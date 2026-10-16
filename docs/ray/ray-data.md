---
title: Ray Data
description: Compute text embeddings with a Python loop, then scale batch inference with Ray Data.
tags:
  - Ray
  - Embeddings
  - Distributed Computing
---

# Ray Data

In this tutorial, we will compute embeddings for ten text records with a simple
Python loop, then improve it with batching. Then we will scale to a billion records using Ray Data: read Parquet files from
S3, compute embeddings across GPU workers, and write the results back to S3.

## 1. Start with 10 text records

Suppose we have short text records and want to find records with similar meanings.
An embedding model converts each text into a vector of numbers. We can store that
vector alongside the record's ID, then compare vectors when searching.

Install Sentence Transformers:

```sh
uv add sentence-transformers
```

Save this as `records.py`. We will use these records for the loop and batching examples.

```python
records = [
    {"id": 1, "text": "The cat is sleeping on the sofa."},
    {"id": 2, "text": "A kitten is resting on a couch."},
    {"id": 3, "text": "The dog wants to go for a walk."},
    {"id": 4, "text": "We hiked through the forest."},
    {"id": 5, "text": "The train arrives at noon."},
    {"id": 6, "text": "My flight was delayed by two hours."},
    {"id": 7, "text": "Add fresh basil to the tomato soup."},
    {"id": 8, "text": "This recipe needs two cups of flour."},
    {"id": 9, "text": "The telescope captured a distant galaxy."},
    {"id": 10, "text": "Astronomers discovered a new planet."},
]
```

### 1.1. A plain Python loop

Save this as `embed_loop.py`, next to `records.py`:

```python
import numpy as np
from sentence_transformers import SentenceTransformer
from records import records

# Load once, before the loop. The first run downloads the model files.
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2", device="cpu")

results = []
for record in records:
    vector = model.encode(record["text"], normalize_embeddings=True)
    results.append({"id": record["id"], "embedding": vector})

print(len(results))                     # 10 records
print(results[0]["embedding"].shape)     # (384,) numbers per record

# Normalized vectors have length 1, so their dot product is cosine similarity.
similarity = np.dot(results[0]["embedding"], results[1]["embedding"])
print(f"Similarity between records 1 and 2: {similarity:.3f}")
```

Run `python embed_loop.py`. The model has already been trained; this code only
performs inference. Its output has 384 dimensions, and long inputs are truncated
at 256 word pieces by default. Our short sentences fit; a document-length input
would need a deliberate splitting strategy. See the
[model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2).

For ten records, this loop is a reasonable solution. There is no need for Ray yet.

### 1.2. Give the model a batch

Before distributing work, replace the loop with a single call over a list:

```python
texts = [record["text"] for record in records]
vectors = model.encode(texts, batch_size=32, normalize_embeddings=True)

results = [
    {"id": record["id"], "embedding": vector}
    for record, vector in zip(records, vectors)
]
print(vectors.shape)  # (10, 384)
```

