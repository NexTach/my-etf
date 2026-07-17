# NXDI Claude Guidelines

Follow the repository-wide instructions in `AGENTS.md`.

## Testing Policy

- Create unit tests only for core business logic and service or application logic.
- Write all new unit tests in BDD style using clear `Given`, `When`, and `Then` wording.
- Use nested `describe` blocks for the scenario and action, and use `it` for the expected behavior.
- Keep tests deterministic, isolated, and focused on externally observable business outcomes.
- Do not create tests for UI rendering, components, Markdown or content files, static text, CSS, metadata, configuration wiring, framework behavior, or simple data containers.
- Do not use snapshot tests or assert private implementation details.
- Validate changes outside this test scope with linting, type checking, builds, or focused manual verification.
- Do not extend existing out-of-scope tests unless the task explicitly asks for a test migration or cleanup.
