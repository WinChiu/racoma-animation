const {chromium}=require('C:/Users/win88/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const results=[];
 for(const width of (process.argv.includes('--extras')?[]:[1440,390])) for(const theme of ['a','b','c','d']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.motionCalls=[];const animate=Element.prototype.animate;
   Element.prototype.animate=function(frames,options){window.motionCalls.push({className:this.className,kind:this.dataset.motionKind,preset:this.dataset.motionPreset,frames,options});return animate.call(this,frames,options);};
  });
  await page.goto('http://127.0.0.1:4173/animation-'+theme+'.html');
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.nav').evaluate(el=>el.classList.contains('is-scrolled')),false);
  await page.waitForTimeout(5500);
  assert.equal(await page.locator('.hero').getAttribute('data-slide'),'0','5-second autoplay');
  if(theme==='d' && width===1440) await page.screenshot({path:'verify-desktop-d.png'});
  for(let i=0;i<6;i++) await page.locator('.dot').nth(i%4).click({force:true});
  await page.waitForTimeout(1600);
  assert.equal(await page.locator('.hero-carousel-outgoing,.hero-carousel-incoming').count(),0,'overlay cleanup');
  const height=await page.evaluate(()=>document.documentElement.scrollHeight);
  for(let y=0;y<=height;y+=500){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await page.waitForTimeout(100);}
  await page.locator('.materials').evaluate(el=>{el.scrollIntoView({block:'center',behavior:'instant'});});
  for(let x=0;x<1300;x+=170){await page.locator('.materials').evaluate((el,x)=>el.scrollTo({left:x,behavior:'instant'}),x);await page.waitForTimeout(120);}
  if(theme==='c' && width===390) await page.screenshot({path:'verify-mobile-c.png'});
  await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  await page.waitForTimeout(2400);
  assert.equal(await page.locator('.nav').evaluate(el=>el.classList.contains('is-scrolled')),true);
  const audit=await page.evaluate(()=>{
   const visible=el=>getComputedStyle(el).display!=='none' && el.getClientRects().length;
   const covered=el=>{for(let node=el;node && node!==document.body;node=node.parentElement)if(node.dataset.motionKind)return true;return false;};
   const candidates=[...document.querySelectorAll('main h1,main h2,main h3,main p,main strong,.eyebrow,main img,.story-photo,.product-image,.collection-photo,.watermark,footer dt,footer dd,footer img,.copyright')].filter(visible);
   return {uncovered:candidates.filter(el=>!covered(el)).map(el=>el.className||el.tagName),pending:[...document.querySelectorAll('[data-motion-state="pending"]')].filter(visible).map(el=>el.className),overflow:document.documentElement.scrollWidth>innerWidth,calls:window.motionCalls.length};
  });
  assert.deepEqual(audit.uncovered,[], 'coverage');
  assert.deepEqual(audit.pending,[], theme+' '+width+' visible entries triggered');
  assert.equal(audit.overflow,false,'no horizontal page overflow');
  assert.deepEqual(errors,[], 'runtime errors');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>document.querySelectorAll('[style*="opacity: 0"]').length),0,'reduced motion visibility');
  results.push({width,theme,...audit,errors});await page.close();
 }
 // Check layout against the static page with animations disabled.
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 async function geometry(file){await page.goto('http://127.0.0.1:4173/'+file);await page.evaluate(()=>document.fonts.ready);return page.evaluate(()=>Object.fromEntries(['.hero','.story','.products','.collection-photo','.collection-body','footer'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,[r.x,r.y,r.width,r.height]];})));}
 const base=await geometry('index.html');for(const theme of ['a','b','c','d'])assert.deepEqual(await geometry('animation-'+theme+'.html'),base,'layout unchanged');
 await page.setViewportSize({width:390,height:900});const mobileBase=await geometry('index.html');for(const theme of ['a','b','c','d'])assert.deepEqual(await geometry('animation-'+theme+'.html'),mobileBase,'mobile layout unchanged');
 // Verify regional mixing without replacing layout or registering effects twice.
 await page.route('**/animation-a.html',async route=>{
  const response=await route.fetch();let html=await response.text();
  html=html.replace('class="hero"','class="hero" data-motion-theme="d"').replace('class="story"','class="story" data-motion-theme="b"').replace('class="products"','class="products" data-motion-theme="c"');
  await route.fulfill({response,body:html});
 });
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('http://127.0.0.1:4173/animation-a.html');
 assert.equal(await page.locator('.hero').getAttribute('data-carousel-transition'),'push-up');
 assert.equal(await page.locator('.story-photo').getAttribute('data-motion-preset'),'b');
 assert.equal(await page.locator('.product-image').first().getAttribute('data-motion-preset'),'c');
 assert.equal(await page.locator('.material').first().getAttribute('data-motion-preset'),'a');
 console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
