/* The Photoelectric Effect — the quiz questions.
 *
 * Five questions across four slides. The talk runs three times in ten minutes,
 * poster-session style, so each one has about twenty seconds. Loaded by
 * present.html and quiz.html. Classic script, like physics.js — see the note
 * there.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE:
 *
 *   No answer is typed. Every question carries a compute() that DERIVES its
 *   answer by calling physics(), and the option list is searched for what
 *   compute() returned. A physics quiz with a wrong answer key is worse than
 *   no quiz, so the key and the animation must come from one source.
 *
 * The options themselves are ordinary strings — the wrong ones are wrong by
 * construction, and the right one has to be MATCHED by the computed value
 * rather than marked. That is deliberate: if physics.js ever changes so that
 * the computed answer stops matching any option, answerIndex() reports it
 * loudly instead of quietly picking the nearest one.
 *
 * A compute() that returns null is saying "the premise this question rests on
 * no longer holds". That matches no option either, so it fails the same loud
 * way rather than guessing.
 */

/* Work functions come from MATERIALS in physics.js, never retyped here, so a
   question can never quote a φ the simulation does not use. */
function phiOf(name) {
  const m = MATERIALS.find(x => x.name === name);
  if (!m) throw new Error('questions.js: no material named ' + name);
  return m.phi;
}

const QUESTIONS = [
  {
    id: 'Q1', part: 1,
    text: 'Which photon has more energy?',
    options: [
      'A red photon',
      'They carry the same energy',
      'A violet photon',
      'It depends on how bright the light is'
    ],
    /* Slide 1, straight after E = hc/λ. Two things are derived here, not one:
       that violet beats red, AND that brightness has nothing to do with it —
       the last option is ruled out by comparing the same colour dim against
       bright and finding the same energy per photon. */
    compute: () => {
      const phi    = phiOf('Sodium');
      const dim    = physics(400, 10, phi).energy;
      const bright = physics(400, 100, phi).energy;
      if (dim !== bright) return 'It depends on how bright the light is';
      const red    = physics(700, 50, phi).energy;
      const violet = physics(400, 50, phi).energy;
      if (red === violet) return 'They carry the same energy';
      return violet > red ? 'A violet photon' : 'A red photon';
    },
    why: 'Violet light has a shorter wavelength, so each photon carries more energy. '
       + 'Brightness changes how MANY photons arrive, never how much energy each one has.'
  },
  {
    id: 'Q2', part: 2,
    text: 'A photon has less energy than the metal’s work function. '
        + 'Can it release an electron?',
    options: [
      'No — the electron stays.',
      'Yes — the electron escapes.',
      'Only if the light is bright enough.',
      'Only if we shine it for long enough.'
    ],
    /* Slide 2, the work function as a threshold. The concrete case is 700 nm on
       sodium: 1.77 eV against 2.30 eV. Faint light and blazing light are both
       evaluated, so "bright enough" is ruled out by the model rather than by
       the wording. Time is not in the model at all — that option is a
       distractor and nothing can return it. */
    compute: () => {
      const phi     = phiOf('Sodium');
      const faint   = physics(700, 1, phi);
      const blazing = physics(700, 100, phi);
      if (blazing.energy >= blazing.phi) return null;   /* premise: below φ */
      if (!faint.emits && !blazing.emits) return 'No — the electron stays.';
      if (!faint.emits && blazing.emits) return 'Only if the light is bright enough.';
      return 'Yes — the electron escapes.';
    },
    why: 'The photon does not provide enough energy to overcome the work function, '
       + 'and no amount of brightness or patience changes that in this model.'
  },
  {
    id: 'Q3', part: 3,
    text: '700 nm red light does not release electrons from sodium. '
        + 'Which change will help?',
    options: [
      'Make the same red light brighter.',
      'Shine the red light for longer.',
      'Use a metal with a higher work function.',
      'Switch to 400 nm violet light.'
    ],
    /* The hook. Three of the four are evaluated against physics() — brighter
       red, the same red on a harder metal, and violet — and the question only
       has an answer while exactly one of them emits. */
    compute: () => {
      const phi      = phiOf('Sodium');
      const brighter = physics(700, 100, phi).emits;
      const harder   = physics(700, 50, phiOf('Zinc')).emits;
      const violet   = physics(400, 50, phi).emits;
      const working  = [brighter, harder, violet].filter(Boolean).length;
      if (working !== 1) return null;     /* no single change stands out */
      if (violet)   return 'Switch to 400 nm violet light.';
      if (brighter) return 'Make the same red light brighter.';
      return 'Use a metal with a higher work function.';
    },
    why: 'Each 400 nm photon now has enough energy to release an electron from sodium. '
       + 'Adding more red photons does not overcome the energy barrier, and a metal that '
       + 'holds its electrons more tightly only makes it harder.'
  },
  {
    id: 'Q4', part: 3,
    text: 'Electrons are already escaping. We shorten the wavelength while '
        + 'keeping the same metal. What happens to their maximum speed?',
    options: [
      'It stays the same.',
      'It increases.',
      'It decreases.',
      'All of these are possible — it depends on the metal.'
    ],
    /* Kmax = hf − φ, the teacher's "what kinetic energy they acquire". The last
       option is the interesting one: it is ruled out by checking EVERY material
       in physics.js, not just sodium. If any metal behaved differently the
       answer would be null and the page would say so rather than mark one. */
    compute: () => {
      const LONGER = 400, SHORTER = 300;
      let compared = 0, increases = 0;
      MATERIALS.forEach(m => {
        const a = physics(LONGER, 50, m.phi);
        const b = physics(SHORTER, 50, m.phi);
        if (!a.emits || !b.emits) return;   /* below threshold: nothing to compare */
        compared++;
        if (b.k > a.k) increases++;
      });
      if (compared === 0) return null;                /* premise: already escaping */
      return increases === compared ? 'It increases.' : null;
    },
    why: 'Shorter wavelengths provide more energy per photon, leaving more energy '
       + 'for the emitted electron’s motion — and this holds for every metal, '
       + 'not just this one.'
  },
  {
    id: 'Q5', part: 4,
    text: 'Sodium is emitting electrons. We keep the wavelength fixed and '
        + 'increase the light intensity. What changes?',
    options: [
      'The maximum electron speed increases.',
      'Nothing changes.',
      'More electrons escape per second.',
      'Both the number and the maximum speed increase.'
    ],
    /* The pair of ideas the whole talk turns on, side by side: intensity moves
       the RATE, wavelength moves the ENERGY. Every one of the four options is
       reachable from the model, so the answer is genuinely read off physics()
       rather than being the only sentence that fits. */
    compute: () => {
      const phi    = phiOf('Sodium');
      const dim    = physics(400, 50, phi);
      const bright = physics(400, 100, phi);
      if (!dim.emits || !bright.emits) return null;   /* premise: already emitting */
      const more   = bright.rate > dim.rate;
      const faster = bright.k > dim.k;
      if (more && faster)   return 'Both the number and the maximum speed increase.';
      if (more && !faster)  return 'More electrons escape per second.';
      if (!more && faster)  return 'The maximum electron speed increases.';
      return 'Nothing changes.';
    },
    why: 'More photons arrive, but their individual energies are unchanged, so the '
       + 'maximum electron kinetic energy stays exactly where it was.'
  }
];

