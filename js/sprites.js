// Overworld sprites (hand-drawn 16x16) and procedural battle portraits.
(function () {
  const S = window.SPR = {};
  const spr = (rows) => {
    rows.forEach((r, i) => { if (r.length !== 16) console.warn('sprite row', i, 'len', r.length, r); });
    return G.spr(rows);
  };

  // ---------- Dr. Malphas (the player) ----------
  const docDownTop = [
    '...3........3...',
    '...32......23...',
    '....33333333....',
    '...3333333333...',
    '..333333333333..',
    '..331111111133..',
    '..311311113113..',
    '..311311113113..',
    '...3111331113...',
    '....31111113....',
    '...3003223003...',
    '..300002200003..',
    '..303002200303..',
    '..313000000313..',
  ];
  S.docDown = [
    spr([...docDownTop, '...3333333333...', '....33....33....']),
    spr([...docDownTop, '...3333333333...', '....33..........']),
  ];

  const docUpTop = [
    '...3........3...',
    '...32......23...',
    '....33333333....',
    '...3333333333...',
    '..333332233333..',
    '..332333333233..',
    '..333333333333..',
    '..333333333333..',
    '...3333333333...',
    '....33111133....',
    '...3000000003...',
    '..300000000003..',
    '..303000000303..',
    '..313000000313..',
  ];
  S.docUp = [
    spr([...docUpTop, '...3333333333...', '....33....33....']),
    spr([...docUpTop, '...3333333333...', '..........33....']),
  ];

  const docSideTop = [
    '.....3...3......',
    '.....32..23.....',
    '.....33333333...',
    '....3333333333..',
    '...33333331113..',
    '...33333311113..',
    '...33331111313..',
    '...33331111313..',
    '...333311111113.',
    '....3311111333..',
    '.3...30002233...',
    '323.300000303...',
    '.3..300000303...',
    '..33300000313...',
    '....33333333....',
  ];
  S.docSide = [
    spr([...docSideTop, '.....33..33.....']),
    spr([...docSideTop, '....33....33....']),
  ];

  // ---------- NPCs ----------
  S.nurse = spr([
    '.....333333.....',
    '....30022003....',
    '...3333333333...',
    '..333333333333..',
    '..331111111133..',
    '..311311113113..',
    '..311111111113..',
    '..331112211133..',
    '..333111111333..',
    '..33.311113.33..',
    '...3322222233...',
    '..322222222223..',
    '..323222222323..',
    '..313222222313..',
    '...3333333333...',
    '....33....33....',
  ]);

  // Wet floor sign, set on a bay while it's being cleaned.
  S.wetSign = spr([
    '................',
    '................',
    '.......33.......',
    '......3113......',
    '......3113......',
    '.....311113.....',
    '.....313313.....',
    '....31133113....',
    '....31133113....',
    '...3111331113...',
    '...3111111113...',
    '..311113311113..',
    '..311111111113..',
    '..333333333333..',
    '..3..........3..',
    '..3..........3..',
  ]);

  // Anesthesiologist: bouffant cap, mask on the chin, eyes on the phone.
  S.anesth = spr([
    '................',
    '....33333333....',
    '...3121212123...',
    '...3212121213...',
    '...3333333333...',
    '...3111111113...',
    '...3111111113...',
    '...3131111313...',
    '...3200000023...',
    '....30000003....',
    '...3222222223...',
    '..322233332223..',
    '..321130031123..',
    '..322233332223..',
    '...3222222223...',
    '....33....33....',
  ]);

  S.skeleton = spr([
    '................',
    '.....333333.....',
    '....30000003....',
    '...3000000003...',
    '...3033003303...',
    '...3033003303...',
    '...3000330003...',
    '....30000003....',
    '....30303033....',
    '.....333333.....',
    '....33300333....',
    '...30.3003.03...',
    '...3033333303...',
    '...3..3003..3...',
    '.....30..03.....',
    '.....33..33.....',
  ]);

  S.cerberus = spr([
    '.3.3..3.3..3.3..',
    '322233222332223.',
    '302033020330203.',
    '322233222332223.',
    '.333..333..333..',
    '.3222222222223..',
    '32222222222223..',
    '30202020202023..',
    '32222222222223.3',
    '322222222222233.',
    '.322222222223...',
    '.3223.....3223..',
    '.3223.....3223..',
    '.3003.....3003..',
    '..33.......33...',
    '................',
  ]);

  S.ghost = spr([
    '.....333333.....',
    '....30000003....',
    '...3000000003.2.',
    '...3033003303.2.',
    '...3033003303.2.',
    '...3000000003.2.',
    '...3000330003.2.',
    '...3000330003.2.',
    '..3000000000032.',
    '..3000000000032.',
    '..3000000000032.',
    '..300000000003..',
    '..30000000000332',
    '...30300300303..',
    '....3..3..3.322.',
    '............2222',
  ]);

  // Overworld patients: 's' = skin, 'b' / 'h' = bonnet fabric / sheen. One sprite per skin tone and headwear.
  const OW = [
    '................',
    '.....333333.....',
    '....33333333....',
    '...3333333333...',
    '...33ssssss33...',
    '...3s3ssss3s3...',
    '...3ssssssss3...',
    '...3sss33sss3...',
    '....3ssssss3....',
    '.....3ssss3.....',
    '...3000000003...',
    '..300200002003..',
    '..3s30000003s3..',
    '...3002000203...',
    '....3ss33ss3....',
    '....333..333....',
  ];
  const OW_BONNET = [
    '................',
    '....33333333....',
    '...3bbhbbbbb3...',
    '..3bhbbbbbbbb3..',
  ];
  const owCache = {};
  S.ow = (look = {}) => {
    const skin = look.skin || 1, bonnet = look.hair === 'bonnet', k = skin + (bonnet ? 'b' : '');
    if (!owCache[k]) {
      const rows = (bonnet ? OW_BONNET.concat(OW.slice(4)) : OW).map((r, y) => [...r].map((ch, x) => {
        if (ch === 's') return skin === 'mid' ? ((x + y) % 2 ? '1' : '2') : String(skin);
        return ch === 'b' ? '1' : ch === 'h' ? '0' : ch;
      }).join(''));
      owCache[k] = spr(rows);
    }
    return owCache[k];
  };

  // ---------- battle portraits (48x48) ----------
  const W = 48;

  // A thick curve made of shrinking blobs, for horns and tails.
  function curve(px, x0, y0, cx, cy, x1, y1, r0, r1, c) {
    for (let t = 0; t <= 1.0001; t += 0.04) {
      const u = 1 - t;
      const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
      const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      const r = r0 + (r1 - r0) * t;
      px.ellipse(x, y, Math.max(0.6, r), Math.max(0.6, r), c);
    }
  }

  S.docBack = (() => {
    const p = new G.Pix(W, W);
    curve(p, 41, 47, 47, 38, 43, 28, 1.6, 1.2, 2);           // tail
    p.ellipse(43, 26, 3, 2.5, 2).set(43, 23, 2);             // spade tip
    p.ellipse(24, 54, 23, 20, 0);                            // coat shoulders
    p.rect(19, 33, 10, 5, 1);                                // neck
    p.ellipse(11.5, 23, 2.5, 4, 1).ellipse(36.5, 23, 2.5, 4, 1); // ears
    p.set(10, 18, 1).set(37, 18, 1);
    p.ellipse(24, 22, 12, 13, 3);                            // hair
    p.dither(17, 12, 14, 6, 2, 0);                           // hair sheen
    curve(p, 17, 13, 9, 9, 7, 1, 3, 0.8, 2);                 // horns
    curve(p, 31, 13, 39, 9, 41, 1, 3, 0.8, 2);
    p.line(24, 38, 24, 47, 2);                               // coat seam
    p.line(8, 40, 14, 37, 2).line(40, 40, 34, 37, 2);        // shoulder creases
    p.rect(19, 35, 10, 2, 0);                                // collar
    p.outline(3);
    return p.toSprite();
  })();

  // look: {rx, hair, hairC, eyes, mouth, prop, extra, skin (1 light, 'mid' dithered, 2 dark), bonnetC}
  const MID = 4; // placeholder for the dithered mid skin tone, resolved after drawing
  S.makePatient = (look) => {
    const L = Object.assign({ rx: 11, hair: 'short', hairC: 3, eyes: 'dot', mouth: 'open', skin: 1 }, look);
    const p = new G.Pix(W, W), cx = 24, cy = 21, rx = L.rx, ry = 13;
    const SK = L.skin === 'mid' ? MID : L.skin, FC = SK === 1 ? 2 : 3; // FC: nose/shadow color that reads on this skin

    if (L.hair === 'long') p.ellipse(cx, cy + 6, rx + 3, ry + 5, L.hairC);
    p.ellipse(cx, 52, 21, 14, 0);                                       // gown
    for (let y = 40; y < 48; y += 4) for (let x = 6 + (y % 8 ? 2 : 0); x < 44; x += 5) p.set(x, y, 2);
    p.line(cx - 4, 38, cx, 42, 2).line(cx + 4, 38, cx, 42, 2);          // neckline
    p.rect(cx - 4, 31, 8, 7, SK);                                   // neck
    p.ellipse(cx - rx, cy + 1, 2, 3, SK).ellipse(cx + rx, cy + 1, 2, 3, SK); // ears
    p.ellipse(cx, cy, rx, ry, SK);                                  // head

    // hair cap above the hairline
    const capTo = { short: 13, long: 13, spiky: 13, bun: 12, cap: 13, bonnet: 13, mohawk: 0, bald: 0 }[L.hair] || 0;
    for (let y = 0; y < capTo; y++) for (let x = 0; x < W; x++) if (p.get(x, y) === SK) p.set(x, y, L.hairC);
    if (L.hair === 'spiky') for (let i = -2; i <= 2; i++) p.line(cx + i * 4, 10, cx + i * 5, 3 - Math.abs(i), L.hairC).line(cx + i * 4 + 1, 10, cx + i * 5 + 1, 3 - Math.abs(i), L.hairC);
    if (L.hair === 'bun') p.ellipse(cx, 5, 5, 4, L.hairC);
    if (L.hair === 'mohawk') p.rect(cx - 2, 2, 4, 12, L.hairC);
    if (L.hair === 'bald' || L.hair === 'mohawk') p.set(cx - 6, 11, 0).set(cx - 5, 10, 0).set(cx - 4, 10, 0);
    if (L.hair === 'cap') { p.rect(cx - rx, 12, rx * 2 + 1, 2, 2); p.rect(cx, 12, rx + 7, 2, 3); }
    if (L.hair === 'bonnet') {
      // silk bonnet: a satin puff over the hair, a gathered band at the hairline, sheen on top
      const fc = L.bonnetC === 0 ? 0 : 1, sc = fc === 0 ? 1 : 0, bc = fc === 0 ? 1 : 2;
      p.ellipse(cx, 7, rx + 4, 7, fc);
      p.rect(cx - rx - 2, 13, rx * 2 + 5, 2, bc);
      for (let x = cx - rx - 2; x < cx + rx + 3; x += 2) p.set(x, 15, bc);
      p.line(cx + 1, 4, cx + 4, 12, bc).line(cx - 3, 5, cx - 5, 12, bc);   // folds
      p.line(cx - 9, 6, cx - 4, 2, sc).line(cx - 10, 9, cx - 8, 7, sc).line(cx + 4, 2, cx + 7, 3, sc);
    }

    // eyes
    const ey = cy + 1, exL = cx - 6, exR = cx + 4;
    if (L.eyes === 'shades') {
      p.rect(exL - 2, ey - 1, 6, 4, 3).rect(exR - 2, ey - 1, 6, 4, 3).line(exL + 4, ey, exR - 2, ey, 3);
      p.set(exL - 1, ey, 0).set(exR - 1, ey, 0);
    } else {
      if (L.eyes === 'tired') { p.rect(exL, ey + 1, 2, 1, 3).rect(exR, ey + 1, 2, 1, 3); p.rect(exL, ey + 3, 3, 1, FC).rect(exR, ey + 3, 3, 1, FC); }
      else p.rect(exL, ey, 2, 2, 3).rect(exR, ey, 2, 2, 3);
      if (SK !== 1 && L.eyes !== 'tired') p.rect(exL - 1, ey, 1, 2, 0).rect(exR + 2, ey, 1, 2, 0); // eye whites
      if (L.eyes === 'angry') p.line(exL - 2, ey - 4, exL + 2, ey - 2, 3).line(exR + 3, ey - 4, exR - 1, ey - 2, 3);
      if (L.eyes === 'worried') p.line(exL - 1, ey - 2, exL + 2, ey - 4, 3).line(exR + 2, ey - 2, exR - 1, ey - 4, 3);
      if (L.eyes === 'glasses') {
        for (const ex of [exL, exR]) { p.line(ex - 2, ey - 2, ex + 3, ey - 2, 3).line(ex - 2, ey + 3, ex + 3, ey + 3, 3).line(ex - 2, ey - 2, ex - 2, ey + 3, 3).line(ex + 3, ey - 2, ex + 3, ey + 3, 3); }
        p.line(exL + 3, ey, exR - 2, ey, 3);
      }
    }
    p.set(cx - 1, cy + 5, FC).set(cx - 1, cy + 6, FC);                 // nose

    // mouth
    const my = cy + 9;
    if (L.mouth === 'open') p.ellipse(cx - 0.5, my, 3.5, 2.5, 3).rect(cx - 3, my - 2, 5, 1, 0);
    if (L.mouth === 'frown') p.line(cx - 4, my + 1, cx - 2, my - 1, 3).line(cx - 2, my - 1, cx + 2, my - 1, 3).line(cx + 2, my - 1, cx + 3, my + 1, 3);
    if (L.mouth === 'smile') p.line(cx - 4, my - 1, cx - 2, my + 1, 3).line(cx - 2, my + 1, cx + 2, my + 1, 3).line(cx + 2, my + 1, cx + 3, my - 1, 3);
    if (L.mouth === 'flat') p.line(cx - 3, my, cx + 2, my, 3);
    if (L.mouth === 'wavy') for (let i = -4; i <= 3; i++) p.set(cx + i, my + (i % 2 ? 1 : 0), 3);

    // extras
    if (L.extra === 'beard') {
      for (let y = cy + 6; y < cy + ry + 3; y++) for (let x = 0; x < W; x++) if (p.get(x, y) === SK && y !== my && y !== my - 1) p.set(x, y, L.hairC);
      p.ellipse(cx, cy + 13, 7, 4, L.hairC);
    }
    if (L.extra === 'mask') { p.rect(cx - 8, my + 3, 16, 5, 0); p.line(cx - 8, my + 5, cx + 7, my + 5, 2); p.line(cx - 9, my + 3, cx - rx, cy, 2).line(cx + 8, my + 3, cx + rx, cy, 2); }
    if (L.extra === 'bandage') { p.rect(cx + 2, 6, 9, 4, 0); p.line(cx + 2, 6, cx + 10, 6, 2).line(cx + 6, 6, cx + 6, 9, 2); }
    if (L.extra === 'icepack') { p.rect(cx - 7, 3, 14, 6, 0).dither(cx - 6, 4, 12, 4, 1, 0); }
    if (L.extra === 'tissue') p.ellipse(cx - 2, cy + 7, 2, 1.5, 0).set(cx - 2, cy + 9, 1);

    // prop held in a hand at lower right
    const hx = 36, hy = 40;
    if (L.prop === 'phone') { p.rect(hx - 1, hy - 14, 8, 13, 3).rect(hx, hy - 13, 6, 10, 1).line(hx + 1, hy - 11, hx + 4, hy - 11, 0).line(hx + 1, hy - 9, hx + 3, hy - 9, 0); }
    if (L.prop === 'sandwich') { p.rect(hx - 2, hy - 10, 11, 3, 1).rect(hx - 1, hy - 7, 10, 2, 2).rect(hx - 2, hy - 5, 11, 3, 1); p.dither(hx - 1, hy - 7, 10, 2, 0, 1); }
    if (L.prop === 'chips') { p.rect(hx - 2, hy - 14, 10, 13, 2).rect(hx, hy - 10, 6, 4, 0).line(hx - 2, hy - 14, hx + 7, hy - 14, 3); p.set(hx + 2, hy - 16, 1).set(hx + 5, hy - 17, 1); }
    if (L.prop === 'oil') { p.rect(hx + 1, hy - 16, 3, 4, 3).rect(hx - 1, hy - 12, 7, 11, 2).rect(hx, hy - 9, 5, 4, 0); }
    if (L.prop === 'note') { p.rect(hx - 3, hy - 14, 11, 13, 0); for (let y = hy - 11; y < hy - 2; y += 3) p.line(hx - 1, y, hx + 5, y, 2); }
    if (L.prop === 'cane') p.line(hx + 4, hy + 8, hx + 4, hy - 12, 2).line(hx + 4, hy - 12, hx + 1, hy - 14, 2);
    if (L.prop === 'bag') { p.rect(hx - 3, hy - 9, 12, 9, 2).line(hx - 1, hy - 9, hx + 1, hy - 13, 3).line(hx + 1, hy - 13, hx + 5, hy - 13, 3).line(hx + 5, hy - 13, hx + 7, hy - 9, 3); }
    if (L.prop === 'tissues') { p.ellipse(hx + 2, hy - 6, 5, 4, 0).line(hx, hy - 7, hx + 3, hy - 5, 1).line(hx + 2, hy - 9, hx + 5, hy - 7, 1); }
    if (L.prop) p.ellipse(hx + 1, hy, 4, 3, SK);

    p.outline(3);
    for (let i = 0; i < p.d.length; i++) if (p.d[i] === MID) p.d[i] = ((i % W) + Math.floor(i / W)) % 2 ? 1 : 2;
    return p.toSprite();
  };
})();
