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
    options: ['A red photon', 'A violet photon'],
    /* Slide 1, straight after E = hc/λ: shorter wavelength, more energy per
       photon. Compared at 700 nm against 400 nm rather than asserted. The
       material is irrelevant here — photon energy does not depend on it. */
    compute: () => {
      const red    = physics(700, 50, phiOf('Sodium')).energy;
      const violet = physics(400, 50, phiOf('Sodium')).energy;
      if (violet === red) return null;
      return violet > red ? 'A violet photon' : 'A red photon';
    },
    why: 'Violet light has a higher frequency, so each photon carries more energy.'
  },
  {
    id: 'Q2', part: 2,
    text: 'A photon has less energy than the metal’s work function. '
        + 'Can it release an electron?',
    options: ['Yes — the electron escapes.', 'No — the electron stays.'],
    /* Slide 2, the work function as a threshold. The concrete case behind the
       wording is 700 nm on sodium: 1.77 eV against 2.30 eV. The answer is
       whatever emits says about that case, not what the wording implies. */
    compute: () => {
      const r = physics(700, 100, phiOf('Sodium'));
      if (r.energy >= r.phi) return null;   /* premise gone: no longer "less than φ" */
      return r.emits ? 'Yes — the electron escapes.' : 'No — the electron stays.';
    },
    why: 'The photon does not provide enough energy to overcome the work function.'
  },
  {
    id: 'Q3', part: 3,
    text: '700 nm red light does not release electrons from sodium. '
        + 'Which change will help?',
    options: ['Make the same red light brighter.', 'Switch to 400 nm violet light.'],
    /* The hook. The intuitive answer is the wrong one: brightness sends more
       photons, and no number of photons that are individually too weak adds up
       to one that is strong enough. Both branches are evaluated — the question
       is only valid while exactly one of them emits. */
    compute: () => {
      const phi      = phiOf('Sodium');
      const brighter = physics(700, 100, phi).emits;
      const violet   = physics(400, 50, phi).emits;
      if (brighter === violet) return null;   /* both work, or neither: no answer */
      return violet ? 'Switch to 400 nm violet light.' : 'Make the same red light brighter.';
    },
    why: 'Each 400 nm photon now has enough energy to release an electron from sodium. '
       + 'Adding more red photons does not overcome the energy barrier in this model.'
  },
  {
    id: 'Q4', part: 3,
    text: 'Electrons are already escaping. We shorten the wavelength while '
        + 'keeping the same metal. What happens to their maximum speed?',
    options: ['It increases.', 'It stays the same.'],
    /* Kmax = hf − φ, the teacher's "what kinetic energy they acquire". 400 nm
       against 300 nm on sodium, both above threshold, k compared. */
    compute: () => {
      const phi     = phiOf('Sodium');
      const longer  = physics(400, 50, phi);
      const shorter = physics(300, 50, phi);
      if (!longer.emits || !shorter.emits) return null;  /* premise: already escaping */
      if (shorter.k > longer.k) return 'It increases.';
      if (shorter.k === longer.k) return 'It stays the same.';
      return null;
    },
    why: 'Shorter wavelengths provide more energy per photon, leaving more energy '
       + 'for the emitted electron’s motion.'
  },
  {
    id: 'Q5', part: 4,
    text: 'Sodium is emitting electrons. We keep the wavelength fixed and '
        + 'increase the light intensity. What changes?',
    options: ['More electrons escape per second.', 'The maximum electron speed increases.'],
    /* The pair of ideas the whole talk turns on, side by side: intensity moves
       the RATE, wavelength moves the ENERGY. Both are read off physics() at
       400 nm, dim against bright — rate compared, k compared. */
    compute: () => {
      const phi    = phiOf('Sodium');
      const dim    = physics(400, 50, phi);
      const bright = physics(400, 100, phi);
      if (!dim.emits || !bright.emits) return null;      /* premise: already emitting */
      const moreElectrons = bright.rate > dim.rate;
      const sameEnergy    = bright.k === dim.k;
      if (moreElectrons && sameEnergy) return 'More electrons escape per second.';
      if (!moreElectrons && !sameEnergy) return 'The maximum electron speed increases.';
      return null;
    },
    why: 'More photons arrive, but their individual energies are unchanged, so the '
       + 'maximum electron kinetic energy stays the same.'
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
