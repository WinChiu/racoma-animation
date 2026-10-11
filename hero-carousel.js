(() => {
  const hero = document.querySelector('.hero');
  const controls = hero.querySelector('.dots');
  const dots = [...controls.querySelectorAll('.dot')];
  const slides = [
    {src:'assets/hero-bergamo.jpg',label:'Bergamo white sectional sofa in a bright living room',desktopPosition:'center bottom',mobilePosition:'45% bottom'},
    {src:'assets/hero-southampton.jpg',label:'Southampton beige sofa bed with yellow and white ottomans',desktopPosition:'center bottom',mobilePosition:'40% bottom'},
    {src:'assets/hero-mazing.jpg',label:'Brown leather sectional sofa and white lounge chair',desktopPosition:'center bottom',mobilePosition:'65% bottom'},
    {src:'assets/hero.png',label:'RACOMA living room'}
  ];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:700px)');
  const interval = 5000;
  const effect = hero.dataset.carouselTransition || 'crossfade';
  let current = 3;
  let timer;
  let elapsed = 0;
  let startedAt;
  let progress;
  let request = 0;
  let inView = true;
  let focused = false;
  let ready = false;
  let transition;
  let companion;
  let outgoing;
  let incoming;
  let pointerStart;

  hero.setAttribute('aria-roledescription','carousel');
  dots.forEach(dot => {
    const fill = document.createElement('span');
    fill.className = 'dot-progress';
    fill.setAttribute('aria-hidden','true');
    dot.append(fill);
  });
  controls.setAttribute('aria-label','Choose a living room photo');
  const images = slides.map(slide => {
    const image = new Image();
    image.src = slide.src;
    return image.decode().then(() => true).catch(() => false);
  });
  function setPosition() {
    hero.style.backgroundPosition = current === 3
      ? (mobile.matches ? '51% bottom' : 'center bottom')
      : (mobile.matches ? slides[current].mobilePosition : slides[current].desktopPosition);
  }
  function setIndicators() {
    dots.forEach((dot,index) => {
      dot.classList.toggle('active',index === current);
      dot.setAttribute('aria-label','Show photo '+(index+1)+': '+slides[index].label);
      dot.setAttribute('aria-current',index === current ? 'true' : 'false');
    });
    hero.setAttribute('aria-label',slides[current].label);
    hero.dataset.slide = String(current);
  }
  function pauseClock() {
    clearTimeout(timer);
    if(startedAt !== undefined) {
      elapsed = Math.min(interval,elapsed+performance.now()-startedAt);
      startedAt = undefined;
    }
    if(progress) {progress.pause();progress.currentTime=elapsed;}
  }
  function schedule(reset=false) {
    pauseClock();
    if(reset) {
      elapsed=0;
      progress?.cancel();
      progress=dots[current].querySelector('.dot-progress').animate(
        [{transform:'scaleX(0)'},{transform:'scaleX(1)'}],
        {duration:interval,easing:motion.matches?'steps(5,end)':'linear',fill:'both'}
      );
      progress.pause();progress.currentTime=0;
    }
    if(!ready || document.hidden || !inView || focused) return;
    progress?.play();
    startedAt=performance.now();
    timer = setTimeout(() => show((current+1)%slides.length),Math.max(0,interval-elapsed));
  }
  function finishTransition() {
    transition?.cancel();
    companion?.cancel();
    companion = undefined;
    transition = undefined;
    outgoing?.remove();
    outgoing = undefined;
    incoming?.remove();
    incoming = undefined;
  }
  async function show(index) {
    pauseClock();
    const ticket = ++request;
    const valid = await images[index];
    if(ticket !== request) return;
    if(!valid || index === current) {schedule(true);return;}
    finishTransition();
    const fixedLayer = document.documentElement.classList.contains('fixed-scenes')
      ? hero.querySelector('.fixed-photo-layer') : null;
    const host = fixedLayer || hero;
    const oldStyle = getComputedStyle(host);
    if(!motion.matches) {
      outgoing = document.createElement('div');
      outgoing.className = 'hero-carousel-outgoing';
      outgoing.setAttribute('aria-hidden','true');
      outgoing.style.background = oldStyle.background;
      if(!fixedLayer) {
        const imageLayer = getComputedStyle(hero,'::before');
        if(imageLayer.backgroundImage !== 'none') outgoing.style.transform = imageLayer.transform;
      }
      host.append(outgoing);
    }
    current = index;
    hero.style.backgroundImage = 'url("'+slides[current].src+'")';
    setPosition();
    setIndicators();
    if(outgoing) {
      const layer = outgoing;
      let target=layer;
      let frames=[{opacity:1},{opacity:0}];
      let duration=600;
      if(effect==='reveal-up'){
        frames=[{clipPath:'inset(0 0 0 0)'},{clipPath:'inset(0 0 100% 0)'}];
        duration=700;
      }else if(effect==='wipe-right'){
        frames=[{clipPath:'inset(0 0 0 0)'},{clipPath:'inset(0 0 0 100%)'}];
        duration=800;
      }else if(effect==='zoom-fade' || effect==='push-up'){
        // Start the existing slow zoom afresh, behind the incoming photo.
        document.getAnimations().filter(animation=>
          animation.effect?.target===hero &&
          animation.effect.pseudoElement==='::before' &&
          animation.effect.getTiming().iterations===Infinity
        ).forEach(animation=>animation.currentTime=0);
        incoming=document.createElement('div');
        incoming.className='hero-carousel-incoming';
        incoming.setAttribute('aria-hidden','true');
        incoming.style.background=getComputedStyle(host).background;
        host.append(incoming);
        target=incoming;
        if(effect==='zoom-fade') {
          frames=[{transform:'scale(1.06)'},{transform:'scale(1)'}];
          duration=1400;
        } else {
          frames=[{transform:'translateY(100%)'},{transform:'translateY(0)'}];
          duration=850;
          companion=layer.animate([{transform:'translateY(0)'},{transform:'translateY(-100%)'}],{duration,easing:'ease-in-out'});
        }
      }
      const newLayer=incoming;
      transition = target.animate(frames,{duration,easing:'ease-in-out'});
      transition.finished.then(() => {
        layer.remove();
        newLayer?.remove();
        if(outgoing === layer) {outgoing=undefined;transition=undefined;}
        if(incoming === newLayer) incoming=undefined;
      },() => {layer.remove();newLayer?.remove();});
    }
    // The next switch is timed from this switch, including its transition.
    schedule(true);
  }
  dots.forEach((dot,index) => dot.addEventListener('click',event => {
    if(event.detail>0) focused=false;
    show(index);
  }));
  controls.addEventListener('keydown',event => {
    if(event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    focused=true;
    pauseClock();
    const next = (current+(event.key === 'ArrowRight'?1:-1)+slides.length)%slides.length;
    dots[next].focus();
    show(next);
  });
  controls.addEventListener('focusin',event => {
    focused=event.target.matches(':focus-visible');
    schedule();
  });
  controls.addEventListener('focusout',event => {
    if(controls.contains(event.relatedTarget)) return;
    focused=false;schedule();
  });
  hero.addEventListener('pointerdown',event => {
    if(event.pointerType !== 'touch' || event.target.closest('.dots')) return;
    pointerStart={x:event.clientX,y:event.clientY};
  },{passive:true});
  hero.addEventListener('pointerup',event => {
    if(!pointerStart) return;
    const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y;
    pointerStart=undefined;
    if(Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy)*1.5)
      show((current+(dx<0?1:-1)+slides.length)%slides.length);
  },{passive:true});
  hero.addEventListener('pointercancel',() => {pointerStart=undefined;},{passive:true});
  document.addEventListener('visibilitychange',()=>schedule());
  new IntersectionObserver(entries => {
    inView=entries[0].isIntersecting;
    schedule();
  },{threshold:0}).observe(hero);
  mobile.addEventListener('change',setPosition);
  motion.addEventListener('change',() => {if(motion.matches) finishTransition();});
  Promise.all(images).then(() => {ready=true;schedule(true);});
  setPosition();
  setIndicators();
})();
