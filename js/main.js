// Input, game state, overworld, menus, title / game-over, and the main loop.
(function () {
  const TS = WORLD.TS;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const fmt = (n) => n.toLocaleString('en-US');

  // ---------- screen sizing (integer scale when there's room) ----------
  function fit() {
    const avail = Math.min((innerWidth - 90) / 160, (innerHeight - 330) / 144);
    const s = avail >= 2 ? Math.floor(avail) : Math.max(1, avail);
    G.canvas.style.width = 160 * s + 'px';
    G.canvas.style.height = 144 * s + 'px';
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
    if (on) { SFX.unlock(); audioOk = true; if (!I.down[b]) I.hit[b] = true; }
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

  function reset() {
    g = newGame();
    const s = WORLD.START;
    P = { x: s.x, y: s.y, px: s.x * TS, py: s.y * TS, dir: s.dir, moving: false, steps: 0 };
    WORLD.NPCS.forEach((n) => (n.i = 0));
    spawnBay(); spawnBay();
    stepsSince = 0;
  }

  function spawnBay() {
    const empty = g.bays.map((b, i) => (b ? -1 : i)).filter((i) => i >= 0);
    if (!empty.length) return -1;
    const i = pick(empty);
    g.bays[i] = pickPatient();
    return i;
  }

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
  function updDialog() {
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
    g.min += 0.5;
    stepsSince++;
    if (++g.bayTimer >= 40) {
      g.bayTimer = 0;
      const i = spawnBay();
      if (i >= 0) { SFX.play('page'); return say(`OVERHEAD: "NEW PATIENT IN BAY ${WORLD.BAYS[i].n}."`); }
    }
    if (g.min >= 720) return nightEnd();
    const zone = WORLD.encounterZone(P.x, P.y);
    if (zone && stepsSince > 6 && Math.random() < 1 / 14) {
      const p = pickPatient();
      const intro = zone === 'waiting' ? 'A PATIENT FROM THE WAITING ROOM CORNERS YOU!'
        : `A PATIENT WANDERS OUT OF BAY ${1 + Math.floor(Math.random() * 6)}!`;
      SFX.play('page');
      say(pick(FLAVOR.pages), () => encounter(p, intro, -1));
    }
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
    if (npc) return say(`${npc.name}:\n${npc.lines[npc.i++ % npc.lines.length]}`);
    const bi = WORLD.BAYS.findIndex((b) => b.x === fx && b.y === fy);
    if (bi >= 0 && g.bays[bi]) return encounter(g.bays[bi], `BAY ${WORLD.BAYS[bi].n}: "FINALLY! A DOCTOR!"`, bi);
    const lines = WORLD.interact(ch, g);
    if (!lines) return;
    if (/^\+/.test(lines[lines.length - 1])) SFX.play('heal');
    say(lines);
  }

  function updWorld() {
    if (dlg) return updDialog();
    if (menu) return updMenu();
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
  function encounter(p, intro, bay) {
    SFX.music(null);
    SFX.play('encounter');
    state = 'trans';
    trans = { t: 0, p, intro, bay };
  }
  function updTrans() {
    trans.t++;
    G.invert = trans.t < 24 && (trans.t >> 2) % 2 === 0;
    if (trans.t < 60) return;
    G.invert = false;
    const tr = trans;
    trans = null;
    state = 'battle';
    BATTLE.start(tr.p, g, tr.intro, (r) => battleOver(r, tr.bay));
  }
  function battleOver(r, bay) {
    if (r === 'lose') return fadeOut(() => { state = 'gameover'; over = { t: 0 }; });
    if (bay >= 0) g.bays[bay] = null;
    if (r === 'win') {
      g.seen++; g.coffeeReady = true; g.napReady = true; g.vendIn = Math.max(0, g.vendIn - 1); g.min += 35;
    } else g.min += 15;
    stepsSince = 0;
    fadeOut(() => { state = 'world'; SFX.music('world'); if (g.min >= 720) nightEnd(); });
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
      G.draw(SPR.docDown[0], 136, 8);
      [
        'DR. MALPHAS, M.D.', 'DEMON. NIGHT SHIFT.', '',
        `BURNOUT LV   ${g.lv}`, `BURNOUT PTS  ${g.xp}/${g.next}`, `SANITY       ${g.san}/${g.sanMax}`,
        `SELF-RESPECT ${g.rsp}/${g.rspMax}`, `NIGHT        ${g.night}`, `PATIENTS     ${g.seen}`,
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
    let s, flip = false;
    if (P.dir === 'down' || P.dir === 'up') {
      s = (P.dir === 'down' ? SPR.docDown : SPR.docUp)[walking ? 1 : 0];
      flip = walking && P.steps % 2 === 1;
    } else {
      s = SPR.docSide[walking ? 1 : 0];
      flip = P.dir === 'left';
    }
    G.draw(s, P.px - cx, P.py - cy - 3 - (walking ? 1 : 0), flip);
  }

  function drawWorld() {
    const cx = Math.max(0, Math.min(WORLD.w * TS - 160, P.px - 72));
    const cy = Math.max(-9, Math.min(WORLD.h * TS - 144, P.py - 64));
    G.clear(3);
    WORLD.draw(cx, cy);
    WORLD.drawBays(g.bays, cx, cy);
    WORLD.drawNPCs(cx, cy);
    drawPlayer(cx, cy);
    G.rect(0, 0, 160, 9, 3);
    G.text(`${g.clockStr()} N${g.night}`, 2, 1, 0);
    const st = `SAN ${g.san} RSP ${g.rsp}`;
    G.text(st, 158 - G.textW(st), 1, g.san < 10 || g.rsp < 8 ? 1 : 0);
    if (menu) drawMenu();
    if (dlg) TB.draw(dlg.tb);
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
    if (fade) stepFade();
    else if (state === 'title') updTitle();
    else if (state === 'world') updWorld();
    else if (state === 'trans') updTrans();
    else if (state === 'battle') BATTLE.update(I);
    else if (state === 'gameover') updOver();
    I.hit = {};
  }
  function draw() {
    if (state === 'title') drawTitle();
    else if (state === 'world' || state === 'trans') drawWorld();
    else if (state === 'battle') BATTLE.draw();
    else if (state === 'gameover') drawOver();
  }

  let last = performance.now(), acc = 0;
  function loop(now) {
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= 1000 / 60) { acc -= 1000 / 60; tick(); }
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Console hooks for testing: DEBUG.press('a'); DEBUG.run(60);
  window.DEBUG = {
    get g() { return g; }, get state() { return state; }, get P() { return P; }, get dlg() { return dlg; },
    encounter: (i) => { dlg = null; encounter(PATIENTS[i || 0], 'DEBUG PATIENT!', -1); },
    press: (b) => { I.hit[b] = true; },
    hold: (b, on) => { I.down[b] = on; },
    run: (n = 1) => { for (let i = 0; i < n; i++) tick(); draw(); },
  };
})();
