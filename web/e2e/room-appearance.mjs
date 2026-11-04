// Real painted room and customization controls, without accessing practice data.
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const shots = process.argv[2];
if (shots) await mkdir(shots, {recursive:true});
const server = await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();
let browser;
try {
  browser = await chromium.launch({channel:'chrome',headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:950}, reducedMotion:'reduce'});
  const page = await context.newPage();
  const errors=[], api=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',r=>{api.push(r.request().url());return r.abort();});
  const url=`${server.resolvedUrls.local[0]}e2e/fixtures/room-appearance.html`;
  await page.goto(url);
  await page.getByRole('button',{name:'Make it yours',exact:true}).click();
  await page.getByRole('radio',{name:'Night',exact:true}).check();
  assert.equal(await page.locator('.room-paint').getAttribute('data-light'),'night');
  assert.equal(await page.locator('img[src="room/room-night.webp"]').evaluate(el=>el.style.opacity),'1');
  await page.waitForFunction(()=>[...document.querySelectorAll('.room-art')].every(im=>im.complete&&im.naturalWidth));
  const canvas = page.locator('.room-fx');
  const unlit=await canvas.evaluate(c=>c.toDataURL());
  await page.getByRole('radio',{name:'On',exact:true}).check();
  assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),unlit,'fairy lights change actual scene pixels with motion reduced');
  await page.getByRole('slider',{name:'Warmth'}).fill('65');
  assert.ok(Number(await page.locator('.room-color-wash').evaluate(el=>el.style.opacity))>0);
  await page.getByRole('radio',{name:'Leaves',exact:true}).check();
  assert.equal(await page.locator('.room-monitor-art').getAttribute('src'),'pictures/plant-fern.webp');
  await page.getByRole('radio',{name:'Sunset',exact:true}).check();
  if(shots) await page.screenshot({path:path.join(shots,'room-customize.png')});
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button',{name:'Make it yours',exact:true}).evaluate(el=>el===document.activeElement),true);
  if(shots) await page.screenshot({path:path.join(shots,'room-sunset.png')});
  await page.reload();
  await page.getByRole('button',{name:'Make it yours',exact:true}).click();
  assert.equal(await page.locator('.room-paint').getAttribute('data-light'),'sunset');
  assert.equal(await page.getByRole('slider',{name:'Warmth'}).inputValue(),'65');
  assert.equal(await page.locator('.room-monitor-art').count(),1);
  for(const width of [390,768]) {
    await page.setViewportSize({width,height:844});
    for(const name of ['Reset room','Night','Leaves']) {
      const control=name==='Reset room' ? page.getByRole('button',{name,exact:true}) : page.getByRole('radio',{name,exact:true}).locator('..');
      const b=await control.boundingBox();
      assert.ok(b&&b.x>=0&&b.x+b.width<=width&&b.y>=0&&b.y+b.height<=844,`${name} fits at ${width}px`);
    }
    if(shots) await page.screenshot({path:path.join(shots,`room-${width}.png`)});
  }
  await page.getByRole('button',{name:'Reset room',exact:true}).click();
  assert.equal(await page.locator('.room-paint').getAttribute('data-light'),'auto');
  assert.equal(await page.getByRole('slider',{name:'Warmth'}).inputValue(),'0');
  assert.equal(await page.locator('.room-monitor-art').count(),0);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/Sit down at the computer/}).click();
  assert.equal(await page.evaluate(()=>window.entered),1,'computer hit target remains aligned');
  // Other tabs can update or clear the same browser preferences.
  const other=await page.context().newPage(); await other.goto(url);
  await other.getByRole('button',{name:'Make it yours',exact:true}).click();
  await other.getByRole('radio',{name:'Morning',exact:true}).check();
  await page.waitForFunction(()=>document.querySelector('.room-paint').dataset.light==='morning');
  await other.evaluate(()=>localStorage.removeItem('lilt.room.appearance'));
  await page.waitForFunction(()=>document.querySelector('.room-paint').dataset.light==='auto');
  await other.close();
  assert.deepEqual(api,[]); assert.deepEqual(errors,[]);
  // Exercise the real home too: its card stack and inert desk transition are absent in the fixture.
  const home=await context.newPage();
  home.on('pageerror',e=>errors.push(e.message));
  await home.route('**/api/**',r=>r.fulfill({status:503,json:{error:'Isolated room test'}}));
  await home.setViewportSize({width:1440,height:844});
  await home.goto(server.resolvedUrls.local[0]);
  await home.getByRole('button',{name:'Make it yours',exact:true}).click();
  await home.getByRole('radio',{name:'Sunset',exact:true}).check();
  const reset=home.getByRole('button',{name:'Reset room',exact:true});
  assert.equal(await reset.evaluate(el=>{
    const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
  }),true,'home cards do not cover appearance controls');
  if(shots) await home.screenshot({path:path.join(shots,'room-home.png')});
  await home.getByRole('button',{name:/Sit down at the computer/}).focus();
  await home.keyboard.press('Enter');
  await home.waitForFunction(()=>location.hash.startsWith('#/deck'));
  await home.waitForFunction(()=>!document.querySelector('.room-appearance'));
  await home.goto(`${server.resolvedUrls.local[0]}#/`);
  await home.setViewportSize({width:390,height:844});
  await home.getByRole('button',{name:'Make it yours',exact:true}).click();
  assert.equal(await home.getByRole('button',{name:'Reset room',exact:true}).evaluate(el=>{
    const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
  }),true,'mobile home cards do not cover appearance controls');
  if(shots) await home.screenshot({path:path.join(shots,'room-home-mobile.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS: original room, lighting and visible effects, warmth, decor, persistence/reset, keyboard dismissal, mobile fit, computer hit target and cross-tab updates.');
} finally {await browser?.close();await server.close();}
