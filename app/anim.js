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
function spectralColor(w) {
  if (w < 380) return '#a98cff';          /* ultraviolet, by convention */
  if (w > 780) return '#8d2b20';
  let r = 0, g = 0, b = 0;
  if (w < 440)      { r = -(w - 440) / 60; b = 1; }
  else if (w < 490) { g = (w - 440) / 50;  b = 1; }
  else if (w < 510) { g = 1; b = -(w - 510) / 20; }
  else if (w < 580) { r = (w - 510) / 70;  g = 1; }
  else if (w < 645) { r = 1; g = -(w - 645) / 65; }
  else              { r = 1; }
  /* Lift toward white so every part of the spectrum reads on a dark board. */
  const lift = c => Math.round(255 * (c + (1 - c) * 0.22));
  return 'rgb(' + lift(r) + ',' + lift(g) + ',' + lift(b) + ')';
}

/* The name the rest of this file calls it by. */
const lightColor = spectralColor;

/* The lane geometry, shared by every drawing so the plates line up down the
   card however many lanes it has. */
const LANE = {
  w: 760, h: 80,
  waveStart: 16, waveEnd: 250,     /* the light */
  plateX: 292, plateW: 16,         /* the metal */
  outX: 326,                       /* where an electron appears */
  travel: 400                      /* how far it flies before looping */
};

/* A wave whose period comes from the wavelength. 700 nm draws a long lazy
   squiggle, 300 nm a tight one — which is the comparison slide 1 is making,
   drawn rather than asserted. */
