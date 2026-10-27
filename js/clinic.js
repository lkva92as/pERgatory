// Where patients come from. Regulars (patients.js) are fixed people who keep coming back.
// Walk-ins (walkins.js) are case templates; each time one is drawn, a fresh random person plays it.
// A shuffled deck makes every case show up once before any repeats.
(function () {
  const C = window.CLINIC = {};
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  const NAMES = {
    A: ['ANDY', 'AMY', 'ABE', 'ALMA', 'ARLO', 'ANDRE', 'ANA'], B: ['BOB', 'BEA', 'BUD', 'BRAD', 'BETH'],
    C: ['CARL', 'CODY', 'CHAZ', 'CLEO', 'CORA', 'CHEN'], D: ['DAVE', 'DEB', 'DOUG', 'DANA', 'DALE', 'DEJA', 'DION'],
    E: ['ED', 'EVE', 'ELLA', 'EARL', 'ENZO', 'ESSIE'], F: ['FRAN', 'FLO', 'FINN', 'FAYE', 'FRED', 'FARAH'],
    G: ['GUS', 'GIL', 'GLEN', 'GINA', 'GWEN'], H: ['HAL', 'HANK', 'HOPE', 'HUGO', 'HEIDI', 'HIRO'],
    I: ['IVY', 'IKE', 'IDA', 'IAN', 'IRMA', 'IMANI'], J: ['JEN', 'JOE', 'JUNE', 'JAKE', 'JODI', 'JADA', 'JAMAL'],
    K: ['KEN', 'KIM', 'KYLE', 'KAT', 'KURT', 'KIARA', 'KENJI'], L: ['LOU', 'LEN', 'LIZ', 'LANA', 'LYLE', 'LUIS', 'LUPE'],
    M: ['MEG', 'MAX', 'MO', 'MIMI', 'MILO', 'MAE', 'MALIK', 'MEI'], N: ['NED', 'NAN', 'NOAH', 'NORA', 'NICK', 'NIA'],
    O: ['OTIS', 'OLGA', 'OZ', 'OLLIE', 'ODIN', 'OMAR'], P: ['PAM', 'PETE', 'PAT', 'PIA', 'PHIL', 'PRIYA'],
    Q: ['QUINN'], R: ['RAY', 'RITA', 'ROB', 'RUTH', 'RHYS', 'RAJ'], S: ['SUE', 'SID', 'STU', 'SKIP', 'SASHA', 'SHAY', 'SANTI'],
    T: ['TIM', 'TINA', 'TOM', 'TESS', 'TROY', 'TIANA', 'TREY'], U: ['UMA', 'URSA'], V: ['VIC', 'VAL', 'VERN', 'VERA'],
    W: ['WES', 'WALT', 'WANDA', 'WIN', 'WEI'], X: ['XAVI'], Y: ['YURI', 'YVES', 'YUSUF'], Z: ['ZOE', 'ZEKE', 'ZED'],
  };
  const FEM = new Set(('AMY ALMA ANA BEA BETH CLEO CORA DEB DANA DEJA EVE ELLA ESSIE FRAN FLO FAYE FARAH GINA GWEN HOPE ' +
    'HEIDI IVY IDA IRMA IMANI JEN JUNE JODI JADA KIM KAT KIARA LIZ LANA LUPE MEG MIMI MAE MEI NAN NORA NIA OLGA PAM PIA ' +
    'PRIYA RITA RUTH SUE SASHA SHAY TINA TESS TIANA UMA URSA VAL VERA WANDA ZOE').split(' '));
  const ALL_NAMES = [].concat(...Object.values(NAMES));
  const NAME_MAX = 14; // fits the battle HUD

  // Alliterative where it fits: "AIRPOD ANDY". `fem` limits the pick to women's names.
  function firstName(nick, fem) {
    const room = NAME_MAX - nick.length - 1;
    const fit = (list) => list.filter((n) => n.length <= room && (!fem || FEM.has(n)));
    const own = fit(NAMES[nick[0]] || []), any = fit(ALL_NAMES);
    return pick(own.length ? own : any.length ? any : ['AL']);
  }

  function rollLook(over) {
    const L = {
      skin: pick([1, 1, 'mid', 'mid', 2, 2]),
      hair: pick(['short', 'short', 'long', 'long', 'spiky', 'bun', 'cap', 'mohawk', 'bald']),
      hairC: pick([1, 2, 3, 3]),
      eyes: pick(['dot', 'dot', 'tired', 'tired', 'worried', 'angry', 'glasses', 'shades']),
      mouth: pick(['open', 'open', 'frown', 'smile', 'flat', 'wavy']),
    };
    if (L.skin !== 1 && L.hairC === 2) L.hairC = 3; // mid-gray hair disappears into darker skin
    return Object.assign(L, over || {});
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

  // How absurd each case is: 1 is an ordinary bad night, 5 is unhinged. Later nights unlock higher levels.
  const TIERS = {
    1: 'steve wendy chad frank lonely lozenge fever hasty bigtoe tooth hangnail shoes insomnia',
    2: 'iris opal sal ted sam painless dandruff lotion booger hiccup almost scratch apple roach denim stones lift ride early soup gargle bottle hamster disco buffet glued',
    3: 'gary roz haircut pinky pulse whoop pebble puddle migraine salon socket nicked yoga warmice evidence hotel sibling foreman halves scooter pizzaroll lasik boots lobster',
    4: 'nuggets gator laser psychic wallet lawsuit chicken mussel yacht combo sweetcorn banana turkey puppy rabbit redial gull gadget magpie facial delivery tinfoil',
    5: 'toast carryon egg pants bulb shark movers swing',
  };

  C.cases = () => {
    if (!C.byId) {
      C.byId = {};
      PATIENTS.forEach((p) => { p.regular = true; p.tid = p.id; p.spec = { tid: p.id }; C.byId[p.id] = p; });
      WALKINS.forEach((t) => { C.byId[t.id] = t; });
      Object.entries(TIERS).forEach(([tier, ids]) => ids.split(' ').forEach((id) => { C.byId[id].tier = +tier; }));
      Object.values(C.byId).forEach((c) => { if (!c.tier) console.warn('no tier for case', c.id); });
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
      look: spec.look,
      sprite: SPR.makePatient(spec.look),
    });
  };

  C.roll = (tid) => {
    const t = C.cases()[tid];
    if (t.regular) return { tid };
    const [a, b] = t.age || [19, 72];
    const look = rollLook(t.look);
    // Some walk-ins come straight from bed: Black women in silk bonnets (unless the case sets the hair or headwear).
    const bonnet = !(t.look && (t.look.hair || t.look.extra)) && Math.random() < 0.18;
    if (bonnet) Object.assign(look, { hair: 'bonnet', skin: pick([2, 2, 'mid']), bonnetC: pick([0, 1]) });
    return { tid, first: firstName(t.nick, bonnet), age: rnd(a, b), look };
  };

  // The absurdity level a night draws from: night 1 is ordinary, night 7 on is unhinged.
  C.level = (night) => [1, 2, 2, 3, 4, 4][night - 1] || 5;

  // Draw the next patient: mostly from tonight's level, some from the two levels below, never above.
  // Cases already in the building can't arrive twice, and nobody repeats this shift until their
  // levels run dry, except Frank, who is frequent.
  C.draw = (g, present) => {
    const lvl = C.level(g.night);
    const weight = (c) => [6, 3, 1][lvl - c.tier] || 0;
    const open = Object.values(C.cases()).filter((c) => weight(c) && !present.includes(c.id));
    let pool = open.filter((c) => c.id === 'frank' || !g.drawn.includes(c.id));
    if (!pool.length) {
      g.drawn = g.drawn.filter((id) => !open.some((c) => c.id === id));
      pool = open;
    }
    if (!pool.length) return C.make(C.roll(pick(WALKINS).id));
    let r = Math.random() * pool.reduce((a, c) => a + weight(c), 0), c = pool[0];
    for (const x of pool) { r -= weight(x); if (r <= 0) { c = x; break; } }
    g.drawn.push(c.id);
    return C.make(C.roll(c.id));
  };
})();
