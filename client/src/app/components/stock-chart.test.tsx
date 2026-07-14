import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CandleChart } from "./stock-chart";

describe("CandleChart", () => {
  it("renders rising, falling, and unchanged candles with distinct directions", () => {
    const markup = renderToStaticMarkup(createElement(CandleChart, {
      candles: [
        { date: "2026-07-12", open: 100, high: 110, low: 100, close: 110 },
        { date: "2026-07-13", open: 110, high: 110, low: 90, close: 90 },
        { date: "2026-07-14", open: 90, high: 90, low: 90, close: 90 }
      ]
    }));

    assert.match(markup, /class="candle up"/);
    assert.match(markup, /class="candle down"/);
    assert.match(markup, /class="candle flat"/);
  });
});
