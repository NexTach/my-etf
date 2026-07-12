import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RiskBadge } from "./risk-badge";

describe("RiskBadge", () => {
  it("hides unassigned risk on public surfaces", () => {
    assert.equal(renderToStaticMarkup(createElement(RiskBadge)), "");
  });

  it("shows unassigned risk when requested for admin surfaces", () => {
    const markup = renderToStaticMarkup(createElement(RiskBadge, { showUnassigned: true }));

    assert.match(markup, /risk-badge unassigned/);
    assert.match(markup, />미지정</);
  });

  it("renders low and high risk with text and distinct classes", () => {
    const lowMarkup = renderToStaticMarkup(createElement(RiskBadge, { level: "LOW" }));
    const highMarkup = renderToStaticMarkup(createElement(RiskBadge, { level: "HIGH" }));

    assert.match(lowMarkup, /risk-badge low/);
    assert.match(lowMarkup, />저위험</);
    assert.match(highMarkup, /risk-badge high/);
    assert.match(highMarkup, />고위험</);
  });
});
