// Input, game state, overworld, menus, title / game-over, and the main loop.
(function () {
  const TS = WORLD.TS;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const fmt = (n) => n.toLocaleString('en-US');

  // ---------- screen sizing: fill what the console shell leaves free (integer scale when there's room) ----------
  function fit() {
    const c = G.canvas, shell = c.closest('.shell'), help = document.querySelector('.help');
    const root = getComputedStyle(document.documentElement), body = getComputedStyle(document.body);
    const pad = (st, a, b) => parseFloat(st[a]) + parseFloat(st[b]);
    const freeW = innerWidth - pad(body, 'paddingLeft', 'paddingRight') - (shell.offsetWidth - c.offsetWidth);
    const freeH = innerHeight - pad(root, 'paddingTop', 'paddingBottom') - pad(body, 'paddingTop', 'paddingBottom')
      - (shell.offsetHeight - c.offsetHeight) - (help.offsetParent ? help.offsetHeight + 14 : 0);
    const avail = Math.min(freeW / 160, freeH / 144);
    const s = avail >= 2 ? Math.floor(avail) : Math.max(1, avail);
    c.style.width = 160 * s + 'px';
    c.style.height = 144 * s + 'px';
  }
  addEventListener('resize', fit);
  fit();

  // ---------- input ----------
  const I = { down: {}, hit: {} };
  I.pressed = (b) => !!I.hit[b];
  I.held = (b) => !!I.down[b];
  let audioOk = false;
  const KEYS = {
    ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
    z: 'a', Z: 'a', ' ': 'a', j: 'a', J: 'a', x: 'b', X: 'b', Escape: 'b', Backspace: 'b', k: 'b', K: 'b',
    Enter: 'start', Shift: 'select',
  };
  const press = (b, on) => {
    if (on) {
      SFX.unlock();
      if (!audioOk && state === 'world') SFX.music(WORLD.MUSIC); // resumed from a snapshot before any input
      audioOk = true;
      if (!I.down[b]) I.hit[b] = true;
    }
    I.down[b] = on;
  };
  addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') { SFX.unlock(); SFX.toggleMute(); return; }
    const b = KEYS[e.key];
    if (!b) return;
    e.preventDefault();
    press(b, true);
  });
  addEventListener('keyup', (e) => { const b = KEYS[e.key]; if (b) press(b, false); });
  addEventListener('blur', () => { I.down = {}; });
  document.querySelectorAll('[data-btn]').forEach((el) => {
    const b = el.dataset.btn;
    const off = () => { el.classList.remove('on'); press(b, false); };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.classList.add('on'); press(b, true); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => el.addEventListener(ev, off));
  });

  // ---------- game state ----------
  let shiftNo = 4812330;
  try { shiftNo = +localStorage.getItem('perg.shift') || shiftNo; } catch (e) {}

  function newGame() {
    return {
      san: 40, sanMax: 40, rsp: 30, rspMax: 30, lv: 1, xp: 0, next: 30,
      items: Object.assign({}, START_ITEMS), night: 1, min: 0, seen: 0,
      coffeeReady: true, napReady: true, vendIn: 0, bays: [null, null, null, null, null, null], bayTimer: 0,
      waiting: [], deck: null, met: {}, // waiting room queue; case deck; visits per regular this shift
      bayClean: [0, 0, 0, 0, 0, 0], // steps until a just-cleared bay can take a new patient
      floor: 'er', orFix: {}, pitched: 0, // which floor; OR patients you've rescued; night you last turned down Dr. Ether
      morgueRest: false, stares: 0, // lay on the morgue's empty table since the last patient; bodies stared at
      psychMet: false, psychDone: false, psychGroupAt: -1, psychSteps: 0, bevPsych: false, // the 3F episode
      heal(k, n) { const b = this[k]; this[k] = Math.min(this[k + 'Max'], this[k] + n); return this[k] - b; },
      gainXp(n) {
        const msgs = [];
        this.xp += n;
        while (this.xp >= this.next) {
          this.xp -= this.next; this.lv++; this.next = 30 + this.lv * 12;
          this.sanMax += 3; this.rspMax += 2; this.san += 3; this.rsp += 2;
          msgs.push(`BURNOUT LEVEL ${this.lv}! YOU FEEL NOTHING.`, 'MAX SANITY +3.\nMAX SELF-RESPECT +2.');
        }
        return msgs;
      },
      // min = minutes since 7:00 PM
      clockStr() {
        const t = (19 * 60 + Math.floor(this.min)) % 1440, h = Math.floor(t / 60), m = t % 60;
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
      },
    };
  }

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  let g = newGame(), P = null, state = 'title', dlg = null, menu = null, trans = null, fade = null, over = null;
  let stepsSince = 0, bumpT = 0;
  let cut = null, sleep = null; // an NPC walking on its own; the blackout screen

  function reset() {
    g = newGame();
    WORLD.use('er');
    const s = WORLD.START;
    P = { x: s.x, y: s.y, px: s.x * TS, py: s.y * TS, dir: s.dir, moving: false, steps: 0 };
    WORLD.resetNpcs();
    arrive(5); roomNext(); roomNext();
    stepsSince = 0;
  }

  // ---------- patient flow: arrivals sit in the waiting room; the nurse rooms them into empty bays ----------
  const present = () => g.bays.concat(g.waiting).filter(Boolean).map((p) => p.tid);
  function arrive(n) {
    for (let i = 0; i < n; i++) {
      const p = CLINIC.draw(g, present()), used = g.waiting.map((w) => w.seat);
      p.seat = WORLD.ER_SEATS.findIndex((_, k) => !used.includes(k)); // -1: standing room only
      g.waiting.push(p);
    }
  }
  function leaveWaiting(p) {
    g.waiting = g.waiting.filter((w) => w !== p);
    const stander = g.waiting.find((w) => w.seat < 0);
    if (stander) stander.seat = p.seat;
    return p;
  }
  // Rooms the longest-waiting patient into an empty, clean bay; returns the bay number, or 0.
  function roomNext() {
    const i = g.bays.findIndex((b, k) => !b && !g.bayClean[k]);
    if (i < 0 || !g.waiting.length) return 0;
    g.bays[i] = leaveWaiting(g.waiting[0]);
    return i + 1;
  }
  const flowMsg = (n, bay) => (n > 1 ? `THE DOORS SLIDE OPEN. ${n} NEW PATIENTS.` : 'THE DOORS SLIDE OPEN. A NEW PATIENT.')
    + (bay ? ` NURSE BEV ROOMS SOMEONE INTO BAY ${bay}.` : '') + ` WAITING ROOM: ${g.waiting.length}.`;

  function fadeOut(cb) { fade = { t: 0, cb }; }
  function stepFade() {
    const t = ++fade.t;
    if (t <= 12) G.shift = Math.ceil(t / 4);
    else if (t === 13) fade.cb();
    else if (t <= 25) G.shift = 3 - Math.ceil((t - 13) / 4);
    else { G.shift = 0; fade = null; }
  }

  // ---------- dialog ----------
  function say(lines, cb) {
    lines = [].concat(lines);
    dlg = { tb: TB.make(lines.shift()), lines, cb };
  }
  // A question with options; cb(index). B picks the last option (the "no" / "stay" one).
  function choose(q, opts, cb) {
    dlg = { tb: TB.make(q), lines: [], choice: { i: 0, opts, cb } };
  }
  const ask = (q, cb) => choose(q, ['YES', 'NO'], (i) => cb(i === 0));
  function updDialog() {
    const c = dlg.choice;
    if (c && TB.done(dlg.tb)) {
      const n = c.opts.length;
      if (I.pressed('up')) { c.i = (c.i + n - 1) % n; SFX.play('blip'); }
      if (I.pressed('down')) { c.i = (c.i + 1) % n; SFX.play('blip'); }
      if (I.pressed('a') || I.pressed('b')) {
        const i = I.pressed('a') ? c.i : n - 1;
        dlg = null;
        SFX.play(i === n - 1 ? 'back' : 'select');
        c.cb(i);
      }
      return;
    }
    if (!TB.update(dlg.tb, I)) return;
    if (dlg.lines.length) dlg.tb = TB.make(dlg.lines.shift());
    else { const cb = dlg.cb; dlg = null; if (cb) cb(); }
  }

  const INTRO = [
    'YOU ARE DR. MALPHAS.\nDEMON. M.D.',
    "FOR CRIMES YOU CAN'T QUITE REMEMBER, YOU'VE BEEN SENTENCED TO PURGATORY GENERAL HOSPITAL.",
    'EMERGENCY DEPARTMENT.\nNIGHT SHIFT.\nFOREVER.',
    'KEEP YOUR SANITY AND SELF-RESPECT ABOVE ZERO. THERE IS NO WINNING. THERE IS ONLY 3 AM.',
    '(PRESS START FOR THE MENU. NURSE BEV HAS TIPS. THE BREAK ROOM HAS COFFEE.)',
  ];

  // ---------- overworld ----------
  function blocked(x, y) { return WORLD.solid(x, y) || !!WORLD.npcAt(x, y); }

  function tryMove(d) {
    P.dir = d;
    const [dx, dy] = DIRS[d], nx = P.x + dx, ny = P.y + dy;
    if (blocked(nx, ny)) {
      if (I.pressed(d) || ++bumpT % 18 === 0) SFX.play('bump');
      return;
    }
    P.x = nx; P.y = ny; P.moving = true; P.steps++;
  }

  function onStep() {
    // On 3F nothing from the ER reaches you. Sooner or later, something kicks off.
    if (WORLD.id === 'ps') {
      g.psychSteps++;
      if (!g.psychDone && ((g.psychGroupAt >= 0 && g.psychSteps - g.psychGroupAt >= 6) || g.psychSteps >= 90)) scuffle();
      return;
    }
    g.min += 0.5;
    stepsSince++;
    // A bay that finishes being cleaned gets the next patient right away.
    let freed = false;
    g.bayClean.forEach((c, i) => { if (c > 0 && --g.bayClean[i] === 0) freed = true; });
    if (freed) {
      const n = roomNext();
      if (n) { SFX.play('page'); return say(`OVERHEAD: "BAY ${n} IS CLEAN. NEW PATIENT IN BAY ${n}."`); }
    }
    if (++g.bayTimer >= 40) {
      g.bayTimer = 0;
      arrive(1);
      SFX.play('page');
      return say(flowMsg(1, roomNext()));
    }
    if (g.min >= 720) return nightEnd();
    // Waiting room: someone seated there corners you. Hallway: a bay patient comes looking for you.
    const zone = WORLD.encounterZone(P.x, P.y);
    if (!zone || stepsSince <= 6 || Math.random() >= 1 / 14) return;
    if (zone === 'waiting') {
      if (g.waiting.length) { const p = pick(g.waiting); encounter(p, null, { wait: p }); }
      return;
    }
    const full = g.bays.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
    if (!full.length) return;
    const i = pick(full);
    encounter(g.bays[i], `THE PATIENT FROM BAY ${i + 1} HAS FOLLOWED YOU INTO THE HALL.`, { bay: i });
  }

  function nightEnd() {
    SFX.play('clock');
    say(['THE CLOCK STRIKES 7:00 AM.', 'YOUR RELIEF IS HERE! YOU CAN FINALLY GO HOME!', '...',
      "NO. THAT'S A COAT RACK SOMEONE PUT A LAB COAT ON.", 'THE CLOCK HANDS SPIN BACKWARD WITH A SICKENING CREAK.',
      `IT IS 7:00 PM. NIGHT ${g.night + 1} BEGINS. THE PATIENTS SEEM... NEEDIER.`]);
    g.night++;
    g.min = 0;
  }

  function interact() {
    const [dx, dy] = DIRS[P.dir], fx = P.x + dx, fy = P.y + dy, ch = WORLD.tile(fx, fy);
    let npc = WORLD.npcAt(fx, fy);
    if (!npc && WORLD.isCounter(ch)) npc = WORLD.npcAt(fx + dx, fy + dy);
    if (npc && npc.pitch) return pitch(npc);
    if (npc && npc.group && g.psychGroupAt < 0) return groupTherapy();
    if (npc && npc.name === 'NURSE BEV' && g.psychDone && !g.bevPsych) {
      g.bevPsych = true;
      return say("NURSE BEV:\nTHE PSYCH WARD? DOC, THAT FLOOR'S BEEN CLOSED FOR CENTURIES. ...WHY DO YOU ASK?");
    }
    if (npc) return say(`${npc.name}:\n${npc.lines[npc.i++ % npc.lines.length]}`);
    if (ch === 'L') {
      if (WORLD.id === 'ps') return say(['THE ELEVATOR NEEDS A STAFF BADGE.', 'YOU DO NOT HAVE A STAFF BADGE. YOU HAVE A WRISTBAND.']);
      const floors = [['ps', 'PSYCH 3F'], ['or', 'SURGERY 2F'], ['er', 'ER 1F'], ['mo', 'MORGUE B1']].filter(([id]) => id !== WORLD.id);
      return choose('THE ELEVATOR. SOMEONE HAS WRITTEN "WHY BOTHER" NEXT TO THE BUTTONS.',
        floors.map((f) => f[1]).concat('STAY'), (i) => {
          if (i >= floors.length) return;
          if (floors[i][0] !== 'ps' || !g.psychDone) return ride(floors[i][0]);
          const lines = ["THE 3F BUTTON WON'T LIGHT UP. IT'S CAKED IN DUST. NOBODY HAS PRESSED IT IN A VERY LONG TIME."];
          if (WORLD.id === 'er') {
            g.bevPsych = true;
            lines.push("NURSE BEV (FROM THE DESK): \"THE PSYCH WARD? DOC, THAT FLOOR'S BEEN CLOSED FOR CENTURIES.\"", '"...YOU FEELING OKAY?"');
          }
          say(lines);
        });
    }
    const bi = WORLD.BAYS.findIndex((b) => b.x === fx && b.y === fy);
    if (bi >= 0 && !g.bays[bi] && g.bayClean[bi]) return say(`MORT IS MOPPING BAY ${bi + 1}. IT WON'T STAY EMPTY FOR LONG.`);
    if (bi >= 0 && g.bays[bi]) return encounter(g.bays[bi], `YOU PULL BACK THE CURTAIN ON BAY ${WORLD.BAYS[bi].n}.`, { bay: bi });
    const si = WORLD.seatAt(fx, fy), sitter = si >= 0 && g.waiting.find((w) => w.seat === si);
    if (sitter) return encounter(sitter, 'YOU MAKE EYE CONTACT WITH SOMEONE IN THE WAITING ROOM. ROOKIE MISTAKE.', { wait: sitter });
    const lines = WORLD.interact(ch, g, fx, fy);
    if (!lines) return;
    if (/^\+/.test(lines[lines.length - 1])) SFX.play('heal');
    say(lines);
  }

  function ride(to) {
    fadeOut(() => {
      WORLD.use(to);
      g.floor = to;
      const a = WORLD.ARRIVE;
      Object.assign(P, { x: a.x, y: a.y, px: a.x * TS, py: a.y * TS, dir: a.dir, moving: false });
      stepsSince = 0;
      SFX.music(WORLD.MUSIC);
      SFX.play('ding');
      say(ARRIVALS[to], to === 'ps' && !g.psychMet ? orderlyRush : null);
    });
  }

  // ---------- 3F: the psych ward episode ----------
  // An NPC walks a path of tiles at the player's pace; cb runs when it arrives.
  function walkNpc(npc, path, cb) { cut = { npc, path, k: 0, cb }; }
  function updCut() {
    const n = cut.npc;
    if (!n.ox && !n.oy) {
      if (cut.k >= cut.path.length) { const cb = cut.cb; cut = null; return cb(); }
      const [tx, ty] = cut.path[cut.k++];
      n.ox = (n.x - tx) * TS; n.oy = (n.y - ty) * TS; n.x = tx; n.y = ty;
    }
    n.ox -= Math.sign(n.ox) * 2; n.oy -= Math.sign(n.oy) * 2;
  }
  function orderlyRush() {
    g.psychMet = true;
    SFX.play('page');
    const o = WORLD.npcById('orderly'), path = [];
    for (let x = o.x - 1; x >= 2; x--) path.push([x, 3]);
    path.push([2, 2]);
    walkNpc(o, path, () => say([
      'ORDERLY DALE: "MALPHAS! THERE YOU ARE. WHERE WERE YOU? YOU CAN\'T JUST WANDER OFF THE UNIT."',
      '"AND WHERE DID YOU EVEN GET A LAB COAT? WE TALKED ABOUT THIS. NO MORE DOCTOR."',
      'YOU LOOK DOWN. YOU ARE WEARING STRIPED PAJAMAS. THERE IS A WRISTBAND ON YOUR WRIST. IT SAYS "MALPHAS."',
      '"GROUP STARTS SOON. GO SAY HI TO EVERYBODY. AND STAY ON THE UNIT THIS TIME."',
    ]));
  }
  function groupTherapy() {
    say(['DR. OKAFOR: "WELCOME, EVERYONE. LET\'S GO AROUND THE CIRCLE."',
      'LEON: "I\'M LEON. THIS WEEK I DIDN\'T YELL AT THE TOASTER." EVERYONE SNAPS.',
      'PRIYA: "I\'M PRIYA. I SLEPT FOUR HOURS. IN A ROW." EVERYONE SNAPS LOUDER.'],
    () => choose('DR. OKAFOR: "MALPHAS? WOULD YOU LIKE TO SHARE?"', ["I'M AN ER DOCTOR", "I'M A DEMON", 'PASS'], (i) => {
      const share = [
        ['"I\'M AN ER DOCTOR. I WORK NIGHTS. I CAN\'T LEAVE. THE PATIENTS NEVER STOP COMING."',
          'THE GROUP NODS POLITELY. THEY HAVE HEARD THIS ONE BEFORE.',
          'DR. OKAFOR: "AND HOW DOES IT FEEL, BEING NEEDED BY EVERYONE, ALL THE TIME?" YOU OPEN YOUR MOUTH. NOTHING COMES OUT.'],
        ['"I\'M A DEMON. I WAS SENTENCED TO THE NIGHT SHIFT FOR CRIMES I CAN\'T REMEMBER."',
          'LEON: "SAME, MAN."',
          'DR. OKAFOR WRITES SOMETHING DOWN AND UNDERLINES IT. TWICE.'],
        ['"PASS."', 'DR. OKAFOR: "THAT\'S OKAY. YOU SAID THAT LAST TIME TOO. AND THE TIME BEFORE THAT."',
          '"...HOW MANY TIMES HAVE I BEEN TO GROUP?" DR. OKAFOR SMILES KINDLY AND DOES NOT ANSWER.'],
      ][i];
      g.psychGroupAt = g.psychSteps;
      say(share.concat('GROUP ENDS. EVERYONE GETS A PUDDING CUP.'));
    }));
  }
  function scuffle() {
    g.psychDone = true;
    SFX.play('hit');
    say(['GUS: "HEY. THAT\'S MY PUDDING." IT IS YOUR PUDDING. YOU ARE PRETTY SURE IT IS YOUR PUDDING.',
      'A BRIEF, INTENSE TUG-OF-WAR OVER A PUDDING CUP. LEON CHEERS. DOLORES KEEPS KNITTING.',
      'THE PUDDING GOES EVERYWHERE.',
      'ORDERLY DALE: "CODE GRAY! I NEED HANDS!" TWO MORE ORDERLIES APPEAR OUT OF NOWHERE. YOU ALWAYS SUSPECTED THEY COULD DO THAT.',
      'A NURSE: "HALOPERIDOL, FIVE MILLIGRAMS. LITTLE PINCH, MALPHAS."'], () => {
      SFX.play('hurt');
      SFX.music(null);
      fadeOut(() => { state = 'sleep'; sleep = { t: 0 }; });
    });
  }
  function updSleep() {
    if (++sleep.t >= 240 || (sleep.t > 60 && I.pressed('a'))) { sleep.t = -1e9; fadeOut(wake); }
  }
  function drawSleep() {
    G.clear(3);
    const t = Math.max(0, sleep.t);
    ['Z', 'Z', 'Z'].forEach((z, i) => { if (t > 30 + i * 40) G.text(z, 64 + i * 14, 70 - i * 10 + Math.round(Math.sin(t / 20 + i)), 1, i + 1); });
  }
  function wake() {
    WORLD.use('er');
    g.floor = 'er';
    Object.assign(P, { x: 27, y: 10, px: 27 * TS, py: 10 * TS, dir: 'up', moving: false });
    g.san = g.sanMax;
    g.min += 60;
    state = 'world';
    SFX.music(WORLD.MUSIC);
    say(['YOU WAKE UP ON THE BREAK ROOM COUCH.',
      'YOUR LAB COAT IS ON. YOUR BADGE SAYS "DR. MALPHAS." YOUR PAGER IS GOING OFF.',
      "THERE IS A SMALL BANDAGE ON YOUR ARM, AND SOME PUDDING ON YOUR SLEEVE. YOU DON'T REMEMBER WHY.",
      'EVERYTHING FEELS VERY CALM. AND VERY FLAT. (SANITY FULLY RESTORED.)']);
  }
  const ARRIVALS = {
    er: 'DING. EMERGENCY DEPARTMENT. THE NOISE HITS YOU LIKE A WALL.',
    or: ['DING. SURGICAL FLOOR.', 'IT IS VERY QUIET UP HERE. EXCEPT FOR THE ALARMS. NOBODY SEEMS TO HEAR THE ALARMS.'],
    mo: ['DING. BASEMENT. MORGUE.', 'IT IS COLD AND COMPLETELY SILENT. NOBODY DOWN HERE WANTS ANYTHING FROM YOU.'],
    ps: ['DING. 3F. THE DOORS OPEN ONTO A WARM, QUIET HALLWAY THAT SMELLS LIKE PUDDING.', 'YOU FEEL A LITTLE STRANGE.'],
  };

  // Dr. Ether's residency pitch. Turning it down is good for you, once a night.
  function pitch(npc) {
    say(`${npc.name}:\n${npc.lines[npc.i++ % npc.lines.length]}`, () => ask('"SO. APPLY TO ANESTHESIA RESIDENCY?"', (yes) => {
      if (yes) {
        return say(['DR. ETHER HANDS YOU A ONE-PAGE APPLICATION. QUESTION 1: "FAVORITE BETTING APP?" QUESTION 2: "CAN YOU SIT STILL?"',
          `DR. ETHER STAMPS IT WITHOUT READING IT. "WELCOME TO THE WAITLIST. YOU ARE NUMBER ${fmt(shiftNo)}."`,
          '"WE\'LL CALL YOU." DR. ETHER DOES NOT TAKE YOUR NUMBER.', 'YOU ARE STILL AN ER DOCTOR. YOU WILL ALWAYS BE AN ER DOCTOR.']);
      }
      const lines = ['"SUIT YOURSELF. MORE FOR US." DR. ETHER GOES BACK TO A HAND OF ONLINE POKER.'];
      if (g.pitched !== g.night) {
        g.pitched = g.night;
        SFX.play('heal');
        lines.push(`+${g.heal('rsp', 2)} SELF-RESPECT. YOU STILL HAVE STANDARDS.`);
      }
      say(lines);
    }));
  }

  function updWorld() {
    if (dlg) return updDialog();
    if (menu) return updMenu();
    if (cut) return updCut();
    if (P.moving) {
      const [dx, dy] = DIRS[P.dir];
      P.px += dx * 2; P.py += dy * 2;
      if (P.px !== P.x * TS || P.py !== P.y * TS) return;
      P.moving = false;
      onStep();
      if (dlg || state !== 'world') return;
    }
    if (I.pressed('start')) { SFX.play('select'); menu = { i: 0, sub: null, it: 0 }; return; }
    if (I.pressed('select')) { G.setPalette(G.palIdx() + 1); SFX.play('select'); return; }
    if (I.pressed('a')) return interact();
    const d = ['up', 'down', 'left', 'right'].find(I.held);
    if (d) tryMove(d); else bumpT = 0;
  }

  // ---------- encounters ----------
  // `from` says where the patient was: { bay: i }, { wait: patient }, or {} (debug).
  function encounter(p, intro, from) {
    SFX.music(null);
    SFX.play('encounter');
    state = 'trans';
    trans = { t: 0, p, intro, from };
  }
  function updTrans() {
    trans.t++;
    G.invert = !G.reducedMotion && trans.t < 24 && (trans.t >> 2) % 2 === 0;
    if (trans.t < 60) return;
    G.invert = false;
    const tr = trans;
    trans = null;
    state = 'battle';
    BATTLE.start(tr.p, g, tr.intro, (r) => battleOver(r, tr.from));
  }
  function battleOver(r, from) {
    if (r === 'lose') return fadeOut(() => { state = 'gameover'; over = { t: 0 }; });
    if (from.bay >= 0) { g.bays[from.bay] = null; g.bayClean[from.bay] = 30; }
    if (from.wait) leaveWaiting(from.wait);
    if (r === 'win') {
      g.seen++; g.coffeeReady = true; g.napReady = true; g.orFix = {}; g.morgueRest = false; g.vendIn = Math.max(0, g.vendIn - 1); g.min += 35;
    } else g.min += 15;
    // The doors never stop: every patient out means at least one more in, more as the nights go on.
    const n = 1 + (Math.random() < 0.25 + 0.1 * g.night ? 1 : 0);
    arrive(n);
    const bay = roomNext();
    stepsSince = 0;
    fadeOut(() => {
      state = 'world';
      SFX.music(WORLD.MUSIC);
      SFX.play('page');
      say(flowMsg(n, bay), () => { if (g.min >= 720) nightEnd(); });
    });
  }

  // ---------- start menu ----------
  const MENU = ['STATUS', 'ITEMS', 'PALETTE', 'SOUND', 'CLOSE'];
  const ownedItems = () => Object.keys(ITEMS).filter((k) => g.items[k] > 0);
  function nav(I, n, obj, key) {
    if (I.pressed('up')) { obj[key] = (obj[key] + n - 1) % n; SFX.play('blip'); }
    if (I.pressed('down')) { obj[key] = (obj[key] + 1) % n; SFX.play('blip'); }
  }
  function updMenu() {
    if (menu.sub === 'status') {
      if (I.pressed('a') || I.pressed('b')) { menu.sub = null; SFX.play('back'); }
      return;
    }
    if (menu.sub === 'items') {
      const list = ownedItems();
      if (!list.length) { menu.sub = null; return; }
      menu.it = Math.min(menu.it, list.length - 1);
      nav(I, list.length, menu, 'it');
      if (I.pressed('b')) { menu.sub = null; SFX.play('back'); return; }
      if (!I.pressed('a')) return;
      const it = ITEMS[list[menu.it]];
      if (!it.heal) return say(`BETTER SAVE THE ${it.name} FOR A PATIENT.`);
      g.items[list[menu.it]]--;
      SFX.play('heal');
      const parts = [];
      if (it.heal.san) parts.push(`+${g.heal('san', it.heal.san)} SANITY`);
      if (it.heal.rsp) parts.push(`+${g.heal('rsp', it.heal.rsp)} SELF-RESPECT`);
      return say([`YOU USE: ${it.name}.`, parts.join(', ') + '.']);
    }
    nav(I, MENU.length, menu, 'i');
    if (I.pressed('b') || I.pressed('start')) { menu = null; SFX.play('back'); return; }
    if (!I.pressed('a')) return;
    SFX.play('select');
    const o = MENU[menu.i];
    if (o === 'STATUS') menu.sub = 'status';
    else if (o === 'ITEMS') { if (ownedItems().length) { menu.sub = 'items'; menu.it = 0; } else say('YOUR POCKETS ARE EMPTY. LIKE YOUR SOUL.'); }
    else if (o === 'PALETTE') G.setPalette(G.palIdx() + 1);
    else if (o === 'SOUND') SFX.toggleMute();
    else menu = null;
  }

  function drawMenu() {
    if (menu.sub === 'status') {
      G.box(0, 0, 160, 144);
      const ps = WORLD.id === 'ps';
      G.draw(SPR.outfits[ps ? 'psych' : 'doc'].down[0], 136, 8);
      [
        ps ? 'MALPHAS, ROOM 3' : 'DR. MALPHAS, M.D.', ps ? 'BELIEVES: ER DOCTOR' : 'DEMON. NIGHT SHIFT.', '',
        `BURNOUT LV   ${g.lv}`, `BURNOUT PTS  ${g.xp}/${g.next}`, `SANITY       ${g.san}/${g.sanMax}`,
        `SELF-RESPECT ${g.rsp}/${g.rspMax}`, `NIGHT        ${g.night}`, `PATIENTS     ${g.seen}`, `WAITING      ${g.waiting.length}`,
        `CLOCK        ${g.clockStr()}`, `SHIFT #${fmt(shiftNo)}`,
      ].forEach((r, i) => G.text(r, 10, 10 + i * 11, i === 1 || i === 10 ? 2 : 3));
      return;
    }
    if (menu.sub === 'items') {
      const list = ownedItems(), top = Math.max(0, Math.min(menu.it - 3, list.length - 7));
      G.box(0, 9, 160, 87);
      list.slice(top, top + 7).forEach((id, i) => {
        G.text(ITEMS[id].name, 16, 16 + i * 11);
        const c = 'X' + g.items[id];
        G.text(c, 152 - G.textW(c), 16 + i * 11);
      });
      G.text('▶', 8, 16 + (menu.it - top) * 11);
      if (!dlg && list[menu.it]) { G.box(0, 96, 160, 48); G.text(G.wrap(ITEMS[list[menu.it]].desc, 24).join('\n'), 8, 104); }
      return;
    }
    G.box(88, 9, 72, 62);
    MENU.forEach((m, i) => G.text(m === 'SOUND' ? (SFX.muted() ? 'SOUND:OFF' : 'SOUND:ON') : m, 100, 16 + i * 10));
    G.text('▶', 93, 16 + menu.i * 10);
    if (dlg) return;
    const hint = {
      STATUS: 'CHECK YOUR VITALS. THEY ARE ALL BAD.', ITEMS: 'THE CONTENTS OF YOUR LAB COAT POCKETS.',
      PALETTE: `SCREEN: ${G.palName()}`, SOUND: 'TOGGLE THE MUSIC OF THE DAMNED. (OR PRESS M.)', CLOSE: 'BACK TO WORK. FOREVER.',
    }[MENU[menu.i]];
    G.box(0, 112, 160, 32);
    G.text(G.wrap(hint, 24).slice(0, 2).join('\n'), 8, 119);
  }

  // ---------- drawing the world ----------
  function drawPlayer(cx, cy) {
    const rem = Math.abs(P.px - P.x * TS) + Math.abs(P.py - P.y * TS);
    const walking = P.moving && rem > 3 && rem <= 12;
    const O = SPR.outfits[WORLD.id === 'ps' ? 'psych' : 'doc']; // on 3F you are in pajamas
    let s, flip = false;
    if (P.dir === 'down' || P.dir === 'up') {
      s = O[P.dir][walking ? 1 : 0];
      flip = walking && P.steps % 2 === 1;
    } else {
      s = O.side[walking ? 1 : 0];
      flip = P.dir === 'left';
    }
    G.draw(s, P.px - cx, P.py - cy - 3 - (walking ? 1 : 0), flip);
  }

  function drawWorld() {
    const cx = Math.max(0, Math.min(WORLD.w * TS - 160, P.px - 72));
    const cy = Math.max(-9, Math.min(WORLD.h * TS - 144, P.py - 64));
    G.clear(3);
    WORLD.draw(cx, cy);
    WORLD.drawBays(g.bays, cx, cy, g.bayClean);
    WORLD.drawWaiting(g.waiting, cx, cy);
    WORLD.drawNPCs(cx, cy);
    drawPlayer(cx, cy);
    G.rect(0, 0, 160, 9, 3);
    const lie = G.weird > 0.5 && Math.sin(G.frame / 41) > 0.96; // the clock briefly says something it shouldn't
    const ps = WORLD.id === 'ps';
    G.text(ps ? 'UNIT 3F' : `${lie ? '3:33 AM' : g.clockStr()} N${g.night}`, 2, 1, 0);
    const st = ps ? 'PT: MALPHAS' : `SAN ${g.san} RSP ${g.rsp}`;
    G.text(st, 158 - G.textW(st), 1, g.san < 10 || g.rsp < 8 ? 1 : 0);
    if (menu) drawMenu();
    if (dlg) TB.draw(dlg.tb);
    if (dlg && dlg.choice && TB.done(dlg.tb)) {
      const o = dlg.choice.opts, w = 6 * Math.max(...o.map((s) => s.length)) + 22, h = o.length * 10 + 12;
      G.box(160 - w, 96 - h, w, h);
      o.forEach((s, i) => G.text(s, 160 - w + 15, 96 - h + 7 + i * 10));
      G.text('▶', 160 - w + 7, 96 - h + 7 + dlg.choice.i * 10);
    }
    if (trans && trans.t >= 24) {
      const w = Math.round(160 * Math.min(1, (trans.t - 24) / 32));
      for (let i = 0; i < 9; i++) G.rect(i % 2 ? 0 : 160 - w, i * 16, w, 16, 3);
    }
  }

  // ---------- title & game over ----------
  function updTitle() {
    if (audioOk) SFX.music('title');
    if (I.pressed('select')) { G.setPalette(G.palIdx() + 1); SFX.play('select'); }
    if (!(I.pressed('a') || I.pressed('start'))) return;
    SFX.play('select');
    shiftNo++;
    try { localStorage.setItem('perg.shift', shiftNo); } catch (e) {}
    reset();
    fadeOut(() => { state = 'world'; SFX.music('world'); say(INTRO); });
  }

  function drawTitle() {
    G.clear(0);
    const x = 80 - G.textW('PERGATORY', 2) / 2;
    G.text('P', x, 14, 3, 2);
    G.text('ER', x + 12, 14, 2, 2);
    G.text('GATORY', x + 36, 14, 3, 2);
    G.rect(x + 11, 31, 24, 2, 2);
    G.textC('THE ETERNAL NIGHT SHIFT', 80, 38, 3);
    G.rect(8, 50, 144, 1, 3);
    G.draw(SPR.skeleton, 22, 72);
    G.draw(SPR.docDown[0], 64, 56 + ((G.frame >> 5) % 2), false, 2);
    G.draw(SPR.cerberus, 122, 72);
    G.rect(8, 90, 144, 1, 3);
    if ((G.frame >> 5) % 2 === 0) G.textC('PRESS START', 80, 102, 3);
    G.textC(`SHIFT #${fmt(shiftNo + 1)}`, 80, 118, 2);
    G.textC('(C)1996 HELLSOFT', 80, 131, 2);
  }

  const OVER = ['YOU HAVE BEEN', 'REASSIGNED TO...', 'THE SAME SHIFT.'];
  function updOver() {
    over.t++;
    if (over.t > 150 && (I.pressed('a') || I.pressed('start'))) {
      SFX.play('select');
      fadeOut(() => { state = 'title'; });
    }
  }
  function drawOver() {
    G.clear(3);
    OVER.forEach((l, i) => { if (over.t > 20 + i * 30) G.textC(l, 80, 20 + i * 12, i === 2 ? 1 : 0); });
    if (over.t > 120) {
      [`PATIENTS SEEN    ${g.seen}`, `NIGHTS SERVED    ${g.night}`, `BURNOUT LEVEL    ${g.lv}`]
        .forEach((l, i) => G.text(l, 20, 72 + i * 11, 1));
    }
    if (over.t > 150 && (G.frame >> 5) % 2 === 0) G.textC('PRESS A TO CLOCK IN', 80, 124, 0);
  }

  // ---------- main loop ----------
  function tick() {
    G.frame++;
    // Reality starts to slip below 65% sanity and is fully gone around 10%.
    const lost = P && ['world', 'trans', 'battle'].includes(state) && WORLD.id !== 'ps' ? 1 - g.san / g.sanMax : 0; // 3F is eerily stable
    G.weird = Math.max(0, Math.min(1, (lost - 0.35) / 0.55));
    G.tickWeird();
    SFX.setWeird(G.weird);
    if (fade) stepFade();
    else if (state === 'title') updTitle();
    else if (state === 'world') updWorld();
    else if (state === 'trans') updTrans();
    else if (state === 'battle') BATTLE.update(I);
    else if (state === 'gameover') updOver();
    else if (state === 'sleep') updSleep();
    I.hit = {};
  }
  function draw() {
    if (state === 'title') drawTitle();
    else if (state === 'world' || state === 'trans') drawWorld();
    else if (state === 'battle') BATTLE.draw();
    else if (state === 'gameover') drawOver();
    else if (state === 'sleep') drawSleep();
    G.post();
  }

  let last = performance.now(), acc = 0;
  function loop(now) {
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= 1000 / 60) { acc -= 1000 / 60; tick(); }
    draw();
    requestAnimationFrame(loop);
  }

  // ---------- hot reload (artifact viewer): keep the run going across republishes ----------
  function snapshot() {
    if (!P || !['world', 'trans', 'battle'].includes(state)) return {};
    const d = {};
    for (const k of Object.keys(g)) if (typeof g[k] !== 'function') d[k] = g[k];
    d.bays = g.bays.map((p) => p && p.spec);
    d.waiting = g.waiting.map((p) => ({ spec: p.spec, seat: p.seat }));
    return { g: d, P: { x: P.x, y: P.y, dir: P.dir } };
  }
  function restore(d) {
    if (!d || !d.g || !d.P) return;
    reset();
    const make = (spec) => spec && CLINIC.make(typeof spec === 'string' ? { tid: spec } : spec); // older snapshots stored ids
    Object.assign(g, d.g, {
      items: Object.assign({}, d.g.items),
      bays: d.g.bays.map((s) => make(s) || null),
      waiting: (d.g.waiting || g.waiting.map((p) => ({ spec: p.spec, seat: p.seat })))
        .map((w) => { const p = make(w.spec); if (p) p.seat = w.seat; return p; }).filter(Boolean),
    });
    WORLD.use(g.floor || 'er');
    if (g.psychMet) Object.assign(WORLD.npcById('orderly'), { x: 2, y: 2 }); // the orderly already came to get you
    Object.assign(P, d.P, { px: d.P.x * TS, py: d.P.y * TS, moving: false });
    state = 'world';
  }
  const boot = (d) => { restore(d); requestAnimationFrame(loop); };
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(snapshot);
  if (hot && hot.ready) hot.ready(boot); else boot((hot && hot.data) || {});

  // Console hooks for testing: DEBUG.press('a'); DEBUG.run(60);
  window.DEBUG = {
    get g() { return g; }, get state() { return state; }, get P() { return P; }, get dlg() { return dlg; },
    encounter: (i) => { dlg = null; encounter(PATIENTS[i || 0], null, {}); },
    walkin: (tid) => { dlg = null; encounter(CLINIC.make(CLINIC.roll(tid)), null, {}); },
    arrive, roomNext,
    press: (b) => { I.hit[b] = true; },
    hold: (b, on) => { I.down[b] = on; },
    run: (n = 1) => { for (let i = 0; i < n; i++) tick(); draw(); },
  };
})();
