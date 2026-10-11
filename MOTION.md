# RACOMA motion presets

The original `index.html` is preserved. A–D use shared `motion-presets.js` and
`motion-presets.css`; the existing carousel stays in `hero-carousel.js`.

| Preset | Theme | Main visual language |
| --- | --- | --- |
| a | Soft emergence | Opacity only, reading-order fades |
| b | Editorial reveal | Image masks, clipped upward text, no opacity fades |
| c | Slow breathing | Image scale, grouped vertical text, slow hover and arrow loop |
| d | Spatial layers | Desktop fixed hero, image parallax, scroll-linked horizontal text |

## Mix by region

Set `data-motion-theme` before page load on a section or region. The nearest
attribute wins; the body provides the default. No layout markup needs replacing.

```html
<body data-motion-theme="a">
  <section class="hero" data-motion-theme="d">...</section>
  <section class="story" data-motion-theme="b">...</section>
  <section class="products" data-motion-theme="c">...</section>
  <section class="collection" data-motion-theme="a">...</section>
  <footer data-motion-theme="b">...</footer>
</body>
```

Existing elements only: do not paste the literal ellipses over page content.
`data-motion-theme` can also be placed on a `.product`, `.collection-copy`,
`.materials`, or an individual `.material`. These are load-time settings, not
a live-switch API. The hero region selects its matching carousel transition.

## Coverage and intentional exclusions

- Story photo, watermark, product images and text, collection copy, all six
  material cards, footer logo/contact/copyright are included.
- Text inside a grouped block and images/text inside a material card inherit
  that block's motion; they are not also given duplicate entrance animations.
- Navigation stays functional and visible, with the shared transparent-to-white
  state change at 48px of scroll.
- D's collection sofa remains normal scrolling without parallax or pinning.
- D's hero is fixed only on desktop; mobile uses normal scrolling.
- A's mobile arrow is still; B moves it once; C loops gently; D inherits text
  scroll motion. The exported arrow asset is unchanged.
- Reduced-motion preferences remove decorative motion and reveal all content.
- Carousel timing is 5000ms, with bottom-aligned photos and existing keyboard,
  dot and swipe controls. The active bar fills linearly over the same five seconds.
  Offscreen/hidden-tab/keyboard-focus pauses preserve elapsed time; selecting a
  photo restarts its countdown, including when selecting the current photo.

## Verification

Serve this directory on port 4173 and run `node verify-motion.cjs` with the local
Playwright dependency and Edge installed. The check covers A–D at desktop and
mobile widths, text/image coverage, triggering, overflow, autoplay, rapid
switch cleanup, navigation, reduced motion, and unchanged layout geometry.
