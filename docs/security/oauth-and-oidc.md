---
title: Authentication, sessions, OAuth, and OIDC
description: Start with signing into example.com, then add an identity provider and delegated API access.
tags:
  - security
  - authentication
  - OAuth
  - OIDC
---

# Authentication, sessions, OAuth, and OIDC

Alice opens `https://example.com`, a reading app where she keeps private notes.
How does the site know which notes belong to her?

Start with just this one site. It has a backend and a database. Alice uses a
browser to interact with it.

## ✅ 1. Basic authentication of a single site

### ✅ 1.1. Create an account to identify Alice

The app needs a record representing Alice. When she registers, it creates an
account with an internal user ID:

| User ID | Email | Password hash |
|---|---|---|
| `user-42` | `alice@example.net` | Encoded password hash |

The user ID connects Alice to her notes. Her email helps her find her account,
but typing an email address does not prove she owns it.

For this example, she chooses a password. The backend stores a **password hash**
using a password-hashing library, such as one supporting Argon2id. This is a
one-way checkable representation, rather than a password the app can decrypt.
The library generates a unique salt and records the parameters needed for later
verification. A plain SHA-256 hash is unsuitable for password storage because it
is too fast to compute. See [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

### ✅ 1.2. Verify Alice's password when she signs in

Alice submits her email and password to `https://example.com/login` over HTTPS.
The backend looks up her account and uses the library's password-verification
function to check the submitted password against the stored hash.

On success, the app has **authenticated** Alice: it has verified her claim to
this account using her credential. The backend makes that decision; displaying
a success message in the browser would not establish trust.

![Alice submits her credentials to example.com. The backend verifies the password and creates a session. On later requests, the browser sends a session cookie so the backend can recognize user-42.](../assets/images/authentication-local-session.svg)

This password flow is one way to authenticate. Passkeys are another. For now,
keep the password example so we can focus on what happens after verification.
See [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### ✅ 1.3. Remember the login with a session

Alice next opens `/notes`. We do not want her to submit her password on every
page. The app creates a **session** after successful authentication.

In our design, the server stores a record like this:

| Session ID | User ID | Expires at |
|---|---|---|
| `******` | `user-42` | Server-defined expiry |

The server generates an unguessable session ID when the session starts. Here,
`******` hides its value. The browser reuses that same value on later requests.
It does not change on every request. It stays the same until the session ends
or the server deliberately replaces it.

The session ID is an opaque lookup key. It does not need to contain Alice's user
ID or be a JWT. Generate a fresh session ID when she signs in to prevent session
fixation, where an attacker tries to make a victim use a known session ID.
See [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

The backend sends that identifier to the browser in a cookie:

```http
Set-Cookie: __Host-session=******; Path=/; Secure; HttpOnly; SameSite=Lax
```

- **`Set-Cookie`** is a response header telling the browser to store a cookie.
  Here, its name is `__Host-session` and its value is the session ID.
- **`Secure`** tells the browser to send the cookie only over HTTPS, protecting
  it from exposure over an unencrypted connection to example.com.
- **`HttpOnly`** prevents page JavaScript from reading or modifying this cookie
  through cookie APIs. The browser still attaches it to matching requests,
  including requests initiated by JavaScript.
- **`SameSite=Lax`** limits when the browser sends the cookie with requests from
  another site. “Lax” means relaxed or less strict. Suppose Alice is already
  signed into example.com:
  - She follows a link from another site to example.com: the browser sends
    her session cookie on this top-level GET navigation, so she arrives signed in.
  - Another site submits a POST form to example.com: the browser leaves the
    cookie out. This helps prevent that site from performing actions as Alice,
    a type of attack called cross-site request forgery (CSRF).
  - She navigates within example.com: the browser sends the cookie normally.
  - With `SameSite=Strict`: the browser would also withhold the cookie on the
    initial navigation from another site. `Lax` allows ordinary links to bring
    Alice back to her signed-in session.

See [MDN's Set-Cookie reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

On a later matching request, the browser sends:

```http
GET /notes HTTP/1.1
Host: example.com
Cookie: __Host-session=******
```

The backend looks up the session, checks it is valid and unexpired, and learns
that this request belongs to `user-42`. The cookie carries the identifier; the
session record supplies its meaning.

**Users can modify their own cookies**, for example through browser developer
tools, or send a custom request with a different value. These attributes govern
browser behavior; they do not make client-supplied values trustworthy.

Changing the cookie does not change the server's session record. If Alice sends
an invented ID, the server finds no valid session and treats her as signed out.
She cannot become another user simply by editing her cookie: she would need
that user's valid session ID. This is why IDs must be unguessable and protected
from theft. `HttpOnly` restricts page scripts, rather than the person controlling
the browser. See [OWASP session ID guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#session-id-properties).

**We can now explain a complete login:** verify a credential once, then recognize
later requests through a session.

### ✅ 1.4. Authentication vs Authorization

Recognizing Alice does not mean she may read every note. For a request such as
`GET /notes/note-7`, the backend must also check that the note belongs to
`user-42`, or that she otherwise has permission to read it.

This is **authorization**: deciding whether an identified caller may perform an
operation. Authentication establishes who is calling. Authorization checks what
they may do. Both checks belong on the server; hiding a button does not protect
the underlying operation. See [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

A naming curiosity: HTTP calls status 401 “Unauthorized,” even though it means
the request lacks valid authentication credentials. “Unauthenticated” would
fit our distinction more clearly. An API might return 401 when Alice has no
valid session, and 403 “Forbidden” when she is signed in but tries to read
Bob's private note. A 403 can also indicate refusal for reasons unrelated to
authentication, so it does not always imply a signed-in user. See the HTTP
definitions of [401](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.2)
and [403](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.4).

### ✅ 1.5. End and protect the session

When Alice signs out, the backend invalidates the server-side session and
expires the browser cookie. It also enforces idle and absolute timeouts on the
server. Deleting the cookie alone would leave a copied identifier usable until
the session expires.

A session ID is a credential: someone who steals it may impersonate Alice.
Use HTTPS, protect session storage, and apply CSRF protection to state-changing
requests. Cookie attributes help, but do not replace those checks.
See [OWASP session expiration](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#session-expiration).

**One site is enough for this model.** Accounts, credential verification,
sessions, and permission checks already let Alice use her private notes. OAuth
and OIDC become useful when we introduce another responsibility or service.

## 2. Let another service verify Alice: OIDC

Now suppose we want Alice to use an existing account instead of creating a new
password at example.com. Introduce a fictional service called **FileBox**, which
supports sign-in for other applications.

FileBox becomes our **identity provider**: example.com trusts it to authenticate
Alice. **OpenID Connect (OIDC)** standardizes how FileBox communicates that
result. It is an authentication layer built on OAuth 2.0.

A typical sign-in follows this path:

1. Example.com redirects Alice's browser to FileBox with an OIDC sign-in request.
2. FileBox authenticates Alice, or uses an existing suitable login session.
3. FileBox redirects her browser to `https://example.com/callback` with a code.
4. Our backend exchanges the code directly with FileBox and receives an ID token.
5. The backend validates the token and maps FileBox's user identity to a local account.
6. Example.com creates the same kind of local session we already understand.

The **ID token** is a signed statement about the authenticated user. The app
validates the signature, issuer, audience, expiration, and other applicable
rules. It identifies the external account using the issuer and subject together.
See [OIDC code flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth)
and [ID token validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation).

The change is at the credential-verification step: FileBox verifies Alice, and
example.com verifies FileBox's assertion. Our local session and note permission
checks still have their jobs.

## 3. Give our app access to FileBox documents: OAuth

Signing in and importing files are different needs. Suppose Alice also wants
the app to read documents stored at FileBox. Now FileBox must grant the app
limited API access. This is where **OAuth 2.0 delegated authorization** applies.

Alice could give our app her FileBox password. But then the app would hold a
credential intended for Alice herself, rather than permission tailored to one
task.

Instead, Alice approves a narrower arrangement: let this app read her documents.
FileBox issues an **access token**, a credential the app can present to its API.
A **scope** describes requested access, such as our fictional `documents.read`.

![Alice approves document access at FileBox, which issues an access token to example.com. The backend presents that token to the FileBox API.](../assets/images/oauth-delegated-access.svg)

This is **delegated authorization**: Alice lets another application exercise
limited access. OAuth 2.0 defines a framework for arranging it without the app
receiving her password. See [OAuth roles and access tokens](https://www.rfc-editor.org/rfc/rfc6749#section-1.1).

## 4. Use the token to call the API

Suppose our backend already has a token. With a **bearer token**, it sends an API
request like this:

```http
GET /documents HTTP/1.1
Host: api.filebox.example
Authorization: Bearer ACCESS_TOKEN
```

The API checks the token and whether it permits the requested operation. A
read-only token should not authorize deleting a document.

“Bearer” means possession is enough to use the credential. The backend must
protect it in storage and send it over HTTPS. It should not put it in a URL,
where it might enter logs or browser history. See [bearer token usage](https://www.rfc-editor.org/rfc/rfc6750#section-2.1)
and [token disclosure risks](https://www.rfc-editor.org/rfc/rfc6750#section-5).

**We can now explain an API call.** Next we need to explain how the backend gets
the token in the first place.

## 5. Obtain a token through Alice's browser

Our app first registers with FileBox and receives a **client ID**, here
`reading-app`. It also registers an exact return address, the **redirect URI**:
`https://example.com/callback`.

When Alice clicks **Connect FileBox**, the app sends her browser to FileBox's
authorization endpoint. FileBox authenticates Alice and obtains authorization,
which may include a consent screen.

After approval, FileBox redirects her browser back with a short-lived,
single-use **authorization code**. The backend exchanges that code at FileBox's
token endpoint for an access token. The code itself cannot read documents.
This is the **authorization code flow**. See [OAuth authorization code flow](https://www.rfc-editor.org/rfc/rfc6749#section-4.1).

![Authorization code flow: Alice's browser follows redirects between example.com and FileBox, delivers the code to example.com, and the backend exchanges it directly with FileBox for an access token.](../assets/images/oauth-authorization-code.svg)

Notice the two paths: the browser carries the code; the backend receives the
token directly. The next step adds protections to this exchange.

## 6. Bind the exchange to the request that started it

What if someone intercepts the code? **PKCE (Proof Key for Code Exchange)** binds
the code to a secret created for this particular attempt:

1. The backend generates a random **code verifier** and keeps it privately.
2. It derives a **code challenge** and sends that in the authorization request.
3. During the token exchange, it supplies the original verifier.
4. FileBox checks that the verifier matches the challenge associated with the code.

With the `S256` method, the derivation is:

```text
code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
```

The base64url encoding omits padding. Knowing the challenge or code alone does
not reveal the verifier. See [PKCE challenge generation](https://www.rfc-editor.org/rfc/rfc7636#section-4.2)
and [verifier checks](https://www.rfc-editor.org/rfc/rfc7636#section-4.6).

The app also creates a random **state** value, binds it to Alice's browser
session, and checks the returned value before accepting the callback. This
helps prevent an attacker from substituting an authorization response into her
session.

Here is the authorization request, displayed across lines for readability:

```text
https://login.filebox.example/authorize
  ?response_type=code
  &client_id=reading-app
  &redirect_uri=https%3A%2F%2Fexample.com%2Fcallback
  &scope=documents.read
  &state=RANDOM_STATE
  &code_challenge=DERIVED_CHALLENGE
  &code_challenge_method=S256
```

The backend's token request includes the code, redirect URI, verifier, and the
client authentication required by its registration. A client ID identifies the
app; it is not a secret.

Use authorization code flow with PKCE here. Current security guidance applies
PKCE to web applications too and requires exact redirect URI matching in this
case. Use a maintained library to handle these checks. See [OAuth security best
practice](https://www.rfc-editor.org/rfc/rfc9700#section-2.1).

## 7. Combine sign-in and API access when needed

The code exchange above explains the mechanism used by our OIDC sign-in too.
To request OIDC, include `openid` in the scope. To request both sign-in and
document access, use `scope=openid%20documents.read`. Add a fresh `nonce` bound
to the sign-in attempt, and check it in the ID token.

The token response now includes an ID token alongside the access token. These
credentials have different recipients and purposes:

| Credential | Who receives it? | Purpose in our example |
|---|---|---|
| ID token | example.com backend | Verify the identity asserted by FileBox |
| Access token | FileBox API | Authorize document access |
| Session cookie | example.com backend | Recognize Alice on later visits |

See [OIDC authentication requests](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest).

The app can offer FileBox sign-in without requesting document access. It can
also add FileBox document access to an account that uses a local password.
Neither feature requires us to replace our application session with an API token.

## 8. Extend the model when another need appears

**Find the provider's endpoints and keys.** Starting from its configured,
trusted issuer, the app retrieves FileBox's OIDC discovery document. It supplies
endpoint locations and `jwks_uri`, the public signing key location. Metadata
must match the expected issuer. See [OIDC discovery](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig).

**Import documents after the access token expires.** A provider may issue a
**refresh token** that our backend exchanges for new access tokens. It goes to
the token endpoint, not the document API. See [OAuth refresh tokens](https://www.rfc-editor.org/rfc/rfc6749#section-1.5).

**Sign out after using OIDC.** Ending example.com's session and ending FileBox's
login session are separate operations. Ending either is also distinct from
revoking document access. Provider logout can use [OIDC RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html).
