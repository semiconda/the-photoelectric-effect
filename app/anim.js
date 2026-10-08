/* The Photoelectric Effect — the slide animations.
 *
 * Built in the idiom of the "What changes?" cards in index.html, because that
 * is the one that works: hold everything constant, change ONE thing, and put
 * the two results side by side. Nothing on screen that does not carry meaning.
 *
 * A card is a question with two or three lanes under it. A lane is a strip of
 * light arriving at a metal plate, and whatever comes off it:
 *
 *     ~~~~~~~>  |    o   o   o  -->
 *     the light   the plate   the electrons
 *
 * Four things vary, and every one of them is READ OFF physics(), never set by
 * hand:
 *
 *   the colour of the light   from the wavelength, via lightColor() — the same
 *                             function index.html uses, so a 400 nm beam is the
 *                             same violet in the talk and in the toy
 *   the squiggle of the wave  shorter wavelength draws a tighter wave, which is
 *                             the whole of slide 1 in one picture
 *   how many electrons        from rate: double the intensity, double the dots
 *   how fast they fly         from k, as 1/sqrt(k), because that is what speed
 *                             does with kinetic energy. The original cards used
 *                             3 s at Kmax 0.18 eV and 0.95 s at 1.83 eV; those
 *                             are the same curve, so this matches them.
 *
 * No emission means no dots. That is the entire point of the first half of the
 * talk, and it needs no caption to land.
 *
 * SVG and a CSS keyframe, not canvas: nothing to drive, nothing to tear, and
 * it costs the page a few kilobytes. Classic script, like physics.js.
 */

/* Wavelength to colour.
 *
 * index.html does this by sweeping hue from 270 to 0 across 380-750 nm, which
 * puts 700 nm at hue 36 - orange. On a slide whose whole point is "this is the
 * red one", orange is wrong, so this page uses the standard piecewise spectral
 * approximation instead: 700 nm is red, 400 nm is violet, and the greens and
 * yellows in between land where a spectrum chart puts them.
 *
 * The usual brightness falloff at the two ends is deliberately NOT applied -
 * it exists to mimic the eye's response, and on a dark board it would render
 * deep red as nearly black. Everything is lifted toward white instead, so the
 * ends stay legible from the back of a room.
 *
 * Consequence worth knowing: 700 nm is a slightly different colour here than
 * in the toy at the end. The toy is a different page with its own palette; the
 * numbers, which are what the quiz is scored on, come from physics.js in both.
 */
function spectralColor(w, lift) {
  if (lift == null) lift = 0.22;
  if (w < 380) return lift > 0.3 ? '#c4affd' : '#a98cff';  /* ultraviolet, by convention */
  if (w > 780) return '#8d2b20';
  let r = 0, g = 0, b = 0;
  if (w < 440)      { r = -(w - 440) / 60; b = 1; }
  else if (w < 490) { g = (w - 440) / 50;  b = 1; }
  else if (w < 510) { g = 1; b = -(w - 510) / 20; }
  else if (w < 580) { r = (w - 510) / 70;  g = 1; }
  else if (w < 645) { r = 1; g = -(w - 645) / 65; }
  else              { r = 1; }
  /* Lift toward white so every part of the spectrum reads on a dark board. */
  const up = c => Math.round(255 * (c + (1 - c) * lift));
  return 'rgb(' + up(r) + ',' + up(g) + ',' + up(b) + ')';
}

/* The name the rest of this file calls it by. */
const lightColor = spectralColor;

/* The same colour, lifted further, for text.
   A 2.4px violet stroke at 400 nm is perfectly visible on the slate; the words
   "400 nm" in that same violet measure 4.08:1 against it, which is under the
   4.5 a projector in a lit room needs. Lines and letters do not have the same
   requirements, so they do not get the same colour. */
function labelColor(w) { return spectralColor(w, 0.45); }

/* The lane geometry, shared by every drawing so the surfaces line up down the
   card however many lanes it has.
 *
 * THE ARRANGEMENT MATTERS, AND THE FIRST ONE WAS WRONG. It had the light
 * entering one face of an upright bar and electrons leaving the opposite
 * face, as though the light went through the metal and knocked them out the
 * back. That is not the photoelectric effect. Light is absorbed within
 * nanometres of the surface it strikes and the electrons come back out of
 * THAT surface, towards the source.
 *
 * So the metal is a horizontal slab, the beam arrives from the upper left,
 * and the electrons leave upwards from the lit face - the same side the light
 * came in on. The arrangement is now the physics, not just decoration. */
