---
title: Data curation for LLM pretraining
description: Follow a web page from Common Crawl through extraction, filtering, deduplication, and testing to understand how training corpora are built.
tags:
  - LLM
  - Datasets
---

# Data curation for LLM pretraining

An LLM learns from the text we show it. If we spend training time on broken
pages, repeated advertisements, or thousands of copies of one article, we
spend less of that time on useful material.

**Data curation** means choosing and preparing the material a model will learn
from. This note follows text from Common Crawl into a pretraining corpus.
Pretraining teaches a model to predict the next token in text. It does not
require every document to be a question and answer.

We will build an illustrative English-language corpus for a general-purpose
model. Our running example is a short article about growing tomatoes. The
article, records, and numerical examples below are invented to explain the
process. Published pipelines provide the supporting examples and sources.

## ⏳ 1. Start with an archived web page

### ✅ 1.1. What Common Crawl gives us

Common Crawl collects web pages and publishes archives of its crawls. A page
capture may contain an article, but also menus, advertisements, scripts, and
cookie notices. The same URL may appear in several crawls.

The archive offers several representations:

| Format | What it contains | Why we might use it | Rough compressed size (WARC = 100%) |
| --- | --- | --- | --- |
| **WARC** | Archived responses, including headers and page content | Extract text ourselves from the captured HTML | 82.8 TiB (100%) |
| **WAT** | Derived metadata, such as links and HTML metadata | Analyze pages and sources | 14.2 TiB (17%) |
| **WET** | Already extracted plain text | Start with text without running our own HTML extraction | 5.9 TiB (7%) |

