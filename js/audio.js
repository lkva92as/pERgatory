// Chiptune SFX and looping music via WebAudio.
(function () {
  const A = window.SFX = {};
  let ac = null, master = null, filter = null, pulse = null, muted = false;
  let weird = 0, tape = 0; // sanity distortion (0..1); notes left in a tape-stop sag
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  try { muted = localStorage.getItem('perg.mute') === '1'; } catch (e) {}
  const VOL = 0.16;

  function ensure() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ac = new C();
      master = ac.createGain();
      master.gain.value = muted ? 0 : VOL;
      filter = ac.createBiquadFilter(); // closes down as sanity drains, so everything sounds underwater
      filter.type = 'lowpass';
      filter.frequency.value = 18000;
      filter.Q.value = 4;
      master.connect(filter);
      filter.connect(ac.destination);
      // 25% duty pulse wave, the classic handheld lead tone
      const n = 32, re = new Float32Array(n), im = new Float32Array(n), d = 0.25;
      for (let k = 1; k < n; k++) {
        re[k] = Math.sin(2 * Math.PI * k * d) / (k * Math.PI);
        im[k] = (1 - Math.cos(2 * Math.PI * k * d)) / (k * Math.PI);
      }
      pulse = ac.createPeriodicWave(re, im);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  A.unlock = ensure;
  A.muted = () => muted;
  A.toggleMute = () => {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : VOL;
    try { localStorage.setItem('perg.mute', muted ? '1' : '0'); } catch (e) {}
    return muted;
  };

  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function tone(f, t0, dur, type = 'pulse', vol = 0.5, slideTo = null) {
    const o = ac.createOscillator(), g = ac.createGain();
    if (type === 'pulse') o.setPeriodicWave(pulse); else o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    if (weird > 0.1) o.detune.setValueAtTime(Math.sin(t0 * 0.7) * weird * 60 + (Math.random() - 0.5) * weird * 40, t0);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(t0, dur, vol = 0.4) {
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = buf;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(g); g.connect(master);
    s.start(t0);
  }

  function arp(t, notes, step, type = 'pulse', vol = 0.4) {
    notes.forEach((m, i) => { if (m) tone(freq(m), t + i * step, step * 0.95, type, vol); });
  }

  A.play = (name) => {
    if (!ensure()) return;
    const t = ac.currentTime;
    switch (name) {
      case 'blip':   tone(1400, t, 0.025, 'square', 0.08); break;
      case 'select': arp(t, [84, 91], 0.05); break;
      case 'back':   arp(t, [79, 72], 0.05); break;
      case 'bump':   tone(80, t, 0.09, 'square', 0.35); break;
      case 'hit':    noise(t, 0.18, 0.5); tone(260, t, 0.18, 'square', 0.3, 70); break;
      case 'hurt':   noise(t, 0.25, 0.35); tone(140, t, 0.3, 'square', 0.35, 40); break;
      case 'fire':   noise(t, 0.6, 0.45); tone(90, t, 0.6, 'sawtooth', 0.3, 600); break;
      case 'heal':   arp(t, [72, 76, 79, 84], 0.06); break;
      case 'miss':   tone(400, t, 0.25, 'square', 0.25, 150); break;
      case 'page':   arp(t, [76, 0, 72], 0.14, 'triangle', 0.6); break;
      case 'encounter': arp(t, [81, 80, 81, 80, 81, 80, 81, 80, 69, 0, 57], 0.045); break;
      case 'win':    arp(t, [72, 76, 79, 84, 0, 79, 84], 0.09); break;
      case 'levelup': arp(t, [72, 74, 76, 77, 79, 81, 83, 84], 0.06); break;
      case 'gameover': arp(t, [69, 68, 67, 66, 65, 64, 63, 62, 61, 60, 0, 45], 0.14, 'square', 0.35); break;
      case 'clock':  arp(t, [96, 0, 96, 0, 96], 0.08, 'triangle', 0.5); break;
      case 'door':   noise(t, 0.35, 0.2); tone(300, t, 0.35, 'triangle', 0.2, 600); break;
      case 'birds':  arp(t, [96, 100, 0, 98, 103, 0, 0, 100, 96], 0.07, 'triangle', 0.35); break;
      case 'ding':   tone(freq(88), t, 0.6, 'triangle', 0.5); tone(freq(84), t + 0.25, 0.8, 'triangle', 0.4); break;
    }
  };

  // ---------- music ----------
  // Each track: 8th-note steps; 0 = rest.
  const TRACKS = {
    title: { bpm: 70,
      lead: [69, 0, 72, 0, 71, 0, 68, 0, 69, 0, 64, 0, 65, 0, 64, 0],
      bass: [45, 0, 0, 0, 41, 0, 0, 0, 40, 0, 0, 0, 45, 0, 0, 0] },
    world: { bpm: 96,
      lead: [69, 72, 76, 72, 68, 71, 76, 71, 65, 69, 72, 69, 64, 68, 71, 68,
             69, 72, 76, 79, 77, 76, 74, 71, 72, 69, 65, 69, 68, 0, 64, 0],
      bass: [45, 0, 0, 0, 44, 0, 0, 0, 41, 0, 0, 0, 40, 0, 0, 0,
             45, 0, 0, 0, 43, 0, 0, 0, 41, 0, 0, 0, 40, 0, 40, 0] },
    battle: { bpm: 152,
      lead: [76, 0, 76, 77, 76, 74, 72, 71, 72, 0, 72, 74, 72, 71, 69, 68,
             69, 0, 72, 0, 76, 0, 81, 80, 77, 76, 74, 72, 71, 0, 68, 0],
      bass: [45, 57, 45, 57, 45, 57, 45, 57, 41, 53, 41, 53, 40, 52, 40, 52,
             45, 57, 45, 57, 43, 55, 43, 55, 41, 53, 41, 53, 40, 52, 44, 56] },
  };
  let cur = null, step = 0, nextT = 0, timer = null;

  // As sanity drains (weird -> 1) the music drifts out of tune, sways in tempo, hits wrong notes,
  // drops out, stutters, sags like a stopping tape, and sinks underwater.
  function schedule() {
    if (!cur || !ac) return;
    const tr = TRACKS[cur], k = weird, now = ac.currentTime;
    const cutoff = k < 0.3 ? 18000 : 600 + 17000 * Math.pow(1 - (k - 0.3) / 0.7, 2) + Math.sin(now * 0.8) * 300 * k;
    filter.frequency.setTargetAtTime(cutoff, now, 0.2);
    while (nextT < now + 0.25) {
      const dt = 60 / tr.bpm / 2 * (1 + (k > 0.3 ? Math.sin(nextT * 0.5) * 0.3 * k : 0));
      const i = step % tr.lead.length, b = tr.bass[i % tr.bass.length];
      let m = tr.lead[i];
      if (k > 0.2 && m) {
        const r = Math.random();
        if (r < k * 0.12) m += pick([1, -1, 6, 12, -12]);
        else if (r < k * 0.2) m = 0;
      }
      const sag = tape > 0 ? Math.pow(2, -(8 - tape) / 12) : 1;
      if (m) tone(freq(m) * sag, nextT, dt * 0.85, k > 0.6 && Math.random() < k - 0.5 ? 'sawtooth' : 'pulse', 0.16);
      if (b) tone(freq(b) * sag, nextT, dt * 1.8, 'triangle', 0.4);
      if (k > 0.5 && Math.random() < k * 0.03) noise(nextT, 0.2, 0.08);
      if (tape > 0) tape--; else if (k > 0.7 && Math.random() < 0.01) tape = 8;
      nextT += dt;
      if (!(k > 0.3 && Math.random() < k * 0.08)) step++;
    }
  }
  A.setWeird = (k) => { weird = k; };

  A.music = (name) => {
    if (name === cur) return;
    cur = name || null;
    if (!cur) return;
    if (!ensure()) return;
    step = 0; nextT = ac.currentTime + 0.05;
    if (!timer) timer = setInterval(schedule, 60);
  };
})();