/* The lane geometry, shared by every drawing so the surfaces line up across
 * the card however many cases it holds.
 *
 * THE ARRANGEMENT MATTERS, AND THE FIRST ONE WAS WRONG. It had the light
 * entering one face of an upright bar and the electrons leaving the opposite
 * face, as though the light passed through the metal and knocked them out of
 * the back. That is not the photoelectric effect. Light is absorbed within
 * nanometres of the surface it strikes, and the electrons come back out of
 * THAT surface, towards the source.
 *
 * So the metal is a horizontal slab, the beam arrives from the upper left,
 * and the electrons leave upwards from the lit face - the same side the light
 * came in on. The picture is the physics now, not decoration around it.
 *
 * That shape is tall rather than wide, which is why the cases sit left,
 * middle, right instead of stacked. */
/* The viewBox is shaped to the box it lands in rather than to the drawing.
   A 300x220 picture in a 383x233 cell is HEIGHT-limited: it renders 318 wide
   and leaves 65px of the cell empty on either side, so everything in it is
   smaller than the space allows. Matching the aspect spends that width on a
   longer beam and a wider slab instead. */
const LANE = {
  w: 360, h: 220,                 /* a tall cell: the cases now sit side by side */
  slabX: 8, slabW: 344, slabH: 32,
  surfaceY: 170,          /* the lit face: where light lands and electrons leave */
  impactX: 120,           /* where the beam meets it */
  beamAngle: 225,         /* degrees - down and to the right, onto the surface */
  beamLen: 165,
  emitMin: 185, emitMax: 338,   /* electrons leave to the RIGHT of the beam, so
                                   the two never cross */
  travel: 190             /* clear off the top, so the loop is never seen */
};

/* Slide 1's lane has no metal in it, so it has no use for a tall cell. Its
   own box is long and shallow, which is the shape a wave wants.
 *
 * HOW MANY CYCLES. The period cannot come from the same formula the beam
 * uses: that one is tuned to a 107-unit stretch of beam, and across 580 units
 * it drew nineteen cycles of red and THIRTY-THREE of violet. At that density
 * neither is a wave any more, they are both a solid block of ink, and the one
 * thing the slide exists to show - that one is tighter than the other - is
 * the first thing to disappear. Seven cycles of red reads as a wave; violet
 * keeps the exact ratio, so it comes out at 700/400 of that, and the
 * comparison survives being legible.
 *
 * AND IT MOVES. Both waves scroll at the SAME speed, because light does: what
 * differs is how many crests go past in a second. That is c = lambda f drawn
 * rather than asserted - the violet wave visibly cycles faster while travelling
 * no quicker. The path is drawn one period wider than the box and translated
 * by exactly one period, so the loop has no seam. */
/* The proportions are measured, not guessed: the cell this lands in comes out
   607x73, so an 8.3:1 box fills it. At 600x80 it was height-limited and drew
   546px wide inside 607 - a tenth of the width given away for nothing. */
/* A photon in flight: a short wave train, and how long one takes to cross.
   The flight time is the same for every colour, because the speed of light
   is - only the electron's flight depends on energy. */
/* The flight is deliberately the longer half of the cycle: a photon that is
   only on screen for a third of it leaves the beam looking empty, and the
   beam is where "how many" is read. */
const PACKET = { len: 62, flight: 1.7 };

const WAVE_ONLY = {
  w: 600, h: 72, mid: 36, amp: 62,
  stepAt700: 41,        /* half-period of the red wave: seven cycles across */
  speed: 52             /* units per second - the same for every colour */
};
/* The half-period in drawing units, in proportion to the real wavelength. */
function waveStep(wavelength) {
  return WAVE_ONLY.stepAt700 * (wavelength / 700);
}

/* What each metal looks like.
 *
 * Sodium, caesium, zinc and copper are not interchangeable grey bars: caesium
 * is visibly golden, copper is copper, zinc is blue-grey and sodium a soft
 * silvery white. Slide 4 turns on two metals behaving differently under
 * identical light, and that lands harder when they do not look alike.
 *
 * Keyed by the name in MATERIALS, with a neutral fallback, so a material
 * added to physics.js that nobody has given a colour still draws. */
