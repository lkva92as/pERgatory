// The ER: tiles, map, NPCs, and things to poke at.
(function () {
  const W = window.WORLD = {};
  const TS = 16;
  W.TS = TS;

  W.MAP = [
    '##ww##C##ww####B##E###w####w##',
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
  W.MAP.unshift('##############################');
  W.MAP.forEach((r, i) => { if (r.length !== 30) console.warn('map row', i, 'len', r.length); });
  W.w = W.MAP[0].length;
  W.h = W.MAP.length;

  W.START = { x: 16, y: 7, dir: 'down' };
  W.BAYS = [
    { x: 21, y: 2, n: 1 }, { x: 24, y: 2, n: 2 }, { x: 27, y: 2, n: 3 },
    { x: 21, y: 7, n: 4 }, { x: 24, y: 7, n: 5 }, { x: 27, y: 7, n: 6 },
  ];

  W.tile = (x, y) => (x < 0 || y < 0 || x >= W.w || y >= W.h) ? '#' : W.MAP[y][x];
  const WALLISH = '#wCBE';
  const isWall = (ch) => WALLISH.includes(ch);
  W.solid = (x, y) => !',.:'.includes(W.tile(x, y));
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

  const CH = {
    '.': 'floor', ',': 'carpet', ':': 'brk', c: 'chair', T: 'triage', N: 'counter', X: 'computer',
    b: 'bed', u: 'curtain', D: 'door', P: 'plant', K: 'coffee', V: 'vend', S: 'couch', R: 'rack',
    w: 'window', C: 'clock', B: 'board', E: 'exit',
  };

  function tileSprite(x, y) {
    const ch = W.tile(x, y);
    if (ch === '#') {
      if (x < 0 || y < 0 || x >= W.w || y >= W.h) return t.dark;
      return isWall(W.tile(x, y + 1)) ? t.wallTop : t.wallFace;
    }
    return t[CH[ch]] || t.dark;
  }

  W.draw = (camX, camY) => {
    const x0 = Math.floor(camX / TS), y0 = Math.floor(camY / TS);
    for (let y = y0; y <= y0 + 9; y++) {
      for (let x = x0; x <= x0 + 10; x++) G.draw(tileSprite(x, y), x * TS - camX, y * TS - camY);
    }
  };

  // ---------- NPCs ----------
  W.NPCS = [
    { x: 16, y: 3, spr: 'nurse', name: 'NURSE BEV', lines: [
      "IF SOMEONE ASKS FOR A SANDWICH, IT'S GARY. IT'S ALWAYS GARY.",
      "I'VE WORKED NIGHTS FOR 300 YEARS. YOU GET USED TO IT.\n(YOU DO NOT GET USED TO IT.)",
      'TIP: CHART A PATIENT TO FIND THEIR WEAKNESS. EVERYONE HAS ONE. MINE IS NIGHTS.',
      "DON'T GET ATTACHED TO AN EMPTY BAY. THEY ALL COME BACK. FRANK ESPECIALLY.",
      'IF YOUR SANITY OR SELF-RESPECT HITS ZERO, THE SHIFT STARTS OVER. ASK ME HOW I KNOW.',
      'THE BREAK ROOM COFFEE REFILLS AFTER EVERY PATIENT. IT IS THE ONLY THING HERE THAT DOES.',
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
  W.NPCS.forEach((n) => { n.i = 0; n.dir = 'down'; });
  W.npcAt = (x, y) => W.NPCS.find((n) => n.x === x && n.y === y) || null;

  // ---------- interactions with fixtures ----------
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  // Returns dialog lines; may mutate game state g.
  W.interact = (ch, g) => {
    switch (ch) {
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
      case 'B': return [pick([
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
      G.draw(SPR[n.spr], n.x * TS - camX, n.y * TS - camY - 2 + bob);
    }
  };
  W.drawBays = (bays, camX, camY) => {
    W.BAYS.forEach((b, i) => {
      if (bays[i]) G.draw(SPR.patient, b.x * TS - camX, b.y * TS - camY - 3 + ((G.frame >> 5) % 2));
    });
  };
})();
