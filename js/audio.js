/* ============================================================
   音频模块：WebAudio 合成武侠音效（无需音频文件，异常安全）
   ============================================================ */
"use strict";

const AudioSys = (() => {
  let ctx = null;
  let master = null;
  let sfxGain = null;
  let muted = false;

  const F = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function ensureCtx() {
    if (ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.85;
      sfxGain.connect(master);
    } catch (e) { ctx = null; }
  }

  function tone(freq, t0, dur, type, vol, slideTo) {
    if (!ctx || !isFinite(freq) || !isFinite(t0) || !isFinite(dur)) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(sfxGain);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) {}
  }

  function noise(t0, dur, vol, freq) {
    if (!ctx) return;
    try {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass"; f.frequency.value = freq || 2400; f.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(sfxGain);
      src.start(t0);
    } catch (e) {}
  }

  return {
    init() { try { ensureCtx(); if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {}); } catch (e) {} },
    setMuted(m) { muted = m; try { if (master) master.gain.value = m ? 0 : 0.9; } catch (e) {} },
    isMuted() { return muted; },
    click() { try { ensureCtx(); tone(F(72), ctx.currentTime, 0.08, "square", 0.05); } catch (e) {} },
    /* 剑鸣（挥剑破空） */
    slash() {
      try {
        ensureCtx(); if (!ctx) return;
        const t = ctx.currentTime;
        noise(t, 0.28, 0.22, 3200);
        tone(1500, t, 0.22, "sawtooth", 0.07, 300);
        tone(2400, t + 0.02, 0.2, "triangle", 0.06, 500);
      } catch (e) {}
    },
    /* 命中（金铁交鸣） */
    hit() {
      try {
        ensureCtx(); if (!ctx) return;
        const t = ctx.currentTime;
        noise(t, 0.16, 0.3, 4200);
        tone(880, t, 0.14, "square", 0.09, 440);
        tone(1320, t + 0.01, 0.12, "triangle", 0.08, 660);
      } catch (e) {}
    },
    /* 受击 */
    hurt() {
      try {
        ensureCtx(); if (!ctx) return;
        const t = ctx.currentTime;
        tone(220, t, 0.22, "sawtooth", 0.16, 90);
        noise(t, 0.14, 0.18, 500);
      } catch (e) {}
    },
    /* 敌人倒地 */
    die() {
      try {
        ensureCtx(); if (!ctx) return;
        const t = ctx.currentTime;
        tone(300, t, 0.4, "sawtooth", 0.1, 60);
        tone(150, t + 0.06, 0.42, "square", 0.08, 40);
        noise(t + 0.02, 0.25, 0.14, 300);
      } catch (e) {}
    },
    /* 敌人怒吼（进入攻击前摇时的低音提示） */
    roar() {
      try {
        ensureCtx(); if (!ctx) return;
        const t = ctx.currentTime;
        tone(190, t, 0.22, "sawtooth", 0.07, 95);
        tone(120, t + 0.04, 0.26, "square", 0.055, 60);
      } catch (e) {}
    },
    /* 胜利（五声音阶上行） */
    win() {
      try {
        ensureCtx(); if (!ctx) return;
        const notes = [60, 64, 67, 72, 74, 79, 84];
        notes.forEach((n, i) => tone(F(n), ctx.currentTime + i * 0.15, 0.6, "triangle", 0.14));
      } catch (e) {}
    },
    /* 失败（下行） */
    lose() {
      try {
        ensureCtx(); if (!ctx) return;
        const notes = [72, 67, 64, 60, 55];
        notes.forEach((n, i) => tone(F(n), ctx.currentTime + i * 0.18, 0.55, "triangle", 0.13));
      } catch (e) {}
    }
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = AudioSys;

