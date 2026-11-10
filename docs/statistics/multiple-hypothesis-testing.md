---
title: Multiple hypothesis testing
description: From Welch’s p-value for one comparison to false discovery rates and Benjamini–Hochberg correction.
tags:
  - statistics
  - evaluation
---

# Multiple hypothesis testing

Suppose we compare model B with model A on five benchmarks. Each observed score
difference could reflect a real improvement, random variation, or both.
We first need a way to assess one difference, then a way to interpret the five
comparisons together.

## ⏳ 1. Start with one comparison

### ✅ 1.1. Comparing two training recipes

Start with just one benchmark. A and B are two **training recipes**: each
specifies how to build and train a model. Train each recipe three times with
independently chosen random seeds. Each **run** starts training from scratch;
random initialization and data order can make its final score vary. Evaluate
all six trained models on the same fixed benchmark.

Suppose we get these illustrative scores:

| Training recipe | Run 1 | Run 2 | Run 3 | Average |
| --- | --- | --- | --- | --- |
| A | 70 | 72 | 71 | 71 |
| B | 72 | 74 | 73 | 73 |

B's observed average is 2 points higher. But we have only three runs of each
recipe. Does B perform better on average, or did these particular B runs happen
to be luckier?

Imagine we could repeat training indefinitely. The average over all those
runs is the recipe's **underlying mean performance** on this benchmark. We
cannot observe that mean directly; our three-run average is an estimate.

To assess the evidence, temporarily assume A and B have the same underlying
mean. We then ask how surprising our observed difference would be under that
assumption, taking the variation between runs into account.

This assumption is the **null hypothesis**, written $H_0$. Here, “null” means
no difference: the two underlying means differ by zero. It is the reference
assumption we test, not a claim we have already established as true. The
**alternative hypothesis**, $H_1$, is that the underlying means differ. Here we use a
**two-sided test**: a difference in either direction counts as evidence against
the null. A one-sided test instead asks about a specified direction; choose that
direction before looking at the results.

### ✅ 1.2. What a p-value tells you

In section 1.1, A averages 71 and B averages 73. To judge that 2-point gap,
we need to look at how much scores vary between runs. Compare two possible
sets of results, each with three independent runs per recipe:

| Situation | A's scores | B's scores | Difference in averages |
| --- | --- | --- | --- |
| Scores cluster closely, as in 1.1 | 70, 72, 71 | 72, 74, 73 | 2 points |
| Scores vary widely | 61, 71, 81 | 63, 73, 83 | 2 points |

In the first situation, a 2-point gap stands out more against the variation
between runs. In the second, individual scores fluctuate by much more than
2 points, so the gap is easier to explain as random variation. **With the
same number of runs, more spread makes the same mean difference weaker
evidence of a real difference.** More independent runs can help estimate
the averages more precisely.

The **p-value** puts a number on this evidence. Temporarily assume the recipes
have equal underlying means, as our null hypothesis says. Then ask: if we
repeated the experiment under that assumption, how often would we get a
difference at least this surprising, in either direction? The test judges
“surprising” relative to the uncertainty in the averages, taking both the
spread and the number of runs into account. The next section explains how
Welch's test does this.

Suppose A and B really have the same average performance. Imagine repeating
our experiment many times: train each recipe three times, then compare their
averages. A hypothetical $p=0.03$ means that, under the test's assumptions,
about 3% of those experiments would produce a gap at least as large relative
to its standard error as ours, in either direction. Because that is uncommon,
our result gives us reason to doubt that the recipes have equal average
performance. The 3% describes how often we would see results like these
**assuming equal performance**; it is not the probability that the recipes
are equally good.

This answers how strong the evidence is, not how useful the improvement is.
A genuine 2-point improvement might be valuable in either situation; the
widely varying scores simply make us less certain that we have established it.
[ASA guidance on p-values](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf)

Before testing, choose a cutoff called the **significance level**, often
$\alpha=0.05$. If $p\leq0.05$, we reject the equal-means assumption and call
the result **statistically significant**. If the p-value is larger, we have
not established a difference; we have not proved equality either.

This decision can be wrong in two ways. A **Type I error** (false positive)
declares a difference when the underlying means are equal. A valid test at
level 0.05 makes this error at most 5% of the time when the null is true,
over repeated experiments. A **Type II error** misses a difference that
really exists. **Statistical power** is the technical term for how likely our
test is to detect a specified difference that really exists. For example,
80% power to detect a 2-point improvement means that, if B truly averages
2 points higher than A, about 80% of repeated experiments would produce a
statistically significant result.

