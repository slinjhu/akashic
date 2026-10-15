---
title: LLM datasets
description: Why major LLM datasets exist, what they contain, their scale, and where they fit in training and evaluation.
tags:
  - LLM
  - Datasets
---

# LLM datasets

LLM datasets serve different purposes. Some provide vast collections of text
for learning language and knowledge. Others demonstrate how to answer requests,
compare alternative answers, or test capabilities on held-out problems.

This note surveys representative public datasets by category. These are
recognizable names in published model recipes and evaluations, not a ranking
of private industry usage. Public datasets let us inspect the ingredients;
they do not reveal the complete training mixtures of proprietary models.
The focus is text and code, rather than image, audio, or video training.

## 1. Pretraining datasets

During **pretraining**, a typical decoder language model learns
to predict subsequent tokens in documents. A token is a piece of text defined
by a tokenizer; it is not necessarily a word.

An illustrative record might look like this:

```json
{"text": "Plants use sunlight to convert water and carbon dioxide into sugars...", "source": "web"}
```

There is no user question or preferred response here. The document itself
supplies the prediction targets. The snippets in this note are invented examples
of record shapes, not excerpts or exact schemas from the named datasets.

### 1.1. **Common Crawl**: the raw source behind many corpora

Created by: the nonprofit Common Crawl Foundation. [About Common Crawl](https://commoncrawl.org/about).

Motivation: make large-scale web data accessible without every team operating
its own crawler. Common Crawl holds petabytes of web archives collected since
2008, with new crawls generally published monthly. It includes web responses,
metadata, and extracted text. See [Common Crawl's overview](https://commoncrawl.org/overview).

Scale: the accumulated archive totals **more than 10 petabytes**, according to
the foundation's [About page](https://commoncrawl.org/about). For a concrete
monthly example, the **September 2026** release (`CC-MAIN-2026-39`) contains:

| Measure | Size |
|---|---|
| Web page captures | 2.17 billion |
| Registered domains represented | 33.2 million |
| URLs not visited in previous crawls | 587.2 million |
| Uncompressed content | 361.4 TiB |
| Compressed web archives (WARC) | 82.79 TiB |
| Compressed extracted text (WET) | 5.89 TiB |

These are figures for one release, not the whole archive. WARC stores archived
web responses; WET contains extracted plain text, so their sizes describe
different representations. One TiB is approximately 1.10 TB. See the
[September 2026 release announcement](https://commoncrawl.org/blog/september-2026-crawl-archive-now-available).

Page captures across releases can revisit the same URLs. Archive size therefore
does not equal unique, cleaned text available for LLM training.

What it is useful for: building a custom pretraining corpus or studying web
data processing. It is a raw source, not a ready-made collection of good
assistant answers. Extraction, language identification, filtering, and
deduplication determine which material reaches training. Two datasets can use
Common Crawl and still produce very different training data.

### 1.2. **FineWeb** and **FineWeb-Edu**: broad coverage versus educational selection

Created by: Hugging Face’s FineWeb research team, including Guilherme Penedo, Hynek Kydlíček, Loubna Ben Allal, and collaborators. The team released both FineWeb and FineWeb-Edu. [Research report](https://arxiv.org/abs/2406.17557).

**FineWeb** was released as roughly **15 trillion English tokens**, measured
with the GPT-2 tokenizer, from 96 Common Crawl snapshots. Its motivation is to
provide a large, reproducible web corpus with explicit cleaning and
deduplication. Its records are web documents, with text and provenance metadata.
It is useful as a general pretraining foundation or for comparing data filters.
See the [FineWeb report](https://arxiv.org/abs/2406.17557).

**FineWeb-Edu** asks a more selective question: which web pages contain useful
educational material? The principal release contains about **1.3 trillion
tokens**, selected using educational-quality scoring; a less restrictive
score-2 variant contains about **5.4 trillion**. It supports research into whether
a smaller, selected corpus teaches more per training token. It is filtered web
text, not a collection of synthetic tutor conversations. See the
[FineWeb-Edu card](https://huggingface.co/datasets/HuggingFaceFW/fineweb-edu).

Broad web data supplies many styles and topics, while educational selection
favors explanatory material. Selection also changes
coverage: “educational” is one objective, not a universal definition of quality.

### 1.3. **Dolma**: an open training mixture

Created by: the Allen Institute for AI (Ai2), with Luca Soldaini and collaborators on the Dolma/OLMo project. [Dolma paper](https://arxiv.org/abs/2402.00159).

Motivation: support open language-model research, including OLMo, with a
documented mixture rather than an opaque dataset. Dolma is a roughly **3 trillion
token** corpus containing web text, academic publications, code, books, and
encyclopedic material. Releases and mixture recipes differ; a reported result
is tied to a specific version. See the [Dolma dataset card](https://huggingface.co/datasets/allenai/dolma).

Useful for: reproducing open pretraining experiments and testing how source
balance affects capabilities. A mixture makes the relative exposure to prose,
code, and other sources an explicit design decision.
The number of tokens in a corpus is distinct from how often a training recipe
samples each source.

### 1.4. **FineWeb2**: multilingual web text

Created by: researchers at Hugging Face and EPFL, including Guilherme Penedo, Hynek Kydlíček, and collaborators. [FineWeb2 paper](https://arxiv.org/html/2506.20920v1).

English-heavy training data leaves other languages underrepresented. **FineWeb2** was designed to adapt filtering and deduplication
to over **1,000 languages**, rather than apply English-specific rules everywhere.
The reported release has about **5 billion documents**, **20 TB** of text, and
over **3 trillion words**. Those are words, not a tokenizer-independent token
count. See the [FineWeb2 card](https://huggingface.co/datasets/HuggingFaceFW/fineweb-2).

Useful for: multilingual pretraining and studying language coverage. A large
language count does not imply equal data volume or quality in every language.

### 1.5. **The Stack v2**: source code

Created by: BigCode, the open research collaboration led by Hugging Face and ServiceNow, working with Software Heritage on the source-code collection. [Dataset card](https://huggingface.co/datasets/bigcode/the-stack-v2/blob/main/README.md), [BigCode governance](https://huggingface.co/datasets/bigcode/governance-card/blob/main/README.md).

Learning to write code requires examples of source code as well as prose about
programming.
**The Stack v2** collects source code through Software Heritage across more than
**600 programming languages**. The full release reports **67.5 TB of uncompressed
source content**; deduplicated and training subsets are different datasets.
It includes code and repository/provenance information and underpins the
StarCoder2 work. See the [BigCode dataset card](https://huggingface.co/datasets/bigcode/the-stack-v2/blob/main/README.md).

Motivation and use: make large-scale code pretraining reproducible and study
code completion or code understanding. Raw files are not automatically
instruction/answer pairs. License metadata and source-code terms still matter;
inclusion in a dataset is not blanket permission for every use.

### 1.6. Older names that still appear in papers

| Dataset | Created by | Motivation and contents | Reported scale and useful context |
|---|---|---|---|
| C4 | Google Research’s T5 team, including Colin Raffel and collaborators | A cleaned English Common Crawl corpus introduced with T5, providing consistent data for transfer-learning experiments | Original corpus roughly 750 GB of text; useful for understanding older pretraining recipes and baselines. Variants such as multilingual or unfiltered C4 have different sizes. [T5 paper](https://arxiv.org/abs/1910.10683), [C4 catalog](https://www.tensorflow.org/datasets/catalog/c4) |
| The Pile | EleutherAI, including Leo Gao, Stella Biderman, and collaborators | Broaden training beyond generic web text using academic, professional, and other sources | **825 GiB**, composed of **22 subsets**; useful for studying source diversity and reproducing historical open-model work. It is a mixture, not a single uniformly licensed source. [The Pile paper](https://arxiv.org/abs/2101.00027) |

These are important reference points, not an assertion that they are the best
starting point for a new project today.

## 2. Instruction and conversation datasets

Learning to continue documents does not by itself teach a model how to respond
to user requests. **Supervised fine-tuning (SFT)** provides examples
of desired responses, often as conversations:

```json
{"messages": [
  {"role": "user", "content": "Explain photosynthesis in one sentence."},
  {"role": "assistant", "content": "Plants use sunlight to turn water and carbon dioxide into sugars, releasing oxygen."}
]}
```

The training recipe commonly applies loss to assistant responses. This teaches
answer format and task behavior. It does not replace the need for broad
pretraining knowledge.

### 2.1. **UltraChat 200k**: synthetic conversations

Created by: the original UltraChat was developed by Ning Ding and collaborators in Tsinghua University’s THUNLP group. Hugging Face’s H4 team prepared the filtered `ultrachat_200k` derivative described here. [Original project](https://github.com/thunlp/UltraChat), [H4 release](https://huggingface.co/datasets/HuggingFaceH4/ultrachat_200k).

Motivation: provide a practical, filtered collection of synthetic
conversations for instruction tuning. The Hugging Face H4 `ultrachat_200k`
release has **207,865 examples in its SFT training split**, with separate other
splits. It was used for Zephyr-7B-beta. The rows contain multi-turn messages,
covering questions, writing, and other assistant tasks. See the
[UltraChat 200k card](https://huggingface.co/datasets/HuggingFaceH4/ultrachat_200k).

Useful for: learning an SFT pipeline or establishing a general conversational
baseline. The name does not describe every row across every split, and synthetic
responses should not be treated as independently verified facts.

### 2.2. **Tülu 3 SFT mixture**: a broad instruction mixture

Created by: Ai2’s Tülu team and collaborators, combining existing community datasets with newly generated data. This credits the mixture’s curation; its individual sources have their own creators. [Tülu 3 technical report](https://allenai.org/blog/tulu-3-technical).

Motivation: make a strong, reproducible post-training recipe rather than
optimize just one conversational skill. The mixture contains approximately
**939,000 prompt/response examples**, combining public data with newly generated
synthetic examples. It covers areas such as general instruction following,
reasoning, mathematics, coding, and safety. See the
[Tülu 3 technical report](https://allenai.org/blog/tulu-3-technical) and
[SFT dataset](https://huggingface.co/datasets/allenai/tulu-3-sft-mixture).

Useful for: studying a broad post-training recipe and its component mixture.
The mixture lets researchers study how balancing task types affects the
resulting model, rather than training on only one question style.
A mixture can overlap with datasets distributed separately under other names.

## 3. Preference datasets

A model may produce several plausible answers that differ in accuracy,
clarity, or relevance. A **preference dataset** compares alternatives for the same
prompt:

```json
{
  "prompt": "Do plants get most of their carbon from soil?",
  "chosen": "No. Most of their carbon comes from carbon dioxide absorbed from the air.",
  "rejected": "Yes. Plants absorb most of their carbon through their roots from soil."
}
```

This example labels factual correctness. Real preference labels can also encode
helpfulness, style, or other criteria; “chosen” does not mean objectively best
under every criterion.

### 3.1. **UltraFeedback**: scalable feedback on candidate responses

Created by: Ganqu Cui, Lifan Yuan, Ning Ding, and collaborators, released through OpenBMB. Hugging Face’s H4 team produced the binarized derivative used here. [Original project](https://github.com/OpenBMB/UltraFeedback), [H4 derivative](https://huggingface.co/datasets/HuggingFaceH4/ultrafeedback_binarized).

Motivation: produce feedback at scale using model-generated judgments.
The original UltraFeedback collection has about **64,000 prompts** with multiple
candidate responses and feedback. The H4 **binarized** derivative converts these
into chosen/rejected pairs; its `train_prefs` split has about **61,000 rows**.
It is a processed derivative, not another name for the entire original dataset.
See the [UltraFeedback binarized card](https://huggingface.co/datasets/HuggingFaceH4/ultrafeedback_binarized).

Useful for: direct preference optimization (DPO), which trains a model to
favor chosen responses relative to rejected ones, or experiments with reward
models. These are primarily AI judgments, not a survey of human preferences.
Judge biases and label quality affect the behavior the model learns.

## 4. Evaluation datasets

Training examples teach; held-out evaluation examples measure. If we train on
the questions and answers we later report as a test, we no longer have a clean
measurement of generalization. Some datasets deliberately provide both training
and test splits, but those roles must remain separate.

### 4.1. Recognizable benchmarks and what they actually test

| Dataset | Created by | Why it exists and what is in it | Scale | Useful for |
|---|---|---|---|---|
| MMLU | Dan Hendrycks, Collin Burns, Steven Basart, Andy Zou, Mantas Mazeika, Dawn Song, and Jacob Steinhardt. [Paper](https://arxiv.org/abs/2009.03300) | Test breadth of academic and professional knowledge using multiple-choice questions across 57 subjects | Roughly 16,000 questions across its splits | Broad knowledge comparison; not a direct test of a multi-turn assistant or tool use. [Author repository](https://github.com/hendrycks/test) |
| GSM8K | OpenAI; Karl Cobbe and collaborators | Test multi-step arithmetic reasoning using human-written grade-school word problems and worked solutions | Roughly 7,500 training and 1,000 test problems | Training on the training split and evaluating arithmetic reasoning on held-out problems. [Author repository](https://github.com/openai/grade-school-math) |
| HumanEval | OpenAI; Mark Chen and collaborators | Test whether generated Python functions work, using prompts, reference solutions, and executable tests | 164 programming problems | A compact function-generation benchmark; not a test of navigating a large repository. [Paper](https://arxiv.org/abs/2107.03374), [evaluation harness](https://github.com/openai/human-eval) |
| SWE-bench / Verified | SWE-bench: Carlos E. Jimenez, John Yang, and collaborators at Princeton University and the University of Chicago. Verified: OpenAI in collaboration with the SWE-bench authors. [Verified release](https://openai.com/index/introducing-swe-bench-verified/) | Move from isolated functions to resolving real GitHub issues in repositories, evaluated through tests | Original: 2,294 instances; Verified: 500 human-filtered instances | Evaluating a coding agent's model, tools, and execution workflow together. Report the subset and agent setup. [Official benchmark](https://www.swebench.com/) |

These established benchmarks explain many published scores, but should not be
the only evaluation for a new application. Public exposure and contamination can
limit their usefulness. A high score on short Python functions does not establish
that a model can resolve a real software issue across multiple files.

Application-specific evaluations measure behavior that broad public benchmarks
may not cover. Their value depends on representative tasks, explicit scoring
criteria, and separation from training data.

## 5. Understanding dataset scale

| Reported quantity | What it tells us | What it does not tell us |
|---|---|---|
| Tokens | Text volume under a particular tokenizer | Unique knowledge, quality, or a directly comparable count under another tokenizer |
| Documents or files | Number of records | Their lengths or whether near-duplicates remain |
| Conversations | Number of dialogue examples | Number of turns, supervised tokens, or correctness |
| Preference pairs | Number of comparisons | Number of unique prompts or independent human judgments |
| GB/TB | Storage volume in a specified representation | Training tokens; compressed and unpacked sizes differ |

For example, a hypothetical corpus of 100 billion unique tokens sampled twice
produces 200 billion training-token exposures. That does not mean the corpus
contains 200 billion unique tokens. Likewise, a million short conversations may
contain fewer tokens than a much smaller collection of long documents.

Reported scale depends on the dataset revision, subset, split, tokenizer,
filtering, and sampling weights. Derivatives and mixtures can overlap, so their
headline sizes cannot always be added together.

## 6. How datasets differ beyond size

**Origin:** web documents, human-written examples, and model-generated examples
have different strengths and failure modes. Synthetic data can target specific
tasks at scale, but inherits errors and biases from its generation and filtering.

**Selection:** filtering and deduplication change which information is represented.
FineWeb and FineWeb-Edu illustrate how a shared source can yield different
corpora with different objectives.

**Composition:** a mixture's sampling weights affect what the model sees. A small
component sampled repeatedly can have more influence than its storage size suggests.

**Provenance and terms:** public availability does not give every constituent
source identical permissions. Dataset cards document origins, processing, and
usage conditions to varying degrees.

**Evaluation validity:** benchmark scores describe performance on a particular
set of tasks under a particular evaluation procedure. Overlap with training data,
public exposure, and differences in prompting or tools affect interpretation.
