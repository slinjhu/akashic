---
title: Writing for clear understanding
description: An evolving collection of good and bad practices for fluent, logical writing that is easy to understand.
tags:
  - writing
---

# Writing for clear understanding

Clear writing gives readers what they need to understand the next sentence.
Introduce an idea before asking readers to use it, and connect each new point to
what they already know.

This article collects good and bad practices over time. Each practice states a
rule, compares concrete examples, and explains why the difference matters.

## 1. Explicitly introduce public entities on first mention

When you first mention a publicly known project, product, organization, or other
named entity, briefly explain what it is. Link its name to an authoritative page
so readers can learn more and recognize it as an established public entity.

**Good**

> [OAuth2 Proxy](https://oauth2-proxy.github.io/oauth2-proxy/) is a reusable
> authentication proxy for Kubernetes.

The sentence explicitly introduces the project: its name is the subject, and
the rest of the sentence tells readers what it is. The link points to the
project's official documentation. Readers can understand its role without
opening the link.

**Bad**

> Use [OAuth2 Proxy](https://oauth2-proxy.github.io/oauth2-proxy/) as the reusable
> component.

This sentence asks readers to use the project before explaining what it is.
“The reusable component” describes its place in the proposed solution, but does
not tell readers what kind of component it is. The hyperlink gives them somewhere
to look, but does not replace an explicit introduction.

Once readers know what OAuth2 Proxy is, later sentences can refer to it by name
and explain how to use it in the example.
