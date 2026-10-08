/* The Photoelectric Effect — the quiz questions.
 *
 * Four questions, numbered Q1 to Q4 with no gaps - two earlier ones were
 * cut, and a button bar that reads Q1 Q3 Q4 Q5 invites the question of where
 * the missing one went. Slides 2 and 4 carry none. The talk runs three times in ten minutes,
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
      'A violet photon',
      'A red photon',
      'They carry the same energy',
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
    id: 'Q2', part: 3,
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
    id: 'Q3', part: 3,
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
       + 'for the emitted electron’s motion. This holds for every metal, '
       + 'not just this one.'
  },
  {
    /* Asked on the metal slide, about the metal that does nothing. Slide 4
       showed brightness mattering; this asks what brightness is worth when
       the photon cannot pay the entrance fee in the first place. */
    id: 'Q4', part: 5,
    text: 'Copper is not emitting electrons. We keep the wavelength fixed and '
        + 'increase the light intensity. What changes?',
    options: [
      'Nothing changes.',
      'More electrons escape per second.',
      'The maximum electron speed increases.',
      'Both the number and the maximum speed increase.'
    ],
    /* Every one of the four is reachable from the model, so the answer is
       genuinely read off rate and k rather than being the only sentence that
       fits. Copper at 400 nm is 3.10 eV against a 4.70 eV barrier, so neither
       quantity moves and the answer is the first. */
    compute: () => {
      const phi    = phiOf('Copper');
      const dim    = physics(400, 50, phi);
      const bright = physics(400, 100, phi);
      const more   = bright.rate > dim.rate;
      const faster = bright.k > dim.k;
      if (more && faster)  return 'Both the number and the maximum speed increase.';
      if (more && !faster) return 'More electrons escape per second.';
      if (!more && faster) return 'The maximum electron speed increases.';
      return 'Nothing changes.';
    },
    why: 'Each copper photon is still worth 3.10 eV against a 4.70 eV barrier. '
       + 'Sending more of them only sends more photons that cannot free an electron.'
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
