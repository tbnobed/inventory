---
name: AuthGate routing pattern
description: How to drive auth-gated routing from React Query without imperative navigation
---

## Rule
- `AuthGate` reads `useGetMe()` and renders `<Switch>` with the appropriate routes when `me` is set, or `LoginPage` when it's not.
- After login: call `queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() })` — the refetch sets `me` and AuthGate automatically switches to dashboard routes.
- After logout: call `queryClient.setQueryData(getGetMeQueryKey(), null)` THEN `queryClient.clear()` — sets `me` to null synchronously so AuthGate re-renders to login immediately, without waiting for a network round-trip.
- Do NOT use imperative `setLocation("/dashboard")` after login — it races against the query refetch and causes the login page to flash back.

**Why:** Wouter's `useLocation` in a child component navigates within the router context, but if `AuthGate` is still rendering `<LoginPage>` (because `me` is still null), the navigation has no effect — the login page is shown regardless of the URL.
