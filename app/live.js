/* The Photoelectric Effect — the connection to the quiz room.
 *
 * One WebSocket, used by both pages: present.html connects as the presenter and
 * pushes questions, quiz.html connects as a player and answers them.
 *
 * Everything here is optional. If the room cannot be reached, both pages carry
 * on without it — the presenter still presents, and each phone still keeps its
 * own score. Nothing in this file may ever be required for the talk to happen.
 */

const Live = (function () {

  /* The deployed room. Change this if the Worker moves. */
  const ENDPOINT = 'wss://the-photoelectric-effect.a15222103.workers.dev/ws';

  /* ONE room. Which GROUP is live is decided by the presenter and lives on the
     server, so the audience chooses nothing: whoever joins lands in whatever
     group is running at that moment. */
  const ROOM = 'main';

  let ws = null;
  let role = 'player';
  let open = false;
  let part = null;
  let openQuestion = null;
  let retry = 0;
  let wantOpen = false;
  let session = null;      /* which group the server says is live */
  const listeners = [];

  function emit(type, detail) {
    listeners.forEach(fn => { try { fn(type, detail); } catch (e) {} });
  }

  function url() {
    const u = new URL(ENDPOINT);
    u.searchParams.set('room', ROOM);
    if (role === 'presenter') {
      u.searchParams.set('role', 'presenter');
      const secret = new URLSearchParams(location.search).get('secret');
      if (secret) u.searchParams.set('secret', secret);
    }
    return u.toString();
  }

  function connect() {
    wantOpen = true;
    try { ws = new WebSocket(url()); }
    catch (e) { scheduleRetry(); return; }

    ws.onopen = () => { retry = 0; };

    ws.onmessage = ev => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }

      if (msg.type === 'hello') {
        open = true;
        part = msg.part;
        session = msg.session;
        openQuestion = msg.open;
        emit('open', msg);
        /* Come back as who we were before the screen locked, rather than
           joining again as a second person with no score. */
        const me = typeof Scoreboard !== 'undefined' && Scoreboard.me();
        if (me && me.token) send({ type: 'resume', token: me.token });
        return;
      }

      if (msg.type === 'sessionChanged') { session = msg.session; part = msg.part; openQuestion = null; }
      if (msg.type === 'partOpened')   { part = msg.part; openQuestion = { qid: msg.qid, part: msg.part }; }
      if (msg.type === 'questionClosed') openQuestion = null;
      if (msg.type === 'partChanged')  { part = msg.part; openQuestion = null; }

      emit(msg.type, msg);
    };

    ws.onclose = () => {
      const was = open;
      open = false;
      ws = null;
      if (was) emit('close', null);
      if (wantOpen) scheduleRetry();
    };

    ws.onerror = () => { /* onclose always follows; handle it there */ };
  }

  /* Back off, but never give up: a phone that reconnects on its own is the
     difference between a blip and someone dropping out of the quiz. */
  function scheduleRetry() {
    retry = Math.min(retry + 1, 6);
    setTimeout(() => { if (wantOpen && !ws) connect(); }, Math.min(1000 * retry, 5000));
  }

  function send(msg) {
    if (!ws || ws.readyState !== 1) return false;
    try { ws.send(JSON.stringify(msg)); return true; } catch (e) { return false; }
  }

  return {
    on(fn) { listeners.push(fn); },

    /* opts: { as: 'presenter' | 'player' } */
    start(opts) {
      role = (opts && opts.as) || 'player';
      connect();
    },

    stop() { wantOpen = false; if (ws) try { ws.close(); } catch (e) {} },

    isOpen:       () => open,
    session:      () => session,
    currentPart:  () => part,
    openQuestion: () => openQuestion,

    join(name)              { return send({ type: 'join', name: name }); },
    submitAnswer(qid, choice) { return send({ type: 'answer', qid: qid, choice: choice }); },

    /* Presenter only. `answer` is the array of correct option indices, computed
       by the page from physics.js — the server never works it out itself. */
    openQuestionFor(part, qid, answer) {
      return send({ type: 'openPart', part: part, qid: qid, answer: answer });
    },
    closeQuestion(qid) { return send({ type: 'closeQuestion', qid: qid }); },
    setPart(part)      { return send({ type: 'setPart', part: part }); },

    /* Presenter only: start the next group of the poster session. */
    newSession()       { return send({ type: 'newSession' }); },

    /* Presenter only: clear this group entirely and put everyone out. */
    resetRoom()        { return send({ type: 'resetRoom' }); }
  };
})();
