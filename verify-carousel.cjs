const {chromium}=require('C:/Users/win88/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const results=[];
 for(const width of [1440,390]) await Promise.all(['index.html',...['a','b','c','d'].map(t=>'animation-'+t+'.html')].map(async file=>{
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(file)).href);
  const fraction=()=>page.locator('.dot.active .dot-progress').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a);
  await page.waitForFunction(()=>document.querySelector('.dot.active .dot-progress').getAnimations().length>0);
  await page.waitForTimeout(1000);
  const first=await fraction();assert(first>.12 && first<.4,file+' progress filling');
  assert.equal(await page.locator('.hero').getAttribute('data-slide'),'3','no early switch');
  await page.evaluate(()=>scrollTo({top:1300,behavior:'instant'}));await page.waitForTimeout(200);
  const paused=await fraction();await page.waitForTimeout(700);
  assert(Math.abs(await fraction()-paused)<.015,file+' offscreen pause');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(400);
  assert(await fraction()>paused+.04,file+' resumes elapsed progress');
  // Hidden-tab clock and fill pause together, then continue.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  const hidden=await fraction();await page.waitForTimeout(400);
  assert(Math.abs(await fraction()-hidden)<.015,file+' hidden pause');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  // Selecting the same photo also resets the entire countdown.
  await page.locator('.dot').nth(3).click({force:true});await page.waitForTimeout(150);
  assert(await fraction()<.08,file+' same-photo reset');
  await page.locator('.dot').nth(1).click({force:true});await page.waitForTimeout(250);
  assert.equal(await page.locator('.hero').getAttribute('data-slide'),'1');
  assert(await fraction()<.1,file+' manual reset');
  await page.waitForTimeout(3400);
  assert.equal(await page.locator('.hero').getAttribute('data-slide'),'1',file+' waits longer than 3 seconds');
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('.hero').getAttribute('data-slide'),'2',file+' five-second switch');
  assert(await fraction()<.16,file+' resets after autoplay');
  assert.deepEqual(errors,[]);results.push({file,width,first,paused,errors});await page.close();
 }));
 console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
