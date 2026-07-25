---
name: client-state
description: Place client-side state in the right tier — server data lives only in the server cache (React Query / RSC), client-owned shared state in one global store, ephemeral state in the component. Never mirror server data into a client store.
when_to_use: When deciding where new client state lives, adding a query/mutation or a global store, implementing an optimistic update, or debugging stale, flickering, or clobbered UI state that involves server data.
---

# Client State Tiers

Three tiers, by **ownership of the data**:

1. **Server state → the server cache.** In an SPA that means React Query (`useQuery`); in App Router it means RSC props + revalidation, with React Query only for client-interactive reads. The cache is the *single* client-side copy of anything persisted in the database. Components read it directly.
2. **Global client state → one store** (Zustand or equivalent): state that is client-owned but shared across components — filters, UI modes, cross-component drafts. Persist deliberately, per store.
3. **Local UI state → `useState`** in the component: open/closed, hover, focus. Don't lift it into a store.

Rule of thumb: if it's in the database, it's in the server cache; if it's client-only and shared, it's in the store; otherwise it's `useState`.

## The anti-pattern: server-mirror stores

Never sync server data into a client store (a `useEffect` copying query data into Zustand). That creates **three copies of state** — server, cache, store — reconciled by hand, and two recurring bug families:

- the sync effect clobbers an optimistic update during the mutation's async gap;
- the cache and the store drift, so different components disagree about the same row.

If a store holds rows that came from the server, that's the disease. Migrate reads back to the query (use the query's `select` option for derived/filtered shapes the store used to compute) and delete the mirroring machinery. The guards a mirror needs to almost-work (serialized-data comparisons, prev-data refs, temp-row replacement) exist only to serve the mirror — they go with it.

## Optimistic updates live in the cache

The recipe, in order (plain React Query terms; with tRPC, `utils.<proc>.cancel/getData/setData/invalidate` are the same operations scoped to a procedure):

1. `onMutate`: `await queryClient.cancelQueries({ queryKey })` → snapshot `const previousData = queryClient.getQueryData(queryKey)` → `queryClient.setQueryData(queryKey, updater)` with the optimistic row (creates get a `temp-${Date.now()}` id) → `return { previousData }`.
2. `onError`: restore with `queryClient.setQueryData(queryKey, context.previousData)`.
3. `onSettled` (or `onSuccess`): `queryClient.invalidateQueries({ queryKey })` — the server row (real id) replaces the optimistic one and every other consumer of the same cache entry refreshes.

Rules that make it correct:

- The cache updater must use the **exact same query key/input** as the reading component, or `setQueryData` silently writes to a different cache entry.
- Query inputs must be **stable, normalized values** (memoized; dates zeroed to a canonical time) or cache reads/writes miss.
- **`temp-` ids never reach the server** — strip them before mutating (`id: id?.startsWith('temp-') ? undefined : id`) so the backend creates instead of updating.
- Set `staleTime` deliberately on queries shared across components, so consumers don't refetch redundantly.