### ✅ 1.3. What “Welch p” means

In a results table, **Welch p** usually means the p-value from **Welch’s
two-sample t-test**. It compares the means of two independent groups while
allowing different variances and sample sizes. Variance describes how spread
out the observations are; B's run scores can be more variable than A's.

The test compares the observed mean difference with its estimated uncertainty:

$$
t=\frac{\bar{x}_B-\bar{x}_A}{\sqrt{s_B^2/n_B+s_A^2/n_A}}.
$$

Here $\bar{x}$ is a sample mean, $s$ a sample standard deviation, and $n$ the
number of independent observations. In our example, each group has $n=3$ and
the numerator is $73-71=2$ points. The denominator is the **standard error**
of the difference: it estimates how much the difference between sample averages
would fluctuate if we repeated the experiment. A larger difference relative
to that uncertainty gives a larger absolute $t$. Software converts this statistic into a p-value using a
t-distribution with Welch's approximate degrees of freedom, which account for
the sample sizes and variances. The same $t$ need not give the same p-value at
every sample size.
[NIST explanation and formulas](https://www.itl.nist.gov/div898/handbook/eda/section3/eda353.htm)

Welch's test produces one raw p-value for this comparison. It does not correct
for the other benchmarks you also tested.

## ✅ 2. Why five comparisons change the problem

Now repeat the comparison on all five benchmarks. Each test offers another
opportunity for a false positive. If all five null hypotheses are true and
the tests are independent, each with an exact 5% false-positive rate, then:

$$
P(\text{at least one false positive})=1-(1-0.05)^5\approx22.6\%.
$$

For 20 such tests, this becomes about 64.2%. These calculations assume
independence; correlated benchmarks need not follow this formula. Nevertheless,
checking every raw p-value against 0.05 does not generally give a 5% error
guarantee for the whole collection.

These five comparisons form a **family of tests**: the group of tests we
consider together when accounting for false positives. You should choose which
comparisons belong in this group before looking at their results. For our example, we choose
the five benchmarks in advance and keep all five comparisons in the group,
including those with large p-values. Reporting only the favorable results
would hide how many chances we had to find a small p-value by luck.

## ✅ 3. Decide which error rate to control

There are two common goals for a family of tests:

| Goal | Error rate | Common methods |
| --- | --- | --- |
| Limit the chance of making even one false discovery | Family-wise error rate (FWER) | Bonferroni, Holm |
| Limit the expected fraction of false discoveries among all discoveries | False discovery rate (FDR) | Benjamini–Hochberg |

A **discovery** is a rejected null hypothesis. For our two-sided comparisons,
it is evidence of a difference; inspect the sign to see whether B improved.

Bonferroni tests each of our five p-values against $0.05/5=0.01$. Holm also
controls FWER, but uses an ordered procedure that can reject more hypotheses.
Both work without assuming independence, provided the individual p-values are
valid. FDR control permits a different tradeoff, often detecting more effects
when exploring many hypotheses.
[R documentation on multiple-comparison methods](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/p.adjust.html)

To define FDR, let $R$ be the number of discoveries and $V$ the number that are
actually false. The false-discovery proportion is $V/R$, taken as zero when
$R=0$. FDR is its expectation over repeated experiments:

$$
\mathrm{FDR}=\mathbb{E}\!\left[\frac{V}{\max(R,1)}\right].
$$

Controlling FDR at 5% does not guarantee that at most 5% of this particular
result list is false, nor assign a 5% error probability to each discovery.
It is a property of the procedure across repeated experiments.
[Benjamini and Hochberg, 1995](https://www.math.tau.ac.il/~ybenja/MyPapers/benjamini_hochberg1995.pdf)

## ⏳ 4. Apply Benjamini–Hochberg to the five benchmarks

### ✅ 4.1. How the procedure works

**Benjamini–Hochberg (BH)** takes the family's raw p-values and selects
discoveries at a target FDR, written $q$. It can adjust Welch p-values, but
also p-values from other valid tests.

For $m$ tests, sort the p-values from smallest to largest. At rank $i$, compare
$p_{(i)}$ with $iq/m$. Find the **largest rank** that passes, and reject every
null up to that rank. If no rank passes, reject none.
[Original BH procedure](https://www.math.tau.ac.il/~ybenja/MyPapers/benjamini_hochberg1995.pdf)

### ✅ 4.2. Work through the five benchmarks

Here are illustrative p-values for our five benchmarks, already sorted,
with $q=0.05$:

| Rank $i$ | Benchmark | Raw Welch p | BH threshold $i\times0.05/5$ | Passes this row's threshold? | Final BH decision |
| --- | --- | --- | --- | --- | --- |
| 1 | A | 0.001 | 0.010 | Yes | Reject null |
| 2 | B | 0.021 | 0.020 | No | Reject null |
| 3 | C | 0.024 | 0.030 | Yes | Reject null |
| 4 | D | 0.060 | 0.040 | No | Do not reject |
| 5 | E | 0.200 | 0.050 | No | Do not reject |

The largest passing rank is 3, so BH selects A, B, and C. This means the
comparisons on benchmarks A, B, and C are **statistically significant after
BH correction at a target FDR of 5%**: we reject their equal-means null
hypotheses. Notice that B is
included even though its own row fails: **BH is not five independent threshold
checks, and you must not stop at the first failure.** Bonferroni at 5% would
select only A in this example.

### ✅ 4.3. What an adjusted p-value means

Software often returns a **BH-adjusted p-value** for each test instead of
showing the rank thresholds. Compare these adjusted values directly with
your target $q$:

| Benchmark | Raw p | BH-adjusted p | Selected at $q=0.05$? |
| --- | --- | --- | --- |
| A | 0.001 | 0.005 | Yes |
| B | 0.021 | 0.040 | Yes |
| C | 0.024 | 0.040 | Yes |
| D | 0.060 | 0.075 | No |
| E | 0.200 | 0.200 | No |

For sorted p-values, multiply each by $m/i$, then take the running minimum
from the largest rank back toward the smallest, capped at 1. That backward
step explains why B and C both become 0.040. Return the results to their
original order afterward.

The adjusted value is the smallest BH target level at which that hypothesis
would be selected within this family. It is not the probability that its null
is true. Reports sometimes call these values “q-values,” but that term can
also refer to other FDR methods; name the adjustment explicitly.
[SciPy's BH implementation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.false_discovery_control.html)

## ⏳ 5. Check the study design before interpreting the result

### ⏳ 5.1. Independent runs and paired questions are different

Our Welch example treats independently trained runs as the observations.
Its uncertainty concerns variation between runs on the chosen benchmark.
It does not automatically capture uncertainty from sampling different test
questions.

If both models answer the **same questions**, their outcomes are paired:
easy questions tend to be easy for both. Use an analysis that preserves that
pairing, such as a paired test on suitable per-question differences, rather
than assuming two independent groups. Likewise, matched experimental runs
need an analysis that respects the matching.

Welch allows unequal variances; it does not fix dependence, extreme outliers,
or poorly estimated uncertainty from very small samples. Its usual calibration
relies on approximately normal populations or sufficiently well-behaved large
samples. Choose the observation unit and test before applying BH.
[NIST discussion of paired and unpaired samples](https://www.itl.nist.gov/div898/handbook/eda/section3/eda353.htm)

### ⏳ 5.2. Dependence between tests also matters

There are two separate questions: are observations within a test independent,
and are p-values across tests dependent? Fixing the first does not settle the
second. Benchmarks can share questions or capabilities.

BH controls FDR under independence and certain forms of positive dependence,
formally called positive regression dependence. Correlation alone does not
establish this condition. **Benjamini–Yekutieli (BY)** offers FDR control under
arbitrary dependence, with more conservative thresholds. Neither procedure
repairs invalid input p-values.
[SciPy's assumptions for BH and BY](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.false_discovery_control.html)

### ⏳ 5.3. Report the improvement, not just significance

Report the **effect size**, such as B's mean score minus A's, with an uncertainty
interval, the sample sizes, raw p-values, adjusted p-values, and the correction
method. A tiny improvement can become significant with enough observations;
a useful improvement can remain uncertain with little data. Ordinary per-test
95% confidence intervals are not automatically simultaneous 95% intervals
for the whole family.

Repeatedly checking results and stopping when a p-value is small, selecting
only favorable metrics, or tuning on the evaluation set changes the analysis.
Correcting the final visible table does not account for all those hidden
opportunities. Plan the comparisons and report the full family.
[ASA guidance on interpretation and selective reporting](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf)
