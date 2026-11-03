// End-to-end test of Photos: the app opens from the dock and from the clock, a photo you add is
// shrunk and saved on the server, shows on the clock when picked, and is deleted from disk; one of
// Lilt's own is hidden and restored; the viewer steps through and closes. Run it on a scratch data
// folder: it adds and deletes photos.
//
// Usage: LILT_URL=http://127.0.0.1:7979 node e2e/photos.mjs

import { chromium } from "playwright-core";

const BASE = process.env.LILT_URL ?? "http://127.0.0.1:7979";
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const api = (path, init) => page.evaluate(async ([p, i]) => { const r = await fetch(p, i); return { status: r.status, type: r.headers.get("content-type"), body: r.headers.get("content-type")?.includes("json") ? await r.json() : null }; }, [path, init]);
  const tiles = () => page.locator(".ph-grid .ph-tile:not(.ph-drop)");
  const tile = (name) => tiles().filter({ has: page.locator(".ph-meta b", { hasText: name }) });

  // Start clean: nothing added, nothing hidden.
  await page.goto(`${BASE}/#/photos`);
  for (const p of (await api("/api/photos")).body.uploaded) await api(`/api/photos/${p.id}`, { method: "DELETE" });
  await api("/api/photos/restore", { method: "POST" });
  await page.reload();
  await tiles().first().waitFor();
  const builtIn = await tiles().count();
  check("Photos opens as an app with Lilt's photos", builtIn >= 10, `${builtIn} photos`);
  const names = await tiles().locator(".ph-meta b").allInnerTexts();
  check("…but not the views of the room", !names.some((n) => /^The (room|cat on the screen|window|desk)$/.test(n)), names.join(", "));
  const box = await tiles().first().locator(".ph-img span").boundingBox();
  check("…each shown as a square", box && box.width > 100 && Math.abs(box.width - box.height) < 2, box && `${Math.round(box.width)}×${Math.round(box.height)}`);
  check("it has a place in the dock", await page.getByRole("button", { name: "Photos" }).count() > 0);

  // A big picture, drawn in the page, added through Add photos.
  const png = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 3000; c.height = 2000; const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 3000, 2000); gr.addColorStop(0, "#ff7a59"); gr.addColorStop(1, "#5a3fd1"); g.fillStyle = gr; g.fillRect(0, 0, 3000, 2000); return c.toDataURL("image/png").split(",")[1]; });
  await page.locator('.ph input[type="file"]').setInputFiles({ name: "My_sunset.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await tile("My sunset").waitFor({ timeout: 15000 });
  check("an added photo shows, named from its file", (await tile("My sunset").locator("small").innerText()) === "Yours");
  const added = (await api("/api/photos")).body.uploaded;
  check("the server keeps it", added.length === 1 && added[0].name === "My sunset", JSON.stringify(added.map((p) => p.name)));
  const img = await api(`/api/photos/${added[0].id}/image`);
  const size = await page.evaluate(async (u) => { const b = await (await fetch(u)).blob(); const i = await createImageBitmap(b); return [i.width, i.height]; }, `/api/photos/${added[0].id}/image`);
  check("…shrunk before it was sent", img.status === 200 && Math.max(...size) === 1600, `${img.type}, ${size.join("×")}`);

  // Put it on the clock, then look at the room.
  await tile("My sunset").hover();
  await tile("My sunset").getByRole("button", { name: /on the clock/ }).click();
  check("picking it marks it on the clock", (await tile("My sunset").locator("small").innerText()) === "On the clock");
  await page.goto(`${BASE}/#/`);
  await page.locator(".ds-clock").waitFor();
  await page.waitForTimeout(800);
  check("the clock in the room shows it", /My sunset/.test(await page.locator(".ds-clock-next").getAttribute("aria-label")));
  await page.locator(".ds-clock-next").click({ force: true });
  await page.getByRole("button", { name: "Open Photos" }).click({ force: true });
  await page.waitForURL(/#\/photos/).then(() => check("the clock's Photos opens the app", true), () => check("the clock's Photos opens the app", false, page.url()));

  // The viewer.
  await tiles().first().locator(".ph-img").click();
  const first = await page.locator(".ph-viewer-bar b").innerText();
  await page.keyboard.press("ArrowRight");
  const second = await page.locator(".ph-viewer-bar b").innerText();
  await page.keyboard.press("Escape");
  check("the viewer steps through and closes", first !== second && (await page.locator(".ph-viewer").count()) === 0, `${first} → ${second}`);

  // Delete yours: gone from the server, and the clock goes back to shuffling.
  await tile("My sunset").hover();
  await tile("My sunset").getByRole("button", { name: /^Delete/ }).click();
  await tile("My sunset").getByRole("button", { name: "Delete", exact: true }).click();
  await page.waitForTimeout(500);
  check("deleting your photo removes it", (await tile("My sunset").count()) === 0 && (await api("/api/photos")).body.uploaded.length === 0);
  check("…and its image is gone", (await api(`/api/photos/${added[0].id}/image`, { cache: "no-store" })).status === 404);
  check("…and the clock shuffles again", await page.evaluate(() => localStorage.getItem("lilt.clock.picture.v2")) === "shuffle");

  // Hide one of Lilt's, then restore.
  await tile("Orange fluff").hover();
  await tile("Orange fluff").getByRole("button", { name: /^Hide/ }).click();
  await tile("Orange fluff").getByRole("button", { name: "Hide", exact: true }).click();
  await page.waitForTimeout(400);
  check("hiding one of Lilt's photos takes it away", (await tile("Orange fluff").count()) === 0 && (await tiles().count()) === builtIn - 1);
  await page.getByRole("button", { name: "Restore" }).click();
  await page.waitForTimeout(400);
  check("Restore brings it back", (await tile("Orange fluff").count()) === 1);

  check("no page errors", errors.length === 0, errors.join("; "));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