const METAL = {
  Sodium: { body: '#9b988e', face: '#dcd9ce', edge: '#f4f1e8' },
  Cesium: { body: '#a98636', face: '#e9c96c', edge: '#fae6ab' },
  Zinc:   { body: '#7c868c', face: '#b8c3c9', edge: '#dfe7ec' },
  Copper: { body: '#8c5330', face: '#d0854f', edge: '#f0b388' }
};
const METAL_DEFAULT = { body: '#8a8f93', face: '#c2c7cb', edge: '#e6eaec' };
function metalLook(name) { return METAL[name] || METAL_DEFAULT; }

/* A wave whose period comes from the wavelength. 700 nm draws a long lazy
   squiggle, 300 nm a tight one — which is the comparison slide 1 is making,
   drawn rather than asserted. */
function wavePath(wavelength, y, from, to, amp, stepUnits) {
  const step = stepUnits != null ? stepUnits
                                 : Math.max(4, Math.min(16, wavelength / 46));
  /* Taller than the geometry strictly needs. The wave is what the back of the
     room looks at, and a flat squiggle reads as a line rather than as light.
     The quarter-period control offset is what sets the height. */
  const a = amp == null ? 20 : amp;
  let d = 'M ' + from + ' ' + y;
  let x = from;
  let first = true;
  while (x + step * 2 <= to) {
    d += first ? ' q ' + (step / 2) + ' -' + a + ' ' + step + ' 0' : ' t ' + step + ' 0';
    first = false;
    x += step;
  }
  return d;
}

/* ---- Pairing a photon with its electron ---------------------------------
 * CSS can only keep two animations in step if they share a duration, so the
 * pair shares ONE cycle and splits it: the photon flies for the first part,
 * the electron for the rest. Where the split falls depends on how fast that
 * particular electron leaves, which depends on its energy - so the keyframes
 * cannot be written once in the stylesheet. They are generated per lane.
 *
 * The two per-lane rules are the whole trick. Photon and electron get the
 * same duration and the same negative delay, so the electron starts moving on
 * the exact frame its photon lands, every cycle, for as long as the page is
 * open - with no timer, no script running and nothing to drift. */
let laneSeq = 0;

function laneStyle() {
  let el = document.getElementById('laneAnim');
  if (!el) {
    el = document.createElement('style');
    el.id = 'laneAnim';
    document.head.appendChild(el);
  }
  return el;
}

function keyframesFor(id, landPct, startX, travel) {
  const f = landPct.toFixed(2);
  const g = Math.min(landPct + 0.4, 99).toFixed(2);
  laneStyle().textContent +=
    '@keyframes pk-' + id + '{' +
      '0%{transform:translateX(' + startX + 'px);opacity:1}' +
      f + '%{transform:translateX(0px);opacity:1}' +
      g + '%{transform:translateX(0px);opacity:0}' +
      '100%{transform:translateX(0px);opacity:0}}' +
    '@keyframes el-' + id + '{' +
      '0%{transform:translateY(0px);opacity:0}' +
      f + '%{transform:translateY(0px);opacity:0}' +
      g + '%{transform:translateY(0px);opacity:1}' +
      '100%{transform:translateY(-' + travel + 'px);opacity:1}}';
}

/* Scattered by the golden ratio rather than spread evenly across the cycle.
   Even spacing puts the i-th electron at height i, so a row of them climbing
   straight up lines up into a diagonal and reads as sideways motion - the one
   thing this picture must not say. 0.618 never repeats, so no two are ever at
   the same height. Photon arrivals are not evenly spaced in reality either. */
function phaseOf(i, n) { return (i * 0.6180339887) % 1; }

function el2(tag, cls, text) {
  const n = document.createElement(tag);
  n.className = cls;
  n.textContent = text;
  return n;
}

function svgEl(name, attrs) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.keys(attrs || {}).forEach(k => n.setAttribute(k, attrs[k]));
  return n;
}

/* How many dots, and how fast. Both from physics(), both clamped so the
   picture stays readable rather than accurate to six figures — the caption
   under every card says as much. */
