# Yarn Patches

This folder contains patches for npm packages that fix issues not yet released upstream.

## react-dom-npm-19.2.3-93a2378518.patch

**Issue:** https://github.com/facebook/react/issues/34840  
**PR:** https://github.com/facebook/react/pull/34848  
**Status:** Pending merge (as of Jan 2026)

### Problem

`ReactPerformanceTrackProperties` tries to read `$$typeof` on every object during development, which can throw an error if the object has a getter that throws (e.g., revoked Proxies or objects with throwing getters).

### Fix

Wraps reading `$$typeof` in a try/catch helper function `readTypeof()` to safely handle objects that throw when accessing properties.

### When to Remove

This patch can be removed once PR #34848 is merged and released in a future React version.
