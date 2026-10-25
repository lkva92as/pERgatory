// Typewriter text box (shared) and the patient-encounter battle system.
(function () {
  // ---------- text box ----------
  const TB = window.TB = { LINES: 3, COLS: 24 };
  TB.make = (str) => {
    const lines = G.wrap(str, TB.COLS), pages = [];
    for (let i = 0; i < lines.length; i += TB.LINES) pages.push(lines.slice(i, i + TB.LINES));
    return { pages, page: 0, shown: 0 };
  };
  const pageText = (tb) => tb.pages[tb.page].join('\n');
  // Returns true once the player dismisses the last page.
  TB.update = (tb, I) => {
    const len = pageText(tb).length;
    if (tb.shown < len) {
      const prev = tb.shown;
      tb.shown = Math.min(len, tb.shown + 2);
      if ((tb.shown >> 2) !== (prev >> 2)) SFX.play('blip');
      if (I.pressed('a') || I.pressed('b')) tb.shown = len;
      return false;
    }
    if (I.pressed('a') || I.pressed('b')) {
      if (tb.page < tb.pages.length - 1) { tb.page++; tb.shown = 0; return false; }
      return true;
    }
    return false;
  };
  TB.done = (tb) => tb.page === tb.pages.length - 1 && tb.shown >= pageText(tb).length;
  TB.draw = (tb) => {
    G.box(0, 96, 160, 48);
    if (!tb) return;
    const full = pageText(tb);
    G.text(full.slice(0, tb.shown), 8, 104, 3);
    if (tb.shown >= full.length && (G.frame >> 4) % 2 === 0) G.text('▼', 147, 133, 3);
  };

  // ---------- battle ----------
  const B = window.BATTLE = {};
  let s = null;
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const STAT = { san: 'SANITY', rsp: 'SELF-RESPECT' };
  const short = (id) => (MOVES.find((m) => m.id === id) || ITEMS[id]).short;
  const MENU = ['TREAT', 'ITEMS', 'CHART', 'DISCHARGE'];

  const push = (e) => s.q.push(e);
  const say = (t) => push({ k: 'text', s: t });
  const sfx = (n) => push({ k: 'fn', f: () => SFX.play(n) });
  const lost = () => s.g.san <= 0 || s.g.rsp <= 0;
  const itemList = () => Object.keys(ITEMS).filter((k) => s.g.items[k] > 0);

  // `where` is an optional line setting the scene (which bay, etc.) before the patient's own intro.
  B.start = (p, g, where, onEnd) => {
    const hp = Math.round(p.hp * (1 + 0.15 * (g.night - 1) + 0.04 * (g.lv - 1)));
    const visit = g.met[p.id] = (g.met[p.id] || 0) + 1;
    s = {
      p, g, onEnd, hp, hpMax: hp, hpShown: hp, dmgScale: 1 + 0.12 * (g.night - 1),
      sanShown: g.san, rspShown: g.rsp, q: [], ev: null, tb: null, mode: 'busy',
      menu: 0, mv: 0, it: 0, calm: false, line: 0, loud: 0, charted: false,
      blink: 0, shake: 0, faint: 0, slide: 0,
    };
    SFX.music('battle');
    push({ k: 'slide' });
    if (where) say(where);
    say(visit > 1 && p.back ? p.back.replace('{N}', visit) : p.intro);
    say(`${p.name}!\nCHIEF COMPLAINT: ${p.cc}`);
    push({ k: 'menu' });
  };

  // ---------- turn logic (state changes now, display catches up via events) ----------
  // Weakness hits get the patient's own reaction; other hits show `reaction` if given.
  function hitPatient(base, id, reaction) {
    const weak = s.p.weak === id;
    s.hp = Math.max(0, s.hp - Math.round(base * (weak ? (s.p.weakMult || 2) : 1)));
    sfx('hit');
    push({ k: 'blink' });
    push({ k: 'bar', w: 'hp', to: s.hp });
    if (weak) { say(s.p.weakHit); say("IT'S SUPER EFFECTIVE!"); }
    else if (reaction) say(reaction);
  }

  function hurtMe(stat, n) {
    s.g[stat] = Math.max(0, s.g[stat] - n);
    sfx('hurt');
    push({ k: 'shake' });
    push({ k: 'bar', w: stat, to: s.g[stat] });
  }

  // Patients work through their script in order; at the end they start over, louder.
  function enemyTurn() {
    const p = s.p;
    let a = p.script[s.line++];
    if (!a) {
      s.line = 0;
      s.loud++;
      a = { t: null, s: 'san', d: 6 };
    }
    let n = (a.d + 2 * s.loud) * s.dmgScale * (0.9 + Math.random() * 0.2);
    if (s.calm) n *= 0.5;
    s.calm = false;
    say(a.t ? `${p.short}: "${a.t}"` : `${p.short} TAKES A DEEP BREATH AND STARTS AGAIN FROM THE TOP. LOUDER.`);
    hurtMe(a.s, Math.max(1, Math.round(n)));
    if (a.g && s.hp < s.hpMax && !lost()) {
      s.hp = Math.min(s.hpMax, s.hp + a.g);
      push({ k: 'bar', w: 'hp', to: s.hp });
      say(`${p.short}'S DEMANDS GREW!`);
    }
  }

  function winSeq() {
    const p = s.p, g = s.g, xp = Math.round(s.hpMax * 0.9);
    push({ k: 'faint' });
    sfx('win');
    say(p.win);
    say(`PATIENT DISCHARGED!\n+${xp} BURNOUT POINTS.`);
    const msgs = g.gainXp(xp);
    if (msgs.length) sfx('levelup');
    msgs.forEach(say);
    push({ k: 'end', r: 'win' });
  }

  function loseSeq() {
    say(`${s.p.short}: ${s.p.last}`);
    say(s.g.san <= 0 ? 'YOUR SANITY HAS LEFT THE BUILDING.' : 'YOU HAVE NO SELF-RESPECT LEFT. NOT EVEN A LITTLE.');
    push({ k: 'fn', f: () => { SFX.music(null); SFX.play('gameover'); } });
    say('DR. MALPHAS BLACKED OUT!');
    push({ k: 'end', r: 'lose' });
  }

  function endOrMenu(usedTurn) {
    if (s.hp <= 0) return winSeq();
    if (lost()) return loseSeq();
    if (usedTurn) {
      enemyTurn();
      if (lost()) return loseSeq();
    }
    push({ k: 'menu' });
  }

  function doMove(m) {
    const g = s.g, p = s.p;
    s.mode = 'busy';
    if (m.cost && g.rsp <= m.cost) {
      say("YOU DON'T HAVE ENOUGH SELF-RESPECT LEFT TO RISK ANOTHER HR WRITE-UP.");
      return push({ k: 'menu' });
    }
    const base = rnd(m.min, m.max);
    if (m.id === 'diagnose') {
      say(`DR. MALPHAS DIAGNOSES:\n"${p.dx}"`);
      hitPatient(base, m.id);
    } else if (m.id === 'reassure') {
      say(p.reassure);
      hitPatient(base, m.id);
      s.calm = true;
    } else if (m.id === 'pamphlet') {
      say(`YOU HAND ${p.short} A PAMPHLET:\n"${p.pamphlet}"`);
      if (p.weak !== 'pamphlet' && (p.resist === 'pamphlet' || Math.random() < m.backfire)) {
        sfx('miss');
        say(p.backfire);
        hurtMe('san', rnd(4, 7));
      } else hitPatient(base, m.id);
    } else if (m.id === 'hellfire') {
      say('YOUR EYES BLAZE WITH THE FIRES OF THE PIT!');
      sfx('fire');
      push({ k: 'flash' });
      hitPatient(base, m.id, p.hellfire);
      g.rsp -= m.cost;
      push({ k: 'bar', w: 'rsp', to: g.rsp });
      say(`HR HAS BEEN NOTIFIED.\n-${m.cost} SELF-RESPECT.`);
    }
    endOrMenu(true);
  }

  function useItem(id) {
    const it = ITEMS[id], g = s.g;
    s.mode = 'busy';
    g.items[id]--;
    if (it.heal) {
      say(`YOU USE: ${it.name}.`);
      sfx('heal');
      const parts = [];
      for (const k of ['san', 'rsp']) {
        if (!it.heal[k]) continue;
        parts.push(`+${g.heal(k, it.heal[k])} ${STAT[k]}`);
        push({ k: 'bar', w: k, to: g[k] });
      }
      say(parts.join(', ') + '.');
    } else {
      say(`YOU OFFER ${s.p.short}: ${it.name}.`);
      hitPatient(it.dmg, id, it.use.replace('{P}', s.p.short));
    }
    endOrMenu(true);
  }

  function chart() {
    const p = s.p;
    s.mode = 'busy';
    say(`CHART: ${p.chart}`);
    say(`WEAKNESS: ${short(p.weak)}.` + (p.resist ? ` RESISTS: ${short(p.resist)}.` : '') + (p.noRun ? ' CANNOT BE DISCHARGED.' : ''));
    s.charted = true;
    push({ k: 'menu' });
  }

  function discharge() {
    const p = s.p;
    s.mode = 'busy';
    say(`YOU TRY TO DISCHARGE ${p.short}...`);
    if (p.noRun) { say(`${p.short} REFUSES. ${p.short} LIVES HERE NOW.`); return endOrMenu(true); }
    if (Math.random() < 0.35 + 0.55 * (1 - s.hp / s.hpMax)) {
      sfx('back');
      say(`${p.short} LEAVES AGAINST MEDICAL ADVICE. "YOU'LL HEAR FROM MY LAWYER."`);
      push({ k: 'end', r: 'run' });
    } else {
      say('"I\'M NOT LEAVING UNTIL I GET ANSWERS!"');
      endOrMenu(true);
    }
  }

  // ---------- update ----------
  function nav(I, n, key) {
    if (I.pressed('up')) { s[key] = (s[key] + n - 1) % n; SFX.play('blip'); }
    if (I.pressed('down')) { s[key] = (s[key] + 1) % n; SFX.play('blip'); }
  }

  function menuInput(I) {
    if (s.mode === 'menu') {
      nav(I, 4, 'menu');
      if (!I.pressed('a')) return;
      SFX.play('select');
      if (s.menu === 0) s.mode = 'moves';
      else if (s.menu === 1) {
        if (itemList().length) { s.mode = 'items'; s.it = 0; }
        else { s.mode = 'busy'; say('YOUR POCKETS ARE EMPTY. LIKE YOUR SOUL.'); push({ k: 'menu' }); }
      } else if (s.menu === 2) chart();
      else discharge();
    } else if (s.mode === 'moves') {
      nav(I, MOVES.length, 'mv');
      if (I.pressed('b')) { s.mode = 'menu'; SFX.play('back'); }
      else if (I.pressed('a')) { SFX.play('select'); doMove(MOVES[s.mv]); }
    } else if (s.mode === 'items') {
      const list = itemList();
      nav(I, list.length, 'it');
      if (I.pressed('b')) { s.mode = 'menu'; SFX.play('back'); }
      else if (I.pressed('a')) { SFX.play('select'); useItem(list[s.it]); }
    }
  }

  const next = () => { s.ev = null; };

  B.update = (I) => {
    if (s.blink) s.blink--;
    if (s.shake) s.shake--;
    if (s.mode !== 'busy') return menuInput(I);
    if (!s.ev) {
      s.ev = s.q.shift();
      if (!s.ev) return;
      s.ev.c = 0;
      if (s.ev.k === 'text') { s.tb = TB.make(s.ev.s); return; }
    }
    const e = s.ev;
    e.c++;
    switch (e.k) {
      case 'text': if (TB.update(s.tb, I)) next(); break;
      case 'fn': e.f(); next(); break;
      case 'slide': s.slide = Math.min(1, e.c / 40); if (s.slide >= 1) next(); break;
      case 'blink': if (e.c === 1) s.blink = 24; if (e.c >= 24) next(); break;
      case 'shake': if (e.c === 1) s.shake = 16; if (e.c >= 16) next(); break;
      case 'flash': G.invert = !G.reducedMotion && (e.c >> 2) % 2 === 0; if (e.c >= 28) { G.invert = false; next(); } break;
      case 'faint': s.faint = Math.min(48, e.c * 2); if (s.faint >= 48) next(); break;
      case 'bar': {
        const key = e.w + 'Shown';
        const d = e.to - s[key];
        s[key] += Math.sign(d) * Math.min(Math.abs(d), 0.5);
        if (s[key] === e.to) next();
        break;
      }
      case 'menu': s.mode = 'menu'; s.tb = null; next(); break;
      case 'end': next(); s.onEnd(e.r); break;
    }
  };

  B.mode = () => s && s.mode; // for console testing

  // ---------- draw ----------
  B.draw = () => {
    const ctx = G.ctx, p = s.p, g = s.g;
    ctx.save();
    if (s.shake && !G.reducedMotion) ctx.translate((s.shake >> 1) % 2 ? 2 : -2, 0);
    G.clear(0);

    const ex = Math.round(-48 + 152 * s.slide), mx = Math.round(160 - 152 * s.slide);
    G.rect(ex - 4, 46, 56, 2, 1);
    if (!(s.blink && (s.blink >> 2) % 2)) {
      ctx.save();
      ctx.beginPath(); ctx.rect(ex, 0, 48, 46); ctx.clip();
      G.draw(p.sprite, ex, s.faint);
      ctx.restore();
    }
    G.rect(mx - 4, 94, 56, 2, 1);
    G.draw(SPR.docBack, mx, 48);

    if (s.slide >= 1) {
      G.text(p.name, 4, 4);
      G.text('WANTS', 4, 14);
      G.bar(36, 15, 50, s.hpShown / s.hpMax);
      G.rect(2, 22, 86, 1, 3);
      G.rect(88, 12, 1, 11, 3);
      if (s.charted) G.text('WEAK:' + short(p.weak), 4, 27, 2);

      G.text('DR.MALPHAS', 64, 52);
      G.text('L' + g.lv, 156 - G.textW('L' + g.lv), 52);
      [['SAN', 'san', 63], ['RSP', 'rsp', 74]].forEach(([lbl, k, y]) => {
        G.text(lbl, 64, y);
        G.bar(84, y + 2, 48, s[k + 'Shown'] / g[k + 'Max']);
        const v = String(Math.ceil(s[k + 'Shown']));
        G.text(v, 156 - G.textW(v), y);
      });
      G.rect(62, 85, 97, 1, 3);
      G.rect(158, 62, 1, 24, 3);
    }

    if (s.mode === 'menu') {
      G.box(0, 96, 88, 48);
      G.text('WHAT WILL\nDR.MALPHAS\nDO?', 8, 104);
      G.box(88, 96, 72, 48);
      MENU.forEach((m, i) => G.text(m, 100, 101 + i * 10));
      G.text('▶', 93, 101 + s.menu * 10);
    } else if (s.mode === 'moves') {
      G.box(0, 70, 160, 28);
      G.text(G.wrap(MOVES[s.mv].desc, 24).slice(0, 2).join('\n'), 8, 76);
      G.box(0, 96, 160, 48);
      MOVES.forEach((m, i) => G.text(m.name, 16, 101 + i * 10));
      G.text('▶', 8, 101 + s.mv * 10);
    } else if (s.mode === 'items') {
      const list = itemList();
      s.it = Math.min(s.it, list.length - 1);
      const top = Math.max(0, Math.min(s.it - 1, list.length - 4));
      G.box(0, 70, 160, 28);
      G.text(G.wrap(ITEMS[list[s.it]].desc, 24).slice(0, 2).join('\n'), 8, 76);
      G.box(0, 96, 160, 48);
      list.slice(top, top + 4).forEach((id, i) => {
        G.text(ITEMS[id].name, 16, 101 + i * 10);
        const c = 'X' + g.items[id];
        G.text(c, 152 - G.textW(c), 101 + i * 10);
      });
      G.text('▶', 8, 101 + (s.it - top) * 10);
    } else {
      TB.draw(s.tb);
    }
    ctx.restore();
  };
})();