/* Resolve a question to the index of its correct option.
   Returns -1 when the computed answer matches no option — the caller must
   treat that as an error, never as "close enough". */
function answerIndex(q) {
  return q.options.indexOf(q.compute());
}

/* The correct option indices, as an ARRAY: a question is allowed more than one
   right answer, even though every question today has exactly one.

   Throws rather than returning something wrong. A page that cannot work out
   which answer is correct must fail loudly — marking the wrong option green on
   a projector is the failure this whole file exists to prevent. */
function correctIndices(q) {
  const i = answerIndex(q);
  if (i < 0) throw new Error('questions.js: ' + q.id + ' computed "' + q.compute()
    + '", which matches none of its options');
  return [i];
}

/* The questions belonging to one part of the talk, in order. This is what makes
   questions.js the single source: the presentation no longer decides which
   questions a part carries, it asks. */
function questionsForPart(part) {
  return QUESTIONS.filter(q => q.part === part);
}

/* Every question at once, for the self-check page and for any caller that
   wants to fail early rather than mid-presentation. */
function checkQuestions() {
  return QUESTIONS.map(q => {
    const value = q.compute();
    const index = q.options.indexOf(value);
    return { id: q.id, part: q.part, computed: value, index,
             option: index < 0 ? null : q.options[index], ok: index >= 0 };
  });
}
