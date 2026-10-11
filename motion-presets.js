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
    if(themeFor(container)==='c' || themeFor(container)==='d') add(container,'text');
    else [...container.querySelectorAll('.eyebrow,h1,h2,p,strong')].forEach((element,index)=>add(element,'text',Math.min(index*100,450)));
  }
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
        const entrance=play(element,[{transform:'scale(1.04)'},{transform:'scale(1)'}],{...options,duration:2200,pseudoElement:'::before'});
        if(element.matches('.hero')) entrance.finished.then(()=>{
          if(!reduced.matches) play(element,[{transform:'scale(1)'},{transform:'scale(1.04)'}],{duration:14000,iterations:Infinity,direction:'alternate',pseudoElement:'::before',easing:'ease-in-out'});
        },()=>{});
      }
      else if(kind==='image') play(element,[{scale:'1.04'},{scale:'1'}],{...options,duration:2200});
      else if(kind==='card') {
        play(element.querySelector('.material-image'),[{scale:'1.04'},{scale:'1'}],{...options,duration:1800});
        play(element.querySelector('.material-text'),[{translate:'0 10px'},{translate:'0 0'}],{...options,duration:1500});
      } else play(element,[{translate:'0 12px'},{translate:'0 0'}],{...options,duration:1500});
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
      if(entry.theme==='a') entry.element.style.opacity='0';
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
