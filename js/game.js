/* ============================================================
   《角丝旁行侠记》游戏引擎
   横版轻动作：←→ 移动 · 空格/J/点击 挥剑
   ============================================================ */
"use strict";

(function () {
  const $ = (s) => document.querySelector(s);

  /* ---------- 数值 ---------- */
  const HERO = { hp: 160, speed: 290, atkCd: 0.32, dmg: 34, reach: 200, killHeal: 22 };
  const ENEMY = {
    bandit: { hp: 80, speed: 105, dmg: 7, atkCd: 1.5, w: 120, tag: "山贼" },
    elite:  { hp: 150, speed: 85, dmg: 11, atkCd: 1.3, w: 150, tag: "恶霸" },
    boss:   { hp: 300, speed: 62, dmg: 13, atkCd: 1.2, w: 190, tag: "山寨主" }
  };
  const WAVES = [
    { title: "第一战 · 古道茶摊", spawns: [["bandit", 0], ["bandit", 1.4]] },
    { title: "第二战 · 众贼来犯", spawns: [["bandit", 0], ["bandit", 0.9], ["elite", 1.8]] },
    { title: "第三战 · 黑风寨主", spawns: [["boss", 0], ["bandit", 2.2]] }
  ];
  const DIALOGS = [
    [
      { who: "旁白", text: "残阳如血，古道西风。山道旁的茶摊前，几个山贼正围着卖茶的老翁。" },
      { who: "山贼", text: "老东西，这个月的「买路钱」呢？交不出来，这茶摊就别想开了！" },
      { who: "角丝旁", text: "（斗笠微抬，露出一双冷冽的眼）光天化日，欺压良善——" },
      { who: "角丝旁", text: "这剑，可不答应。" }
    ],
    [
      { who: "山贼", text: "哪来的野丫头！兄弟们，并肩子上！" },
      { who: "角丝旁", text: "呵，还有帮手？正好，一并领教。" }
    ],
    [
      { who: "山寨主", text: "就是你伤我兄弟？！今日叫你横着下山！" },
      { who: "角丝旁", text: "黑风寨主？把人放了，剑下自然留情。" }
    ]
  ];
  const VICTORY = [
    { who: "旁白", text: "山贼一哄而散。老翁千恩万谢，角丝旁只是把斗笠压低，转身没入暮色。" },
    { who: "旁白", text: "江湖传言：有位戴草帽的女剑客，路见不平，拔刀相助——" },
    { who: "角丝旁", text: "（嘴角微扬）侠名，就由他们传去吧。该赶路了。" }
  ];

  /* ---------- DOM ---------- */
  const arena = $("#arena");
  const heroEl = $("#heroEntity");
  const bladeEl = $("#blade");
  const dialogEl = $("#dialog");
  const dialogSpeaker = $("#dialogSpeaker");
  const dialogText = $("#dialogText");
  const dialogNext = $("#dialogNext");
  const heroBar = $("#heroBarFill");
  const bossBarWrap = $("#bossBar");
  const bossBarFill = $("#bossBarFill");
  const waveTag = $("#waveTag");
  const resultOverlay = $("#resultOverlay");
  const resultTitle = $("#resultTitle");
  const resultDesc = $("#resultDesc");
  const hurtFlash = $("#hurtFlash");

  /* ---------- 状态 ---------- */
  let state = "intro";        // intro | wave | over
  let hero = null;
  let enemies = [];
  let waveIdx = 0;
  let dlgIdx = 0;
  let dlgList = [];
  let dlgTyping = false;
  let dlgTimer = null;
  let lastTime = 0;
  const touchHold = { l: false, r: false };
  let queuedSlash = false;
  let rafId = null;
  const keys = {};

  /* ---------- 工具 ---------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- 主角 ---------- */
  function createHero() {
    hero = {
      x: arena.clientWidth * 0.12,
      hp: HERO.hp, maxHp: HERO.hp,
      lastSlash: -9, hurtUntil: 0, dir: 1,
      el: heroEl,
      fig: heroEl.querySelector(".fig")
    };
    heroEl.classList.remove("dead");
    heroEl.style.left = hero.x + "px";
    updateHeroBar();
  }

  function updateHeroBar() {
    heroBar.style.width = Math.max(0, (hero.hp / hero.maxHp) * 100) + "%";
  }

  /* ---------- 敌人 ---------- */
  function spawnEnemy(type, delay) {
    setTimeout(() => {
      if (state !== "wave") return;
      const cfg = ENEMY[type];
      const el = document.createElement("div");
      el.className = "entity enemy-entity " + type;
      el.innerHTML = '<div class="fig"><span class="name-tag">' + cfg.tag + '</span>' +
        '<span class="hpbar"><span class="fill"></span></span>' +
        '<span data-sprite="' + (type === "boss" ? "boss" : "bandit") + '"></span></div>';
      arena.appendChild(el);
      const e = {
        type, cfg, el, fig: el.querySelector(".fig"),
        x: arena.clientWidth * 0.8 + Math.random() * 40,
        hp: cfg.hp, maxHp: cfg.hp,
        lastAtk: 0, dead: false
      };
      el.classList.add("show-hp");
      if (type === "elite") el.style.width = "min(22vh,190px)";
      if (type === "boss") { bossBarWrap.classList.add("show"); updateBossBar(e); }
      enemies.push(e);
      el.style.left = e.x + "px";
    }, (delay || 0) * 1000);
  }

  function updateBossBar(e) {
    if (e.type === "boss") bossBarFill.style.width = Math.max(0, (e.hp / e.maxHp) * 100) + "%";
  }

  /* ---------- 挥剑（带输入缓冲） ---------- */
  function slash() {
    if (state !== "wave") return;
    const now = performance.now() / 1000;
    if (now - hero.lastSlash < HERO.atkCd) { queuedSlash = true; return; }
    doSlash(now);
  }
  function doSlash(now) {
    hero.lastSlash = now;
    AudioSys.slash();
    hero.fig.classList.remove("slash-pose");
    void hero.fig.offsetWidth;
    hero.fig.classList.add("slash-pose");
    setTimeout(() => hero.fig.classList.remove("slash-pose"), 360);
    bladeEl.classList.remove("slash");
    void bladeEl.offsetWidth;
    bladeEl.style.left = hero.x + 30 + "px";
    bladeEl.classList.add("slash");

    // 判定
    const hitL = hero.x + 30;
    const hitR = hero.x + 30 + HERO.reach;
    enemies.forEach((e) => {
      if (e.dead) return;
      const ew = e.cfg.w;
      const el = e.x - ew / 2, er = e.x + ew / 2;
      if (er > hitL && el < hitR) {
        damageEnemy(e, HERO.dmg);
      }
    });
  }

  function damageEnemy(e, dmg) {
    e.hp -= dmg;
    AudioSys.hit();
    e.fig.classList.remove("hurt");
    void e.fig.offsetWidth;
    e.fig.classList.add("hurt");
    // 击退
    e.x -= 34;
    e.el.style.left = e.x + "px";
    // 飘字
    spawnFloat(e.x, e.el.getBoundingClientRect().top + 10, "-" + dmg);
    updateBossBar(e);
    e.el.querySelector(".hpbar .fill").style.width = Math.max(0, (e.hp / e.maxHp) * 100) + "%";
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    e.dead = true;
    AudioSys.die();
    // 击杀回血
    hero.hp = Math.min(hero.maxHp, hero.hp + HERO.killHeal);
    updateHeroBar();
    spawnFloat(e.x, arena.clientHeight * 0.42, "+" + HERO.killHeal, true);
    e.el.classList.add("dead");
    if (e.type === "boss") bossBarWrap.classList.remove("show");
    setTimeout(() => {
      e.el.remove();
      const i = enemies.indexOf(e);
      if (i >= 0) enemies.splice(i, 1);
      if (state === "wave" && enemies.length === 0) onWaveCleared();
    }, 520);
  }

  function damageHero(dmg) {
    const now = performance.now() / 1000;
    if (now < hero.hurtUntil) return;
    if (state !== "wave") return;
    hero.hurtUntil = now + 0.85;
    hero.hp -= dmg;
    AudioSys.hurt();
    hurtFlash.classList.remove("go");
    void hurtFlash.offsetWidth;
    hurtFlash.classList.add("go");
    arena.classList.remove("shake");
    void arena.offsetWidth;
    arena.classList.add("shake");
    updateHeroBar();
    hero.fig.classList.remove("hurt");
    void hero.fig.offsetWidth;
    hero.fig.classList.add("hurt");
    spawnFloat(hero.x + 60, arena.clientHeight * 0.5, "-" + dmg, true);
    if (hero.hp <= 0) { hero.hp = 0; updateHeroBar(); gameOver(false); }
  }

  function spawnFloat(x, y, txt, crit) {
    const d = document.createElement("div");
    d.className = "float-num" + (crit ? " crit" : "");
    d.textContent = txt;
    d.style.left = x + "px";
    d.style.top = y + "px";
    arena.appendChild(d);
    setTimeout(() => d.remove(), 850);
  }

  /* ---------- 场景 / 波次 / 对白 ---------- */
  function setScene(bg) {
    document.querySelectorAll(".scene-layer").forEach((l) => l.classList.toggle("active", l.dataset.bg === bg));
  }
  function showDialog(list, onDone) {
    state = "intro";
    dlgList = list;
    dlgIdx = 0;
    dlgOnDone = onDone;
    dialogEl.style.display = "block";
    renderDialogLine();
  }

  function renderDialogLine() {
    const item = dlgList[dlgIdx];
    if (!item) return;
    dialogSpeaker.textContent = item.who;
    dialogSpeaker.className = "speaker" + (item.who === "旁白" ? " narrator" : "");
    dlgTyping = true;
    dialogText.textContent = "";
    dialogNext.style.display = "none";
    const chars = Array.from(item.text);
    let i = 0;
    if (dlgTimer) clearInterval(dlgTimer);
    dlgTimer = setInterval(() => {
      i += 1;
      dialogText.textContent = chars.slice(0, i).join("");
      if (i >= chars.length) { clearInterval(dlgTimer); dlgTimer = null; dlgTyping = false; dialogNext.style.display = "block"; }
    }, 30);
  }

  function advanceDialog() {
    if (dlgTyping) {
      clearInterval(dlgTimer); dlgTimer = null;
      dialogText.textContent = dlgList[dlgIdx].text;
      dialogNext.style.display = "block";
      dlgTyping = false;
      return;
    }
    dlgIdx += 1;
    if (dlgIdx < dlgList.length) { renderDialogLine(); return; }
    // 对白结束
    dialogEl.style.display = "none";
    const done = dlgOnDone;
    dlgOnDone = null;
    if (done) done();
  }

  function startWave(i) {
    waveIdx = i;
    setScene(["bg-trail", "bg-village", "bg-stronghold"][i] || "bg-trail");
    const w = WAVES[i];
    waveTag.textContent = w.title;
    showDialog(DIALOGS[i], () => {
      state = "wave";
      enemies = [];
      w.spawns.forEach((s) => spawnEnemy(s[0], s[1]));
    });
  }

  function onWaveCleared() {
    if (waveIdx + 1 < WAVES.length) {
      setTimeout(() => startWave(waveIdx + 1), 700);
    } else {
      gameOver(true);
    }
  }

  /* ---------- 结果 ---------- */
  function gameOver(win) {
    state = "over";
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    dialogEl.style.display = "none";
    if (win) {
      AudioSys.win();
      resultTitle.textContent = "行侠仗义";
      resultTitle.className = "title";
      resultDesc.textContent = "恶贼尽伏，茶摊重开。\n角丝旁的名字，开始在山道上悄悄流传。";
    } else {
      AudioSys.lose();
      resultTitle.textContent = "力有不逮";
      resultTitle.className = "title fail";
      resultDesc.textContent = "你负伤倒下了……\n侠客也会暂败，养好伤，再战一场！";
    }
    resultOverlay.classList.add("open");
  }

  /* ---------- 输入 ---------- */
  function onPointerDown(ev) {
    AudioSys.init();
    if (state === "intro") { advanceDialog(); return; }
    if (state === "wave") {
      if (ev.target.closest(".hud")) return;
      slash();
    }
  }

  /* ---------- 主循环 ---------- */
  function loop(t) {
    const dt = Math.min(0.05, (t - lastTime) / 1000 || 0.016);
    lastTime = t;
    if (state === "wave" && hero) {
      // 主角移动
      let mx = 0;
      if (keys["ArrowLeft"] || keys["a"] || keys["A"] || touchHold.l) mx -= 1;
      if (keys["ArrowRight"] || keys["d"] || keys["D"] || touchHold.r) mx += 1;
      const minX = 60, maxX = arena.clientWidth * 0.55;
      if (mx !== 0) {
        hero.x = clamp(hero.x + mx * HERO.speed * dt, minX, maxX);
        hero.el.style.left = hero.x + "px";
        hero.dir = mx;
      }
      // 敌人 AI
      enemies.forEach((e) => {
        if (e.dead) return;
        const dist = Math.abs(hero.x - e.x);
        if (dist > 120) {
          const dir = e.x > hero.x ? -1 : 1;
          e.x = clamp(e.x + dir * e.cfg.speed * dt, 70, arena.clientWidth + 160);
          e.el.style.left = e.x + "px";
        }
        // 攻击（带前摇：举刀 0.28s 后才造成伤害，给玩家反应时间）
        const now = performance.now() / 1000;
        if (dist < 150 && now - e.lastAtk > e.cfg.atkCd) {
          e.lastAtk = now;
          e.fig.classList.remove("slash-pose");
          void e.fig.offsetWidth;
          e.fig.classList.add("slash-pose");
          setTimeout(() => e.fig.classList.remove("slash-pose"), 320);
          const atkDmg = e.cfg.dmg;
          setTimeout(() => {
            if (state === "wave" && !e.dead && hero && hero.hp > 0) damageHero(atkDmg);
          }, 280);
        }
      });
    }
    // 输入缓冲：冷却结束后立即挥出
    if (queuedSlash && state === "wave") {
      const nw = performance.now() / 1000;
      if (nw - hero.lastSlash >= HERO.atkCd) { queuedSlash = false; doSlash(nw); }
    }
    rafId = requestAnimationFrame(loop);
  }

  /* ---------- 触屏 ---------- */
  function setupTouch() {
    const L = $("#tleft"), R = $("#tright"), A = $("#tatk");
    const hold = touchHold;
    const bind = (btn, on, off) => {
      const dn = (ev) => { ev.preventDefault(); on(); };
      const up = () => off();
      btn.addEventListener("pointerdown", dn);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointercancel", up);
      btn.addEventListener("pointerleave", up);
    };
    bind(L, () => { hold.l = true; }, () => { hold.l = false; });
    bind(R, () => { hold.r = true; }, () => { hold.r = false; });
    bind(A, () => { slash(); }, () => {});

  }

  /* ---------- 初始化 ---------- */
  function init() {
    window.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", (ev) => {
      keys[ev.key] = true;
      AudioSys.init();
      if (ev.code === "Space" || ev.key === "j" || ev.key === "J") { ev.preventDefault(); onPointerDown({ target: document.body }); }
    });
    document.addEventListener("keyup", (ev) => { keys[ev.key] = false; });

    $("#btnTitle").addEventListener("click", () => { location.href = "index.html"; });
    $("#btnRetry").addEventListener("click", () => { location.reload(); });
    $("#btnTitleEnd").addEventListener("click", () => { location.href = "index.html"; });
    $("#btnMusic").addEventListener("click", () => {
      const m = AudioSys.isMuted();
      AudioSys.setMuted(!m);
      $("#btnMusic").textContent = m ? "♪ 音效：开" : "♪ 音效：关";
    });
    setupTouch();

    createHero();
    // 触摸按键并入主循环
    startWave(0);
    lastTime = performance.now();
    // 输入缓冲：冷却结束后立即挥出
    if (queuedSlash && state === "wave") {
      const nw = performance.now() / 1000;
      if (nw - hero.lastSlash >= HERO.atkCd) { queuedSlash = false; doSlash(nw); }
    }
    rafId = requestAnimationFrame(loop);
  }

  let dlgOnDone = null;
  document.addEventListener("DOMContentLoaded", init);
})();











