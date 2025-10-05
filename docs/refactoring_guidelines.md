# Refactoring Guidelines

## Refactoring Acceptance Criteria
- Preserve user-visible behavior: no regression in Streamlit flows, exports, token handling, or community board isolation.
- Maintain data compatibility: JSON schema (`storytype.json`, `story.json`, `ending.json`, `illust_styles.json`) and saved HTML exports must load without migration steps.
- Sustain observability: telemetry hooks (`emit_log_event`, activity log) and tracking IDs remain intact unless explicitly replaced.
- Keep authentication integrity: existing login/logout flows, session persistence, and token sync logic must continue to function.
- Safeguard performance budget: refactors should not add redundant API calls, repeated JSON loads, or expensive Streamlit reruns.
- Uphold maintainability: new structure reduces duplication, improves naming, and centralizes constants without introducing complex indirection.
- Respect security/privacy boundaries: never expose API keys or user data, and keep board storage separated from core story generation.

## Refactoring Playbook
1. **Identify friction points**: profile large modules (`app.py`, `gemini_client.py`, `services/`) for long functions, duplicated logic, or tightly coupled UI/state.
2. **Scope minimally**: target one concern per pass (e.g., session management helpers vs. illustration IO) to avoid high-risk batch changes.
3. **Confirm configuration paths**: re-use loaders (`load_story_types`, `ensure_state`) and honor existing constants; prefer dependency injection over ad-hoc globals.
4. **Isolate Streamlit interactions**: move pure logic out of UI callbacks, keep state mutations within helper functions, and avoid cross-module widget keys.
5. **Prefer composition**: extract small helpers or dataclasses to clarify intent while keeping module boundaries aligned with current architecture.
6. **Document intent in-code**: only add concise comments where behavior is non-obvious (e.g., token reconciliation) and trim outdated notes.
7. **Validate continuously**: run targeted tests or lightweight scripts after each refactor chunk; smoke test `streamlit run app.py --server.headless true` when feasible.
8. **Stage cleanup**: remove dead imports, collapse redundant wrappers, and keep formatting PEP 8 compliant before handing off for review.
9. **Record manual checks**: log which UI flows, exports, and token operations were exercised so reviewers understand coverage.
10. **Plan follow-ups**: if deeper re-architecture is discovered, capture it in TODOs or the docs instead of mixing into the current refactor.
