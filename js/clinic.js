// Where patients come from. Regulars (patients.js) are fixed people who keep coming back.
// Walk-ins (walkins.js) are case templates; each time one is drawn, a fresh random person plays it.
// A shuffled deck makes every case show up once before any repeats.
(function () {
  const C = window.CLINIC = {};
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  const NAMES = {
    A: ['ANDY', 'AMY', 'ABE', 'ALMA', 'ARLO'], B: ['BOB', 'BEA', 'BUD', 'BRAD', 'BETH'],
    C: ['CARL', 'CODY', 'CHAZ', 'CLEO', 'CORA'], D: ['DAVE', 'DEB', 'DOUG', 'DANA', 'DALE'],
    E: ['ED', 'EVE', 'ELLA', 'EARL', 'ENZO'], F: ['FRAN', 'FLO', 'FINN', 'FAYE', 'FRED'],
    G: ['GUS', 'GIL', 'GLEN', 'GINA', 'GWEN'], H: ['HAL', 'HANK', 'HOPE', 'HUGO', 'HEIDI'],
    I: ['IVY', 'IKE', 'IDA', 'IAN', 'IRMA'], J: ['JEN', 'JOE', 'JUNE', 'JAKE', 'JODI'],
    K: ['KEN', 'KIM', 'KYLE', 'KAT', 'KURT'], L: ['LOU', 'LEN', 'LIZ', 'LANA', 'LYLE'],
    M: ['MEG', 'MAX', 'MO', 'MIMI', 'MILO'], N: ['NED', 'NAN', 'NOAH', 'NORA', 'NICK'],
    O: ['OTIS', 'OLGA', 'OZ', 'OLLIE', 'ODIN'], P: ['PAM', 'PETE', 'PAT', 'PIA', 'PHIL'],
    Q: ['QUINN'], R: ['RAY', 'RITA', 'ROB', 'RUTH', 'RHYS'], S: ['SUE', 'SID', 'STU', 'SKIP', 'SASHA'],
    T: ['TIM', 'TINA', 'TOM', 'TESS', 'TROY'], U: ['UMA', 'URSA'], V: ['VIC', 'VAL', 'VERN', 'VERA'],
    W: ['WES', 'WALT', 'WANDA', 'WIN'], X: ['XAVI'], Y: ['YURI', 'YVES'], Z: ['ZOE', 'ZEKE', 'ZED'],
  };
  const ALL_NAMES = [].concat(...Object.values(NAMES));
  const NAME_MAX = 14; // fits the battle HUD

  // Alliterative where it fits: "AIRPOD ANDY".
  function firstName(nick) {
    const room = NAME_MAX - nick.length - 1;
    const fit = (list) => list.filter((n) => n.length <= room);
    return pick(fit(NAMES[nick[0]] || []).length ? fit(NAMES[nick[0]]) : fit(ALL_NAMES).length ? fit(ALL_NAMES) : ['AL']);
  }

  function rollLook(over) {
    return Object.assign({
      hair: pick(['short', 'short', 'long', 'long', 'spiky', 'bun', 'cap', 'mohawk', 'bald']),
      hairC: pick([1, 2, 3, 3]),
      eyes: pick(['dot', 'dot', 'tired', 'tired', 'worried', 'angry', 'glasses', 'shades']),
      mouth: pick(['open', 'open', 'frown', 'smile', 'flat', 'wavy']),
    }, over || {});
  }

  // Generic reactions for walk-in cases that don't write their own.
  const FALLBACK = {
    backfire: '{P} READS THE FIRST LINE, SIGHS, AND HANDS IT BACK. "I DON\'T DO HOMEWORK."',
    hellfire: '{P} SCREAMS. THEN ASKS IF THIS VISIT IS STILL COVERED BY INSURANCE.',
    win: '{P} LEAVES. A NEW PATIENT SITS DOWN IN THE WARM CHAIR BEFORE IT CAN COOL.',
  };

  const fill = (v, name) => typeof v === 'string' ? v.replace(/\{P\}/g, name)
    : Array.isArray(v) ? v.map((x) => fill(x, name))
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x, name)]))
    : v;

  C.cases = () => {
    if (!C.byId) {
      C.byId = {};
      PATIENTS.forEach((p) => { p.regular = true; p.tid = p.id; p.spec = { tid: p.id }; C.byId[p.id] = p; });
      WALKINS.forEach((t) => { C.byId[t.id] = t; });
    }
    return C.byId;
  };

  // spec: { tid } for a regular, { tid, first, age, look } for a walk-in.
  C.make = (spec) => {
    const t = C.cases()[spec.tid];
    if (!t) return null;
    if (t.regular) return t;
    const p = fill(Object.assign({}, FALLBACK, t), spec.first);
    return Object.assign(p, {
      id: `${t.id}:${spec.first}:${spec.age}`, tid: t.id, spec,
      name: `${t.nick} ${spec.first}`, short: spec.first, hp: t.hp || 24, w: 1,
      chart: `${spec.age} Y/O. ${p.chart}`,
      sprite: SPR.makePatient(spec.look),
    });
  };

  C.roll = (tid) => {
    const t = C.cases()[tid];
    if (t.regular) return { tid };
    const [a, b] = t.age || [19, 72];
    return { tid, first: firstName(t.nick), age: rnd(a, b), look: rollLook(t.look) };
  };

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  // Every walk-in once per deck; regulars once, Frank twice (he's frequent).
  function newDeck() {
    const ids = WALKINS.map((t) => t.id).concat(PATIENTS.map((p) => p.id), ['frank']);
    return shuffle(ids);
  }

  // Draw the next patient. `present` lists regulars already in the building, who can't arrive twice.
  C.draw = (g, present) => {
    for (let tries = 0; tries < 100; tries++) {
      if (!g.deck || !g.deck.length) g.deck = newDeck();
      const tid = g.deck.pop();
      if (C.cases()[tid].regular && present.includes(tid)) continue;
      return C.make(C.roll(tid));
    }
    return C.make(C.roll(pick(WALKINS).id));
  };
})();
