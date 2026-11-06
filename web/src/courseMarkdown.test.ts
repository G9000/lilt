import { test } from "node:test";
import assert from "node:assert/strict";
import { courseLink, coursePicture } from "./courseMarkdown.ts";

test("course pictures stay inside the selected course while legacy voice pictures retain their URL", () => {
  assert.equal(coursePicture("images/test.png"), "/texts/images/test.png");
  assert.equal(coursePicture("images/test.png", "reading"), "/courses/reading/images/test.png");
  assert.equal(coursePicture("../images/test.png", "reading"), undefined);
  assert.equal(coursePicture("https://example.com/test.png", "reading"), "https://example.com/test.png");
});

test("course links resolve only known chapters and preserve document fragments", () => {
  const link = (href: string) => courseLink(href, "reading", ["basics"]);
  assert.equal(link("#/studio/basics/first"), "#/learn/reading/chapter/basics/first");
  assert.equal(link("./01-basics.md#first"), "#/learn/reading/chapter/basics/first");
  assert.equal(link("missing.md"), undefined);
  assert.equal(link("#/studio/missing"), undefined);
  assert.equal(link("#/deck"), "#/learn/reading/today");
  assert.equal(link("#note"), "#note");
  assert.equal(link("https://example.com"), "https://example.com");
  assert.equal(link("javascript:alert(1)"), undefined);
  assert.equal(courseLink("#/studio/settings"), "#/studio/settings");
});
