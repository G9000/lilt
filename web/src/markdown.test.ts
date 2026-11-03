import { test } from "node:test";
import assert from "node:assert/strict";
import { introductionSteps } from "./markdown.ts";

test("simple labelled paragraphs keep the numbered introduction layout", () => {
  assert.deepEqual(introductionSteps("A short introduction.\n\n**Choose a subject.** Start with an idea.\n\n**Try it:** Make something small."), {
    lede: "A short introduction.", tips: [{ label: "Choose a subject.", body: "Start with an idea." }, { label: "Try it:", body: "Make something small." }],
  });
});

test("rich Markdown introductions stay intact instead of splitting blocks", () => {
  for (const src of [
    "An introduction.\n\n- First item\n\n  A second paragraph in that item.",
    "```text\nfirst line\n\nlast line\n```",
    "An introduction.\n\n**Example.**\n\n| A | B |\n| --- | --- |\n| 1 | 2 |",
    "An introduction.\n\n**Try it.**\n```text\nexample\n```",
    "An introduction.\n\n[ref]: https://example.com\n\nRead [ref].",
    "## Heading\n\n**Try it.** A step.",
    "    literal code\n\n**Step.** Body.",
    "\tliteral code\n\n**Step.** Body.",
  ]) assert.equal(introductionSteps(src), null, src);
});

test("ordinary paragraphs and CRLF are preserved", () => {
  assert.equal(introductionSteps("First paragraph.\n\nSecond paragraph."), null);
  assert.equal(introductionSteps("Just one paragraph."), null);
  assert.equal(introductionSteps("Intro.\r\n\r\n**Step.** Body.")?.tips[0].body, "Body.");
});
