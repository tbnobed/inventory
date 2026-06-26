---
name: customFetch credentials
description: Why credentials:"include" is required in the shared API client fetch wrapper
---

## Rule
`lib/api-client-react/src/custom-fetch.ts` must include `credentials: "include"` in the `fetch()` call:
```ts
const response = await fetch(input, { credentials: "include", ...init, method, headers });
```

**Why:** Without it, browsers do not send session cookies on same-site requests in Playwright test contexts (and some production browser environments). The Replit proxy means the browser may treat requests as cross-origin even when same-domain.

**How to apply:** This is already set. If sessions stop working after a codegen run that regenerates `custom-fetch.ts`, re-add this line.
