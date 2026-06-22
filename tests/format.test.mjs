import test from "node:test";
import assert from "node:assert/strict";

import { escapeCsvField, formatNumber, formatPercent, formatSignedPercent } from "../src/format.js";

test("formats percentages with two decimals and clear fallback", () => {
  assert.equal(formatPercent(0.12345), "12.35%");
  assert.equal(formatPercent(-0.008), "-0.80%");
  assert.equal(formatPercent(Number.NaN), "—");
});

test("formats signed percentages with explicit plus sign for positive values", () => {
  assert.equal(formatSignedPercent(0.015), "+1.50%");
  assert.equal(formatSignedPercent(-0.015), "-1.50%");
  assert.equal(formatSignedPercent(undefined), "—");
});

test("formats numbers with consistent decimal places", () => {
  assert.equal(formatNumber(1234.567, 2), "1,234.57");
  assert.equal(formatNumber(null, 2), "—");
});

test("escapes CSV fields with commas, quotes, and line breaks", () => {
  assert.equal(escapeCsvField("TAIEX"), "TAIEX");
  assert.equal(escapeCsvField("Federal Reserve, sample"), "\"Federal Reserve, sample\"");
  assert.equal(escapeCsvField("quote \"inside\""), "\"quote \"\"inside\"\"\"");
  assert.equal(escapeCsvField("two\nlines"), "\"two\nlines\"");
});
