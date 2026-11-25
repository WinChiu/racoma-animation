(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:700px)');
  const animations = new Set();
  const entries = [];
  const scrollEntries = [];
  const ease = 'cubic-bezier(.22,1,.36,1)';
  const themeFor = element => element.closest('[data-motion-theme]')?.dataset.motionTheme || 'a';
  const nav = $('.nav');
  const updateNav = () => nav.classList.toggle('is-scrolled',scrollY > 48);
  addEventListener('scroll',updateNav,{passive:true});
  addEventListener('pageshow',updateNav);
  updateNav();

  function play(element,frames,options={}) {
    const animation = element.animate(frames,{duration:1000,easing:ease,...options});
    animations.add(animation);
    animation.finished.then(()=>animations.delete(animation),()=>animations.delete(animation));
    return animation;
  }
  function add(element,kind,delay=0,forcedTheme) {
    if(!element) return;
    const theme = forcedTheme || themeFor(element);
    element.dataset.motionKind = kind;
    element.dataset.motionPreset = theme;
    element.dataset.motionState = 'pending';
    const entry = {element,kind,theme,delay,played:false};
    entries.push(entry);
    if(kind==='background' && (element.matches('.hero') || theme==='c' || (theme==='d' && !element.matches('.collection-photo')))) element.classList.add('motion-image-'+theme);
    if(theme==='d') {
      if(kind==='background' && !element.matches('.hero,.collection-photo')) scrollEntries.push(entry);
      else if(kind==='text' || kind==='group' || kind==='image') scrollEntries.push(entry);
      else element.dataset.motionState = 'static-by-design';
    }
  }
  // Text blocks preserve grouping in C; A and B follow the reading order.
  function textBlock(container) {
    if(!container) return;
    if(themeFor(container)==='c') [...container.children].forEach((element,index)=>add(element,'text',index*220));
    else if(themeFor(container)==='d') add(container,'text');
    else [...container.querySelectorAll('.eyebrow,h1,h2,p,strong')].forEach((element,index)=>add(element,'text',Math.min(index*100,450)));
  }
  // Off-center origin and a slight drift per photo, so the settle is not a pure center zoom.
  const origins=[['38% 62%','-1.2%','.8%'],['64% 40%','1.2%','-.6%'],['44% 70%','-.8%','1%'],['60% 58%','1%','.6%'],['36% 44%','-1%','-.8%']];
  $$('.hero,.story-photo,.product-image,.collection-photo').forEach((element,index)=>{
    const [origin,x,y]=origins[index%origins.length];
    element.style.setProperty('--origin',origin);element.style.setProperty('--drift-x',x);element.style.setProperty('--drift-y',y);
  });
  add($('.hero'),'background');
  add($('.hero-copy h1'),'text',150);
  add($('.dots'),'group',300);
  add($('.story-photo'),'background');
  add($('.watermark'),'image');
  textBlock($('.story-inner'));
  $$('.product').forEach(product=>{add(product.querySelector('.product-image'),'background');textBlock(product.querySelector('.inner'));});
  add($('.collection-photo'),'background');
  textBlock($('.collection-copy'));
  if(!['c','d'].includes(themeFor($('.collection-copy')))) add($('.click-hint'),'text');
  const materialsTheme = themeFor($('.materials'));
  if(materialsTheme==='d') add($('.materials'),'group');
  $$('.material').forEach((card,index)=>{
    const theme=themeFor(card);
    card.dataset.motionTheme=theme;
    if(theme==='d' && materialsTheme==='d') {
      card.dataset.motionKind='group';card.dataset.motionPreset=theme;card.dataset.motionState='inherited';
    } else add(card,'card',Math.min(index*100,500),theme);
  });
  if(themeFor($('.contact'))==='c' || themeFor($('.contact'))==='d') add($('.contact'),'text');
  else $$('.contact dt,.contact dd').forEach((element,index)=>add(element,'text',index*60));
  add($('.footer-logo'),'image');
  add($('.copyright'),'text',300);
  // Fabric selection: one card at a time; page code can listen for 'fabricchange'.
  const cards=$$('.material');
  // Demo: hovering a fabric swaps the collection photo (placeholder sofas from existing assets).
  const photo=$('.collection-photo');
  const defaultPhoto='assets/collection.png';
  const fabricPhotos=['assets/hero-bergamo.jpg','assets/hero-southampton.jpg','assets/hero-mazing.jpg','assets/product-1.png','assets/product-2.png','assets/hero.png'];
  const swapOrigins=['40% 60%','62% 42%','46% 68%','58% 56%','36% 46%','66% 62%'];
  let shownPhoto=defaultPhoto,selectedCard=null;
  [defaultPhoto,...fabricPhotos].forEach(src=>{const img=new Image();img.src=src;});
  function showPhoto(src,index=0) {
    if(!photo || src===shownPhoto) return;
    shownPhoto=src;
    const layer=document.createElement('div');
    layer.className='fabric-swap';
    layer.style.backgroundImage='url("'+src+'")';
    if(src!==defaultPhoto){layer.style.backgroundSize='cover';layer.style.backgroundPosition='center';}
    layer.style.transformOrigin=swapOrigins[index%swapOrigins.length];
    photo.append(layer);
    if(reduced.matches) {[...photo.querySelectorAll('.fabric-swap')].slice(0,-1).forEach(old=>old.remove());return;}
    layer.animate([{opacity:0},{opacity:1}],{duration:320,easing:'ease-out',fill:'both'});
    layer.animate([{transform:'scale(1.14)'},{transform:'scale(1)'}],{duration:2200,easing:'cubic-bezier(.16,.8,.3,1)',fill:'both'});
    setTimeout(()=>{[...photo.querySelectorAll('.fabric-swap')].forEach(old=>{if(old!==layer && old.compareDocumentPosition(layer)&Node.DOCUMENT_POSITION_FOLLOWING) old.remove();});},360);
  }
  const photoFor=card=>card?fabricPhotos[cards.indexOf(card)%fabricPhotos.length]:defaultPhoto;
  function selectFabric(card) {
    selectedCard=card;showPhoto(photoFor(card),cards.indexOf(card));
    cards.forEach(item=>{const on=item===card;item.classList.toggle('is-selected',on);item.setAttribute('aria-pressed',on);});
    document.dispatchEvent(new CustomEvent('fabricchange',{detail:{index:cards.indexOf(card),name:card.querySelector('h3')?.textContent.trim(),card}}));
  }
  cards.forEach(card=>{
    card.setAttribute('role','button');card.tabIndex=0;card.setAttribute('aria-pressed','false');
    card.addEventListener('click',()=>selectFabric(card));
    // Hover counts as selecting; the last hovered card stays selected.
    card.addEventListener('mouseenter',()=>{if(!mobile.matches) selectFabric(card);});
    card.addEventListener('focus',()=>selectFabric(card));
    card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectFabric(card);}});
  });
  // Mobile: no hover. While the card row scrolls, the card nearest the hint arrow is selected.
  const strip=$('.materials'),arrow=$('.click-hint span');
  let pickQueued=false;
  function pickByArrow() {
    pickQueued=false;
    if(!mobile.matches || !arrow) return;
    const x=arrow.getBoundingClientRect().left+arrow.offsetWidth/2;
    let best=null,gap=Infinity;
    cards.forEach(card=>{const r=card.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-x);if(d<gap){gap=d;best=card;}});
    if(best && best!==selectedCard) selectFabric(best);
  }
  strip?.addEventListener('scroll',()=>{if(!pickQueued){pickQueued=true;requestAnimationFrame(pickByArrow);}},{passive:true});
  // Persistent navigation is shared UI, not an entrance demonstration.
  nav.dataset.motionState='shared-navigation';

  const hero = $('.hero');
  hero.dataset.carouselTransition = {a:'crossfade',b:'wipe-right',c:'zoom-fade',d:'push-up'}[themeFor(hero)];
  if(themeFor(hero)==='d') {
    const layer=document.createElement('div');
    layer.className='fixed-photo-layer';layer.setAttribute('aria-hidden','true');
    hero.prepend(layer);
  }
  function configureFixed() {
    document.documentElement.classList.toggle('fixed-scenes',themeFor(hero)==='d' && !reduced.matches && !mobile.matches);
  }
  configureFixed();mobile.addEventListener('change',configureFixed);

  function enter(entry) {
    if(entry.played || reduced.matches) return;
    entry.played=true;
    const {element,theme,kind,delay}=entry;
    element.dataset.motionState='played';
    element.style.removeProperty('opacity');
    element.style.removeProperty('clip-path');
    element.classList.remove('motion-pending-a','motion-pending-b');
    const options={delay,fill:'backwards',...(kind==='background' && element.matches('.hero')?{pseudoElement:'::before'}:{})};
    if(theme==='a') play(element,element.matches('.hero')?[{opacity:1},{opacity:0}]:[{opacity:0},{opacity:1}],{...options,duration:1100,easing:'ease-in-out'});
    if(theme==='b') {
      if(element.matches('.hero')) play(element,[{clipPath:'inset(0)'},{clipPath:'inset(0 0 0 100%)'}],{...options,duration:1100});
      else if(kind==='text') play(element,[{clipPath:'inset(100% 0 0 0)',translate:'0 18px'},{clipPath:'inset(0 0 0 0)',translate:'0 0'}],{...options,duration:900});
      else play(element,[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],{...options,duration:1100});
    }
    if(theme==='c') {
      if(kind==='background') {
        // Furniture photos only: start enlarged (CSS), then one slow exhale to 1. No loop.
        // Wait until the photo is decoded so the first frames of the settle are not dropped (looks like a pause).
        const url=getComputedStyle(element).backgroundImage.match(/url\(["']?(.+?)["']?\)/)?.[1];
        const ready=url?(()=>{const img=new Image();img.src=url;return img.decode?img.decode().catch(()=>{}):Promise.resolve();})():Promise.resolve();
        ready.then(()=>requestAnimationFrame(()=>play(element,[{transform:'scale(1.14) translate(var(--drift-x,-1.2%),var(--drift-y,.8%))'},{transform:'scale(1) translate(0,0)'}],{...options,fill:'both',duration:2200,easing:'cubic-bezier(.16,.8,.3,1)',pseudoElement:'::before'})));
      }
      else if(kind==='image') {/* logos stay still */}
      else play(element,[{opacity:0,translate:'0 28px'},{opacity:1,translate:'0 0'}],{...options,duration:1400});
    }
  }
  const observer = new IntersectionObserver(items=>{
    items.forEach(item=>{
      if(!item.isIntersecting) return;
      const entry=entries.find(entry=>entry.element===item.target);
      enter(entry);observer.unobserve(item.target);
    });
  },{threshold:.08,rootMargin:'-64px 0px 0px 0px'});
  entries.filter(entry=>entry.theme!=='d').forEach(entry=>{
    if(reduced.matches) {entry.element.dataset.motionState='reduced';return;}
    // The C theme moves immediately visible content; it never hides text.
    if(entry.element.matches('.hero')) entry.element.classList.add('motion-pending-'+entry.theme);
    else {
      if(entry.theme==='a' || (entry.theme==='c' && ['text','group','card'].includes(entry.kind))) entry.element.style.opacity='0';
      // Fully clipped targets cannot intersect. Hide paint only until the mask starts.
      if(entry.theme==='b') entry.element.style.opacity='0';
    }
    observer.observe(entry.element);
  });
  // The hero remains visible throughout a transition; only its paint is animated.
  const arrow=$('.click-hint span');
  let arrowAnimation;
  const arrowObserver=new IntersectionObserver(items=>{
    if(reduced.matches) return;
    items.forEach(item=>{
      if(!item.isIntersecting) {arrowAnimation?.pause();return;}
      const theme=themeFor(arrow);
      if(theme==='c') {
        if(!arrowAnimation) arrowAnimation=play(arrow,[{translate:'0 -3px'},{translate:'0 3px'},{translate:'0 -3px'}],{duration:2400,iterations:Infinity,easing:'ease-in-out'});
        else arrowAnimation.play();
      } else if(theme==='b' && !arrowAnimation) arrowAnimation=play(arrow,[{translate:'0 -10px'},{translate:'0 0'}],{duration:700});
    });
  });
  arrowObserver.observe(arrow);
  $('.click-hint').addEventListener('click',()=>$('.materials').scrollBy({left:195,behavior:reduced.matches?'instant':'smooth'}));

  let frame=0;
  function updateScroll() {
    frame=0;
    if(reduced.matches) return;
    scrollEntries.forEach(({element,kind})=>{
      const rect=element.getBoundingClientRect();
      const progress=Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight*.75)));
      if(kind==='background') {
        const travel=Math.min(mobile.matches?6:18,rect.height*.035);
        const centered=Math.max(-1,Math.min(1,(innerHeight/2-(rect.top+rect.height/2))/((innerHeight+rect.height)/2)));
        element.style.setProperty('--motion-parallax',(centered*travel).toFixed(2)+'px');
      } else element.style.translate=((1-progress)*(mobile.matches?8:18)).toFixed(2)+'px 0';
      element.dataset.motionState='scroll-linked';
    });
  }
  function queueScroll() {if(!frame) frame=requestAnimationFrame(updateScroll);}
  addEventListener('scroll',queueScroll,{passive:true});
  addEventListener('resize',queueScroll);updateScroll();
  reduced.addEventListener('change',()=>{
    configureFixed();
    if(!reduced.matches) {updateScroll();return;}
    observer.disconnect();arrowObserver.disconnect();
    animations.forEach(animation=>animation.cancel());animations.clear();
    entries.forEach(({element})=>{
      element.style.removeProperty('opacity');element.style.removeProperty('clip-path');
      element.style.removeProperty('translate');element.style.removeProperty('--motion-parallax');
      element.dataset.motionState='reduced';
    });
  });
})();
