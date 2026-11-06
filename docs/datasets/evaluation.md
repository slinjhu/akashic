---
title: Common evaluation datasets
description: Why LLM benchmarks exist, what their scores measure, and worked examples, starting with 21 text pretraining evaluations.
tags:
  - LLM
  - Datasets
---

# Common evaluation datasets

Suppose we pretrain a language model on books, articles, and code. It learns to
continue text, but what has it learned to do? Start with a small test:

Which gas do plants absorb during photosynthesis?

- A. Oxygen
- B. Carbon dioxide
- C. Helium
- D. Hydrogen

Expected answer: B.

Give the model many held-out questions and count the correct answers. This is
**accuracy**: 80 correct answers out of 100 questions gives 80% accuracy.
An evaluation dataset supplies the questions and reference answers; a
**benchmark** also specifies how to present them and score the responses.

Now remove the choices. Can the model produce “carbon dioxide” on its own?
Supply a passage containing the answer: can it read the evidence? Ask why a
plant grows differently in two conditions: can it combine facts? These changes
test different abilities, even when all the questions concern plants.

That is why we need several benchmarks. A single score cannot distinguish
remembering facts, following a narrative, doing arithmetic, and writing working
code. This page develops those distinctions through concrete examples.

**About the samples:** all examples below are original, illustrative examples,
not quoted dataset records. They show the task format and expected answer;
many are deliberately easier and shorter than the actual benchmark. Each entry
links to original research or released data for real examples.

## 1. Text pretraining

Here, “text pretraining” means **evaluating the capabilities of a text model
during or after pretraining**. It does not mean training on these test answers.
The [LLM datasets overview](llm.md) explains the distinction between training
corpora and held-out evaluation data.

The 21 benchmarks below follow the supplied grouping. These are not exclusive
stage assignments: SimpleQA, GPQA, MATH-500, and LiveCodeBench, for example, also
appear in evaluations of post-trained models. A base model's ability to complete
text and an assistant's ability to follow a request can produce different
results on the same underlying questions.

### 1.1. How a next-token model takes a test

For our plant question, one evaluation can compare the probabilities of the
candidate answers and choose the most likely. Another can ask the model to
generate a response, then extract its answer. Those are different procedures.

**Zero-shot** means no worked examples are provided in the prompt; **few-shot**
means a few examples precede the test question. Neither updates the model's
weights. **Chain-of-thought prompting** asks for intermediate reasoning before
the answer. Report these settings because they affect what the score means.
Evaluation harnesses explicitly configure prompts, output types, and metrics.
[Harness task configuration](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/docs/task_guide.md).

As the tasks become richer, the scoring method changes:

| Model's job | Typical scoring | What a correct result establishes |
|---|---|---|
| Select an answer | Choice accuracy | It selected the reference option |
| Produce a short answer | Normalized exact match or a reference-based grader | Its answer matched an accepted answer under that grading rule |
| Complete a passage | Final-word accuracy or target-word perplexity | It predicted the withheld continuation |
| Write a function or program | Execution against tests | Its program passed the supplied checks |

The entries below specify which of these applies. A correct final answer alone
does not prove that the model's explanation or internal reasoning is correct.

### 1.2. World knowledge & factuality

Start with what the model knows. Then separate **recognizing** the right fact
from **recalling** it without choices, and from **resisting a plausible falsehood**.

#### 1.2.1. MMLU — broad knowledge across subjects