/* Eight per unit of rate, and the 8 is not free.
 *
 * Slide 4 says "four times the light, four times the rate" and then shows it,
 * so the two lanes have to come out in a 4:1 ratio or the slide contradicts
 * itself. At x3 they did not: the dim lane's rate of 0.5 gives 1.5, which
 * rounds UP to 2, while the bright lane's 2.0 gives exactly 6 - a ratio of 3
 * under a caption promising 4. Rounding had quietly eaten a quarter of it.
 *
 * Any scale has to keep the SMALLEST rate in use landing on a whole number,
 * or that comes back. x8 does, and it is finer than x4 for a second reason:
 * each photon is only on screen while it is in flight, which is about half
 * the cycle, so the number ON SCREEN is about half the number counted. At x4
 * "four times brighter" was one packet against four. At x8 it is four against
 * sixteen, and nobody has to count to see it.
 *
 * The cap sits above the largest value the talk produces, for the same
 * reason: a clamp that bites would flatten the ratio just as rounding did. */
function dotCount(r) {
  if (!r.emits) return 0;
  return Math.max(1, Math.min(20, Math.round(r.rate * 8)));
}
function dotDuration(r) {
  /* v is proportional to sqrt(K), so the time to cross is proportional to
     1/sqrt(K). The constant is picked to reproduce index.html's own timings. */
  return (1.273 / Math.sqrt(Math.max(r.k, 0.05))).toFixed(2) + 's';
}

