/* The Photoelectric Effect — the quiz questions.
 *
 * Three questions. The talk runs three times in ten minutes, poster-session
 * style, so there is room for about 80 seconds of actual teaching and three
 * questions at roughly 40 seconds each. Loaded by present.html and quiz.html.
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
    /* The hook, and the teacher's "whether electrons are emitted". The
       intuitive answer is wrong: 700 nm carries 1.77 eV, sodium needs 2.30 eV,
       so no amount of brightness helps. Derived from emits, not asserted. */
    compute: () => physics(700, 100, phiOf('Sodium')).emits
      ? 'More electrons come out'
      : 'Nothing comes out at all'
  },
  {
    id: 'Q2', part: 4,
    text: 'Cesium needs 2.14 eV to release an electron; copper needs 4.70 eV. Which one needs shorter-wavelength light?',
    options: ['Cesium', 'Copper', 'They need the same wavelength'],
    /* The work function as the second input the teacher names. A higher work
       function means a SHORTER threshold wavelength — compared, not assumed. */
    compute: () => {
      const cs = physics(400, 50, phiOf('Cesium')).threshold;
      const cu = physics(400, 50, phiOf('Copper')).threshold;
      if (cs === cu) return 'They need the same wavelength';
      return cu < cs ? 'Copper' : 'Cesium';
    }
  },
  {
    id: 'Q3', part: 6,
    text: 'Sodium under 400 nm light: each electron escapes with 0.80 eV. Now we make the light twice as bright. What is the maximum kinetic energy now?',
    options: ['1.60 eV', '0.80 eV', '0.40 eV', 'No electrons come out'],
    /* The point of the entire experiment: brightness changes HOW MANY electrons
       escape and changes their energy not at all. Worded to stand alone, since
       the question that set up 0.80 eV was cut to fit three minutes.
       Computed at 100% intensity — the same light, twice over. */
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