function wavePath(y, wavelength, waveEnd) {
  const end = waveEnd == null ? LANE.waveEnd : waveEnd;
  const step = Math.max(4, Math.min(16, wavelength / 46));
  let d = 'M ' + LANE.waveStart + ' ' + y;
  let x = LANE.waveStart;
  let first = true;
  while (x + step * 2 <= end) {
    d += first ? ' q ' + (step / 2) + ' -9 ' + step + ' 0' : ' t ' + step + ' 0';
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
function dotCount(r) {
  if (!r.emits) return 0;
  return Math.max(1, Math.min(8, Math.round(r.rate * 3)));
}
function dotDuration(r) {
  /* v is proportional to sqrt(K), so the time to cross is proportional to
     1/sqrt(K). The constant is picked to reproduce index.html's own timings. */
  return (1.273 / Math.sqrt(Math.max(r.k, 0.05))).toFixed(2) + 's';
}

/* One lane: the light, the plate, and what comes off it. */
function buildLane(spec) {
  const r = physics(spec.wavelength, spec.intensity, spec.phi);
  const colour = lightColor(spec.wavelength);

  const lane = document.createElement('div');
  lane.className = 'lane';

  const head = document.createElement('div');
  head.className = 'lane-title';
  const strong = document.createElement('strong');
  strong.textContent = spec.label;
  strong.style.color = colour;
  const span = document.createElement('span');
  span.textContent = spec.sub || '';
  head.appendChild(strong);
  head.appendChild(span);
  lane.appendChild(head);

  /* The result shares the title's line rather than taking one of its own.
     Vertical space is what a projector runs out of first, and this is the row
     the eye compares between lanes anyway. */
  const result = document.createElement('div');
  result.className = 'lane-result';
  head.appendChild(result);

  const svg = svgEl('svg', {
    viewBox: '0 0 ' + LANE.w + ' ' + LANE.h,
    role: 'img',
    'aria-label': spec.label + ': ' + resultText(spec, r)
  });

  /* Two wave lines where the light is a BEAM arriving at something. One where
     the slide is about a single photon's wave, which is slide 1: a second line
     there only invites "what is the other one?". */
  const bare = spec.show === 'energy';
  const end  = bare ? LANE.w - 16 : LANE.waveEnd;
  (bare ? [40] : [30, 50]).forEach(y => svg.appendChild(svgEl('path', {
    d: wavePath(y, spec.wavelength, end), fill: 'none', stroke: colour,
    'stroke-width': bare ? 3 : 2.4
  })));
  /* The arrow that says which way it is going. */
  if (spec.show !== 'energy') svg.appendChild(svgEl('path', {
    d: 'M 258 40 H 284 m -7 -6 l 7 6 -7 6',
    fill: 'none', stroke: colour, 'stroke-width': 2.4
  }));

  /* Slide 1 asks about the photon BEFORE it reaches anything, so that lane has
     no metal in it and nothing coming off it. Drawing a plate there would
     invite the question the slide has not asked yet. */
  if (spec.show === 'energy') {
    lane.appendChild(svg);
    result.textContent = resultText(spec, r);
    return lane;
  }

  /* The metal. Amber is the work function's colour everywhere in this project. */
  svg.appendChild(svgEl('rect', {
    x: LANE.plateX, y: 4, width: LANE.plateW, height: LANE.h - 8,
    rx: 2, fill: 'var(--chalk-amber)'
  }));

  const n = dotCount(r);
  if (n === 0) {
    /* Nothing comes out. The light stops at the plate, and the lane is
       deliberately, visibly empty to the right of it. */
    svg.appendChild(svgEl('path', {
      d: 'M ' + (LANE.outX + 6) + ' 28 l 22 24 m 0 -24 l -22 24',
      fill: 'none', stroke: 'var(--no-emit)', 'stroke-width': 2.4,
      'stroke-linecap': 'round', opacity: '.85'
    }));
  } else {
    const duration = dotDuration(r);
    for (let i = 0; i < n; i++) {
      const cy = n === 1 ? 40 : 14 + (52 / (n - 1)) * i;
      const dot = svgEl('circle', {
        class: 'e', cx: LANE.outX, cy: cy.toFixed(1), r: 5, fill: 'var(--emit)'
      });
      dot.style.setProperty('--duration', duration);
      dot.style.setProperty('--delay', '-' + (i / n * parseFloat(duration)).toFixed(2) + 's');
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

  if (card.aside === 'spectrum') {
    /* Lanes on the left, the reference strip on the right. */
    const row = document.createElement('div');
    row.className = 'cardrow';
    const left = document.createElement('div');
    left.className = 'cardlanes';
    card.lanes.forEach(spec => left.appendChild(buildLane(spec)));
    row.appendChild(left);
    row.appendChild(buildSpectrum());
    el.appendChild(row);
  } else {
    card.lanes.forEach(spec => el.appendChild(buildLane(spec)));
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

function ANIMATIONS(part) {
  const Na = phiOf('Sodium');

  if (part === 1) return [{
    title: 'Shorter wavelength, more energy',
    held: 'The light on its own — before it reaches anything',
    lanes: [
      { wavelength: 700, intensity: 50, phi: Na, label: '700 nm', sub: 'Red',    show: 'energy' },
      { wavelength: 400, intensity: 50, phi: Na, label: '400 nm', sub: 'Violet', show: 'energy' }
    ],
    aside: 'spectrum',
    takeaway: 'Same beam, different photons.',
    note: 'The tighter the wave, the more energy each photon carries.'
  }];

  if (part === 2) return [{
    title: 'Enough energy, or not',
    held: 'Sodium · same brightness',
    lanes: [
      { wavelength: 700, intensity: 50, phi: Na, label: '700 nm', sub: 'Below the work function' },
      { wavelength: 400, intensity: 50, phi: Na, label: '400 nm', sub: 'Above the work function' }
    ],
    takeaway: 'Below the barrier, nothing comes out at all.',
    note: 'Sodium needs 2.30 eV. The red photon brings 1.77 eV and is turned away.'
  }];

  if (part === 3) return [{
    title: 'Red, violet, ultraviolet',
    held: 'Sodium · same brightness',
    lanes: [
      { wavelength: 700, intensity: 50, phi: Na, label: '700 nm', sub: 'Red' },
      { wavelength: 400, intensity: 50, phi: Na, label: '400 nm', sub: 'Violet' },
      { wavelength: 300, intensity: 50, phi: Na, label: '300 nm', sub: 'Ultraviolet' }
    ],
    takeaway: 'Nothing, then electrons, then faster electrons.',
    note: 'Speed comparison; the number of dots is illustrative.'
  }];

  if (part === 4) return [
    {
      title: 'More light',
      held: 'Sodium · same wavelength (400 nm)',
      lanes: [
        { wavelength: 400, intensity: 25,  phi: Na, label: '25%',  sub: 'Dim' },
        { wavelength: 400, intensity: 100, phi: Na, label: '100%', sub: 'Bright' }
      ],
      takeaway: 'More electrons. Same speed.',
      note: 'Four times the light, four times the rate — and not one electron faster.'
    },
    {
      title: 'A different metal',
      held: 'Same light · 400 nm · same brightness',
      lanes: [
        { wavelength: 400, intensity: 50, phi: phiOf('Copper'), label: 'Copper', sub: 'φ = 4.70 eV' },
        { wavelength: 400, intensity: 50, phi: Na,              label: 'Sodium', sub: 'φ = 2.30 eV' }
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
  box.appendChild(
    cards.reduce((grid, c) => (grid.appendChild(buildCard(c)), grid),
                 Object.assign(document.createElement('div'), { className: 'cards' }))
  );
  return true;
}
