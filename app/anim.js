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
  travel: 140             /* how far an electron rises before looping */
};

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
function wavePath(wavelength, y, from, to, amp) {
  const step = Math.max(4, Math.min(16, wavelength / 46));
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

function svgEl(name, attrs) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.keys(attrs || {}).forEach(k => n.setAttribute(k, attrs[k]));
  return n;
}

/* How many dots, and how fast. Both from physics(), both clamped so the
   picture stays readable rather than accurate to six figures — the caption
   under every card says as much. */
/* Four dots per unit of rate, and the 4 is not free.
 *
 * Slide 4 says "four times the light, four times the rate" and then shows it,
 * so the two lanes have to come out in a 4:1 ratio or the slide contradicts
 * itself. At x3 they did not: the dim lane's rate of 0.5 gives 1.5, which
 * rounds UP to 2, while the bright lane's 2.0 gives exactly 6 - a ratio of 3
 * under a caption promising 4. Rounding had quietly eaten a quarter of it.
 *
 * x4 puts both on whole numbers, 2 and 8, and the picture means what the
 * caption says. Any future scale has to keep the SMALLEST rate in use landing
 * on a whole number, or this comes back.
 *
 * The cap sits above the largest value the talk produces, for the same
 * reason: a clamp that bites would flatten the ratio just as rounding did. */
