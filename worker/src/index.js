/* The Photoelectric Effect — the live quiz room.
 *
 * One Durable Object per run of the quiz, addressed by a room code. A new code
 * is a new object, empty by construction, which is how each of the 4–5 runs
 * gets a fresh leaderboard without a reset command to forget to press.
 *
 * Design and its independent review: BACKEND_STRUCTURE.md, BS_REPORT.md.
 *
 * Two rules this file exists to enforce:
 *
 *   SCORING HAPPENS HERE, not on the phone. If a phone decided whether its own
 *   answer was right, anyone could open the console and award themselves six
 *   points.
 *
 *   THE SERVER NEVER DOES PHYSICS. The presenter's page already loads
 *   physics.js to draw the answer, so it computes the correct option indices
 *   and sends them when it opens a question. The server stores them and
 *   compares integers. The formula therefore exists exactly once, in
 *   physics.js, and cannot drift into a second copy here.
 */

const MAX_NAME = 24;
const MAX_PLAYERS = 60;

/* Points for a correct answer: half guaranteed, half scaled by how quickly it
   arrived, within this window. Being RIGHT is worth far more than being fast -
   a careful answer at the last second still beats a quick wrong one - so speed
   only ever separates people who were both correct. That is the whole job:
   with three to five questions and fifteen people, plain counting ties
   constantly, and a tie nobody can explain is worse than a game show.

   The window is independent of when the presenter reveals. They can talk for a
   minute; only the first 20 seconds affect points. */
const POINT_WINDOW_MS = 20000;
const POINTS_MAX = 1000;
const POINTS_FLOOR = 500;

