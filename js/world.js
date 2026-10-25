// The hospital: tiles, maps (ER downstairs, surgical floor upstairs), NPCs, and things to poke at.
(function () {
  const W = window.WORLD = {};
  const TS = 16;
  W.TS = TS;

  const ER = [
    '##ww##C##ww####BL#E###w####w##',
    '#,,,,,,,,,,P#.......#b.ub.ub.#',
    '#,cccc,cccc,#.......#..u..u..#',
    '#,,,,,,,,,,,#.NNXNN..........#',
    '#,cccc,cccc,#................#',
    '#,,,,,,,,,,,........#..u..u..#',
    '#,,,,,,,,,,,........#b.ub.ub.#',
    '#,cccc,,TTT,#.......##########',
    '#,,,,,,,,,,,#.......#K:::::SS#',
    '#,cccc,,,,,,#.......#::::::::#',
    '#,,,,,,,,,,,#.......:::::::::#',
    '#,,,,,,,,,,,#.......#V::::::R#',
    '#P,,,,,,,,,P#.......#::::::::#',
    '#####DD#######################',
  ];
  ER.unshift('##############################');

  // Surgical floor: three ORs above a hallway. The elevator is on the hallway's back wall.
  const OR = [
    '######################',
    '######################',
    '#;;M;;;#;;M;;;#;;M;;;#',
    '#;;O;;;#;;O;;;#;;O;;;#',
    '#;;Q;;;#;;Q;;;#;;Q;;;#',
    '#;;;;;;#;;;;;;#;;;;;;#',
    '#L#;;#####;;#####;;###',
    '#____________________#',
    '#____________________#',
    '######################',
  ];
  [ER, OR].forEach((m) => m.forEach((r, i) => { if (r.length !== m[0].length) console.warn('map row', i, 'len', r.length); }));

  W.START = { x: 16, y: 7, dir: 'down' };
  const ER_BAYS = [
    { x: 21, y: 2, n: 1 }, { x: 24, y: 2, n: 2 }, { x: 27, y: 2, n: 3 },
    { x: 21, y: 7, n: 4 }, { x: 24, y: 7, n: 5 }, { x: 27, y: 7, n: 6 },
  ];

  W.tile = (x, y) => (x < 0 || y < 0 || x >= W.w || y >= W.h) ? '#' : W.MAP[y][x];
  const WALLISH = '#wCBEL';
  const isWall = (ch) => WALLISH.includes(ch);
  W.solid = (x, y) => !',.:;_'.includes(W.tile(x, y));
  W.isCounter = (ch) => ch === 'T' || ch === 'N' || ch === 'X';
  // Random encounters happen on public floors, never in the break room.
  W.encounterZone = (x, y) => {
    const ch = W.tile(x, y);
    return ch === ',' ? 'waiting' : ch === '.' ? 'hall' : null;
  };

  // ---------- tiles ----------
  function T(base, build) {
    const p = new G.Pix(TS, TS);
    if (base) p.d.set(base.data);
    build(p);
    return p.toSprite();
  }
  const t = {};
  t.floor = T(null, (p) => { p.fill(0).line(0, 15, 15, 15, 1).line(15, 0, 15, 15, 1).set(4, 5, 1).set(10, 11, 1).set(12, 3, 1); });
  t.carpet = T(null, (p) => {
    p.fill(1);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) if ((x % 4 === 0 && y % 4 === 0) || (x % 4 === 2 && y % 4 === 2)) p.set(x, y, 2);
  });
  t.brk = T(null, (p) => { p.fill(0).rect(0, 0, 8, 8, 1).rect(8, 8, 8, 8, 1); });
  t.wallTop = T(null, (p) => { p.fill(3).set(3, 3, 2).set(11, 11, 2); });
  t.wallFace = T(null, (p) => {
    p.fill(1).rect(0, 0, 16, 1, 3).rect(0, 7, 16, 1, 2).rect(0, 12, 16, 1, 3).rect(0, 13, 16, 3, 2);
  });
  t.window = T(t.wallFace, (p) => { p.rect(2, 1, 12, 10, 2).rect(3, 2, 10, 8, 3).set(5, 4, 0).set(10, 3, 0).set(8, 7, 1).set(11, 8, 1); });
  t.clock = T(t.wallFace, (p) => {
    p.ellipse(8, 6, 5.5, 5.5, 3).ellipse(8, 6, 4.5, 4.5, 0);
    p.line(8, 6, 11, 6, 3).line(8, 6, 8, 3, 3).set(8, 2, 2).set(12, 6, 2).set(8, 10, 2).set(4, 6, 2);
  });
  t.board = T(t.wallFace, (p) => { p.rect(1, 1, 14, 10, 3).rect(2, 2, 12, 8, 2).rect(3, 3, 4, 5, 0).rect(8, 4, 5, 4, 0).set(5, 3, 3).set(10, 4, 3); });
  t.exit = T(t.wallFace, (p) => {
    p.rect(2, 2, 12, 6, 3).rect(3, 3, 10, 4, 2);
    [4, 5, 7, 9, 11].forEach((x) => p.line(x, 4, x, 5, 0));
    p.set(6, 4, 0).set(8, 5, 0).set(10, 4, 0).set(11, 4, 0);
  });
  t.chair = T(t.carpet, (p) => {
    p.rect(2, 1, 12, 7, 3).rect(3, 2, 10, 5, 2);
    p.rect(2, 8, 12, 5, 3).rect(3, 8, 10, 4, 1);
    p.rect(3, 13, 1, 3, 3).rect(12, 13, 1, 3, 3);
  });
  t.counter = T(t.floor, (p) => { p.rect(0, 1, 16, 1, 3).rect(0, 2, 16, 5, 0).rect(0, 7, 16, 1, 3).rect(0, 8, 16, 7, 2).rect(0, 15, 16, 1, 3).line(4, 10, 11, 10, 3); });
  t.triage = T(t.counter, (p) => { p.rect(3, 3, 5, 3, 1).rect(9, 2, 4, 4, 1).set(10, 3, 3).set(11, 4, 3); });
  t.computer = T(t.counter, (p) => { p.rect(4, 0, 8, 7, 3).rect(5, 1, 6, 4, 1).rect(7, 7, 2, 1, 3).set(6, 2, 0).set(7, 2, 0); });
  t.bed = T(t.floor, (p) => { p.rect(1, 0, 14, 16, 3).rect(2, 1, 12, 14, 0).rect(4, 2, 8, 3, 1).rect(2, 8, 12, 7, 1).line(2, 8, 13, 8, 2); });
  t.curtain = T(t.floor, (p) => {
    p.rect(2, 0, 12, 1, 3).rect(3, 1, 10, 15, 1);
    [5, 8, 11].forEach((x) => p.line(x, 1, x, 14, 2));
    p.line(2, 1, 2, 15, 3).line(13, 1, 13, 15, 3);
    for (let x = 3; x < 13; x += 2) p.set(x, 15, 2);
  });
  t.door = T(null, (p) => {
    p.fill(3).rect(1, 1, 14, 15, 1).rect(7, 1, 2, 15, 3);
    p.line(2, 10, 5, 4, 0).line(10, 12, 13, 6, 0).line(3, 13, 6, 7, 0);
  });
  t.plant = T(t.carpet, (p) => {
    p.rect(4, 10, 8, 6, 3).rect(5, 11, 6, 4, 2);
    p.line(8, 10, 8, 3, 3).line(8, 5, 4, 8, 3).line(8, 6, 12, 9, 3).line(8, 3, 11, 1, 3);
    p.set(3, 9, 2).set(13, 10, 2).set(12, 1, 2);
  });
  t.coffee = T(t.brk, (p) => { p.rect(2, 0, 12, 15, 3).rect(3, 1, 10, 4, 2).rect(5, 8, 6, 5, 1).rect(6, 7, 4, 1, 3).set(11, 2, 0); });
  t.vend = T(t.brk, (p) => {
    p.rect(1, 0, 14, 16, 3).rect(2, 1, 8, 11, 0);
    for (let y = 2; y < 11; y += 3) for (let x = 3; x < 10; x += 2) p.set(x, y, 2).set(x, y + 1, 1);
    p.rect(11, 2, 3, 6, 2).rect(3, 13, 6, 2, 2);
  });
  t.couch = T(t.brk, (p) => { p.rect(0, 3, 16, 12, 3).rect(1, 4, 14, 4, 2).rect(1, 8, 14, 6, 1).line(8, 8, 8, 13, 2); });
  t.rack = T(t.brk, (p) => { p.line(8, 2, 8, 14, 3).line(5, 15, 11, 15, 3).line(5, 2, 11, 2, 3).rect(8, 3, 6, 9, 3).rect(9, 4, 4, 7, 0); });
  t.dark = T(null, (p) => p.fill(3));
  t.elevator = T(t.wallFace, (p) => {
    p.rect(2, 1, 12, 12, 3).rect(3, 2, 10, 11, 2).line(8, 2, 8, 12, 3);
    p.set(5, 5, 0).line(4, 6, 6, 6, 0).line(10, 5, 12, 5, 0).set(11, 6, 0); // up / down arrows
  });
  // Surgical floor
  t.orFloor = T(null, (p) => { p.fill(0); for (let i = 0; i < 16; i += 8) p.line(i, 0, i, 15, 1).line(0, i, 15, i, 1); });
  t.monA = T(t.orFloor, (p) => {
    p.rect(3, 1, 10, 9, 3).rect(4, 2, 8, 6, 1).rect(7, 10, 2, 4, 3).rect(5, 14, 6, 1, 3);
    p.line(4, 5, 6, 5, 3).line(6, 5, 7, 2, 3).line(7, 2, 8, 7, 3).line(8, 7, 9, 5, 3).line(9, 5, 11, 5, 3);
  });
  t.monB = T(t.monA, (p) => { p.rect(4, 2, 8, 6, 3).rect(7, 3, 2, 3, 0).rect(7, 7, 2, 1, 0); }); // alarm: "!"
  t.tableHead = T(t.orFloor, (p) => {
    p.rect(1, 0, 14, 16, 3).rect(2, 1, 12, 15, 1);
    p.ellipse(8, 6, 4.5, 4.5, 3).ellipse(8, 6, 3.5, 3.5, 0);
    p.line(6, 5, 7, 5, 3).line(9, 5, 10, 5, 3);
    p.line(8, 8, 14, 1, 2); // breathing tube
    p.rect(2, 11, 12, 5, 2); // drape
  });
  t.tableFoot = T(t.orFloor, (p) => {
    p.rect(1, 0, 14, 16, 3).rect(2, 0, 12, 15, 2);
    p.line(5, 1, 5, 9, 3).line(10, 1, 10, 9, 3);
    p.ellipse(5.5, 12, 2, 2.5, 1).ellipse(10.5, 12, 2, 2.5, 1);
  });

  const CH = {
    '.': 'floor', ',': 'carpet', ':': 'brk', c: 'chair', T: 'triage', N: 'counter', X: 'computer',
    b: 'bed', u: 'curtain', D: 'door', P: 'plant', K: 'coffee', V: 'vend', S: 'couch', R: 'rack',
    w: 'window', C: 'clock', B: 'board', E: 'exit', L: 'elevator',
    ';': 'orFloor', _: 'floor', O: 'tableHead', Q: 'tableFoot',
  };

  function tileSprite(x, y) {
    const ch = W.tile(x, y);
    if (ch === '#') {
      if (x < 0 || y < 0 || x >= W.w || y >= W.h) return t.dark;
      return isWall(W.tile(x, y + 1)) ? t.wallTop : t.wallFace;
    }
    if (ch === 'M') return (G.frame >> 4) % 2 ? t.monB : t.monA; // the alarms never stop
    return t[CH[ch]] || t.dark;
  }

  W.draw = (camX, camY) => {
    const x0 = Math.floor(camX / TS), y0 = Math.floor(camY / TS);
    for (let y = y0; y <= y0 + 9; y++) {
      for (let x = x0; x <= x0 + 10; x++) G.draw(tileSprite(x, y), x * TS - camX, y * TS - camY);
    }
  };

  // ---------- NPCs ----------
  const ER_NPCS = [
    { x: 16, y: 3, spr: 'nurse', name: 'NURSE BEV', lines: [
      "IF SOMEONE ASKS FOR A SANDWICH, IT'S GARY. IT'S ALWAYS GARY.",
      "THE ELEVATOR GOES UP TO SURGERY. DON'T GO UP THERE. THEY'LL TRY TO RECRUIT YOU.",
      "I'VE WORKED NIGHTS FOR 300 YEARS. YOU GET USED TO IT.\n(YOU DO NOT GET USED TO IT.)",
      'TIP: CHART A PATIENT TO FIND THEIR WEAKNESS. EVERYONE HAS ONE. MINE IS NIGHTS.',
      "DON'T GET ATTACHED TO AN EMPTY BAY. THEY ALL COME BACK. FRANK ESPECIALLY.",
      'IF YOUR SANITY OR SELF-RESPECT HITS ZERO, THE SHIFT STARTS OVER. ASK ME HOW I KNOW.',
      'THE BREAK ROOM COFFEE REFILLS AFTER EVERY PATIENT. IT IS THE ONLY THING HERE THAT DOES.',
      'IF THE WALLS START BREATHING, THAT IS YOUR SANITY TALKING. DRINK SOME COFFEE.',
      'THE BAYS FILL UP ON THEIR OWN. NOBODY KNOWS HOW. NOBODY ASKS.',
    ] },
    { x: 9, y: 7, spr: 'nurse', name: 'TRIAGE NURSE GLADYS', lines: [
      'EVERYONE IN THE WAITING ROOM IS A LEVEL 1 EMERGENCY. JUST ASK THEM.',
      "THAT MAN HAS BEEN 'ABOUT TO PASS OUT' FOR SIX HOURS. HE'S ON HIS THIRD BURRITO.",
      'I TRIAGED A HANGNAIL AS A 2. I REGRET NOTHING.',
      "SOMEONE ASKED IF WE TAKE THEIR INSURANCE. HONEY, WE TAKE SOULS.",
    ] },
    { x: 3, y: 3, spr: 'skeleton', name: 'PATIENT IN CHAIR 3', lines: [
      'STILL WAITING TO BE SEEN.\nDOOR-TO-DOCTOR TIME: 71 YEARS.',
      '...THEY SAID IT WOULD BE A SHORT WAIT.',
      "DON'T WORRY ABOUT ME, DOC. I'M NOT IN A HURRY ANYMORE.",
      'MY CHIEF COMPLAINT? I FORGET. IT WAS SOMETHING WITH MY KNEE.',
    ] },
    { x: 7, y: 13, spr: 'cerberus', name: 'CERBERUS (SECURITY)', lines: [
      'WOOF. WOOF. WOOF.\n(ONE FROM EACH HEAD.)',
      'CERBERUS IS ON SECURITY DETAIL. NOBODY GETS OUT. ESPECIALLY YOU.',
      'THE LEFT HEAD WANTS PETS. THE RIGHT HEAD WANTS YOUR SOUL. THE MIDDLE HEAD IS ON BREAK.',
      'YOU PET ALL THREE HEADS. YOU FEEL... OKAY. FOR A SECOND.',
    ] },
    { x: 16, y: 10, spr: 'ghost', name: 'MORT THE JANITOR', lines: [
      "I'VE BEEN MOPPING THIS SAME SPOT SINCE 1953. IT IS NEVER CLEAN.",
      "THE VENDING MACHINE TAKES SOULS. LITTLE ONES. YOU WON'T MISS 'EM.",
      "THE CLOCK? DON'T LOOK AT THE CLOCK, DOC. IT LOOKS BACK.",
      'THEY TOLD ME THIS WAS A TEMPORARY POSITION. THAT WAS FOUR LIFETIMES AGO.',
    ] },
  ];
  // Upstairs, everyone is "investing."
  const OR_NPCS = [
    { x: 2, y: 3, spr: 'anesth', name: 'DR. NITROUS (ANESTHESIA)', lines: [
      "SHH. I'M INVESTING. *TAPS PHONE* COME ON, RED. COME ON, RED.",
      "IT'S NOT GAMBLING. IT'S A DIVERSIFIED PORTFOLIO OF FOOTBALL GAMES.",
      "THE BEEPING? THAT'S JUST THE MARKET OPENING. IGNORE IT.",
      'YOU SHOULD DO ANESTHESIA. YOU SIT. YOU SCROLL. THE PATIENT SLEEPS. EVERYBODY WINS. MOSTLY ME.',
    ] },
    { x: 9, y: 3, spr: 'anesth', name: 'DR. VAPOR (ANESTHESIA)', lines: [
      'I PUT MY WHOLE SALARY ON A CRYPTO COIN WITH A DOG ON IT. LONG-TERM PLAY.',
      "THE PATIENT? STABLE. I ASSUME. I HAVEN'T LOOKED UP SINCE 2019.",
      "THIS STOCK HAS GONE DOWN SIX DAYS IN A ROW. THAT MEANS IT'S DUE. THAT'S MATH.",
      'YOU LOOK LIKE ANESTHESIA MATERIAL. CALM. DEAD INSIDE. PERFECT. TALK TO DR. ETHER.',
    ] },
    { x: 16, y: 3, spr: 'anesth', name: 'DR. HALOTHANE (ANESTHESIA)', lines: [
      'DOUBLE OR NOTHING ON WHETHER THE SURGEON FINISHES BEFORE 4 AM. WANT IN?',
      "I'M NOT IGNORING THE PATIENT. I'M MONITORING THE PATIENT. FROM MY PHONE. WHICH IS SHOWING HORSE RACING.",
      "SATS ARE 80? THAT'S ONLY 20 POINTS FROM 100. I'VE BEEN DOWN WORSE.",
      'WE CALL IT "THE GAS PASSER\'S PORTFOLIO." IT\'S MOSTLY SCRATCH TICKETS.',
    ] },
    { x: 13, y: 8, spr: 'anesth', name: 'DR. ETHER (PROGRAM DIRECTOR)', pitch: true, lines: [
      '"MALPHAS! WE\'VE BEEN WATCHING YOU. YOU HAVE THE PERFECT ANESTHESIA PERSONALITY: NONE."',
      '"THINK ABOUT IT. NO PATIENTS TALKING AT YOU. THEY\'RE ALL ASLEEP. THAT\'S THE WHOLE JOB."',
      '"WE GET A PHONE STIPEND. AND A BETTING STIPEND. WE CALL IT A PHONE STIPEND."',
      '"THE CHAIR SPINS. THE PATIENT SLEEPS. THE MARKETS NEVER CLOSE. IT\'S PARADISE."',
    ] },
  ];

  // The skeleton keeps its own chair; every other waiting-room chair is a seat.
  const seatsOf = (rows, npcs) => {
    const s = [];
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'c' && !npcs.some((n) => n.x === x && n.y === y)) s.push({ x, y }); }));
    return s;
  };
  const MAPS = {
    er: { rows: ER, npcs: ER_NPCS, bays: ER_BAYS, arrive: { x: 16, y: 2, dir: 'down' }, music: 'world' },
    or: { rows: OR, npcs: OR_NPCS, bays: [], arrive: { x: 1, y: 7, dir: 'down' }, music: 'title' },
  };
  Object.values(MAPS).forEach((m) => { m.seats = seatsOf(m.rows, m.npcs); m.npcs.forEach((n) => { n.i = 0; n.dir = 'down'; }); });
  W.ER_SEATS = MAPS.er.seats; // the waiting room is downstairs whichever floor you're on

  // Switch floors. Everything else reads the current floor through these fields.
  W.use = (id) => {
    const m = MAPS[id];
    Object.assign(W, { id, MAP: m.rows, w: m.rows[0].length, h: m.rows.length, NPCS: m.npcs, BAYS: m.bays, SEATS: m.seats, ARRIVE: m.arrive, MUSIC: m.music });
  };
  W.use('er');
  W.npcAt = (x, y) => W.NPCS.find((n) => n.x === x && n.y === y) || null;
  W.seatAt = (x, y) => W.SEATS.findIndex((s) => s.x === x && s.y === y);

  // Each OR's neglected patient: what's wrong, what you do, and how the anesthesiologist takes it.
  const ORS = [
    ['THE MONITOR IS SCREAMING. SATS: 81%. DR. NITROUS IS WATCHING A ROULETTE WHEEL SPIN.',
      'YOU TURN UP THE OXYGEN. THE NUMBERS CLIMB. THE ALARM GOES QUIET.',
      'DR. NITROUS, NOT LOOKING UP: "THANKS. I WAS JUST ABOUT TO DO THAT."'],
    ['THE VENTILATOR IS UNPLUGGED. A PHONE CHARGER IS PLUGGED IN WHERE IT USED TO BE.',
      "YOU PLUG THE VENTILATOR BACK IN. THE PATIENT'S CHEST STARTS RISING AGAIN.",
      'DR. VAPOR: "HEY! I WAS AT 4%!"'],
    ['THE PATIENT IS WAKING UP MID-SURGERY AND TRYING TO SIT UP. NOBODY HAS NOTICED.',
      'YOU TURN THE GAS BACK UP. THE PATIENT LIES BACK DOWN WITH A SMALL, POLITE SIGH.',
      'DR. HALOTHANE: "GOOD CATCH. I HAD MONEY ON SITTING ALL THE WAY UP, BUT GOOD CATCH."'],
  ];

  // ---------- interactions with fixtures ----------
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  // Returns dialog lines; may mutate game state g. (x, y) is the tile being poked.
  W.interact = (ch, g, x) => {
    switch (ch) {
      case 'O': case 'Q': case 'M': {
        const k = x < 7 ? 0 : x < 14 ? 1 : 2;
        if (g.orFix[k]) return ['THE PATIENT IS STABLE. FOR NOW. SOMEONE HAS ALREADY STARTED A BETTING POOL ON HOW LONG IT LASTS.'];
        g.orFix[k] = true;
        return [...ORS[k], `+${g.heal('rsp', 3)} SELF-RESPECT. SOMEBODY HAS TO CARE.`];
      }
      case 'D': return [pick([
        "THE SLIDING DOORS DON'T OPEN FOR YOU. THEY ONLY EVER OPEN INWARD.",
        'OUTSIDE, AN AMBULANCE IDLES. IT HAS BEEN IDLING SINCE 1974.',
        'YOU WAVE YOUR BADGE AT THE SENSOR. THE SENSOR LAUGHS.',
      ])];
      case 'w': return [pick([
        'OUTSIDE: AN ENDLESS PARKING LOT. NO CARS. NO SUN. JUST VIBES.',
        'IT IS DARK OUT. IT HAS ALWAYS BEEN DARK OUT.',
        'YOU SEE YOUR REFLECTION. YOUR HORNS NEED A TRIM.',
      ])];
      case 'C': return [`THE CLOCK SAYS ${g.clockStr()}.`, pick([
        "IT'S TICKING. SLOWLY. SPITEFULLY.", 'YOU COULD SWEAR IT JUST WENT BACKWARDS.', 'SHIFT CHANGE IS AT 7:00 AM. ALLEGEDLY.'])];
      case 'B': return [`TRACKING BOARD: ${g.waiting.length} WAITING. ${g.bays.filter(Boolean).length} OF 6 BAYS FULL.`, pick([
        'EMPLOYEE OF THE MONTH: DR. MALPHAS.\nEVERY MONTH. FOREVER.',
        'REMINDER: PATIENT SATISFACTION SCORES ARE ETERNAL. SMILE!',
        'PIZZA PARTY CANCELLED DUE TO LOW MORALE. MORALE IS LOW DUE TO NO PIZZA.',
      ])];
      case 'E': return ['EXIT.\n(NOT VALID FOR STAFF.)'];
      case 'X': return [pick([
        'YOU HAVE 9,999 UNSIGNED CHARTS. THE NUMBER GOES UP WHEN YOU BLINK.',
        'NEW EMAIL: "MANDATORY WELLNESS SEMINAR. 3 AM. ATTENDANCE IS REQUIRED."',
        'THE COMPUTER IS UPDATING. IT HAS BEEN UPDATING SINCE THE DAWN OF TIME.',
      ])];
      case 'P': return ['A DEAD FICUS. IT DIED HERE TOO.'];
      case 'c': return [pick(['A WAITING ROOM CHAIR. IT IS STICKY. DO NOT ASK WHY.', 'SOMEONE LEFT A HALF-EATEN BURRITO HERE. IT IS STILL WARM. IT IS ALWAYS WARM.'])];
      case 'T': case 'N': return [pick(['A STACK OF FORMS. IN TRIPLICATE. IN BLOOD.', 'A SIGN: "PLEASE BE PATIENT." A PATIENT HAS WRITTEN "NO" UNDER IT.'])];
      case 'b': return ["AN EMPTY BED. IT WON'T STAY THAT WAY."];
      case 'u': return ['A CURTAIN. THE ONLY THING BETWEEN YOU AND THE NEXT BAY\'S OPINIONS.'];
      case 'R': return ['A COAT RACK. FOR ONE GLORIOUS MOMENT YOU THOUGHT IT WAS YOUR RELIEF.'];
      case 'K':
        if (!g.coffeeReady) return ['THE POT IS EMPTY. IT REFILLS AFTER YOUR NEXT PATIENT.'];
        g.coffeeReady = false;
        return ['YOU POUR A CUP. IT HAS BEEN BREWING SINCE THE FALL OF ROME.', `+${g.heal('san', 10)} SANITY.`];
      case 'S':
        if (!g.napReady) return ["YOU'VE ALREADY NAPPED THIS PATIENT. GREEDY."];
        g.napReady = false;
        return ['YOU LIE DOWN AND CLOSE YOUR EYES.', '...', 'YOU ARE IMMEDIATELY PAGED.',
          `+${g.heal('san', 5)} SANITY, +${g.heal('rsp', 5)} SELF-RESPECT.`];
      case 'V': {
        if (g.vendIn > 0) return [`OUT OF ORDER. (BACK IN ORDER AFTER ${g.vendIn} MORE PATIENT${g.vendIn > 1 ? 'S' : ''}.)`];
        const id = pick(Object.keys(window.ITEMS));
        g.items[id] = (g.items[id] || 0) + 1;
        g.vendIn = 3;
        return ['THE MACHINE ACCEPTS A SMALL PIECE OF YOUR SOUL.', `CLUNK! YOU GOT: ${window.ITEMS[id].name}.`];
      }
    }
    return null;
  };

  // ---------- drawing NPCs / bay patients ----------
  W.drawNPCs = (camX, camY) => {
    for (const n of W.NPCS) {
      const bob = n.spr === 'ghost' ? Math.round(Math.sin(G.frame / 20 + n.x)) : 0;
      const seen = G.weird > 0.6 && ((G.frame >> 5) + n.x * 3) % 13 === 0 ? 'skeleton' : n.spr; // hallucinations
      G.draw(SPR[seen], n.x * TS - camX, n.y * TS - camY - 2 + bob);
    }
  };
  W.drawWaiting = (waiting, camX, camY) => {
    for (const p of waiting) {
      const s = W.SEATS[p.seat];
      if (s) G.draw(SPR.ow(p.look), s.x * TS - camX, s.y * TS - camY - 4, (s.x + s.y) % 2 === 1);
    }
  };
  W.drawBays = (bays, camX, camY) => {
    W.BAYS.forEach((b, i) => {
      if (bays[i]) G.draw(SPR.ow(bays[i].look),b.x * TS - camX, b.y * TS - camY - 3 + ((G.frame >> 5) % 2));
    });
  };
})();
