/* The Photoelectric Effect — the quiz questions.
 *
 * Six questions, from SPEC.md §4. Loaded by present.html and quiz.html.
 * Classic script, like physics.js — see the note there.
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
 */

/* Work functions come from MATERIALS in physics.js, never retyped here, so a
   question can never quote a φ the simulation does not use. */
function phiOf(name) {
  const m = MATERIALS.find(x => x.name === name);
  if (!m) throw new Error('questions.js: no material named ' + name);
  return m.phi;
}

const fmtEv = v => v.toFixed(2) + ' eV';
const fmtNm = v => v.toFixed(1) + ' nm';

const QUESTIONS = [
  {
    id: 'Q1', part: 2,
    text: 'Sodium, red light at 700 nm. We turn the brightness all the way up. What happens?',
    options: [
      'More electrons come out',
      'The electrons come out faster',
      'Nothing comes out at all'
    ],
    /* Derived from emits, not asserted: 700 nm carries 1.77 eV, sodium needs
       2.30 eV, so no brightness can help. */
    compute: () => physics(700, 100, phiOf('Sodium')).emits
      ? 'More electrons come out'
      : 'Nothing comes out at all'
  },
  {
    id: 'Q2', part: 3,
    text: 'Which photon carries more energy — violet light at 400 nm, or red light at 700 nm?',
    options: [
      'The 400 nm violet photon',
      'The 700 nm red photon',
      'They carry the same energy'
    ],
    compute: () => {
      const violet = physics(400, 50, phiOf('Sodium')).energy;
      const red    = physics(700, 50, phiOf('Sodium')).energy;
      if (violet === red) return 'They carry the same energy';
      return violet > red ? 'The 400 nm violet photon' : 'The 700 nm red photon';
    }
  },
  {
    id: 'Q3', part: 4,
    text: 'Cesium needs 2.14 eV to release an electron; copper needs 4.70 eV. Which one needs shorter-wavelength light?',
    options: ['Cesium', 'Copper', 'They need the same wavelength'],
    /* A higher work function means a SHORTER threshold wavelength. Compared,
       not assumed. */
    compute: () => {
      const cs = physics(400, 50, phiOf('Cesium')).threshold;
      const cu = physics(400, 50, phiOf('Copper')).threshold;
      if (cs === cu) return 'They need the same wavelength';
      return cu < cs ? 'Copper' : 'Cesium';
    }
  },
  {
    id: 'Q4', part: 5,
    text: 'Zinc needs 4.30 eV. What is the longest wavelength of light that still releases an electron?',
    options: ['288.3 nm', '180.0 nm', '539.1 nm', '4.30 nm'],
    compute: () => fmtNm(physics(400, 50, phiOf('Zinc')).threshold)
  },
  {
    id: 'Q5', part: 6,
    text: 'Sodium needs 2.30 eV to release an electron, and each photon of this light delivers 3.10 eV. What is the maximum kinetic energy of the electron?',
    options: ['0.80 eV', '3.10 eV', '2.30 eV', '5.40 eV'],
    compute: () => fmtEv(physics(400, 50, phiOf('Sodium')).k)
  },
  {
    id: 'Q6', part: 6,
    text: 'Same light, same metal — but now we make the light twice as bright. What is the maximum kinetic energy now?',
    options: ['1.60 eV', '0.80 eV', '0.40 eV', 'No electrons come out'],
    /* The point of the whole experiment: doubling the intensity doubles how
       MANY electrons escape and changes their energy not at all. Computed at
       100% against Q5's 50% so the two really are the same light twice over. */
    compute: () => fmtEv(physics(400, 100, phiOf('Sodium')).k)
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
