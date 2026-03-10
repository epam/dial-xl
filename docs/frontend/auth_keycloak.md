# Authentication with Keycloak

This document describes how authentication is currently implemented in the application using **Keycloak** and **react-oidc-context**.

---

## Overview

The application uses **OpenID Connect (OIDC)** with Keycloak as the identity provider.

Key points:

- `react-oidc-context` is used as the OIDC client
- Tokens are stored in `localStorage`
- Automatic token renewal is enabled
- `offline_access` scope is used to avoid issues with expiring online sessions
- Logout behavior differs between Keycloak and Auth0

---

## OIDC Client Configuration

The OIDC client is configured in `main.tsx` using `AuthProvider`.

Key settings:

- **authority** – Keycloak base URL
- **client_id** – application client ID
- **redirect_uri** – current location without OIDC params
- **automaticSilentRenew** – enabled
- **monitorSession** – disabled for Firefox and Safari due to infinite loop issues
- **userStore** – `localStorage`
- **scope** – includes `offline_access`

## Why `offline_access` Is Used

### Problem with Online Sessions

When `offline_access` is **not used**, token renewal depends on the **online client session** in Keycloak.

In this mode:

- Access tokens are bound to the online **client / user session**
- Token renewal does **not** extend the session lifetime
- Near session expiration, Keycloak may issue access tokens valid only for the
  **remaining lifetime of the session**. 

As a result:
- each refresh produces a new access token with a new `iat` value, while `exp` remains the same. 
- The frontend observes frequent token changes.
- React hooks and callbacks are re-triggered due to token updates.

This behavior is expected and is directly related to
`Client Session Max` / `SSO Session Max` settings in Keycloak.

---

### Offline Sessions Behavior

When `offline_access` is enabled:

- Keycloak issues an **offline refresh token**
- Token renewal is no longer tied to the online client session
- `Client Session Max` does **not** affect token renewal
- Access tokens are issued with a stable and predictable lifetime
  (e.g. 24 hours, based on token lifespan settings)
- No “last-seconds” access tokens are produced

---

## Logout Flow

User logout is initiated from the **UserMenu.tsx** and is implemented explicitly to
properly terminate both the local application state and the identity provider session.

The logout flow differs depending on the authentication provider.

---

### Keycloak Logout

When Keycloak is used as the identity provider, the logout flow relies on
OIDC-compliant logout endpoints.

The following actions are executed:
- Refresh and access tokens are revoked 
- User data is removed from localStorage 
- The Keycloak server-side session is terminated 
- The user is redirected back to the application after logout
- Use of id_token_hint in the **signoutRedirect()** is required to perform the process correctly.

### Auth0 Logout
Auth0 requires a custom logout implementation.

In this case:
- All OIDC-related entries (oidc.*) are manually removed from localStorage 
- The browser is redirected to the Auth0 logout endpoint (/v2/logout)
- A returnTo parameter is used to redirect the user back to the application

This custom flow is required because auth.removeUser() does not reliably
clean up Auth0 tokens in local storage.

