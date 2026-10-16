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

Save this as `embed_ray.py`. Section 2.2 explains how to submit it to the cluster:

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

### 2.2. Submit the program to the cluster

First get the program onto the cluster; then Ray distributes its work to actors.
One option is to SSH into the head node, clone or copy the project there, and run
`uv run python embed_ray.py` in its prepared environment.

Alternatively, use **Ray Jobs** to submit from your laptop or CI machine. Install
the CLI dependencies locally, using a Ray version compatible with the cluster:

```sh
uv add "ray[data,default]"
```

From the project directory containing `embed_ray.py`, run:

```sh
uv run ray job submit \
  --address="http://<head-node-address>:8265" \
  --working-dir="." \
  -- python embed_ray.py
```

The address is the cluster's reachable job-submission endpoint. The command
packages and uploads the working directory, then asks the cluster to run
`python embed_ray.py`. With these options, the entrypoint runs on the head node
by default. The command streams logs while the job runs; your laptop does not
compute embeddings. See the
[Ray Jobs quickstart](https://docs.ray.io/en/latest/cluster/running-applications/job-submission/quickstart.html).

The job's working directory is made available to its driver and workers. Keep it
focused on application files; use `.gitignore` or runtime-environment exclusions
for local environments, caches, and large data files. Our input records remain
in S3 and are read by the pipeline, rather than uploaded with the code.

Code distribution and dependency installation are separate. `uv add` on your
laptop updates the local project; it does not install packages on cluster nodes.
For this submission command, assume the cluster environment already contains
Ray Data, Sentence Transformers, and CUDA-enabled PyTorch. A shared container
image can provide these consistently. Alternatively, configure a job-level
**runtime environment** to install dependencies for the driver and workers before
they execute. Uploading `pyproject.toml` and `uv.lock` alone does not synchronize
that environment. See
[Ray environment dependencies](https://docs.ray.io/en/latest/ray-core/handling-dependencies.html).

Model weights are another input. Each actor loads the model from its node's cache
or downloads it during initialization. Prepopulating the cache or providing an
accessible model directory avoids repeated downloads; copying the Python script
does not copy a model already loaded in another process.

### 2.3. How the work is distributed

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

### 2.4. Where the code runs and how data moves

In either workflow above, `embed_ray.py` runs on the head node. That Python process
is the **driver**: it defines the pipeline and coordinates its execution. The
head node also hosts cluster control services. An **actor** is a separate Python
worker process, scheduled on a node with the requested CPU and GPU resources.
The driver and head node are distinct roles; the driver runs on the head node
here because that is where we launched it or where Ray Jobs placed it.

| Code | Where it executes | What happens |
|---|---|---|
| `ray.init(address="auto")` | Driver | Connects this Python process to the cluster |
| `read_parquet(...)` and `map_batches(...)` | Driver | Build the dataset's execution plan; input discovery and metadata work may also happen |
| `Embedder.__init__()` | Each actor | Loads a separate model onto that actor's GPU |
| `Embedder.__call__(batch)` | An actor assigned a batch | Tokenizes text, computes embeddings, and returns output arrays |
| `embedded.write_parquet(...)` | Called by the driver; writing runs in distributed tasks | Triggers the pipeline, waits for completion, and saves output to S3 |

Defining `class Embedder` on the driver does not instantiate the model there.
Ray makes the callable class available to its workers and instantiates it in
each actor process. The actors do not each rerun the script's main block. Worker
environments still need the imported packages and any model files they use.
See Ray's
[batch inference guide](https://docs.ray.io/en/latest/data/batch_inference.html).

The `Dataset` variables on the driver represent the distributed computation;
they are not Python lists containing all the records. Transformations are lazy,
so defining `embedded` does not compute every embedding immediately. The write
call consumes the dataset and drives execution. See
[Ray Data key concepts](https://docs.ray.io/en/latest/data/key-concepts.html).

Follow one batch through the pipeline:

1. A read task fetches Parquet data from S3 and decodes it into CPU-memory blocks.
2. Ray passes references to blocks through the pipeline. When a consumer runs
   on another node, the required data is transferred to that node. Ray's
   per-node shared-memory object stores support this exchange; local numeric
   arrays can often be read without an additional copy.
3. The actor receives a batch in CPU memory. Sentence Transformers tokenizes the
   strings, transfers model inputs to its GPU, and computes embeddings. With
   the default NumPy output used here, the vectors return to CPU memory.
4. Output blocks feed write tasks, which encode Parquet and upload it to S3.
   If writing happens on another node, that may require another network transfer.

The driver coordinates this work without relaying every batch through its own
Python process. Read tasks, actors, and write tasks may be placed on the same or
different nodes; exact placement and operator fusion can change the physical
path. The important transfers are **S3 ↔ CPU memory**, **between nodes when
needed**, and **CPU memory ↔ GPU memory**. The model stays loaded in the actor
across batches. See
[Ray object serialization and transfer](https://docs.ray.io/en/latest/ray-core/objects/serialization.html).

### 2.5. Follow the data from Parquet to worker and back

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

### 2.6. Measure before scaling further

Eight GPUs do not guarantee an eightfold speedup. Measure records per second on
representative input, separating startup and model downloads from steady-state
processing. Tune the model batch size on one worker, then increase the worker
count. If throughput stops improving, check GPU utilization, CPU tokenization,
S3 reading, and output writing before adding machines.

## 3. Run a large pipeline reliably

A billion-record job may outlive a worker process or a machine. Available GPUs
can change, some batches take much longer than others, and a small fraction of
records may be malformed. A reliable pipeline must keep useful work moving and
make it possible to determine which results are complete.

### 3.1. Match the worker pool to available capacity

The example requests eight actors, each with one GPU and one logical CPU. These
resources must be available together on a node for an actor to start. Eight GPUs
alone are insufficient if the accompanying CPU resources are unavailable.

When capacity is intentionally variable, replace the fixed pool with a range:

```python
# In the existing map_batches call:
compute=ray.data.ActorPoolStrategy(min_size=1, max_size=8)
```

This allows the pool to grow with demand and available resources. The pool
controls model workers; a separately configured **cluster autoscaler** adds or
removes machines. Requesting more actors does not by itself create cloud
capacity. See
[actor-pool configuration](https://docs.ray.io/en/latest/data/api/doc/ray.data.ActorPoolStrategy.html).

### 3.2. Make work small enough to redistribute

Suppose seven workers finish their current batches quickly while one gets a
batch of unusually long texts. That slow batch becomes a **straggler**. Scheduling
more work on the other workers helps overall throughput, but does not shorten
the batch already running.

Balance work at two levels. At the dataset level, provide enough reasonably sized
blocks to keep workers busy; repartition when the existing layout leaves too few
independent pieces. At the model level, account for text length. Two batches of
256 records can have very different token counts and memory requirements.

For embedding workloads, grouping similar-length texts can reduce padding waste.
A token budget can bound the amount of text in each model call more directly
than a row count. Both require preprocessing or batching logic; `batch_size=32`
alone does not implement them. For our MiniLM example, truncation limits model
input length, but oversized source strings still cost memory and tokenization
work before truncation.

Smaller batches reduce the amount of work tied up in one call, but increase
coordination overhead. More partitions also cost scheduling and potentially data
movement. Measure before repartitioning the entire dataset. Ray cannot split a
single oversized record into meaningful passages automatically. See
[performance tuning](https://docs.ray.io/en/latest/data/performance-tips.html) and
[block-size limitations](https://docs.ray.io/en/latest/data/data-internals.html).

### 3.3. Recover workers and make retries safe

If an established model worker dies because its process or node fails, Ray Data
can restart the actor and retry interrupted work. The replacement calls
`Embedder.__init__` again, loading a new model copy. It needs schedulable resources
and access to the model files; the old process's in-memory state is gone.
Ray Data supplies restart and retry defaults for its workers, which differ from
the defaults for manually created Ray Core actors. See the
[Ray Data recovery configuration](https://github.com/ray-project/ray/blob/ray-2.59.0/python/ray/data/_internal/execution/operators/actor_pool_map_operator.py).

Recovery means a batch may be computed more than once. Imagine a worker finishes
an external database write, then crashes before reporting success. Retrying its
function could perform the same write again. Therefore, keep `__call__` focused
on computing and returning embeddings. If it must make external writes, those
writes need a stable deduplication key or an idempotent update operation.

This separates two requirements: **computation may repeat, while the published
dataset should contain one result per input ID**. Ray's retry mechanisms do not
make arbitrary external side effects exactly once. See
[actor fault tolerance](https://docs.ray.io/en/latest/ray-core/fault_tolerance/actors.html).

### 3.4. Publish only complete, validated output

For our S3 pipeline, treat output publication as an explicit step. The following
is an application design to add around the tutorial code, not a guarantee
provided by `write_parquet()`:

1. Freeze the input file list, ideally including immutable object versions, and
   verify that record IDs are unique. Record the model revision and preprocessing
   configuration for the run.
2. Write each attempt to its own S3 prefix. An interrupted attempt may leave
   partial files; do not mix them into a later attempt's output.
3. Validate the output against the input: no missing or unexpected IDs, exactly
   one result per ID, vectors of length 384, and no non-finite values. Equal total
   row counts are insufficient because a duplicate can hide a missing record.
4. Publish a manifest listing the validated files. Consumers read only files
   named by the committed manifest, rather than every object under a broad prefix.

At billion-record scale, perform these checks as distributed aggregations and
joins rather than collecting all IDs on the driver. A manifest is useful only
if consumers honor it and concurrent publishers cannot overwrite each other's
commit decision.

For resumability, divide the frozen input into stable partitions and track one
committed output attempt for each partition. After a restart, skip only validated,
committed partitions. This tracking must survive loss of the driver; actor
restarts alone do not resume an entire application after its coordinating process
exits. Rerunning a write into the same S3 prefix is not a substitute for this
commit protocol.

### 3.5. Isolate invalid records without silently losing data

A transient worker failure may disappear on retry. A null text or a consistently
failing input will not become valid because it runs on another GPU. An unhandled
exception in the batch function can fail the pipeline.

Ray Data defaults to `max_errored_blocks=0`. Increasing this setting allows failed
blocks to be dropped, including valid records alongside the offending input.
That is unsuitable when every input must be accounted for. See
[Ray Data error configuration](https://docs.ray.io/en/latest/data/api/data_context.html).

Validate text types, nulls, and length limits before inference. For an expected
data-related failure in a batch, a recovery path can split the batch and retry
smaller groups to isolate the offending rows. Record rejected IDs with their
error details in a separate output. Avoid catching every exception and silently
returning fewer rows: that can hide programming errors and missing results.

Track two distinct outcomes: successfully embedded IDs and rejected IDs awaiting
repair. Together they should account for the input exactly once. A run with
rejected records is accounted for, but its embedding dataset is not complete
until those records are repaired and successfully processed.
