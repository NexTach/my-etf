# NXDI Agent Guidelines

## Testing Policy

- Write unit tests only for core business logic and service or application logic.
- Structure new unit tests in BDD style with explicit `Given`, `When`, and `Then` wording.
- Prefer nested `describe` blocks for `Given` and `When`, and use `it` for the expected `Then` behavior.
- Keep unit tests deterministic and isolated from databases, networks, clocks, and other external systems unless those dependencies are replaced with controlled test doubles.
- Do not add unit tests for UI components, rendering, Markdown or other content files, static copy, CSS, page metadata, configuration wiring, simple data containers, or framework behavior.
- Do not add snapshot tests or tests that merely reproduce implementation details.
- When a change is outside the allowed unit-test scope, verify it with the appropriate lint, type-check, build, or focused manual check instead of adding a test.
- Do not expand existing out-of-scope test coverage unless the task explicitly requires a test migration or cleanup.

### BDD Example

```ts
describe("Given an eligible dividend balance", () => {
  describe("When the monthly allocation is calculated", () => {
    it("Then it applies the payout cap", () => {
      // Arrange, act, and assert the business outcome.
    });
  });
});
```

## Verification

- Use the narrowest verification command that covers the changed module.
- Run `npm run verify` in `client` or `server` when the full module requires validation.
- Report test, type-check, lint, and build failures separately and identify whether they are related to the current change.
