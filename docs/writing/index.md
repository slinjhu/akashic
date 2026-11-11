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

> [!GOOD]
> [OAuth2 Proxy](https://oauth2-proxy.github.io/oauth2-proxy/) is a reusable
> authentication proxy for Kubernetes.

The sentence explicitly introduces the project: its name is the subject, and
the rest of the sentence tells readers what it is. The link points to the
project's official documentation. Readers can understand its role without
opening the link.

> [!BAD]
> Use [OAuth2 Proxy](https://oauth2-proxy.github.io/oauth2-proxy/) as the reusable
> component.

This sentence asks readers to use the project before explaining what it is.
“The reusable component” describes its place in the proposed solution, but does
not tell readers what kind of component it is. The hyperlink gives them somewhere
to look, but does not replace an explicit introduction.

Once readers know what OAuth2 Proxy is, later sentences can refer to it by name
and explain how to use it in the example.

## 2. Explain what makes a claim true

When explaining why something works, name the concrete actions that make it
work. Avoid compressing the explanation into a phrase that assumes the reader
already understands the mechanism. If a term has several meanings, specify
which meaning you intend.

> [!BAD]
> An identity header is trustworthy only because of the request path.

This sentence leaves two questions unanswered: why does the route make the
header trustworthy, and does “request path” mean the URL or the servers the
request passes through?

> [!GOOD]
> A caller can send `X-Forwarded-User: admin`, so the header alone does not
> prove identity. The authentication proxy verifies the login, overwrites
> caller-supplied identity headers, and forwards the verified identity. The
> application accepts requests only through that proxy chain, so callers
> cannot bypass the check and supply a forged identity directly.

The example starts with the problem, then explains each protection and why it
is needed. Readers can see who sets the header and what prevents a caller from
impersonating someone else. If the route needs a name, call it the “route through
servers” to distinguish it from a URL path such as `/notes`.

You should introduce the mechanism before summarizing it with an abstract term
such as “trusted boundary.” For the full example, see
[passing identity through a trusted boundary](../security/oauth-and-oidc.md#34-pass-identity-through-a-trusted-boundary).
