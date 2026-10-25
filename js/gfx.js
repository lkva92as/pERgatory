// Rendering core: 4-color palette, cached sprites, bitmap text, UI boxes.
(function () {
  const G = window.G = {};
  G.W = 160; G.H = 144;
  G.CW = 6;   // character advance
  G.LH = 10;  // line height
  G.frame = 0;

  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  G.canvas = canvas;
  G.ctx = ctx;

  // ---------- palette ----------
  G.palettes = [
    { name: 'MORGUE GREEN', c: ['#e0f8d0', '#88c070', '#346856', '#081820'] },
    { name: 'HELLFIRE',     c: ['#fbe7c6', '#e0703c', '#8c1d3c', '#1e0a14'] },
    { name: 'FLUORESCENT',  c: ['#f0f0e8', '#a8b0b0', '#586068', '#141820'] },
    { name: 'BRUISE',       c: ['#efe0f8', '#b08cc8', '#5c3c78', '#1a0f26'] },
  ];
  let palIdx = 0;
  try { palIdx = (+localStorage.getItem('perg.pal') || 0) % G.palettes.length; } catch (e) {}
  G.shift = 0;      // -3..3: negative fades toward white, positive toward black
  G.invert = false; // flash effect

  G.setPalette = (i) => {
    palIdx = (i + G.palettes.length) % G.palettes.length;
    try { localStorage.setItem('perg.pal', palIdx); } catch (e) {}
  };
  G.palIdx = () => palIdx;
  G.palName = () => G.palettes[palIdx].name;
  const mapIdx = (i) => {
    if (G.invert) i = 3 - i;
    return Math.max(0, Math.min(3, i + G.shift));
  };
  G.color = (i) => G.palettes[palIdx].c[mapIdx(i)];
  const cacheKey = () => palIdx + ':' + G.shift + ':' + (G.invert ? 1 : 0);

  const rgbCache = {};
  function rgb(hex) {
    if (!rgbCache[hex]) {
      const n = parseInt(hex.slice(1), 16);
      rgbCache[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    return rgbCache[hex];
  }

  // ---------- primitives ----------
  G.rect = (x, y, w, h, ci) => {
    ctx.fillStyle = G.color(ci);
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  G.clear = (ci = 0) => G.rect(0, 0, G.W, G.H, ci);

  // ---------- sprites ----------
  // A sprite is {w, h, data: Uint8Array (0-3 = color, 255 = transparent), cache}.
  G.T = 255;
  G.mkSprite = (w, h, data) => ({ w, h, data, cache: {} });
  G.spr = (rows) => {
    const h = rows.length, w = rows[0].length;
    const data = new Uint8Array(w * h).fill(G.T);
    rows.forEach((r, y) => {
      for (let x = 0; x < w; x++) {
        const ch = r[x];
        if (ch >= '0' && ch <= '3') data[y * w + x] = +ch;
      }
    });
    return G.mkSprite(w, h, data);
  };

  function bake(spr, flip) {
    const c = document.createElement('canvas');
    c.width = spr.w; c.height = spr.h;
    const cx = c.getContext('2d');
    const img = cx.createImageData(spr.w, spr.h);
    const pal = [0, 1, 2, 3].map((i) => rgb(G.color(i)));
    for (let y = 0; y < spr.h; y++) {
      for (let x = 0; x < spr.w; x++) {
        const v = spr.data[y * spr.w + (flip ? spr.w - 1 - x : x)];
        if (v === G.T) continue;
        const o = (y * spr.w + x) * 4, p = pal[v];
        img.data[o] = p[0]; img.data[o + 1] = p[1]; img.data[o + 2] = p[2]; img.data[o + 3] = 255;
      }
    }
    cx.putImageData(img, 0, 0);
    return c;
  }

  G.draw = (spr, x, y, flip = false, scale = 1) => {
    const k = cacheKey() + (flip ? 'f' : '');
    if (!spr.cache[k]) spr.cache[k] = bake(spr, flip);
    ctx.drawImage(spr.cache[k], Math.round(x), Math.round(y), spr.w * scale, spr.h * scale);
  };

  // Procedural pixel buffer used to build tiles and battle sprites.
  G.Pix = class {
    constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h).fill(G.T); }
    get(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? G.T : this.d[y * this.w + x]; }
    set(x, y, c) {
      x = Math.floor(x); y = Math.floor(y);
      if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
      return this;
    }
    fill(c) { this.d.fill(c); return this; }
    rect(x, y, w, h, c) {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
      return this;
    }
    dither(x, y, w, h, c, parity = 0) {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if ((i + j) % 2 === parity) this.set(i, j, c);
      return this;
    }
    ellipse(cx, cy, rx, ry, c) {
      for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) {
        for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
          const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) this.set(i, j, c);
        }
      }
      return this;
    }
    line(x0, y0, x1, y1, c) {
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.set(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
      return this;
    }
    // Stamp string art; '.' and ' ' are skipped.
    rows(x, y, rows) {
      rows.forEach((r, j) => {
        for (let i = 0; i < r.length; i++) {
          const ch = r[i];
          if (ch >= '0' && ch <= '3') this.set(x + i, y + j, +ch);
        }
      });
      return this;
    }
    outline(c = 3) {
      const marks = [];
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (this.get(x, y) !== G.T) continue;
          if (this.get(x - 1, y) !== G.T || this.get(x + 1, y) !== G.T ||
              this.get(x, y - 1) !== G.T || this.get(x, y + 1) !== G.T) marks.push(x, y);
        }
      }
      for (let i = 0; i < marks.length; i += 2) this.set(marks[i], marks[i + 1], c);
      return this;
    }
    toSprite() { return G.mkSprite(this.w, this.h, this.d); }
  };

  // ---------- text ----------
  const glyphs = Object.keys(window.FONT);
  const glyphIdx = {};
  glyphs.forEach((ch, i) => (glyphIdx[ch] = i));
  const atlasCache = {};
  function atlas(ci) {
    const k = cacheKey() + ':' + ci;
    if (atlasCache[k]) return atlasCache[k];
    const c = document.createElement('canvas');
    c.width = glyphs.length * 6; c.height = 7;
    const cx = c.getContext('2d');
    cx.fillStyle = G.color(ci);
    glyphs.forEach((ch, gi) => {
      window.FONT[ch].split('|').forEach((row, y) => {
        for (let x = 0; x < 5; x++) if (row[x] === '#') cx.fillRect(gi * 6 + x, y, 1, 1);
      });
    });
    return (atlasCache[k] = c);
  }

  G.text = (str, x, y, ci = 3, scale = 1) => {
    const a = atlas(ci);
    let cx = Math.round(x), cy = Math.round(y);
    for (const raw of String(str).toUpperCase()) {
      if (raw === '\n') { cx = Math.round(x); cy += G.LH * scale; continue; }
      const gi = glyphIdx[raw] !== undefined ? glyphIdx[raw] : glyphIdx['?'];
      if (raw !== ' ') ctx.drawImage(a, gi * 6, 0, 5, 7, cx, cy, 5 * scale, 7 * scale);
      cx += G.CW * scale;
    }
  };
  G.textW = (str, scale = 1) => (String(str).length * G.CW - 1) * scale;
  G.textC = (str, cx, y, ci = 3, scale = 1) => G.text(str, cx - G.textW(str, scale) / 2, y, ci, scale);

  // Word-wrap to lines of at most `max` characters. Honors '\n'.
  G.wrap = (str, max) => {
    const out = [];
    String(str).split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((word) => {
        while (word.length > max) {
          if (line) { out.push(line); line = ''; }
          out.push(word.slice(0, max)); word = word.slice(max);
        }
        if (!line) line = word;
        else if (line.length + 1 + word.length <= max) line += ' ' + word;
        else { out.push(line); line = word; }
      });
      out.push(line);
    });
    return out;
  };

  // ---------- UI ----------
  G.box = (x, y, w, h) => {
    G.rect(x, y, w, h, 3);
    G.rect(x + 1, y + 1, w - 2, h - 2, 0);
    G.rect(x + 2, y + 2, w - 4, h - 4, 2);
    G.rect(x + 3, y + 3, w - 6, h - 6, 0);
  };

  // Stat bar: outlined, fill flashes when low.
  G.bar = (x, y, w, frac) => {
    frac = Math.max(0, Math.min(1, frac));
    G.rect(x, y, w, 4, 3);
    G.rect(x + 1, y + 1, w - 2, 2, 0);
    const fw = Math.round((w - 2) * frac);
    const low = frac < 0.25 && (G.frame >> 4) % 2 === 0;
    if (fw > 0) G.rect(x + 1, y + 1, fw, 2, low ? 1 : 2);
  };
})();
