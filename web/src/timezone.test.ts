// node --test src/timezone.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { zoneCity, zoneGroups, zoneLabel, zoneNow, zoneOffset } from "./timezone.ts";

const at = new Date("2026-11-08T10:54:00Z");

test("a zone is named by its place, with spaces and any region inside it", () => {
  assert.equal(zoneCity("Asia/Kuala_Lumpur"), "Kuala Lumpur");
  assert.equal(zoneCity("America/Argentina/Buenos_Aires"), "Buenos Aires, Argentina");
  assert.equal(zoneCity("UTC"), "UTC");
});

test("the label carries the offset at that moment", () => {
  assert.equal(zoneOffset("Asia/Kuala_Lumpur", at), "GMT+8");
  assert.equal(zoneOffset("Asia/Kolkata", at), "GMT+5:30");
  assert.equal(zoneOffset("UTC", at), "GMT");
  assert.equal(zoneLabel("Europe/London", at), "London (GMT)");
  assert.equal(zoneOffset("Not/A_Zone", at), "GMT");
});

test("zones group by region, alphabetically, with single names last", () => {
  const g = zoneGroups(["UTC", "Europe/Paris", "Asia/Tokyo", "Asia/Kuala_Lumpur", "Europe/Paris"], at);
  assert.deepEqual(g.map((x) => x.region), ["Asia", "Europe", "Other"]);
  assert.deepEqual(g[0].zones.map((z) => z.label), ["Kuala Lumpur (GMT+8)", "Tokyo (GMT+9)"]);
  assert.equal(g[1].zones.length, 1);
  assert.deepEqual(g[2].zones, [{ id: "UTC", label: "UTC" }]);
});

test("the time there reads as a time and a day", () => {
  assert.equal(zoneNow("Asia/Kuala_Lumpur", at, "en-GB"), "18:54 on Sunday 8 November");
  assert.equal(zoneNow("Not/A_Zone", at, "en-GB"), "");
});