export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sql = state.storage.sql;

    state.blockConcurrencyWhile(async () => {
      this.sql.exec(`CREATE TABLE IF NOT EXISTS players (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name      TEXT    NOT NULL,
        display   TEXT    NOT NULL,
        score     INTEGER NOT NULL DEFAULT 0,
        correct   INTEGER NOT NULL DEFAULT 0,
        token     TEXT    NOT NULL UNIQUE,
        joined_at INTEGER NOT NULL
      )`);
      /* Rooms created before points existed keep the old shape, and
         CREATE TABLE IF NOT EXISTS will not change it. SQLite has no
         ADD COLUMN IF NOT EXISTS, so try and ignore the failure. */
      try { this.sql.exec('ALTER TABLE players ADD COLUMN correct INTEGER NOT NULL DEFAULT 0'); } catch (e) {}

      /* The key is stored PER QUESTION, not per room. One key per room
         mis-scores late answers silently: a backgrounded phone's answer for Q5
         arriving after Q6 opened would be graded against Q6's key. */
      this.sql.exec(`CREATE TABLE IF NOT EXISTS questions (
        qid       TEXT PRIMARY KEY,
        answer    TEXT    NOT NULL,
        opened_at INTEGER NOT NULL
      )`);

      /* The composite key is what stops a second answer existing at all. */
      this.sql.exec(`CREATE TABLE IF NOT EXISTS answers (
        player_id INTEGER NOT NULL,
        qid       TEXT    NOT NULL,
        choice    INTEGER NOT NULL,
        correct   INTEGER NOT NULL,
        points    INTEGER NOT NULL DEFAULT 0,
        at        INTEGER NOT NULL,
        PRIMARY KEY (player_id, qid)
      )`);
      try { this.sql.exec('ALTER TABLE answers ADD COLUMN points INTEGER NOT NULL DEFAULT 0'); } catch (e) {}

      this.sql.exec(`CREATE TABLE IF NOT EXISTS room (
        k TEXT PRIMARY KEY,
        v TEXT
      )`);
    });
  }

  /* ---- small helpers ---------------------------------------------------- */

  getState(k, fallback) {
    const rows = this.sql.exec('SELECT v FROM room WHERE k = ?', k).toArray();
    return rows.length ? JSON.parse(rows[0].v) : fallback;
  }

  setState(k, v) {
    this.sql.exec('INSERT OR REPLACE INTO room (k, v) VALUES (?, ?)', k, JSON.stringify(v));
  }

  standings() {
    return this.sql
      .exec('SELECT display, score, correct FROM players ORDER BY score DESC, joined_at ASC')
      .toArray();
  }

  send(ws, msg) {
    try { ws.send(JSON.stringify(msg)); } catch (e) { /* socket already gone */ }
  }

  broadcast(msg, role) {
    const text = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      const who = ws.deserializeAttachment() || {};
      if (role && who.role !== role) continue;
      try { ws.send(text); } catch (e) { /* ignore */ }
    }
  }

  pushStandings() {
    this.broadcast({ type: 'standings', rows: this.standings() }, 'presenter');
  }

  /* ---- connection ------------------------------------------------------- */

  async fetch(request) {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response(JSON.stringify({
        room: 'alive',
        players: this.sql.exec('SELECT COUNT(*) AS n FROM players').one().n,
        open: this.getState('open', null)
      }, null, 2) + '\n', { headers: { 'content-type': 'application/json' } });
    }

    /* The presenter is whoever opens the page with the secret in the URL. That
       is adequate for a room of classmates and deliberately not strengthened.
       With no secret configured the role is still granted, but the page is told
       so it can say as much rather than appearing secure. */
    const wanted = url.searchParams.get('role') === 'presenter';
    const expected = this.env.PRESENTER_SECRET || null;
    const given = url.searchParams.get('secret');
    const insecure = wanted && !expected;
    const role = wanted && (!expected || given === expected) ? 'presenter' : 'player';

    if (wanted && role !== 'presenter') {
      return new Response('wrong presenter secret\n', { status: 403 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    /* Hibernation API: the object sleeps between questions, which is most of a
       fifteen-minute talk. */
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ role: role, playerId: null });

    this.send(server, {
      type: 'hello',
      role: role,
      insecure: insecure,
      part: this.getState('part', null),
      open: this.getState('open', null),
      rows: role === 'presenter' ? this.standings() : undefined
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  /* ---- messages --------------------------------------------------------- */

  async webSocketMessage(ws, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    const who = ws.deserializeAttachment() || {};

    switch (msg.type) {

      /* Come back as who you already were. Phones lock their screens and
         suspend sockets; without this a reconnect would create John #2 with a
         score of zero, in front of the room. */
      case 'resume': {
        const rows = this.sql.exec(
          'SELECT id, display, score, correct FROM players WHERE token = ?', String(msg.token || '')
        ).toArray();
        if (!rows.length) { this.send(ws, { type: 'unknown-token' }); return; }
        ws.serializeAttachment({ role: who.role, playerId: rows[0].id });
        this.send(ws, {
          type: 'joined', id: rows[0].id, display: rows[0].display,
          token: msg.token, score: rows[0].score, correctCount: rows[0].correct, resumed: true,
          part: this.getState('part', null), open: this.getState('open', null)
        });
        this.pushStandings();
        return;
      }

      case 'join': {
        const count = this.sql.exec('SELECT COUNT(*) AS n FROM players').one().n;
        if (count >= MAX_PLAYERS) { this.send(ws, { type: 'full' }); return; }

        const name = String(msg.name || 'Anonymous').slice(0, MAX_NAME).trim() || 'Anonymous';

        /* The number that tells two Johns apart. Assigned HERE, by the one
           authority, which is the whole reason a server is involved in
           identity at all. */
        const same = this.sql.exec(
          'SELECT COUNT(*) AS n FROM players WHERE name = ?', name
        ).one().n;
        const display = name + ' #' + (same + 1);
        const token = crypto.randomUUID();

        this.sql.exec(
          'INSERT INTO players (name, display, score, token, joined_at) VALUES (?, ?, 0, ?, ?)',
          name, display, token, Date.now()
        );
        const id = this.sql.exec('SELECT last_insert_rowid() AS id').one().id;
        ws.serializeAttachment({ role: who.role, playerId: id });

        this.send(ws, {
          type: 'joined', id: id, display: display, token: token, score: 0, correctCount: 0,
          part: this.getState('part', null), open: this.getState('open', null)
        });
        this.broadcast({ type: 'joined-count', n: count + 1 }, 'presenter');
        this.pushStandings();
        return;
      }

      /* Presenter opens a question. `answer` is the array of correct option
         indices, computed by present.html from physics.js. */
      case 'openPart': {
        if (who.role !== 'presenter') return;
        const qid = String(msg.qid || '');
        if (!qid) return;

        /* INSERT OR IGNORE: first key wins. A second openPart for a question
           already known is a no-op, which makes a presenter reload mid-question
           safe rather than a way to change the answer. */
        this.sql.exec(
          'INSERT OR IGNORE INTO questions (qid, answer, opened_at) VALUES (?, ?, ?)',
          qid, JSON.stringify(msg.answer || []), Date.now()
        );
        this.setState('part', msg.part == null ? null : msg.part);
        this.setState('open', { qid: qid, part: msg.part == null ? null : msg.part });
        this.broadcast({ type: 'partOpened', part: msg.part, qid: qid });
        return;
      }

      case 'closeQuestion': {
        if (who.role !== 'presenter') return;
        this.setState('open', null);
        this.broadcast({ type: 'questionClosed', qid: String(msg.qid || '') });
        return;
      }

      case 'setPart': {
        if (who.role !== 'presenter') return;
        this.setState('part', msg.part == null ? null : msg.part);
        this.setState('open', null);
        this.broadcast({ type: 'partChanged', part: msg.part });
        return;
      }

      case 'answer': {
        if (!who.playerId) { this.send(ws, { type: 'not-joined' }); return; }
        const qid = String(msg.qid || '');
        const rows = this.sql.exec('SELECT answer, opened_at FROM questions WHERE qid = ?', qid).toArray();
        if (!rows.length) { this.send(ws, { type: 'not-open', qid: qid }); return; }

        /* Late answers are accepted on purpose. The key for THAT question is
           still correct, and rejecting would punish someone for a slow phone. */
        const key = JSON.parse(rows[0].answer);
        const choice = Number(msg.choice);
        const correct = key.indexOf(choice) !== -1;

        /* Both timestamps are taken HERE, so no phone's clock is involved.
           Network latency is inside the measurement, which is fair enough in
           one room on one wifi, and is why points are never shown as times. */
        const now = Date.now();
        const elapsed = Math.max(0, now - rows[0].opened_at);
        const frac = Math.min(elapsed, POINT_WINDOW_MS) / POINT_WINDOW_MS;
        const points = correct
          ? Math.round(POINTS_FLOOR + (POINTS_MAX - POINTS_FLOOR) * (1 - frac))
          : 0;

        const cursor = this.sql.exec(
          'INSERT OR IGNORE INTO answers (player_id, qid, choice, correct, points, at) VALUES (?, ?, ?, ?, ?, ?)',
          who.playerId, qid, choice, correct ? 1 : 0, points, now
        );

        /* The primary key stops a duplicate ROW, but not a second increment
           beside it. Gate the score on the insert having actually inserted,
           or a double tap is worth two scores. */
        if (cursor.rowsWritten > 0 && correct) {
          this.sql.exec(
            'UPDATE players SET score = score + ?, correct = correct + 1 WHERE id = ?',
            points, who.playerId
          );
        }

        const me = this.sql.exec(
          'SELECT score, correct FROM players WHERE id = ?', who.playerId
        ).one();

        this.send(ws, {
          type: 'answered', qid: qid, correct: correct,
          score: me.score, correctCount: me.correct,
          points: cursor.rowsWritten > 0 ? points : 0,
          already: cursor.rowsWritten === 0
        });
        this.pushStandings();
        return;
      }
    }
  }

  async webSocketClose(ws, code, reason) {
    try { ws.close(code, reason); } catch (e) { /* already closed */ }
  }

  async webSocketError() { /* the close is the signal */ }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response('photoelectric quiz room: ok\n', {
        headers: { 'content-type': 'text/plain' }
      });
    }

    if (url.pathname === '/ws') {
      /* One object per room code, so each run starts empty. */
      const room = (url.searchParams.get('room') || 'spike').slice(0, 32);
      const id = env.ROOM.idFromName(room);
      return env.ROOM.get(id).fetch(request);
    }

    return new Response('not found\n', { status: 404 });
  }
};
