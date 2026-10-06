/* The Photoelectric Effect — score-keeping and synchronisation.
 *
 * Everything to do with who you are, what you answered and what you scored goes
 * through this one module. Nothing else may touch storage or the network.
 *
 * WHY IT EXISTS: the quiz has to work in two modes — alone on a phone, and
 * connected to the Cloudflare backend — and it has to be able to fall from the
 * second into the first MID-SESSION, without anybody reloading a page.
 *
 * So the two are NOT alternatives that get swapped at build time. The local
 * score is kept ALWAYS, written on every answer whether a socket is open or
 * not. When the connection drops, there is nothing to restore: the local copy
 * has been running in parallel the whole time, and the page simply stops
 * waiting for the presenter. What is permanently lost is the shared
 * leaderboard, which this file never pretends to recover.
 *
 * The networked half lands with the Worker in task F. The interface below is
 * the one BACKEND_STRUCTURE.md §3 specifies, so that step adds a transport
 * rather than rewriting callers.
 */

const Scoreboard = (function () {

  /* ---- Storage ---------------------------------------------------------
     Every read and write is wrapped. iOS Safari in private browsing throws on
     write, and a thrown quiz is worse than one that forgets. */
  let persists = true;

  function get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { persists = false; return fallback; }
  }

  function set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { persists = false; return false; }
  }

  /* ---- State ------------------------------------------------------------ */

  let me      = get('pe.me', null);        /* { name, n, display, token } */
  let score   = get('pe.score', 0);
  let answers = get('pe.answers', {});     /* qid -> chosen index */
  let online  = false;                     /* true once a transport is live */
  let transport = null;                    /* set in task F */

  const listeners = [];
  function emit(type, detail) {
    listeners.forEach(fn => { try { fn(type, detail); } catch (e) {} });
  }

  /* ---- The interface ---------------------------------------------------- */

  return {
    /* Subscribe to 'joined', 'answered', 'online', 'offline', 'partOpened'. */
    on(fn) { listeners.push(fn); },

    me:       () => me,
    score:    () => score,
    answers:  () => Object.assign({}, answers),
    isOnline: () => online,

    /* False once any write has failed — the page should say the score will not
       survive a reload rather than pretend it will. */
    persists: () => persists,

    /* Has this question already been answered? One answer each, no changes. */
    hasAnswered(qid) { return Object.prototype.hasOwnProperty.call(answers, qid); },

    /* Join, or come back as who you already were.

       The number is assigned from this phone's own storage, so two phones can
       both be #1. Only the server can hand out identities unique across a room,
       and it will: in task F the server's answer replaces this one. */
    join(name) {
      if (me) return me;
      const n = get('pe.counter', 0) + 1;
      set('pe.counter', n);
      me = { name: name, n: n, display: name + ' #' + n, token: null };
      set('pe.me', me);
      emit('joined', me);
      return me;
    },

    /* Record an answer. Scores locally always; the server scores independently
       when connected, and its result wins because a phone must not be able to
       award itself points. */
    submitAnswer(qid, choice, correct) {
      if (this.hasAnswered(qid)) return { correct: null, score: score, already: true };

      answers[qid] = choice;
      set('pe.answers', answers);
      if (correct) { score++; set('pe.score', score); }

      if (transport) transport.submitAnswer(qid, choice);

      emit('answered', { qid: qid, choice: choice, correct: correct, score: score });
      return { correct: correct, score: score, already: false };
    },

    /* Local mode knows only this phone. The projected leaderboard needs the
       backend, and saying so here is more honest than returning a list of one. */
    standings() {
      if (!me) return [];
      return [{ display: me.display, score: score, self: true }];
    },

    /* Which part the presenter has opened. Null when nothing is pushing, which
       is what tells the page to walk itself forward instead of waiting. */
    currentPart() { return transport ? transport.currentPart() : null; },

    /* Wipe this phone and start again. */
    reset() {
      me = null; score = 0; answers = {};
      ['pe.me', 'pe.score', 'pe.answers'].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      emit('reset', null);
    },

    /* The server's identity replaces the one this phone invented. Its number
       is unique across the room; ours never could be. Called on 'joined'. */
    adopt(server) {
      me = {
        name: me ? me.name : server.display,
        n: server.id,
        display: server.display,
        token: server.token
      };
      set('pe.me', me);
      if (typeof server.score === 'number') { score = server.score; set('pe.score', score); }
      emit('joined', me);
      return me;
    },

    /* The server's score wins. A phone must not be able to disagree with the
       room about what it scored. */
    syncScore(n) {
      if (typeof n !== 'number' || n === score) return;
      score = n;
      set('pe.score', score);
      emit('answered', { qid: null, choice: null, correct: null, score: score });
    },

    /* Record that a question was answered without scoring it again - used when
       the server confirms an answer this phone already counted locally. */
    noteAnswered(qid, choice) {
      if (this.hasAnswered(qid)) return;
      answers[qid] = choice;
      set('pe.answers', answers);
    },

    /* The transport, when one is connected. Everything above keeps working
       unchanged; the only difference is that answers are also sent, and
       questions start arriving instead of the page walking itself forward. */
    attach(t) {
      transport = t;
      online = true;
      emit('online', null);
    },

    detach(reason) {
      transport = null;
      online = false;
      emit('offline', reason || null);
    }
  };
})();