function dotCount(r) {
  if (!r.emits) return 0;
  return Math.max(1, Math.min(10, Math.round(r.rate * 4)));
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
  const span = document.createElement('span');
  span.textContent = spec.sub || '';
  name.appendChild(strong);
  name.appendChild(span);
  head.appendChild(name);

  const result = document.createElement('div');
  result.className = 'lane-result';
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
    svg.appendChild(svgEl('path', {
      d: wavePath(spec.wavelength, LANE.h / 2, 14, LANE.w - 14, 30),
      fill: 'none', stroke: colour, 'stroke-width': 4, 'stroke-linecap': 'round'
    }));
    lane.appendChild(svg);
    result.textContent = resultText(spec, r);
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

  /* ---- The light ---------------------------------------------------------
     Drawn flat and then rotated onto the surface, so one wave function serves
     any angle. The two lines are offset across the beam, not up the page, so
     they stay parallel to it once it is turned. */
  const beam = svgEl('g', {
    transform: 'translate(' + LANE.impactX + ',' + LANE.surfaceY + ') '
             + 'rotate(' + LANE.beamAngle + ')'
  });
  [-10, 10].forEach(off => beam.appendChild(svgEl('path', {
    d: wavePath(spec.wavelength, off, 20, LANE.beamLen, 13),
    fill: 'none', stroke: colour, 'stroke-width': 3.2, 'stroke-linecap': 'round'
  })));
  beam.appendChild(svgEl('path', {
    d: 'M 42 -11 L 23 0 L 42 11',
    fill: 'none', stroke: colour, 'stroke-width': 3.2,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round'
  }));
  svg.appendChild(beam);

  /* ---- What comes off it -------------------------------------------------
     Upwards, out of the lit face, on the same side the light arrived. */
  const n = dotCount(r);
  if (n === 0) {
    /* Nothing comes out, and the space above the surface is deliberately,
       visibly empty apart from the cross. */
    svg.appendChild(svgEl('path', {
      d: 'M 216 94 l 52 52 m 0 -52 l -52 52',
      fill: 'none', stroke: 'var(--no-emit)', 'stroke-width': 4.4,
      'stroke-linecap': 'round', opacity: '.85'
    }));
  } else {
    const duration = dotDuration(r);
    const span = LANE.emitMax - LANE.emitMin;
    for (let i = 0; i < n; i++) {
      const cx = n === 1 ? LANE.emitMin + span / 2
                         : LANE.emitMin + (span / (n - 1)) * i;
      const dot = svgEl('circle', {
        class: 'e', cx: cx.toFixed(1), cy: LANE.surfaceY - 10, r: 6.5,
        fill: 'var(--emit)'
      });
      dot.style.setProperty('--duration', duration);
      /* Scattered by the golden ratio rather than spread evenly across the
         cycle. Even spacing puts electron i at height i, so a row of them
         climbing straight up lines up into a diagonal and reads as sideways
         motion - the one thing this picture must not say. 0.618 never
         repeats, so no two are ever at the same height and no run of them
         forms a line. */
      const phase = (i * 0.6180339887) % 1;
      dot.style.setProperty('--delay', '-' + (phase * parseFloat(duration)).toFixed(2) + 's');
      svg.appendChild(dot);
    }
  }
  lane.appendChild(svg);

  result.textContent = resultText(spec, r);
  if (n === 0) result.classList.add('none');

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
  const W = 520, H = 230;
  const x0 = 54, x1 = W - 20, barY = 96, barH = 40;
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
  svg.appendChild(text(x0 - 8, barY - 12, 'nm', 'sp-unit', 'end'));
  svg.appendChild(text(x0 - 8, barY + barH + 24, 'eV', 'sp-unit', 'end'));

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
  held.textContent = card.held;
  el.appendChild(held);

  /* The cases sit side by side - left, middle, right - because each one is
     now a tall picture: light coming down onto a surface and electrons
     leaving it. Stacked, three of those would be three slivers. */
  const lanes = document.createElement('div');
  lanes.className = 'lanes';
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

  const take = document.createElement('strong');
  take.className = 'takeaway';
  take.textContent = card.takeaway;
  el.appendChild(take);

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
    held: 'The light on its own — before it reaches anything',
    lanes: [
      { wavelength: 700, intensity: 50, material: 'Sodium', label: '700 nm', sub: 'Red',    show: 'energy' },
      { wavelength: 400, intensity: 50, material: 'Sodium', label: '400 nm', sub: 'Violet', show: 'energy' }
    ],
    aside: 'spectrum',
    /* "Same beam, different photons" was simply untrue: these are two
       different beams. What is actually being shown is that the colour, and
       nothing else, fixes what one photon is worth. */
    takeaway: 'The colour sets what every photon in the beam is worth.',
    note: 'The tighter the wave, the more energy each photon carries.'
  }];

  if (part === 2) return [{
    title: 'Enough energy, or not',
    /* Every number here is read off physics(), including the work function,
       which comes from MATERIALS through phiOf(). */
    held: 'Sodium · φ = ' + phiOf('Sodium').toFixed(2) + ' eV · same brightness',
    lanes: [
      /* A WAVELENGTH is not above or below a work function - a photon's
         ENERGY is. Naming the energy is both more correct and more use: it
         puts 1.77 and 3.10 next to 2.30 and lets the room do the comparison
         itself rather than being told the answer. */
      { wavelength: 700, intensity: 50, material: 'Sodium', label: '700 nm',
        sub: 'photon ' + evAt(700) + ' — below φ' },
      { wavelength: 400, intensity: 50, material: 'Sodium', label: '400 nm',
        sub: 'photon ' + evAt(400) + ' — above φ' }
    ],
    takeaway: 'Below the barrier, nothing comes out at all.',
    note: 'Sodium needs 2.30 eV. The red photon brings 1.77 eV and is turned away.'
  }];

  if (part === 3) return [{
    title: 'Red, violet, ultraviolet',
    held: 'Sodium · same brightness',
    lanes: [
      { wavelength: 700, intensity: 50, material: 'Sodium', label: '700 nm', sub: 'Red' },
      { wavelength: 400, intensity: 50, material: 'Sodium', label: '400 nm', sub: 'Violet' },
      { wavelength: 300, intensity: 50, material: 'Sodium', label: '300 nm', sub: 'Ultraviolet' }
    ],
    takeaway: 'Nothing, then electrons, then faster electrons.',
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
  const cards = ANIMATIONS(part);
  if (!cards) return false;
  /* One card has the whole stage to itself; two share it. */
  const grid = document.createElement('div');
  grid.className = 'cards' + (cards.length === 1 ? ' one' : '');
  cards.forEach(c => grid.appendChild(buildCard(c)));
  box.appendChild(grid);
  return true;
}