These sizes come from the same [September 2026 crawl](https://commoncrawl.org/blog/september-2026-crawl-archive-now-available)
(`CC-MAIN-2026-39`). The release includes all pages captured during that crawl,
both newly discovered URLs and revisits to URLs seen in earlier crawls. It is
not limited to new or changed pages, and it does not include all historical
captures or the entire web.
WET is about one-fourteenth the compressed size of WARC in this release.

WET saves work, but it commits us to an existing extraction. Starting from
HTML gives us more control over what text and structure survive.
[Common Crawl's format and access guide](https://commoncrawl.org/get-started)

### ✅ 1.2. Keep the source attached to the text

Suppose a captured page contains this simplified HTML:

```html
<nav>Home | Shop | Subscribe</nav>
<article>
  <h1>Growing tomatoes</h1>
  <p>Tomatoes need sunlight and well-drained soil.</p>
  <p>Water the roots when the soil begins to dry.</p>
</article>
<footer>Accept cookies | Privacy policy</footer>
```

Before changing it, record where it came from. Keep a document ID, URL, crawl
identifier, capture date, and archive location. This is **provenance**: the
information needed to trace a training record back to its source.

If a later filter makes a mistake, provenance helps us investigate. It also
helps us identify all records from a source we need to exclude. FineWeb's
released records retain source fields such as URL, date, and crawl information.
[FineWeb dataset card](https://huggingface.co/datasets/HuggingFaceFW/fineweb)

## ⏳ 2. Extract the article before judging its quality

### ✅ 2.1. Use the page structure to find the main text

Our first goal is to recover the text someone would want to read:

```text
Growing tomatoes

Tomatoes need sunlight and well-drained soil.
Water the roots when the soil begins to dry.
```

**Text extraction** removes HTML markup and tries to separate the main content
from repeated page furniture. That repeated material is called **boilerplate**.
Simply stripping HTML tags would leave the menu and cookie notice in our text.

To separate them, parse the HTML into a tree of elements. This tree is called
the **DOM**. It tells us which paragraphs belong together and which text sits
inside a menu, article, or footer.

For our tomato page, the structure gives us a simple solution:

| HTML element | Action | Reason |
| --- | --- | --- |
| `<nav>` | Drop it | It contains site navigation |
| `<article>` | Keep its title and paragraphs | It contains the explanation we want |
| `<footer>` | Drop it | It contains the cookie and policy links |

Real pages are less tidy. Some put everything inside generic `<div>` elements.
Main-content extractors then use clues to identify useful text blocks. Long
paragraphs with few links are often article text. Short blocks full of links
are often navigation. These are clues, not guarantees: a useful reference page
can contain many links.

Use an existing main-content extractor as a starting point. Trafilatura,
Readability, and Resiliparse are examples. They handle more page layouts than
a rule that only looks for `<article>`. Their outputs differ, so compare them
on the kinds of pages you want to keep.
[Extractor approaches and comparisons](https://trafilatura.readthedocs.io/en/latest/evaluation.html)

### ✅ 2.2. Convert the selected content without breaking it

Once we have selected the article, turn its HTML into readable text. Convert
paragraph boundaries into line breaks. Put spaces between neighboring text
elements where needed. Decode HTML entities, so `&amp;` becomes `&`.

Preserve structure that carries meaning. In our example, keep the title and
the two separate paragraphs. In a programming tutorial, keep code indentation.
For a table, keep the relationship between headers and values. Flattening
every cell into one long sentence can lose that relationship.

Choose the extractor's settings for the corpus. For an article corpus, we
might exclude reader comments. For a forum corpus, the replies may be the
content we want. Trafilatura offers options for comments, tables, formatting,
and structured output. Choose a representation that retains what you need.
[Trafilatura extraction options](https://trafilatura.readthedocs.io/en/latest/corefunctions.html)

### ✅ 2.3. Check failures before discarding the page

Suppose the output is only “Home Shop Subscribe.” That does not establish
that the original page was low quality. The extractor may have selected the
wrong block.

Keep extraction failures separate from quality rejections. For pages with
empty or suspicious output, try a second extractor or a less aggressive
setting. Then check whether the new output recovered the article or merely
added more boilerplate. Trafilatura supports backup extraction and settings
that favor either keeping more text or selecting less text more precisely.
[Extraction settings](https://trafilatura.readthedocs.io/en/latest/corefunctions.html)

You should build a small test set with several page layouts. Mark which text
should survive, then compare it with the extractor's output. Check for two
errors: article text that went missing, and unwanted text that remained. Keep
examples with lists, code, and tables so an extractor cannot look good merely
by handling ordinary prose well.

Extraction happens before quality filtering because a bad extraction can make
a good article look bad. Once our tomato page contains its title and growing
advice, we can judge the text itself in section 3.

FineWeb starts from Common Crawl HTML and uses a main-content extractor.
Its experiments compare extraction and filtering choices through model training.
[FineWeb processing study](https://arxiv.org/abs/2406.17557)

## ⏳ 3. Remove records that do not fit the corpus

### ✅ 3.1. Start with inexpensive checks

We now have many extracted documents. Some are useful articles. Others are
error messages, spam, or text in languages outside our current English target.
Cheap checks let us remove obvious failures before running costly models.

| Check | Problem it tries to catch | A reason to inspect mistakes |
| --- | --- | --- |
| Empty or failed extraction | No usable text | The extractor may have missed a real article |
| Language identification | Text outside the chosen language mix | Short or mixed-language pages are harder to classify |
| Repeated lines or phrases | Menus, spam, or extraction loops | Some repetition is useful, such as in examples |
| Unusual character patterns | Garbled text or broken formatting | Code and equations can look unusual too |
| URL or source rules | Sources excluded by the corpus policy | A whole domain may contain several kinds of content |

These are **heuristics**: inexpensive rules that use clues instead of fully
understanding the document. FineWeb combines language identification, URL
filtering, and text-quality rules in its pipeline.
[FineWeb's documented filters](https://huggingface.co/datasets/HuggingFaceFW/fineweb#dataset-creation)

Our tomato article should survive if the text is readable and fits our language
target. A page repeating “BUY TOMATO SEEDS” hundreds of times is a candidate
for removal. The decision should depend on the document, rather than just
whether it contains the word “tomato.”

### ✅ 3.2. Readability is only one reason to keep text

#### ✅ 3.2.1. Separate readability from content suitability

Suppose our tomato article is clear and well written. A readability check
would accept it. But what if it also contains a customer's private contact
details? The writing quality has not changed. We still need to decide whether
to remove those details or exclude the document.

These are two separate questions:

| Question | Example decision |
| --- | --- |
| Is the text readable and usable? | Keep the clearly written growing advice |
| Does the content fit what we intend to include? | Remove private details before keeping the article |

A readability score helps answer the first question. It cannot answer the
second by itself. You should define separate rules for sources, personal
information, and other content you want to exclude. Record the reason for
each removal so you can check those decisions later. Dolma separates these
kinds of processing in its curation pipeline.
[Dolma's curation study](https://arxiv.org/abs/2402.00159)

#### ✅ 3.2.2. Find personal information with rules and models

Suppose the tomato article includes “Contact Alice Smith at alice@example.com.”
We need to locate the personal information before deciding what to remove.
Published tools use both rules and models for this task.

| Method | How it works | Example |
| --- | --- | --- |
| Rules | Match recognizable patterns, sometimes with format or checksum validation | Find an email address or phone number |
| Named entity recognition (NER) | Use a trained model to identify names and locations from surrounding text | Recognize “Alice Smith” as a person's name |
| LLM detection | Ask a language model to identify specified types of personal information | Find details expressed in varied wording |

Rules are inexpensive and useful for structured information. Dolma uses
pattern-based detection for emails, phone numbers, and IP addresses. It masks
matches or removes documents containing many matches.
[Dolma processing description](https://allenai.github.io/dolma/docs/assets/dolma-v0_1-20230819.pdf)

You can combine approaches. Presidio supports rules and NER models. NeMo
Curator also supports LLM-based detection, which adds model inference cost.
[Presidio detection methods](https://github.com/data-privacy-stack/presidio/blob/main/docs/analyzer/index.md),
[NeMo Curator's PII processing](https://docs.nvidia.com/nemo-framework/user-guide/25.04/datacuration/personalidentifiableinformationidentificationandremoval.html)

Detection finds candidates; it does not decide whether information is private.
A history article may name a public figure. You should define what to mask
or exclude, then check samples for missed details and unnecessary removals.

#### ✅ 3.2.3. Other reasons readable text may not fit

Personal information is only one reason to exclude readable text. The corpus
also has a purpose and inclusion rules:

| Selection goal | Readable text we might exclude | Reason |
| --- | --- | --- |
| Language | A clear French article about tomatoes | We are building an English-language corpus |
| Topic | An English gardening article | We are building a math-focused corpus |
| Content policy | A well-written gambling advertisement | Our inclusion rules exclude gambling promotions |
| Source permissions | A useful article from an unapproved source | The source does not meet the project's usage requirements |

These examples illustrate possible choices, not rules every corpus must follow.
Our tomato article could belong in a general English corpus and be excluded
from a math corpus. Its writing quality stays the same; the training goal changes.

### ✅ 3.3. Exclusion rules need context

Once we decide what to exclude, we need a way to find it. A simple approach
is a **keyword blocklist**: reject a page if it contains any word on the list.

Suppose we want to exclude pornography and block the word “breast.” That rule
would also reject an article about breast cancer. The word appears in both,
but the pages serve very different purposes. A word match alone is not enough
to distinguish them.

Use context when making the decision, for example with a content classifier
that considers the surrounding text. Check its mistakes too; a classifier
can still reject useful documents. An audit of C4 found that blocklist
filtering disproportionately removed text from and about minority groups.
[C4 dataset audit](https://aclanthology.org/2021.emnlp-main.98/)

You should inspect samples of both accepted and rejected documents. Looking
only at what survived will not reveal useful material that a filter erased.

## ✅ 4. Stop repeated copies from dominating training

Our tomato article may appear in several captures: at the original URL, in a
print view, and in a later crawl. A copied version may also appear on another
site with one sentence changed. Different URLs do not imply different content.

**Deduplication** finds repeated content and decides which copies to keep.

### ✅ 4.1. Find exact copies with text hashes

Suppose the original page and its print view both produce this extracted text:

```text
Growing tomatoes
Tomatoes need sunlight and well-drained soil.
Water the roots when the soil begins to dry.
```

The URLs differ, but the text is identical. We can keep one copy and remove
the other without losing any of this text.

To find such copies efficiently, compute a **hash** of each document's text.
A hash is a compact fingerprint. Store the fingerprints in an index and look
for repeats. Matching fingerprints identify candidates for an exact comparison;
two different texts can occasionally share a hash.

You may first **normalize** the text, such as replacing repeated spaces with
one space. Then documents that differ only in those spaces will match too.
The normalization rules define what counts as identical. Be careful with code,
where whitespace may carry meaning.

This method is inexpensive, but changing one word changes the fingerprint.
That motivates a second method for near copies.

### ✅ 4.2. Find near copies

#### ✅ 4.2.1. Represent text as overlapping word sequences

Now imagine two 1,000-word versions of the article. One has a new title and
an extra sentence at the end. Almost all the advice is copied, but their
whole-document hashes differ.

Instead of treating each article as one string, split it into overlapping
word sequences. A sequence of $n$ words is called an **n-gram**. For example,
“tomatoes need sunlight and well-drained soil” begins with these 3-grams:

```text
tomatoes need sunlight
need sunlight and
sunlight and well-drained
and well-drained soil
```

Compare the sets of n-grams from the two documents. A changed title affects
some sequences, but the copied body still contributes many matches. One
overlap measure is **Jaccard similarity**: the number of distinct sequences
shared by both documents divided by the number appearing in either document.

This catches copied wording with small edits. It does not reliably catch
two articles that express the same ideas using very different words.

#### ✅ 4.2.2. MinHash makes a small summary of each document

The n-gram sets can be large. We want a much smaller representation that still
lets us estimate their overlap. **MinHash** builds this representation, called
a **signature**.

Start with one hash function. Apply it to every distinct n-gram in the document.
Keep only the smallest resulting number. Then repeat with several different
hash functions. Each function contributes one number to the signature.

Why keep the minimum? Think of a hash function as putting all possible n-grams
in a shuffled order. If two documents share many n-grams, they have a good
chance of sharing the first one in that order. Their minimum values then match.
For ideal random orderings, the probability of a match equals their Jaccard
similarity. Repeating with different orderings lets us estimate that probability.

Here is a toy example with four signature entries. The numbers illustrate
the comparison; they are not computed from our article:

| Document | Entry 1 | Entry 2 | Entry 3 | Entry 4 |
| --- | --- | --- | --- | --- |
| A: original tomato article | 12 | 7 | 31 | 4 |
| B: slightly edited copy | 12 | 7 | 31 | 9 |
| C: unrelated article | 8 | 6 | 25 | 2 |

A and B match in three of four positions. That gives a rough similarity
estimate of 75%. Four entries are far too few for a stable estimate; real
pipelines use longer signatures. The shared minimum values, rather than the
numerical distance between values, are what matter.

For scale, DataTrove's default uses 112 signature entries, while
datasketch defaults to 128; longer signatures improve the estimate at added cost.
[DataTrove defaults](https://github.com/huggingface/datatrove/blob/main/src/datatrove/pipeline/dedup/minhash.py),
[datasketch defaults](https://ekzhu.com/datasketch/minhash.html)

MinHash reduces the amount of information needed for a comparison. But we
still cannot afford to compare every pair of signatures. That is the next problem.

#### ✅ 4.2.3. LSH finds likely matches without checking every pair

With one million documents, there are roughly 500 billion possible pairs.
Most are unrelated. **Locality-sensitive hashing (LSH)** helps us find likely
matches first.

For MinHash signatures, a common approach divides each signature into groups
of entries called **bands**. Put documents with the same values in a band into
the same bucket. Documents sharing at least one bucket become candidate pairs.

Split our toy signatures into two bands:

| Document | Band 1 | Band 2 |
| --- | --- | --- |
| A | (12, 7) | (31, 4) |
| B | (12, 7) | (31, 9) |
| C | (8, 6) | (25, 2) |

A and B share band 1, so the index brings them together. C shares neither band
with them, so it does not become a candidate for either comparison in this example.
We found A and B by grouping matching bands, rather than scanning all pairs.

A bucket match is approximate evidence of similarity. Some pipelines check
candidate similarity before grouping documents. Others use band matches
directly to form groups, as DataTrove's MinHash pipeline does. Once a group
is formed, the pipeline chooses which document to retain.

The band settings control the tradeoff. Requiring more entries to match within
each band makes a band match harder. Using more bands gives similar documents
more chances to meet. The process can miss near copies or group documents we
would prefer to keep separately, so test the settings on actual text.
[DataTrove's signature, bucket, and clustering implementation](https://github.com/huggingface/datatrove/blob/main/src/datatrove/pipeline/dedup/minhash.py)

#### ✅ 4.2.4. Put the steps together

We use these methods together because each solves a different part of the
problem. N-grams define the text overlap we care about. MinHash summarizes
that overlap. LSH helps us find likely matches across a large collection.

1. **Process every document.** Extract its n-grams and compute its MinHash
   signature. Our original tomato article and its edited copy get separate
   signatures, but many entries may match.
2. **Build the LSH index.** Split each signature into bands. Put matching bands
   into the same buckets, keeping the document IDs alongside them.
3. **Find candidate pairs.** Documents sharing at least one bucket become
   possible duplicates. We avoid checking every pair in the whole corpus.
4. **Verify candidates if the pipeline calls for it.** Compare full signatures
   to estimate similarity, or compare n-gram sets to calculate exact Jaccard
   similarity. Apply the chosen similarity threshold.
5. **Form duplicate groups and keep representatives.** Choose a consistent
   rule for which copy survives, such as preferring the better extraction.

Step 4 is optional. DataTrove's MinHash pipeline forms groups directly from
band matches. In that setup, the band settings control the matching behavior
without a separate Jaccard check. Other pipelines add verification to reject
accidental candidates. Both approaches can make mistakes, so inspect the
groups they produce.
[DataTrove pipeline implementation](https://github.com/huggingface/datatrove/blob/main/src/datatrove/pipeline/dedup/minhash.py)

### ✅ 4.3. Find copied passages inside different documents

Suppose a second article covers tomato pests. It has several new paragraphs,
but copies the watering advice from our original article:

| Document | Contents |
| --- | --- |
| Original article | Sunlight advice + watering advice |
| Pest article | New pest advice + copied watering advice + new treatment advice |

Most of the two documents differs. Whole-document near-duplicate matching
may keep both. But we may still want to reduce the repeated watering passage.

One approach splits documents into paragraphs and compares paragraph hashes.
This finds exact copied paragraphs even when the rest of the article differs.
Another searches for long repeated sequences that may cross paragraph boundaries.
Google's ExactSubstr research implementation uses a **suffix array**, an index
that makes repeated text sequences easier to find across a corpus.

A **suffix** is the text from a chosen starting position to the end. For
example, in `cat sat`, position 0 starts `cat sat`, position 1 starts `at sat`,
and position 4 starts `sat`. Google's implementation indexes byte positions,
so it is not limited to word or paragraph boundaries.

The suffix array stores these positions sorted by the text that follows them,
like entries in a dictionary. Suffixes that begin with the same passage land
next to each other in that ordering. Comparing neighboring suffixes reveals
how long their shared beginning is. A long shared beginning identifies repeated
text, such as our copied watering advice. The index stores positions rather
than separate copies of every suffix.
[Repeated-sequence deduplication implementation](https://github.com/google-research/deduplicate-text-datasets)

Finding a match and deciding what to remove are separate steps. We might remove
only the repeated passage, or drop a document if most of it is copied. Removing
a passage can leave later sentences without context, so check the remaining text.
Set a minimum match length so ordinary short phrases do not trigger removal.

DataTrove provides tools for several deduplication methods; you do not need
to build every index from scratch.
[DataTrove deduplication tools](https://github.com/huggingface/datatrove#deduplication)

### ✅ 4.4. Choose how broadly to deduplicate

You can search for copies within one crawl, across several crawls, or across
all sources in the final mixture. A copy found in another crawl will survive
if you only deduplicate within each crawl. Document the scope and the rule
used to choose a surviving copy.

Why remove copies? Suppose we keep our article 100 times. The model receives
100 times as much exposure to that article as to an equally long article kept
once. Repetition changes what the model learns and can encourage memorization.
Research has found that deduplication reduces memorized output and can improve
training efficiency.
[Deduplicating Training Data Makes Language Models Better](https://aclanthology.org/2022.acl-long.577/)

However, aggressive matching can remove distinct documents that share useful
phrases. Deduplication also changes the size and composition of the corpus.
You should test the threshold and scope rather than assume the most aggressive
setting is best. FineWeb explicitly experiments with deduplication choices.
[FineWeb study](https://arxiv.org/abs/2406.17557)

## ⏳ 5. Select text for what you want the model to learn

### ✅ 5.1. A quality score needs a purpose

After cleaning and deduplication, we still have more text than we can afford
to train on. Which documents should receive that budget?

Suppose we want clear explanations. Our tomato article explains when to water
plants. A readable shop page lists seed prices. Both are valid text, but the
article may better serve this particular goal.

A **quality classifier** scores documents according to labeled examples.
One approach asks people or a stronger model to rate a sample of documents.
A smaller model then learns to predict those ratings and scores the larger
corpus. FineWeb-Edu uses model-generated educational ratings to train a scalable
scorer, then selects documents with higher educational scores.
[FineWeb-Edu selection method](https://huggingface.co/datasets/HuggingFaceFW/fineweb-edu#dataset-creation)

For a concrete sense of scale, FineWeb-Edu's scorer was trained on **450,000
web samples**, each rated from 0 to 5 by **Llama 3 70B Instruct**. The scorer
uses a pretrained **Snowflake Arctic Embed M**, about **110 million parameters**,
with an added scoring layer (769 parameters: 768 weights and one bias). The text encoder was frozen; only the scoring
layer was trained. This teaches an existing text model to predict educational
ratings, rather than training a new language model from scratch.
[Scorer training details](https://huggingface.co/HuggingFaceFW/fineweb-edu-classifier),
[Base model size](https://huggingface.co/Snowflake/snowflake-arctic-embed-m)

The expensive 70B model labels a sample once. The much smaller scorer then
processes the full corpus. The 450,000 examples are a published recipe, not a
universal requirement; the needed count depends on document diversity and
how subtle the scoring task is.

That score means “resembles the material this scorer was trained to favor.”
It is not a guarantee of factual accuracy. It may also favor some topics or
writing styles over others. Keep human audits and downstream tests in the loop.

### ⏳ 5.2. Filtering and mixing solve different problems

**Filtering** decides what is eligible for training. **Mixing** decides how
often each eligible source or category is sampled.

For example, a hypothetical 100-billion-token budget might allocate 70 billion
tokens to broad web text, 20 billion to educational text, and 10 billion to
code. These are illustrative allocations, not recommended universal weights.
If educational text is a subset of the broad web corpus, account for that
overlap when measuring unique content and total exposure.

Sampling a small collection repeatedly can give it a large influence. If we
have 10 billion unique tokens and train over them three times, we use 30 billion
training-token exposures. We still have only 10 billion unique tokens.

The useful mix depends on the model's goals. Dolma studies mixtures of web
text and other sources, including code, papers, and books.
[Dolma's data-mixture experiments](https://arxiv.org/abs/2402.00159)

## ⏳ 6. Keep evaluation separate from training

Suppose a crawled page reproduces a GSM8K test question and its solution.
Keeping it may help a model answer that exact test item. The resulting score
would be weaker evidence that the model can solve a new problem.

**Decontamination** searches training data for overlap with evaluation material.
Unlike deduplication, its purpose is to protect a measurement. A benchmark
question appearing only once can still contaminate the evaluation.

You can compare document hashes, distinctive passages, or overlapping word
sequences with held-out material. Inspect potential matches before deciding
what to remove. Common short phrases can match by accident. Exact matching
will also miss paraphrases and translations.

Keep copies from the same duplicate group out of both the training and
validation sets. Otherwise validation can reward recalling material seen in
training. The deduplication literature and the C4 audit document overlap
between training and evaluation data.
[Deduplication and evaluation overlap](https://aclanthology.org/2022.acl-long.577/),
[C4 contamination analysis](https://aclanthology.org/2021.emnlp-main.98/)

## ⏳ 7. Test whether the curation actually helps

### ⏳ 7.1. Audit the documents and the counts

Before training, sample records from each processing stage. Read both keeps
and rejects. Include several domains, document lengths, topics, and score ranges.
Return to the original page when the extracted text looks suspicious.

Keep a stage-by-stage ledger. This example shows what to record, not measured
retention rates:

| Stage | Record what changed |
| --- | --- |
| Extraction | Failed pages and usable text volume |
| Filtering | Documents and tokens removed by each reason |
| Deduplication | Duplicate groups, removed copies, and matching scope |
| Selection and mixing | Topic, source, and language shares; sampling weights |
| Final corpus | Unique content, planned token exposures, and overlap checks |

Track tokens as well as document counts. Removing one huge spam page and one
short paragraph each removes one document, but very different text volumes.
State which tokenizer produced the counts. A token is a unit of text defined
by that tokenizer, not necessarily a word.

### ⏳ 7.2. Train a model to test a data decision

An attractive sample is not enough to establish that a filter improves training.
Build two corpus versions: one without the proposed filter and one with it.
Train comparable small models using the same architecture, training settings,
and token budget. Change the data decision you want to test.

This is an **ablation experiment**. It asks what changes when one part of the
pipeline changes. If the filtered corpus is smaller, record how you refill
the budget. Repeating its documents changes exposure as well as selection.

Evaluate on several held-out tasks and languages relevant to the goal.
Check for regressions, not just a higher average. Repeat promising experiments
when run variation could explain the result. Keep a final evaluation set
separate from the benchmarks repeatedly used to tune filters.

DataComp-LM provides standardized training and evaluation to compare data
curation choices. Its experiments find model-based filtering important for
its baseline. This is evidence for testing selection through training, rather
than trusting a quality score alone.
[DataComp-LM paper](https://arxiv.org/abs/2406.11794),
[Experimental framework](https://www.datacomp.ai/dclm/)

## ⏳ 8. Turn the chosen corpus into reproducible training input

Once a corpus version is chosen, store the accepted text with its metadata.
Record the extractor, filter versions, thresholds, duplicate decisions, and
sampling rules. A manifest should identify exactly which files belong to that
version. This lets another run use the same data.

Tokenization converts text into token IDs. Training then groups those tokens
into sequences of the chosen length. Keep document boundaries explicit and
specify how the trainer handles attention across them. Shuffle or sample
according to the intended mixture so that file order does not accidentally
determine what the model sees first. DataTrove includes processing components
for tokenization and training-data preparation.
[DataTrove pipeline tools](https://github.com/huggingface/datatrove)

Our tomato article has now become readable text, passed the corpus rules,
survived as a chosen representative of its copies, and received a place in the
training mixture. We can trace it back to its capture and explain why it was
included. Whether it contributes to a better model is tested through training.

For public corpora built with these ideas, see [LLM datasets](llm.md).
For tasks used to measure model performance, see [Evaluation datasets](evaluation.md).
For interpreting differences between training runs, see
[Multiple hypothesis testing](../statistics/multiple-hypothesis-testing.md).
