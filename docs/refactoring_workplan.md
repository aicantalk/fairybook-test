# Refactoring Plan (2025-02)

## Goals
- Reduce the size and cognitive load of `app.py` by extracting pure helpers and UI submodules.
- Remove unused or redundant helper exports in `gemini_client.py` while keeping test hooks intact.
- Improve testability of the story library viewer by isolating data-fetching logic from Streamlit rendering.
- Preserve existing behavior for story generation, token management, and community board flows.

## Targeted Changes
1. **Story library viewer extraction**
   - Introduce `ui/library.py` with a `load_library_entries()` helper that gathers `StoryRecord` rows, legacy exports, and metadata in a structured form.
   - Add a `render_library_view()` function that consumes the prepared entries and manages Streamlit widgets (`selectbox`, download button, export logging).
   - Update `app.py` to replace the inlined "view" mode block with the new module and to keep session-state handling minimal.

2. **Progress and MOTD helpers**
   - Add a small helper in `ui/create/progress.py` (or similar) to compute the step progress ratio so the main script only decides whether to show the bar.
   - Encapsulate MOTD modal/dialog rendering inside a dedicated helper to keep the top-level flow legible.

3. **Session management cleanup**
   - Simplify `logout_user()` and related state resets by delegating repeated key clearing to small utilities where appropriate.
   - Ensure generation-token cache resets remain intact when switching users or modes.

4. **Gemini client pruning**
   - Remove unused exports such as `_get_genai_module` and `_missing_api_key_error` if they are not referenced outside tests.
   - Confirm tests rely on `genai` monkeypatching and adjust `__all__` accordingly.

5. **Test coverage**
   - Add unit tests for `ui/library.load_library_entries()` covering record + legacy merge, deduplication, and ordering.
   - Adjust existing tests if module paths change.

6. **Documentation & follow-up notes**
   - Summarize the new module responsibilities and reference the refactoring guidelines in `docs/`.
   - Capture any outstanding improvement ideas that surface during implementation.

## Out-of-Scope
- Reworking the community board module (kept isolated per repo guidelines).
- Modifying Gemini prompt templates or JSON asset schemas.
- Introducing new external dependencies.