/* One lane: the light, the plate, and what comes off it. */
function buildLane(spec) {
  /* The work function is looked up from the material's NAME through
     phiOf(), so a lane cannot draw a metal the simulation does not have, and
     cannot draw it with a phi the quiz is not scored against. */
  const r = physics(spec.wavelength, spec.intensity, phiOf(spec.material));
  const colour = lightColor(spec.wavelength);

  const lane = document.createElement('div');
  lane.className = 'lane';

  /* The lane reads left to right, the way the physics does: which light this
     is, then what that light does. The label block is fixed-width so the
     drawings line up down the card and can be compared at a glance - the
     comparison is the whole point of a card. */
  const head = document.createElement('div');
  head.className = 'lane-head';

  const name = document.createElement('div');
  name.className = 'lane-name';
  const strong = document.createElement('strong');
  strong.textContent = spec.label;
  strong.style.color = labelColor(spec.wavelength);
  name.appendChild(strong);

  /* ONE QUANTITY, ONE COLOUR, EVERYWHERE.
   *   photon energy  blue     - what arrives
   *   work function  white    - what it has to beat
   *   Kmax           amber    - what is left over, and "No emission", which
   *                             is the same quantity reading zero
   * A reader who learns the three colours on slide 1 can read every later
   * slide without the words. */
  if (spec.sub) {
    const span = document.createElement('span');
    span.textContent = spec.sub;
    name.appendChild(span);
  }
  if (spec.show !== 'energy') {
    /* The photon's energy, then how it compares with the barrier. Saying it
       with < and > rather than "below" and "above" puts both numbers on
       screen and lets the room do the comparison. */
    const ev = document.createElement('span');
    ev.className = 'ev';
    ev.textContent = r.energy.toFixed(2) + ' eV';
    name.appendChild(ev);

    const cmp = document.createElement('span');
    cmp.className = 'cmp';
    cmp.textContent = (r.emits ? '> ' : '< ') + r.phi.toFixed(2) + ' eV';
    name.appendChild(cmp);
  }
  head.appendChild(name);

  const result = document.createElement('div');
  result.className = 'lane-result';
  result.textContent = resultText(spec, r);
  head.appendChild(result);

  lane.appendChild(head);

  const svg = svgEl('svg', {
    viewBox: '0 0 ' + LANE.w + ' ' + LANE.h,
    role: 'img',
    'aria-label': spec.label + ': ' + resultText(spec, r)
  });

  /* Slide 1 asks about the photon BEFORE it reaches anything, so that lane has
     no metal in it and nothing coming off it. Drawing a surface there would
     invite the question the slide has not asked yet. */
  if (spec.show === 'energy') {
    lane.classList.add('bare');
    svg.setAttribute('viewBox', '0 0 ' + WAVE_ONLY.w + ' ' + WAVE_ONLY.h);
    svg.setAttribute('preserveAspectRatio', 'none');

    const step   = waveStep(spec.wavelength);
    const period = step * 2;
    /* Drawn a period wider than the box at each end, so translating by one
       period lands on an identical picture and the loop cannot be seen. */
    const wave = svgEl('path', {
      class: 'w',
      d: wavePath(spec.wavelength, WAVE_ONLY.mid, -period * 2, WAVE_ONLY.w + period * 2,
                  WAVE_ONLY.amp, step),
      fill: 'none', stroke: colour, 'stroke-width': 4.5, 'stroke-linecap': 'round'
    });
    /* Same speed, so the duration is just however long one period takes. */
    wave.style.setProperty('--period', period + 'px');
    wave.style.setProperty('--cycle', (period / WAVE_ONLY.speed).toFixed(3) + 's');
    svg.appendChild(wave);

    lane.appendChild(svg);
    return lane;
  }

  /* ---- The metal ---------------------------------------------------------
     A slab lying flat, with its lit face on top. Three bands: the body, the
     face catching the light, and a bright line along the very edge, which is
     what makes it read as a surface rather than a coloured rectangle. */
  const metal = metalLook(spec.material);
  svg.appendChild(svgEl('rect', {
    x: LANE.slabX, y: LANE.surfaceY, width: LANE.slabW, height: LANE.slabH,
    rx: 3, fill: metal.body
  }));
  svg.appendChild(svgEl('rect', {
    x: LANE.slabX, y: LANE.surfaceY, width: LANE.slabW, height: 10,
    fill: metal.face
  }));
  svg.appendChild(svgEl('line', {
    x1: LANE.slabX, x2: LANE.slabX + LANE.slabW,
    y1: LANE.surfaceY + 1, y2: LANE.surfaceY + 1,
    stroke: metal.edge, 'stroke-width': 2.4
  }));

  /* ---- The light, arriving one photon at a time --------------------------
     Not a continuous beam any more. A beam says "light is shining"; a stream
     of packets says how MANY arrive, which is the quantity the whole talk
     turns on - and it lets each one be paired with the electron it releases,
     so the emission is visibly caused rather than merely co-located.

     How many are in flight comes from the model with the barrier taken away:
     physics(w, i, 0).rate is the arrival rate on its own, since nothing can
     stop a photon that has no work function to climb. Asking the model that
     way rather than retyping its formula keeps one source for it.

     The consequence is worth the whole change. At the same brightness, RED
     light arrives in more photons than violet - each one is worth less, so
     there are more of them for the same power. Slide 3's red lane now shows
     seven photons landing and not one electron leaving, while violet shows
     four and four. "It is not how many, it is how much each one carries" is
     no longer a sentence under the picture; it is the picture. */
  const arrivals = dotCount(physics(spec.wavelength, spec.intensity, 0));
  const n        = dotCount(r);          /* electrons: 0 when nothing escapes */
  const id       = 'ln' + (laneSeq++);

  /* Every photon crosses in the same time, whatever its colour, because they
     all travel at the same speed. Only the electron's flight depends on what
     it was given. */
  const escape = n ? 1.273 / Math.sqrt(Math.max(r.k, 0.05)) : 0.9;
  const cycle  = PACKET.flight + escape;
  const land   = PACKET.flight / cycle * 100;

  keyframesFor(id, land, LANE.beamLen - PACKET.len, LANE.travel);

  const beam = svgEl('g', {
    transform: 'translate(' + LANE.impactX + ',' + LANE.surfaceY + ') '
             + 'rotate(' + LANE.beamAngle + ')'
  });
  for (let i = 0; i < arrivals; i++) {
    const pk = svgEl('path', {
      class: 'pk',
      d: wavePath(spec.wavelength, 0, 4, PACKET.len, 22,
                  Math.max(5, Math.min(13, spec.wavelength / 46))),
      fill: 'none', stroke: colour, 'stroke-width': 3.4, 'stroke-linecap': 'round'
    });
    pk.style.animationName = 'pk-' + id;
    pk.style.animationDuration = cycle.toFixed(2) + 's';
    pk.style.animationDelay = '-' + (phaseOf(i, arrivals) * cycle).toFixed(2) + 's';
    beam.appendChild(pk);
  }
  svg.appendChild(beam);

  /* ---- What comes off it -------------------------------------------------
     Upwards, out of the lit face, on the same side the light arrived - and
     from the spot the light lands on, not from somewhere convenient. Each one
     leaves on the beat its own photon lands, which is what the shared cycle
     and the shared phase buy. */
  if (n === 0) {
    svg.appendChild(svgEl('path', {
      d: 'M 216 94 l 52 52 m 0 -52 l -52 52',
      fill: 'none', stroke: 'var(--no-emit)', 'stroke-width': 4.4,
      'stroke-linecap': 'round', opacity: '.85'
    }));
  } else {
    for (let i = 0; i < n; i++) {
      /* A hand's width of spread, so a stream of them from one spot does not
         stack into what looks like a single dot. */
      const dx = ((i % 5) - 2) * 9;
      const dot = svgEl('circle', {
        class: 'e', cx: LANE.impactX + dx, cy: LANE.surfaceY - 9, r: 6.5,
        fill: 'var(--emit)'
      });
      dot.style.animationName = 'el-' + id;
      dot.style.animationDuration = cycle.toFixed(2) + 's';
      dot.style.animationDelay = '-' + (phaseOf(i, n) * cycle).toFixed(2) + 's';
      svg.appendChild(dot);
    }
  }
  lane.appendChild(svg);

  /* A verdict under its own case, rather than one sentence under three of
     them trying to cover all of them at once. */
  if (spec.foot) lane.appendChild(el2('div', 'lane-foot', spec.foot));

  return lane;
}

