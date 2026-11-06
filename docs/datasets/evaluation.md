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

> Which gas do plants absorb during photosynthesis?
> A. Oxygen · B. Carbon dioxide · C. Helium · D. Hydrogen
>
> Expected answer: **B**.

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
wording. MMLU-Pro curates more than 12,000 questions across 14 domains, emphasizes
reasoning, and expands the answer set from four to up to ten options.
**Measures:** multiple-choice accuracy on more demanding academic problems.
It is a separate benchmark, not an interchangeable replacement score for MMLU.
[Project and data](https://github.com/TIGER-AI-Lab/MMLU-Pro).

> **Illustrative sample:** A bag has 3 red and 2 blue beads. Draw two without
> replacement. What is the probability both are red?
> A. 0 · B. 1/10 · C. 1/5 · D. 3/10 · E. 2/5 · F. 1/2 · G. 3/5 ·
> H. 7/10 · I. 4/5 · J. 1
>
> **Answer: D.** Multiply $3/5$ by $2/4$ to get $3/10$.

The extra choices reduce guessing success; the reasoning requirement matters
more than the number of choices alone.

#### 1.2.3. TriviaQA — retrieving a fact from evidence or memory

**Motivation:** build question answering around naturally written trivia and
independently collected evidence, rather than questions written to match a
particular passage. The original dataset includes question–answer–evidence
triples. **Measures:** answering factual questions; with evidence it tests reading
and retrieval, while a **closed-book** setup supplies only the question and tests
knowledge recall. The original evaluation uses exact match and token-overlap F1,
accounting for accepted answer aliases.
[Original project](https://nlp.cs.washington.edu/triviaqa/),
[Scoring implementation](https://github.com/mandarjoshi90/triviaqa/blob/master/evaluation/triviaqa_evaluation.py).

> **Illustrative closed-book sample:** Which planet is famous for the Great Red Spot?
>
> **Answer: Jupiter.** There are no answer choices to recognize.

Always check whether documents were provided. Evidence-assisted and closed-book
TriviaQA scores answer different questions about the model.

#### 1.2.4. SimpleQA — short answers that expose factual errors

**Motivation:** make factuality easier to grade by asking for one short,
verifiable fact, while selecting questions that challenge strong models.
The original SimpleQA contains 4,326 questions. “Simple” describes answer format,
not difficulty. **Measures:** short-form factual correctness, with responses
classified as correct, incorrect, or not attempted by a reference-based model
grader. Keeping abstentions separate helps distinguish guessing from declining
to answer. It does not measure all the factual claims in a long essay.
[Original release](https://openai.com/index/introducing-simpleqa/).

> **Illustrative sample:** In what year was Neptune discovered?
>
> **Answer: 1846.** A different year is incorrect; “I don't know” is not attempted.

This familiar example is much easier than many actual SimpleQA questions.

#### 1.2.5. TruthfulQA — resisting learned misconceptions

**Motivation:** predicting human text can reproduce human misconceptions.
TruthfulQA deliberately asks questions that tempt a model into a plausible but
false answer. **Measures:** truthfulness on those traps, not just breadth of
knowledge. The original 817-question benchmark has generation and multiple-choice
evaluations. Generation distinguishes truthfulness from informativeness;
an evasive answer can avoid falsehood without being useful.
[Dataset and scoring](https://github.com/sylinrl/TruthfulQA).

> **Illustrative sample:** Why can lightning never strike the same place twice?
>
> **Answer:** The premise is false: lightning can strike the same place repeatedly.
> An explanation of why it “cannot” would repeat the misconception.

For historical results, **MC1** selects the best true answer; **MC2** measures
normalized probability mass assigned to true answers. The maintainers introduced
a two-option version in 2025. Record the variant rather than comparing all
“TruthfulQA” numbers as if they used one metric.
[Variant documentation](https://github.com/sylinrl/TruthfulQA#tasks).

#### 1.2.6. GPQA Diamond — expert knowledge combined with reasoning

**Motivation:** construct questions that remain difficult for skilled non-experts
even with web access, supporting research on evaluating answers beyond an
ordinary evaluator's expertise. GPQA covers biology, chemistry, and physics.
**Diamond** is a 198-question subset selected for stronger expert agreement and
non-expert difficulty. **Measures:** four-choice accuracy on specialized science
questions. “Google-proof” describes the collection experiment, not a guarantee
against solving questions with search.
[Paper and subset definition](https://arxiv.org/html/2311.12022v1).

> **Simplified illustrative physics sample:** Combine two spin-1/2 systems.
> How many states belong to the total-spin-1 subspace?
> A. 1 · B. 2 · C. 3 · D. 4
>
> **Answer: C.** A spin-1 multiplet has $2S+1=3$ states; the remaining state
> belongs to the spin-0 singlet.

This shows the need for domain knowledge, but is substantially easier than a
typical GPQA problem. GPQA accuracy is not a measure of scientific discovery.

#### 1.2.7. SciQ — basic science questions at scale

**Motivation:** collect science multiple-choice questions efficiently, using
text passages and machine-suggested distractors to help human question writers.
**Measures:** science question answering across subjects such as biology,
chemistry, and physics. It contains 13,679 four-choice questions, usually with a
supporting paragraph. Accuracy with that paragraph tests a different capability
from accuracy without it.
[Paper](https://arxiv.org/abs/1707.06209),
[Released dataset](https://huggingface.co/datasets/allenai/sciq).

> **Illustrative sample:** Which gas is released during oxygenic photosynthesis?
> A. Helium · B. Oxygen · C. Methane · D. Hydrogen
>
> **Answer: B.** If a supplied passage states this fact, the task also tests
> finding and using that evidence.

### 1.3. Commonsense reasoning

Knowing textbook facts is not enough to predict what happens in everyday life.
These tasks move toward plausible actions, physical effects, and references in
sentences. ARC-Easy stays in this grouping to match the supplied suite, although
its questions are school science rather than purely everyday commonsense.

#### 1.3.1. HellaSwag — choosing a plausible continuation

**Motivation:** fluent text can still describe an absurd sequence of events.
HellaSwag uses adversarial filtering to select machine-generated wrong endings
that were difficult for models to reject. **Measures:** four-choice accuracy
for completing descriptions of activities and procedures. It tests recognition
of plausible continuations, rather than free-form story generation.
[Original project](https://rowanzellers.com/hellaswag/).

> **Illustrative sample:** Maya fills a watering can, carries it to the plant,
> and tilts it over the soil. Next, she…
> A. pours water onto the soil.
> B. folds the water into a dry envelope.
> C. pulls the roots out to refill the can.
> D. turns the soil into a glass window.
>
> **Answer: A.** The real benchmark's distractors are less obviously wrong.

#### 1.3.2. PIQA — practical physical knowledge

**Motivation:** test whether models understand how objects and materials behave
when used to achieve a goal. **Measures:** accuracy choosing between two
proposed solutions to a physical task. The answer depends on practical
properties such as absorbency, friction, and support, even though the input
is entirely text.
[Original project](https://yonatanbisk.com/piqa/).

> **Illustrative sample:** Goal: remove spilled water from a countertop.
> A. Wipe it with an absorbent towel.
> B. Wipe it with a sheet of wire mesh.
>
> **Answer: A.** Absorbency is the useful property.

PIQA evaluates descriptions of physical action; it does not test a robot
performing the action.

#### 1.3.3. WinoGrande — resolving references with commonsense

**Motivation:** scale up Winograd-style problems while reducing shortcuts from
word associations. WinoGrande uses crowdsourcing and adversarial filtering.
**Measures:** accuracy choosing which of two entities fills a blank, often
requiring commonsense about who did what or why.
[Paper](https://arxiv.org/abs/1907.10641).

> **Illustrative sample:** The seedling could not fit inside the jar because
> the ___ was too narrow.
> A. seedling · B. jar
>
> **Answer: B.** Change “too narrow” to “too tall,” and **A** becomes the
> natural answer. The relationship matters, not just the nearby nouns.

#### 1.3.4. ARC-Easy — a school-science baseline

**Motivation:** provide the easier partition of the AI2 Reasoning Challenge,
so researchers can compare accessible science questions with ones that defeated
simple baseline systems. **Measures:** multiple-choice science accuracy.
“Easy” is defined relative to the original baseline-based partition, not a
universal difficulty rating.
[ARC paper](https://arxiv.org/abs/1803.05457).

> **Illustrative sample:** What supplies the energy for photosynthesis?
> A. Sunlight · B. Soil particles · C. Sound · D. Gravity
>
> **Answer: A.** This can be answered with one familiar science fact.

### 1.4. Reasoning

Now ask whether the model can combine facts or track several constraints.
These benchmarks provide evidence of success on particular reasoning tasks;
they do not isolate a single, universal “reasoning ability.”

#### 1.4.1. ARC-Challenge — science questions that defeated simple retrieval

**Motivation:** identify school-science questions that require more than the
original retrieval and word-co-occurrence baselines could provide. Questions
answered incorrectly by both baselines formed the Challenge partition.
**Measures:** multiple-choice science accuracy, often involving causal inference
or combining knowledge. Easy and Challenge are partitions of the same ARC
collection. Here ARC means **AI2 Reasoning Challenge**.
[Original paper](https://arxiv.org/abs/1803.05457).

> **Illustrative sample:** Two identical seedlings receive equal water and are
> kept at the same temperature. One receives light; the other stays dark.
> Why will the dark-grown plant eventually struggle to grow?
> A. It cannot make sugars through photosynthesis.
> B. Darkness removes all minerals from its soil.
> C. Darkness stops gravity.
> D. Water becomes unavailable whenever light is absent.
>
> **Answer: A.** Connect the changed condition to the process that supplies sugars.

#### 1.4.2. BBH (BIG-Bench Hard) — several kinds of multistep reasoning

**Motivation:** focus on 23 BIG-Bench tasks where the models evaluated in the
original work had not surpassed average human-rater performance. Tasks include
logical deduction, tracking shuffled objects, and other symbolic or linguistic
problems. **Measures:** task-specific answer accuracy or exact match, aggregated
across tasks. The original work compares direct answers with chain-of-thought
prompting, so the prompting setup is part of the result.
[Project and task files](https://github.com/suzgunmirac/BIG-Bench-Hard).

> **Illustrative object-tracking sample:** Maya holds a seed packet, Leo a pot,
> and Noor a spade. Maya swaps objects with Leo, then Leo swaps with Noor.
> Who now holds the seeds?
>
> **Answer: Noor.** The seeds move Maya → Leo → Noor.

“BBH” is a suite, so its average can conceal large differences between tasks.

#### 1.4.3. AGIEval — reasoning in human exam formats

**Motivation:** evaluate models on problems designed to assess people, including
admission exams, professional qualification exams, and mathematics competitions.
**Measures:** exam problem solving across English and Chinese tasks, combining
reading, knowledge, logic, and mathematics. It includes multiple-choice and
free-response tasks; report the language subset, version, and aggregation.
[Official project](https://github.com/ruixiangcui/AGIEval).

> **Illustrative logic-exam sample:** Every greenhouse in a park is locked at
> night. Some park buildings are greenhouses. Which conclusion must follow?
> A. Every park building is locked at night.
> B. Some park buildings are locked at night.
> C. No park building is locked at night.
> D. Every locked building is a greenhouse.
>
> **Answer: B.** The conclusion applies to the buildings known to be greenhouses.

The name does not mean that passing these exams establishes general intelligence.

#### 1.4.4. MuSR — combining clues across a narrative

**Motivation:** move beyond short symbolic puzzles to multistep reasoning in
natural-language stories. MuSR combines structured generation with language
models to create narratives, including murder mysteries, object placements,
and team allocation. **Measures:** selecting the correct answer after combining
distributed clues and commonsense assumptions. “Soft reasoning” includes
inferences that are less explicit than formal logical rules.
[Paper](https://arxiv.org/abs/2310.16049),
[Project and datasets](https://github.com/Zayne-sprague/MuSR).

> **Shortened illustrative sample:** Maya leaves the seeds in the shed. Rain
> starts leaking through its roof, so Leo carries everything from the shed
> into the greenhouse. Later, Noor takes only the empty pots from the greenhouse
> to the porch. Where are the seeds?
> A. Shed · B. Greenhouse · C. Porch
>
> **Answer: B.** They moved with the shed's contents and were not part of Noor's move.

Real narratives are much longer and demand more inference than this example.

### 1.5. Mathematics

Mathematical tasks make the final answer easier to check, while raising a new
question: can the model translate words into operations and keep the steps
consistent?

#### 1.5.1. GSM8K — multistep arithmetic from word problems

**Motivation:** study reasoning failures on problems whose mathematics is
elementary but whose solution requires several steps. GSM8K supplies
human-written grade-school problems and worked solutions, usually requiring
two to eight steps. **Measures:** final numeric answer correctness, commonly
using exact match after extracting and normalizing the answer.
[Original dataset](https://github.com/openai/grade-school-math).

> **Illustrative sample:** Maya buys 4 packets containing 6 seeds each.
> She plants 9 seeds and gives Leo 5. How many seeds remain?
>
> **Answer: 10.** Start with $4\times6=24$, then compute $24-9-5=10$.

A correct final number does not establish that every written step is valid.
Calculator access, multiple attempts, and answer voting change the setup.

#### 1.5.2. MATH-500 — competition-style mathematical problems

**Motivation:** use a smaller evaluation subset of MATH for repeated evaluation
of more demanding mathematical problem solving. MATH-500 is the 500-problem
subset used in *Let's Verify Step by Step*, spanning subjects and difficulty
levels from the MATH benchmark. **Measures:** final-answer correctness, often
with normalization or mathematical-equivalence checks. It is not the full MATH
test set, and its score does not automatically certify a valid proof.
[Dataset card](https://huggingface.co/datasets/HuggingFaceH4/MATH-500),
[Source split](https://github.com/openai/prm800k#math-splits).

> **Illustrative sample:** Positive real numbers $x,y$ satisfy $x+y=10$ and
> $xy=21$. Find $x^2+y^2$.
>
> **Answer: 58.** Use $x^2+y^2=(x+y)^2-2xy=100-42$.

Compared with the GSM8K example, this requires choosing an algebraic identity.
Many actual MATH-500 problems require substantially more work.

### 1.6. Reading comprehension & language modeling

So far, many answers depended on stored knowledge. These tasks make information
in the supplied text central to the answer.

#### 1.6.1. BoolQ — answering yes/no questions using a passage

**Motivation:** naturally occurring yes/no questions can require inference even
though their answers are only one word. **Measures:** binary answer accuracy
given a question and supporting passage. The original work emphasizes questions
collected in an unconstrained setting, rather than questions generated from a
preselected passage.
[Paper](https://arxiv.org/abs/1905.10044).

> **Illustrative passage:** This greenhouse opens every day except Monday.
> On public holidays it follows the normal weekly schedule.
>
> **Question:** Is it open on a Monday that is a public holiday?
>
> **Answer: No.** The holiday does not override the Monday closure.

Two possible answers do not make the task trivial. Also, a majority-label
baseline can exceed 50% if yes and no are not equally common.

#### 1.6.2. LAMBADA (OpenAI variant) — predicting a word from broader context

**Motivation:** ordinary next-word prediction can reward local word patterns.
LAMBADA selects narrative passages whose last word humans can predict from the
whole passage but not from the final sentence alone. **Measures:** use of
broader discourse to predict that final word.
[Original paper](https://arxiv.org/abs/1606.06031).

> **Illustrative sample:** Maya named her new greenhouse Fernhaven. She painted
> the name on its door and invited Leo to visit. When he arrived, he read the
> sign aloud: “Welcome to ___”
>
> **Target: Fernhaven.** The last sentence alone does not supply the name.

The harness distinguishes `lambada_openai` from `lambada_standard`; use the
specified version. Its OpenAI-variant configuration scores the final word using
log likelihood, reporting accuracy and perplexity. A word can contain multiple
tokens. Higher accuracy and lower target-word perplexity are better; neither
is a full-document perplexity score.
[Task configuration](https://github.com/EleutherAI/lm-evaluation-harness/blob/main/lm_eval/tasks/lambada/lambada_openai.yaml).

### 1.7. Code

Code adds an executable check: a plausible-looking answer can fail when run.
**pass@k** estimates the probability that at least one of $k$ sampled solutions
passes all tests for a problem. pass@1 concerns a single sampled attempt;
pass@10 grants ten chances. Neither means the percentage of individual unit tests
passed. The HumanEval evaluation defines and implements this approach.
[Paper](https://arxiv.org/abs/2107.03374),
[Evaluation code](https://github.com/openai/human-eval).

#### 1.7.1. HumanEval — implementing small functions from specifications

**Motivation:** evaluate functional correctness instead of textual similarity
to a reference program, since many different programs can solve the same task.
**Measures:** generating Python function implementations from signatures and
docstrings, checked by unit tests and summarized with pass@k.
[Original release](https://github.com/openai/human-eval).

**Illustrative prompt:**

```python
def seeds_left(packets: int, per_packet: int, planted: int) -> int:
    """Return remaining seeds after planting.
    Assume nonnegative inputs and planted <= packets * per_packet.
    """
```

**One correct completion:**

```python
    return packets * per_packet - planted
```

**Illustrative checks:**

```python
assert seeds_left(4, 6, 9) == 15
assert seeds_left(0, 6, 0) == 0
assert seeds_left(2, 5, 10) == 0
```

Passing a finite test suite is evidence of correctness on those checks, not
a proof for all inputs or a measure of maintaining an entire software project.

#### 1.7.2. LiveCodeBench v6 — contest programming with dated problems

**Motivation:** reduce contamination risk from repeatedly testing on old public
problems by continually collecting new programming-contest tasks. The project
also includes other coding scenarios; here the focus is code generation.
**Measures:** execution-based correctness on algorithmic problems, commonly
reported as pass@1. Constraints make efficiency and edge cases relevant.
[Official project](https://github.com/LiveCodeBench/LiveCodeBench).

The cumulative **`release_v6` contains 1,055 problems from May 2023 through
April 2025**. A reported “v6” score may further filter dates: record both the
release and evaluated time window. Newly collected problems reduce contamination
risk only relative to a model's actual training data and cutoff.
[Release definitions](https://github.com/LiveCodeBench/LiveCodeBench#dataset-versions).

> **Illustrative sample:** Given $n$ daily seed sales and an integer $k$, find
> the largest total over any $k$ consecutive days. Assume
> $1\leq k\leq n\leq200{,}000$.
>
> **Input:** $n=5$, $k=3$, sales = `[2, 1, 4, 3, 2]`.
>
> **Output: 9.** Window totals are 7, 8, and 9.

A suitable solution updates a rolling sum in $O(n)$ time. Recomputing every
window takes $O(nk)$ and may fail large tests despite passing this tiny example.

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