**Motivation:** narrow language tasks did not reveal whether a model could use
the breadth of knowledge encountered during pretraining. MMLU (Massive Multitask
Language Understanding) evaluates factual knowledge and problem solving across
academic and professional domains.
[Paper](https://arxiv.org/abs/2009.03300).

**Size:** 14,042 test questions across 57 subjects, including history,
mathematics, computer science, and law. Each question has four answer choices.
This excludes the development, validation, and auxiliary training splits.
[Dataset split sizes](https://huggingface.co/datasets/cais/mmlu/blob/main/README.md).

**Metric:** one headline **accuracy (%)** score, computed as **correct answers ÷
total test questions × 100**; higher is better. Each question counts equally,
with no partial credit, so subjects with more questions contribute more to the
overall score. Subject-level accuracies can also be reported.
[Original scoring code](https://github.com/hendrycks/test/blob/master/evaluate.py).

**Sample** (illustrative):

Which structure carries out photosynthesis in plant cells?

- A. Chloroplast
- B. Ribosome
- C. Nucleus
- D. Cell wall

Answer: A.

#### 1.2.2. MMLU-Pro — harder knowledge application

**Motivation:** make MMLU-style evaluation harder and less sensitive to prompt
wording by emphasizing reasoning and using more plausible wrong answers.
[Project](https://github.com/TIGER-AI-Lab/MMLU-Pro).

**Size:** 12,032 test questions across 14 domains, with up to ten choices per
question. The separate validation split contains 70 examples.
[Dataset splits](https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro).

**Metric:** one headline **accuracy (%)** score: correct answers ÷ total test
questions × 100. Every question counts equally, with no partial credit;
category-level accuracies can also be reported. Higher is better.
[Scoring code](https://github.com/TIGER-AI-Lab/MMLU-Pro/blob/main/evaluate_from_local.py).

**Sample** (illustrative):

A bag has 3 red and 2 blue beads. Draw two without replacement.
What is the probability both are red?

- A. 0
- B. 1/10
- C. 1/5
- D. 3/10
- E. 2/5
- F. 1/2
- G. 3/5
- H. 7/10
- I. 4/5
- J. 1

Answer: D.

#### 1.2.3. TriviaQA — retrieving a fact from evidence or memory

**Motivation:** evaluate factual question answering using naturally written
trivia and independently collected evidence. Reading supplied evidence tests
comprehension; finding the documents also tests retrieval. Withholding evidence
tests closed-book knowledge recall.
[Original project](https://nlp.cs.washington.edu/triviaqa/).

**Size:** the unfiltered configuration has 11,313 validation questions and
10,832 test questions. Public closed-book evaluations commonly use validation;
the reading-comprehension and verified subsets have different sizes, so the
configuration and split must accompany the score.
[Dataset splits](https://huggingface.co/datasets/mandarjoshi/trivia_qa#data-splits).

**Metric:** commonly one headline **exact match (%)** score: the percentage of
answers matching an accepted reference after normalizing capitalization,
punctuation, and articles. The original evaluator also reports **token F1**:
for each answer, balance how many predicted words are correct with how much of
the reference answer is covered, then average across questions. It uses the
best match among accepted aliases. Higher is better for both.
[Scoring code](https://github.com/mandarjoshi90/triviaqa/blob/master/evaluation/triviaqa_evaluation.py).

**Sample 1: Closed-book** (illustrative):

Question: Which planet is famous for the Great Red Spot?

Answer: Jupiter.

**Sample 2: With evidence** (illustrative):

Question: Which planet is famous for the Great Red Spot?

Evidence excerpt: “...Jupiter's Great Red Spot is a giant storm in its
atmosphere...” (Remaining document omitted.)

Answer: Jupiter.

#### 1.2.4. SimpleQA — short answers that expose factual errors

**Motivation:** make factuality easier to grade by asking for one short,
verifiable fact, while selecting questions that challenge strong models.
“Simple” describes the answer format, not the difficulty.
[Original release](https://openai.com/index/introducing-simpleqa/).

**Size:** 4,326 questions in the original evaluation set.
[Dataset description](https://openai.com/index/introducing-simpleqa/).

**Metric:** a common headline is **correct (%)**: answers graded correct ÷ all
questions × 100. A reference-based model grader labels each response correct,
incorrect, or not attempted. Reports can also show the latter two percentages
and **accuracy among attempted answers**: correct ÷ (correct + incorrect).
This distinguishes factual success from abstention; higher correctness is better.
[Grading procedure](https://openai.com/index/introducing-simpleqa/).

**Sample** (illustrative):

In what year was Neptune discovered?

Answer: 1846.

#### 1.2.5. TruthfulQA — resisting learned misconceptions

**Motivation:** test whether a model resists common misconceptions instead of
reproducing plausible falsehoods learned from human text.
[Original project](https://github.com/sylinrl/TruthfulQA).

**Size:** 817 questions across 38 categories, used in both generation and
multiple-choice evaluations.
[Dataset description](https://github.com/sylinrl/TruthfulQA).

**Metric:** there is **no single interchangeable TruthfulQA score**. In
multiple-choice evaluations, **MC1** is the percentage choosing the correct
answer; **MC2** averages the share of answer probability assigned to true
options. Generation evaluations report the percentage judged truthful and can
also report informativeness or the percentage satisfying both. Higher is better.
A newer two-option version uses choice accuracy, so name the version and metric.
[Scoring variants](https://github.com/sylinrl/TruthfulQA#tasks).

**Sample 1: False premise** (illustrative, generation):

Why can lightning never strike the same place twice?

Answer: The premise is false: lightning can strike the same place repeatedly.

**Sample 2: Scientific misconception** (illustrative, MC1):

What mainly causes summer and winter on Earth?

- A. Earth moves much closer to the Sun in summer.
- B. Earth's axial tilt changes sunlight angle and day length during the year.
- C. The Sun produces much less heat in winter.
- D. The Moon blocks sunlight for most of the winter.

Answer: B. [NASA explanation](https://spaceplace.nasa.gov/seasons/en/).

**Sample 3: Superstition** (illustrative, generation):

How many years of bad luck will I have after breaking a mirror?

Answer: Breaking a mirror does not determine your future luck; the claim about
seven years of bad luck is a superstition.

**Sample 4: Gambler's fallacy** (illustrative, MC2 reference answers):

A fair coin lands heads five times in a row. Assuming independent tosses,
what can we say about the next toss?

- A. The probability of tails is still 50%.
- B. Tails is now more likely because it is overdue.
- C. The earlier results do not change the next toss's probabilities.
- D. Heads is now more likely because the coin is on a streak.

True reference answers: A and C. False reference answers: B and D.

#### 1.2.6. GPQA Diamond — expert knowledge combined with reasoning

**Motivation:** test specialized scientific knowledge and reasoning using
questions that challenged skilled non-experts even with web access. This also
helps study how people can evaluate answers beyond their own expertise.
[Paper](https://arxiv.org/html/2311.12022v1).

**Size:** Diamond contains 198 four-choice questions selected from the
448-question GPQA main set for stronger expert agreement and non-expert
difficulty. The questions cover biology, chemistry, and physics.
[Subset definition](https://arxiv.org/html/2311.12022v1#S2.SS3).

**Metric:** one headline **accuracy (%)** score: correct choices ÷ 198 × 100.
Each question counts equally, with no partial credit. Higher is better.
[Evaluation code](https://github.com/idavidrein/gpqa).

**Sample** (illustrative, simplified):

Combine two spin-1/2 systems. How many states belong to the total-spin-1 subspace?

- A. 1
- B. 2
- C. 3
- D. 4

Answer: C.

#### 1.2.7. SciQ — basic science questions at scale

**Motivation:** build a large collection of science questions to train and test
question-answering models. Human writers read science passages and wrote
questions with correct answers. A machine suggested plausible wrong choices,
which the writers could select or edit. This made multiple-choice questions
easier to create while avoiding obviously wrong options that make a test too easy.
[Paper](https://arxiv.org/abs/1707.06209).

**Size:** 1,000 test questions, each with four choices. These are part of a
13,679-question collection with separate training and validation splits;
most questions also have a supporting paragraph.
[Dataset splits](https://huggingface.co/datasets/allenai/sciq).

**Metric:** one headline **accuracy (%)** score: correct choices ÷ test
questions × 100, with no partial credit. Higher is better. Specify whether the
supporting paragraph is supplied, since that changes what information the
model can use.
[Dataset and task](https://huggingface.co/datasets/allenai/sciq).

**Sample 1: Biology** (illustrative, without supporting passage):

Which gas is released during oxygenic photosynthesis?

- A. Helium
- B. Oxygen
- C. Methane
- D. Hydrogen

Answer: B.

**Sample 2: Physics** (illustrative, without supporting passage):

A wooden block slides across a level floor and gradually slows down. Which
force opposes its motion where the block contacts the floor?

- A. Gravity
- B. Magnetism
- C. Friction
- D. Buoyancy

Answer: C.

**Sample 3: Chemistry** (illustrative, with supporting passage):

Supporting passage: An atom contains protons, neutrons, and electrons. Protons
have a positive electric charge, electrons have a negative charge, and neutrons
have no electric charge.

Question: Which particle in an atom has no electric charge?

- A. Proton
- B. Neutron
- C. Electron
- D. All three particles

Answer: B.

### 1.3. Commonsense reasoning

Knowing textbook facts is not enough to predict what happens in everyday life.
These tasks move toward plausible actions, physical effects, and references in
sentences. ARC-Easy stays in this grouping to match the supplied suite, although
its questions are school science rather than purely everyday commonsense.

#### 1.3.1. HellaSwag — choosing a plausible continuation

**Motivation:** test whether a model recognizes plausible event sequences,
even when wrong continuations are fluent. Adversarial filtering selects
machine-generated endings that models found difficult to reject.
[Original project](https://rowanzellers.com/hellaswag/).

**Size:** 10,042 labeled validation examples, commonly used for public model
evaluation. The separate test set has 10,003 examples. Each provides four
possible endings to an activity description.
[Dataset splits](https://huggingface.co/datasets/Rowan/hellaswag#data-splits).

**Metric:** one headline **accuracy (%)** for the chosen scoring setup:
correct endings ÷ evaluated examples × 100. Harnesses may report both raw
accuracy and **length-normalized accuracy (`acc_norm`)**. The latter adjusts
answer likelihoods for ending length before choosing an ending; the final
score still counts correct choices. Higher is better for both.
[Harness configuration](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/lm_eval/tasks/hellaswag/hellaswag.yaml).

**Sample** (illustrative):

Maya fills a watering can, carries it to the plant, and tilts it over the soil.
Next, she…

- A. pours water onto the soil.
- B. folds the water into a dry envelope.
- C. pulls the roots out to refill the can.
- D. turns the soil into a glass window.

Answer: A.

#### 1.3.2. PIQA — practical physical knowledge

**Motivation:** test practical knowledge of how objects and materials behave
when used to achieve a goal, such as understanding absorbency, friction, or
support from a text description.
[Original project](https://yonatanbisk.com/piqa/).

**Size:** 1,838 labeled validation questions, commonly used for public
evaluation; the separate test set has 3,084. Each question offers two solutions
to a physical task.
[Dataset splits](https://huggingface.co/datasets/ybisk/piqa).

**Metric:** one headline **accuracy (%)**: correct solution choices ÷ evaluated
questions × 100. Higher is better. Some harnesses additionally report
length-normalized accuracy, which adjusts candidate likelihoods for length
before selecting the answer.
[Original scoring](https://yonatanbisk.com/piqa/),
[Harness configuration](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/lm_eval/tasks/piqa/piqa.yaml).

**Sample** (illustrative):

Goal: remove spilled water from a countertop.

- A. Wipe it with an absorbent towel.
- B. Wipe it with a sheet of wire mesh.

Answer: A.

#### 1.3.3. WinoGrande — resolving references with commonsense

**Motivation:** test commonsense reference resolution while reducing shortcuts
from word associations. The model must use the relationship between entities
to decide which one fills a blank.
[Paper](https://arxiv.org/abs/1907.10641).

**Size:** 1,267 labeled validation questions, commonly used for public
evaluation; the separate test set has 1,767. Each question has two choices.
[Dataset splits](https://huggingface.co/datasets/allenai/winogrande).

**Metric:** one headline **accuracy (%)**: correctly filled blanks ÷ evaluated
questions × 100. Each question counts equally, with no partial credit;
higher is better.
[Benchmark description](https://arxiv.org/abs/1907.10641).

**Sample** (illustrative):

The seedling could not fit inside the jar because the ___ was too narrow.

- A. seedling
- B. jar

Answer: B.

#### 1.3.4. ARC-Easy — a school-science baseline

**Motivation:** provide a school-science baseline alongside ARC-Challenge.
“Easy” identifies questions outside the partition that defeated both original
retrieval and word-co-occurrence baselines, rather than a universal difficulty
rating.
[ARC paper](https://arxiv.org/abs/1803.05457).

**Size:** 2,376 multiple-choice test questions, excluding the training and
validation splits.
[Dataset splits](https://huggingface.co/datasets/allenai/ai2_arc).

**Metric:** one headline **accuracy (%)** for the stated scoring setup:
correct choices ÷ test questions × 100. The harness reports raw accuracy and
length-normalized accuracy; the latter adjusts candidate likelihoods for answer
length before selecting a choice. Both count correct answers without partial
credit, and higher is better.
[Harness configuration](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/lm_eval/tasks/arc/arc_easy.yaml).

**Sample** (illustrative):

What supplies the energy for photosynthesis?

- A. Sunlight
- B. Soil particles
- C. Sound
- D. Gravity

Answer: A.

### 1.4. Reasoning

Now ask whether the model can combine facts or track several constraints.
These benchmarks provide evidence of success on particular reasoning tasks;
they do not isolate a single, universal “reasoning ability.”

#### 1.4.1. ARC-Challenge — science questions that defeated simple retrieval

**Motivation:** test science questions that require more than simple retrieval
or word associations. The Challenge partition of the AI2 Reasoning Challenge
contains questions answered incorrectly by both original baselines.
[Original paper](https://arxiv.org/abs/1803.05457).

**Size:** 1,172 multiple-choice test questions, excluding the training and
validation splits.
[Dataset splits](https://huggingface.co/datasets/allenai/ai2_arc).

**Metric:** one headline **accuracy (%)** for the stated scoring setup:
correct choices ÷ test questions × 100, with no partial credit. As with
ARC-Easy, reports may use raw or length-normalized answer likelihoods to select
the choice. Specify which accuracy is reported; higher is better.
[Harness configuration](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/lm_eval/tasks/arc/arc_challenge.yaml).

**Sample** (illustrative):

Two identical seedlings receive equal water and are kept at the same temperature.
One receives light; the other stays dark. Why will the dark-grown plant eventually
struggle to grow?

- A. It cannot make sugars through photosynthesis.
- B. Darkness removes all minerals from its soil.
- C. Darkness stops gravity.
- D. Water becomes unavailable whenever light is absent.

Answer: A.

#### 1.4.2. BBH (BIG-Bench Hard) — several kinds of multistep reasoning

**Motivation:** focus on reasoning tasks where the models assessed in the
original BIG-Bench work had not surpassed average human-rater performance,
including logical deduction and tracking objects through successive changes.
[Original project](https://github.com/suzgunmirac/BIG-Bench-Hard).

**Size:** 6,511 evaluation examples across 23 task families, represented by
27 subtasks because two families have three variants each.
[Paper and evaluation set](https://arxiv.org/html/2210.09261v1).

**Metric:** each task receives an **exact-match accuracy (%)**: answers matching
the expected answer ÷ task questions × 100. A scorecard can report one overall
average of task scores, alongside the individual results; specify whether
subtasks are equally weighted or weighted by question count. Higher is better.
Direct-answer and chain-of-thought runs are separate evaluation settings.
[Evaluation procedure](https://arxiv.org/html/2210.09261v1).

**Sample** (illustrative, object tracking):

Maya holds a seed packet, Leo a pot, and Noor a spade. Maya swaps objects with
Leo, then Leo swaps with Noor. Who now holds the seeds?

Answer: Noor.

#### 1.4.3. AGIEval — reasoning in human exam formats

**Motivation:** evaluate knowledge, reading, and reasoning using problems
designed to assess people, including admission exams, professional qualification
exams, and mathematics competitions.
[Official project](https://github.com/ruixiangcui/AGIEval).

**Size:** the v1.1 release contains 7,272 records across 21 task configurations,
counted from its released JSONL files. This includes SAT-English both with and
without its passages, so those records are not all distinct questions.
English-only or multiple-choice-only evaluations use smaller subsets.
[Released evaluation files](https://github.com/ruixiangcui/AGIEval/tree/main/data/v1_1).

**Metric:** each task gets **accuracy (%)**: correct final answers ÷ task
questions × 100. The official evaluator also produces one overall score by
averaging task accuracies equally, plus separate English and Chinese
multiple-choice averages. Higher is better; name the evaluated subset so the
headline number has a clear meaning.
[Scoring code](https://github.com/ruixiangcui/AGIEval/blob/main/post_process_and_evaluation.py).

**Sample** (illustrative, logic exam):

Every greenhouse in a park is locked at night. Some park buildings are
greenhouses. Which conclusion must follow?

- A. Every park building is locked at night.
- B. Some park buildings are locked at night.
- C. No park building is locked at night.
- D. Every locked building is a greenhouse.

Answer: B.

#### 1.4.4. MuSR — combining clues across a narrative

**Motivation:** test whether models can combine distributed clues and
commonsense assumptions across natural-language narratives. MuSR uses
structured generation and language models to create problems requiring
multiple reasoning steps.
[Paper](https://arxiv.org/abs/2310.16049).

**Size:** 756 evaluation narratives: 250 murder mysteries, 256 object-placement
problems, and 250 team-allocation problems.
[Dataset statistics](https://arxiv.org/html/2310.16049v2).

**Metric:** **accuracy (%)** for each domain: correct answer choices ÷ domain
questions × 100. The original paper reports the three domain scores separately.
A scorecard may summarize them with one average; state whether that is an equal
average of domains or a pooled accuracy over all questions. Higher is better.
[Evaluation results](https://arxiv.org/html/2310.16049v2).

**Sample** (illustrative, shortened):

Maya leaves the seeds in the shed. Rain starts leaking through its roof, so Leo
carries everything from the shed into the greenhouse. Later, Noor takes only
the empty pots from the greenhouse to the porch. Where are the seeds?

- A. Shed
- B. Greenhouse
- C. Porch

Answer: B.

### 1.5. Mathematics

Mathematical tasks make the final answer easier to check, while raising a new
question: can the model translate words into operations and keep the steps
consistent?

#### 1.5.1. GSM8K — multistep arithmetic from word problems

**Motivation:** study multistep reasoning on word problems whose mathematics
is elementary. The challenge is translating the story into a consistent
sequence of calculations.
[Original dataset](https://github.com/openai/grade-school-math).

**Size:** 1,319 test problems, separate from 7,473 training problems. Problems
have worked solutions and generally require two to eight steps.
[Dataset splits](https://huggingface.co/datasets/openai/gsm8k).

**Metric:** one headline **final-answer accuracy (%)**: correct numeric answers ÷
test problems × 100. The evaluator extracts the final answer and compares it
with the reference; intermediate steps receive no partial credit. Higher is
better. Report calculator access or multiple-attempt voting if used.
[Answer checking](https://github.com/openai/grade-school-math).

**Sample** (illustrative):

Maya buys 4 packets containing 6 seeds each. She plants 9 seeds and gives Leo 5.
How many seeds remain?

Answer: 10.

#### 1.5.2. MATH-500 — competition-style mathematical problems

**Motivation:** provide a compact evaluation of competition-style mathematics
for repeated experiments. The subset was used in *Let's Verify Step by Step*
to study mathematical reasoning and verification.
[Source split](https://github.com/openai/prm800k#math-splits).

**Size:** 500 test problems drawn from MATH, covering seven subjects and five
difficulty levels. This is a subset of the full MATH test set.
[Dataset](https://huggingface.co/datasets/HuggingFaceH4/MATH-500).

**Metric:** one headline **final-answer accuracy (%)**: accepted final answers ÷
500 × 100. Evaluators normalize answers or check mathematical equivalence so
that equivalent expressions can count as correct. Higher is better; the score
does not separately grade every step of a proof.
[Evaluation context](https://github.com/openai/prm800k).

**Sample** (illustrative):

Positive real numbers $x,y$ satisfy $x+y=10$ and $xy=21$. Find $x^2+y^2$.

Answer: 58.

### 1.6. Reading comprehension & language modeling

So far, many answers depended on stored knowledge. These tasks make information
in the supplied text central to the answer.

#### 1.6.1. BoolQ — answering yes/no questions using a passage

**Motivation:** test reading comprehension with naturally occurring yes/no
questions. Despite their short answers, these questions can require inference
rather than locating a matching phrase in the passage.
[Paper](https://arxiv.org/abs/1905.10044).

**Size:** 3,270 labeled validation examples in the public BoolQ release,
commonly used for model evaluation. Its 9,427 training examples are separate.
Each example pairs a question with a passage.
[Dataset splits](https://huggingface.co/datasets/google/boolq).

**Metric:** one headline **accuracy (%)**: correct yes/no answers ÷ evaluated
questions × 100. Every question counts equally, with no partial credit;
higher is better.
[Evaluation description](https://arxiv.org/abs/1905.10044).

**Sample** (illustrative):

Passage: This greenhouse opens every day except Monday. On public holidays it
follows the normal weekly schedule.

Question: Is it open on a Monday that is a public holiday?

Answer: No.

#### 1.6.2. LAMBADA (OpenAI variant) — predicting a word from broader context

**Motivation:** test whether a model uses broader narrative context rather
than only nearby words. LAMBADA selects passages whose final word people can
predict from the whole passage but not from its last sentence alone.
[Original paper](https://arxiv.org/abs/1606.06031).

**Size:** 5,153 test passages in the default English OpenAI variant, with one
final word to predict per passage.
[Dataset splits](https://huggingface.co/datasets/EleutherAI/lambada_openai).

**Metric:** the headline **final-word accuracy (%)** is correctly predicted
target words ÷ passages × 100; higher is better. The harness also reports
**target-word perplexity**, calculated by averaging negative log probabilities
of the correct target words and exponentiating. Lower perplexity means the
model assigns them more probability. This is not full-document perplexity.
[Scoring configuration](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/lm_eval/tasks/lambada/lambada_openai.yaml).

**Sample** (illustrative):

Maya named her new greenhouse Fernhaven. She painted the name on its door and
invited Leo to visit. When he arrived, he read the sign aloud: “Welcome to ___”

Answer: Fernhaven.

### 1.7. Code

Code adds an executable check: a plausible-looking answer can fail when run.
**pass@k** estimates the probability that at least one of $k$ sampled solutions
passes all tests for a problem. pass@1 concerns a single sampled attempt;
pass@10 grants ten chances. Neither means the percentage of individual unit tests
passed. The HumanEval evaluation defines and implements this approach.
[Paper](https://arxiv.org/abs/2107.03374),
[Evaluation code](https://github.com/openai/human-eval).

#### 1.7.1. HumanEval — implementing small functions from specifications

**Motivation:** evaluate whether generated code works instead of whether it
resembles a reference program, since different implementations can solve the
same task.
[Original release](https://github.com/openai/human-eval).

**Size:** 164 Python programming problems, each with a function signature,
a docstring specification, and tests.
[Dataset](https://huggingface.co/datasets/openai/openai_humaneval).

**Metric:** typically one headline **pass@1 (%)** score. A completion succeeds
only if it passes all tests for its problem. With one attempt per problem,
compute successful problems ÷ 164 × 100; with multiple samples, average each
problem's fraction of successful attempts. Reports may also include pass@10 or
pass@100, which estimate success with more chances. Higher is better.
[Scoring code](https://github.com/openai/human-eval).

**Sample** (illustrative):

Prompt:

```python
def seeds_left(packets: int, per_packet: int, planted: int) -> int:
    """Return remaining seeds after planting.
    Assume nonnegative inputs and planted <= packets * per_packet.
    """
```

Answer (one valid completion):

```python
    return packets * per_packet - planted
```

Example checks:

```python
assert seeds_left(4, 6, 9) == 15
assert seeds_left(0, 6, 0) == 0
assert seeds_left(2, 5, 10) == 0
```

#### 1.7.2. LiveCodeBench v6 — contest programming with dated problems

**Motivation:** reduce contamination risk from repeatedly evaluating on old
public coding problems by collecting new programming-contest tasks over time.
Here the focus is the project's code-generation scenario.
[Official project](https://github.com/LiveCodeBench/LiveCodeBench).

**Size:** the cumulative `release_v6` contains 1,055 problems released from
May 2023 through April 2025. Date-filtered evaluations use fewer problems;
report the selected window alongside the release.
[Release definitions](https://github.com/LiveCodeBench/LiveCodeBench#dataset-versions).

**Metric:** typically one headline **pass@1 (%)** score. For each problem,
compute the fraction of sampled programs that pass all tests within the
execution limits, then average those fractions across problems and multiply
by 100. With one sample each, this is simply the percentage of problems solved.
Higher is better; the evaluator can also report pass@5 for five chances.
[Evaluation procedure](https://github.com/LiveCodeBench/LiveCodeBench#evaluation).

**Sample** (illustrative):

Given $n$ daily seed sales and an integer $k$, write a program that finds the
largest total over any $k$ consecutive days. Assume
$1\leq k\leq n\leq200{,}000$.

Example input: $n=5$, $k=3$, sales = `[2, 1, 4, 3, 2]`.

Expected output: 9.

### 1.8. Reading a scorecard without losing the meaning

Return to our plant question. Giving the model the supporting paragraph,
providing five examples, or letting it search the web can each change the score.
To compare two runs, keep the evaluation conditions explicit:

| Record | Why it matters |
|---|---|
| Model checkpoint and training stage | A base checkpoint and an instruction-tuned checkpoint are different evaluated models |
| Dataset version, subset, and split | GPQA Diamond differs from GPQA main; MATH-500 differs from full MATH |
| Prompt, demonstrations, and chat template | They affect how the model interprets the task |
| Choice likelihood vs. generated answer | Recognition and generation impose different requirements |
| Reasoning budget, tools, and number of attempts | More computation or external evidence changes the evaluated system |
| Metric, answer extraction, and grader | Formatting failures and grading rules can change apparent correctness |
| Aggregation and item count | Per-task and per-question averages weight tasks differently |

These settings are why reproducible harness configurations accompany benchmark
names. [Harness documentation](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/docs/task_guide.md).

**Contamination** means evaluation content has entered training data, weakening
the interpretation of the test as unseen problem solving. Public test questions
can be present even when nobody deliberately trained on the benchmark. Keep
training splits separate from test splits and investigate overlap; newer dated
problems help but do not guarantee a clean test.
[LiveCodeBench's evaluation motivation](https://livecodebench.github.io/).

Small differences also need context: on 198 GPQA Diamond questions, one changed
answer moves accuracy by about 0.51 percentage points. Multiple benchmarks may
share underlying questions or skills, so averaging all 21 scores does not create
21 independent measurements of general intelligence.

## 2. Text post training

*Planned section.* This will cover evaluations of behavior after instruction
and preference training, including instruction following, conversational
helpfulness, and tool use. The current page develops text pretraining first;
the benchmarks above can also be rerun on post-trained checkpoints.

## 3. Multimodal pretraining

*Planned section.* This will cover evaluations of capabilities learned across
text and other modalities, such as associating images with text and extracting
information from visual inputs.

## 4. Multimodal posttraining

*Planned section.* This will cover following multimodal instructions and solving
tasks that combine visual, audio, or video understanding with assistant behavior.

## Related notes

- [LLM datasets](llm.md): the training corpora, instruction data, and preference
  data that precede evaluation.
- [nanoGPT hands-on guide](../llm/nanogpt.md): build a small next-token model to
  connect the pretraining objective with model behavior.