/* What the lane is measuring. Slide 1 is about the photon before it arrives,
   so it reports the photon's energy; everywhere else reports what came out. */
function resultText(spec, r) {
  if (spec.show === 'energy') return 'E = ' + r.energy.toFixed(2) + ' eV';
  if (!r.emits) return 'No emission';
  return 'Kₘₐₓ = ' + r.k.toFixed(2) + ' eV';
}

/* ---- The spectrum --------------------------------------------------------
   A reference strip for slide 1, so the two waves on its left are not floating
   in the abstract: here is where red and violet actually sit, and here is what
   every colour between them is worth.

   Wavelengths label the top, the energy each one carries labels the bottom,
   and the two arrows say which way each quantity runs - which is the one thing
   people get backwards. Every energy is hc/lambda through physics(), so this
   strip cannot drift from the quiz. */
const SPECTRUM = { from: 380, to: 720, marks: [400, 450, 500, 550, 600, 650, 700] };

function buildSpectrum() {
  /* Wider than the strip needs, because what sits OUTSIDE each end of it
     matters: the visible band is a window, and saying so costs two words. */
  const W = 580, H = 230;
  const x0 = 96, x1 = W - 96, barY = 96, barH = 40;
  const at = w => x0 + (w - SPECTRUM.from) / (SPECTRUM.to - SPECTRUM.from) * (x1 - x0);

  const svg = svgEl('svg', {
    viewBox: '0 0 ' + W + ' ' + H, class: 'spectrum',
    role: 'img', 'aria-label': 'Visible spectrum from 380 to 720 nanometres, '
      + 'with the photon energy of each colour'
  });

  /* The strip itself: real colours, sampled every 10 nm. */
  const grad = svgEl('linearGradient', { id: 'specgrad', x1: '0', x2: '1', y1: '0', y2: '0' });
  for (let w = SPECTRUM.from; w <= SPECTRUM.to; w += 10) {
    grad.appendChild(svgEl('stop', {
      offset: ((w - SPECTRUM.from) / (SPECTRUM.to - SPECTRUM.from) * 100).toFixed(1) + '%',
      'stop-color': spectralColor(w)
    }));
  }
  const defs = svgEl('defs', {});
  defs.appendChild(grad);
  svg.appendChild(defs);
  svg.appendChild(svgEl('rect', {
    x: x0, y: barY, width: x1 - x0, height: barH, rx: 4, fill: 'url(#specgrad)'
  }));

  const text = (x, y, str, cls, anchor) => {
    const t = svgEl('text', { x: x, y: y, class: cls, 'text-anchor': anchor || 'middle' });
    t.textContent = str;
    return t;
  };

  /* Where each reference colour sits, what it is worth. */
  SPECTRUM.marks.forEach(w => {
    const x = at(w);
    svg.appendChild(svgEl('line', {
      x1: x, x2: x, y1: barY - 6, y2: barY + barH + 6,
      stroke: 'var(--board)', 'stroke-width': 1.5, opacity: '.55'
    }));
    svg.appendChild(text(x, barY - 12, w, 'sp-nm'));
    /* The energy is READ OFF physics(), never written down here. */
    svg.appendChild(text(x, barY + barH + 24,
      physics(w, 50, 2.30).energy.toFixed(2), 'sp-ev'));
  });
  svg.appendChild(text(x0 - 48, barY - 12, 'nm', 'sp-unit', 'end'));
  svg.appendChild(text(x0 - 48, barY + barH + 24, 'eV', 'sp-unit', 'end'));

  /* The strip is only the part we can see. Both neighbours are on the same
     line it is, which is the point: nothing changes at either edge except
     whether an eye happens to respond. */
  svg.appendChild(text(x0 - 10, barY + barH / 2 + 6, 'UV', 'sp-edge', 'end'));
  svg.appendChild(text(x1 + 10, barY + barH / 2 + 6, 'Infrared', 'sp-edge', 'start'));

  /* The two directions. This is the part people get backwards. */
  const arrow = (y, dir, label) => {
    const ax0 = x0, ax1 = x1;
    const head = dir > 0
      ? 'M ' + (ax1 - 11) + ' ' + (y - 5) + ' l 11 5 l -11 5'
      : 'M ' + (ax0 + 11) + ' ' + (y - 5) + ' l -11 5 l 11 5';
    svg.appendChild(svgEl('path', {
      d: 'M ' + ax0 + ' ' + y + ' H ' + ax1 + ' ' + head,
      fill: 'none', stroke: 'var(--chalk-dim)', 'stroke-width': 1.6,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));
    const t = text(dir > 0 ? ax1 - 4 : ax0 + 4, y - 11, label, 'sp-dir',
                   dir > 0 ? 'end' : 'start');
    svg.appendChild(t);
  };
  arrow(34, 1, 'longer wavelength →');
  arrow(H - 20, -1, '← more energy per photon');

  const box = document.createElement('div');
  box.className = 'aside';
  box.appendChild(svg);
  return box;
}

function buildCard(card) {
  const el = document.createElement('article');
  el.className = 'card' + (card.aside ? ' wide' : '');

  const h = document.createElement('h3');
  h.textContent = card.title;
  el.appendChild(h);

  const held = document.createElement('p');
  held.className = 'held';
  if (Array.isArray(card.held)) {
    card.held.forEach(part => {
      const sp = document.createElement('span');
      if (part.c) sp.className = part.c;
      sp.textContent = part.t;
      held.appendChild(sp);
    });
  } else {
    held.textContent = card.held;
  }
  el.appendChild(held);

  /* The cases sit side by side - left, middle, right - because each one is
     now a tall picture: light coming down onto a surface and electrons
     leaving it. Stacked, three of those would be three slivers. */
  const lanes = document.createElement('div');
  lanes.className = 'lanes' + (card.stack ? ' stack' : '');
  card.lanes.forEach(spec => lanes.appendChild(buildLane(spec)));

  if (card.aside === 'spectrum') {
    /* Cases on the left, the reference strip on the right. */
    const row = document.createElement('div');
    row.className = 'cardrow';
    const left = document.createElement('div');
    left.className = 'cardlanes';
    left.appendChild(lanes);
    row.appendChild(left);
    row.appendChild(buildSpectrum());
    el.appendChild(row);
  } else {
    el.appendChild(lanes);
  }

  if (card.takeaway) {
    const take = document.createElement('strong');
    take.className = 'takeaway';
    take.textContent = card.takeaway;
    el.appendChild(take);
  }

  if (card.note) {
    const note = document.createElement('p');
    note.className = 'card-note';
    note.textContent = card.note;
    el.appendChild(note);
  }
  return el;
}

/* ---- What each slide shows ---------------------------------------------
   Work functions are looked up by name through phiOf() in questions.js, so a
   lane can never draw a material the simulation does not have. */

/* A photon energy at some wavelength, for a caption. Read off physics(),
   like every other number on a card. */
function evAt(wavelength) {
  return physics(wavelength, 50, phiOf('Sodium')).energy.toFixed(2) + ' eV';
}

function ANIMATIONS(part) {

  if (part === 1) return [{
    title: 'Shorter wavelength, more energy',
    lanes: [
      { wavelength: 700, intensity: 50, material: 'Sodium', label: '700 nm', sub: 'Red photon',    show: 'energy' },
      { wavelength: 400, intensity: 50, material: 'Sodium', label: '400 nm', sub: 'Violet photon', show: 'energy' }
    ],
    aside: 'spectrum',
    /* Side by side these two would be 281px each next to a spectrum, and the
       whole point is how many periods fit across. Stacked, each one gets the
       full width of the half it shares with the strip. */
    stack: true,
    /* "Same beam, different photons" was simply untrue: these are two
       different beams. What is actually being shown is that the colour, and
       nothing else, fixes what one photon is worth. */
    /* "The colour sets what every photon in the beam is worth" said two
       things badly: "worth" is a metaphor, and the rest of it is the card's
       own title back again. A takeaway earns its line by saying what the
       picture does NOT - here, that brightness is absent from all of it,
       which is the wrong answer Q1 offers a minute later. */
    takeaway: 'Nothing here depends on how bright the light is — only on the color.'
  }];

  if (part === 2) return [{
    title: 'Enough energy, or not',
    /* Every number here is read off physics(), including the work function,
       which comes from MATERIALS through phiOf(). */
    /* The barrier every lane is measured against, called out rather than
       mentioned: it is the number the whole card turns on. */
    held: [{ t: 'Sodium · ' },
           { t: 'φ = ' + phiOf('Sodium').toFixed(2) + ' eV', c: 'phi' },
           { t: ' · same brightness' }],
    lanes: [
      { wavelength: 700, intensity: 50, material: 'Sodium', label: '700 nm' },
      { wavelength: 400, intensity: 50, material: 'Sodium', label: '400 nm' }
    ],
    takeaway: 'Below the barrier, nothing comes out at all.'
    /* The note used to read "Sodium needs 2.30 eV. The red photon brings
       1.77 eV and is turned away." Both rows now print exactly that, with the
       comparison in between, so the sentence had become a transcript of the
       line above it. */
  }];

  if (part === 3) return [{
    title: 'Red, violet, ultraviolet',
    held: [{ t: 'Sodium · ' },
           { t: 'φ = ' + phiOf('Sodium').toFixed(2) + ' eV', c: 'phi' },
           { t: ' · same brightness' }],
    lanes: [
      { wavelength: 700, intensity: 50, material: 'Sodium', label: '700 nm',
        sub: 'Red',         foot: 'Nothing comes out.' },
      { wavelength: 400, intensity: 50, material: 'Sodium', label: '400 nm',
        sub: 'Violet',      foot: 'Electrons come out.' },
      { wavelength: 300, intensity: 50, material: 'Sodium', label: '300 nm',
        sub: 'Ultraviolet', foot: 'Electrons come out faster.' }
    ],
    /* No takeaway: each case now carries its own verdict underneath it,
       which beats one sentence trying to cover three at once. */
    /* The dots are NOT illustrative - they are the model's rate, and at a
       fixed brightness that rate falls as the wavelength shortens, because
       the same power delivered in bigger packets is fewer packets. The old
       caption waved that away; the picture is more interesting than the
       hand-wave, so it says what is actually happening. */
    note: 'Same brightness means fewer photons when each one carries more: '
        + 'fewer electrons, each of them faster.'
  }];

  if (part === 4) return [
    {
      title: 'More light',
      held: 'Sodium · same wavelength (400 nm)',
      lanes: [
        { wavelength: 400, intensity: 25,  material: 'Sodium', label: '25%',  sub: 'Dim' },
        { wavelength: 400, intensity: 100, material: 'Sodium', label: '100%', sub: 'Bright' }
      ],
      takeaway: 'More electrons. Same speed.',
      note: 'Four times the light, four times the rate — and not one electron faster.'
    },
    {
      title: 'A different metal',
      held: 'Same light · 400 nm · same brightness',
      lanes: [
        { wavelength: 400, intensity: 50, material: 'Copper', label: 'Copper', sub: 'φ = 4.70 eV' },
        { wavelength: 400, intensity: 50, material: 'Sodium', label: 'Sodium', sub: 'φ = 2.30 eV' }
      ],
      takeaway: 'Same photons. A lower barrier lets them out.',
      note: 'The light has not changed at all between these two lanes.'
    }
  ];

  return null;
}

/* Fill a container with this part's cards. Returns true if anything was drawn,
   so the caller can leave the slot alone when a part has no animation. */
function paintAnimationInto(box, part) {
  while (box.firstChild) box.removeChild(box.firstChild);
  /* The per-lane keyframes belong to the lanes being replaced. */
  laneStyle().textContent = '';
  laneSeq = 0;
  const cards = ANIMATIONS(part);
  if (!cards) return false;
  /* One card has the whole stage to itself; two share it. */
  const grid = document.createElement('div');
  grid.className = 'cards' + (cards.length === 1 ? ' one' : '');
  cards.forEach(c => grid.appendChild(buildCard(c)));
  box.appendChild(grid);
  return true;
}