This replaces the computation after model loading in `embed_loop.py`.
`batch_size=32` means at most 32 texts per model batch; here there are only ten.
Batching lets the model process several inputs together, often improving hardware
utilization, especially on a GPU. Larger batches also need more memory. See
[Sentence Transformers' encoding API](https://www.sbert.net/docs/package_reference/sentence_transformer/model.html).

## 2. Scale to a billion records with Ray Data

At an illustrative throughput of 200 records per second, one billion records
would take 5,000,000 seconds, or about 58 days. This is a sizing example, not a
benchmark for this model. The output vectors alone would occupy 1.536 TB in
decimal units: one billion records × 384 dimensions × 4 bytes per float32 value,
before IDs, text, or storage-format overhead.

We need to process many batches concurrently and write results as we go.
**Ray Data** handles the dataset pipeline: reading input, distributing batches to
workers, and writing output. The embedding model still does the inference.

### 2.1. Read from S3, embed on GPUs, write to S3

Assume the records are stored in S3 Parquet files with `id` and `text` columns.
Each row has a unique ID and a non-null text string. The example uses an existing
Ray cluster with eight available NVIDIA GPUs and enough CPU resources for both
inference and data loading. All workers need CUDA-enabled PyTorch, compatible
packages, access to the model files, and permission to read and write the S3
locations. The bucket paths below are placeholders.

Add Ray Data to the project's dependencies and make that environment available
on the cluster:

```sh
uv add "ray[data]"
```

Save this as `embed_ray.py` and run it on the cluster's head node with
`uv run python embed_ray.py`:

```python
import numpy as np
import ray
import torch
from sentence_transformers import SentenceTransformer


class Embedder:
    def __init__(self) -> None:
        # Each worker loads its own model once and keeps it on its assigned GPU.
        torch.set_num_threads(1)
        self.model: SentenceTransformer = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2", device="cuda"
        )

    def __call__(self, batch: dict[str, np.ndarray]) -> dict[str, np.ndarray]:
        texts: list[str] = batch["text"].tolist()  # One string per input row.
        vectors: np.ndarray = self.model.encode(
            texts,
            batch_size=32,  # Texts per model inference batch.
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        # id: (N,); embedding: (N, 384).
        return {"id": batch["id"], "embedding": vectors}


if __name__ == "__main__":
    ray.init(address="auto")  # Connect to an existing cluster.

    dataset: ray.data.Dataset = ray.data.read_parquet(
        "s3://your-bucket/text-records/",
        columns=["id", "text"],
    )
    embedded: ray.data.Dataset = dataset.map_batches(
        Embedder,
        batch_format="numpy",
        batch_size=256,  # Rows handed to a worker per Ray batch.
        compute=ray.data.ActorPoolStrategy(size=8),
        num_cpus=1,
        num_gpus=1,  # One GPU per worker: eight GPUs total.
    )

    # Execute the pipeline and write distributed output without collecting it.
    embedded.write_parquet("s3://your-bucket/embeddings/run-001/")
    ray.shutdown()
```

With `batch_format="numpy"`, the worker receives and returns a dictionary mapping
column names to NumPy arrays. Annotations help readers, editors, and type
checkers; they do not enforce column names, array shapes, or dtypes at runtime.
See Ray's annotated
[`map_batches` examples](https://docs.ray.io/en/latest/data/api/doc/ray.data.Dataset.map_batches.html).

The output is a collection of Parquet files with `id` and `embedding` columns.
Choose a fresh output prefix for each run. Match results to source records by ID;
do not rely on file order or row arrival order.

`ray.init(address="auto")` connects to a cluster that has already been started;
it does not provision machines. See the
[starting Ray guide](https://docs.ray.io/en/latest/ray-core/starting-ray.html).

### 2.2. How the work is distributed

Ray creates eight persistent workers, called **actors**, from the `Embedder`
class. Each actor initializes its model once and reuses it for many batches.
This avoids paying the model-loading cost for every call. The workers can run
on different machines; each processes different records with a complete copy of
the model. See Ray's
[batch inference guide](https://docs.ray.io/en/latest/data/batch_inference.html).

`num_gpus=1` reserves a logical GPU resource for each actor, and Ray sets the
worker's GPU visibility. `device="cuda"` makes the model use that GPU. Both
settings matter: requesting a GPU alone does not move a model onto it. Each
model replica and its inference batch must fit in one GPU's memory. See
[Ray accelerator support](https://docs.ray.io/en/latest/ray-core/scheduling/accelerators.html).

The two batch sizes control different parts of the pipeline. Ray hands a worker
up to 256 rows, possibly fewer at block boundaries. The worker then processes
those texts in model batches of at most 32. Increasing the Ray batch size can
amortize coordination overhead; increasing the model batch size can improve GPU
utilization but needs more GPU memory. `num_cpus=1` is a scheduling request, not
an operating-system CPU limit; the code sets PyTorch's thread count separately.
See [`map_batches`](https://docs.ray.io/en/latest/data/api/doc/ray.data.Dataset.map_batches.html).

Ray Data divides input into **blocks**, chunks of rows that workers can process
independently. Streaming execution overlaps reading, inference, and writing, so
the billion records do not all need to fit in memory at once. There must still
be enough independent input work to feed the GPUs, and enough memory for active
blocks, batches, and models. See
[Ray Data internals](https://docs.ray.io/en/latest/data/data-internals.html).

### 2.3. Follow the data from Parquet to worker and back

**A file, a block, and a batch are different units.** Parquet files are the
storage layout. Read tasks produce in-memory blocks; there is no required
one-file-to-one-block mapping. Ray forms batches from those blocks for calls to
`Embedder.__call__`. A worker processes many batches over its lifetime.

With `batch_format="numpy"`, one three-row input batch looks like this:

```python
{
    "id": np.array([1, 2, 3]),             # Shape: (3,)
    "text": np.array(["A cat...", "A kitten...", "A dog..."]),
}
```

The dictionary represents a table **by columns**. `batch["text"].tolist()` turns
the text column into the list of strings expected by `encode`. Its output is a
NumPy matrix with shape `(3, 384)`. The worker returns:

```python
{
    "id": batch["id"],   # Shape: (3,)
    "embedding": vectors,  # Shape: (3, 384)
}
```

Both columns have three entries along their first dimension. Row `i` pairs
`id[i]` with the entire vector `vectors[i]`. Thus `"embedding"` names a column;
it does not mean the dictionary contains only one record. The input `text`
column is omitted from this output. See the
[`map_batches` input and output formats](https://docs.ray.io/en/latest/data/api/doc/ray.data.Dataset.map_batches.html).

Ray packages returned batches into output blocks and feeds them to write tasks.
It does **not** reconstruct one giant Python list on the driver. Write tasks
serialize their portions into Parquet files, where each row contains an ID and
its vector. Worker batches, output blocks, and output files need not have matching
boundaries. Reading, inference, and writing can overlap as blocks become ready.
See [Ray Data's execution model](https://docs.ray.io/en/latest/data/data-internals.html).

### 2.4. Measure before scaling further

Eight GPUs do not guarantee an eightfold speedup. Measure records per second on
representative input, separating startup and model downloads from steady-state
processing. Tune the model batch size on one worker, then increase the worker
count. If throughput stops improving, check GPU utilization, CPU tokenization,
S3 reading, and output writing before adding machines.

For a billion-record run, record the model revision and preprocessing settings,
validate output IDs and vector dimensions, and check for non-finite values.
Plan how to resume interrupted work without duplicating completed records;
distributed execution alone is not an application-level checkpointing strategy.
