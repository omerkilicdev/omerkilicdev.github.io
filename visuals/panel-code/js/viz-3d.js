// 3D scenes built from one run of the panel code (window.TD) and the interactive stage with step slider + film strip.
(function () {
  "use strict";
  const TD = window.TD;
  const COL = { border: "#f0a43a", center: "#7f9cc0", dim: "#3a4352", shed: "#ff5d73", body: "#4a5566", u: "#9be564", normal: "#e8edf3" };
  const NXB = TD.mesh.f.nxb, NSTEP = TD.steps.length, U = TD.mesh.U[0];
  const WN = window.WING_NAMES;

  function bodyPrims(t) {
    const x0 = -U * t, p = [];
    const seg = [[-0.3, 0.035], [-0.24, 0.05], [-0.12, 0.06], [0, 0.062], [0.12, 0.06], [0.24, 0.048], [0.36, 0.034], [0.6, 0.026], [0.9, 0.022], [1.15, 0.018]];
    for (let i = 0; i < seg.length - 1; i++) {
      p.push({ t: "line", p: [[x0 + seg[i][0], 0, 0], [x0 + seg[i + 1][0], 0, 0]], c: COL.body, lw: 9 * (seg[i][1] / 0.06), a: 0.95, bias: 0.02 });
    }
    p.push({ t: "pt", p: [x0 - 0.33, 0, 0.005], r: 8, c: "#56657a", bias: 0.02 });
    return p;
  }

  // wings: array of 4 panel lists (17 x 4 x 3); opts.hl decides colouring
  function wingPrims(wings, o) {
    o = o || {};
    const out = [];
    wings.forEach((panels, w) => {
      if (o.only && !o.only.includes(w)) return;
      const faded = o.focus != null && o.focus !== w;
      panels.forEach((q, i) => {
        const isB = i < NXB;
        let fill = isB ? COL.border : COL.center;
        if (o.hl === "border" && !isB) fill = COL.dim;
        if (o.hl === "center" && isB) fill = COL.dim;
        if (o.gam) fill = G.diverge(o.gam[w][i], o.gamMax);
        if (o.hl === "bordergam") fill = isB ? G.diverge(o.gam[w][i], o.gamMax) : COL.dim;
        if (faded) fill = COL.dim;
        out.push({ t: "poly", p: q, fill, stroke: "rgba(10,14,20,.55)", lw: 0.8, a: faded ? 0.35 : 0.93 });
      });
    });
    return out;
  }

  function wakePrims(stepIdx, o) {
    o = o || {};
    const s = TD.steps[stepIdx], out = [];
    const nBirth = Math.max(1, s.nxw / NXB);
    s.w.forEach((W, w) => {
      if (o.only && !o.only.includes(w)) return;
      const nOld = o.skipNewest ? W.wake.length - NXB : W.wake.length;
      for (let i = 0; i < nOld; i++) {
        const birth = Math.floor(i / NXB) + 1;
        let c = G.age(1 - (birth - 1) / Math.max(1, nBirth - 1));
        if (o.color === "gam") c = G.diverge(W.wgam[i], o.gamMax || 0.3);
        if (o.window && birth <= nBirth - o.window) c = "#3b4351";
        if (o.mono) c = o.mono;
        out.push({ t: "line", p: W.wake[i], close: true, c, lw: o.lw || 1.1, a: o.a == null ? 0.85 : o.a });
      }
    });
    return out;
  }

  // one fixed box for every frame so film strips do not jump
  const BOX = (() => {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    TD.steps.forEach((s) => s.w.forEach((W) => W.panels.concat(W.wake).forEach((q) => q.forEach((p) => {
      for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
    }))));
    return { lo, hi };
  })();
  const CYCBOX = (() => {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    TD.cycle.forEach((c) => c.w.forEach((ps) => ps.forEach((q) => q.forEach((p) => {
      for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
    }))));
    return { lo, hi };
  })();

  function gamMaxAt(k) {
    let m = 1e-9;
    TD.steps[k].w.forEach((W) => W.gam.forEach((g) => (m = Math.max(m, Math.abs(g)))));
    return m;
  }

  // The scene for a given highlight at step k.
  function sceneFor(hl, k, extra) {
    extra = extra || {};
    const s = TD.steps[k];
    const wings = s.w.map((W) => W.panels);
    let prims = bodyPrims(s.t);
    const gm = gamMaxAt(k);
    const wakeOn = extra.wake !== false;
    if (hl === "gam" || hl === "solve") prims = prims.concat(wingPrims(wings, { gam: s.w.map((W) => W.gam), gamMax: gm, focus: extra.focus }));
    else if (hl === "bordergam") prims = prims.concat(wingPrims(wings, { hl, gam: s.w.map((W) => W.gam), gamMax: gm }));
    else prims = prims.concat(wingPrims(wings, { hl, focus: extra.focus, only: extra.only }));
    if (hl === "colloc" || hl === "normals" || hl === "vnc" || hl === "vncw") {
      let vmax = 1e-9;
      if (hl === "vnc" || hl === "vncw") s.w.forEach((W) => W[hl].forEach((v) => (vmax = Math.max(vmax, Math.abs(v)))));
      s.w.forEach((W, w) => {
        if (extra.only && !extra.only.includes(w)) return;
        W.colloc.forEach((c, i) => {
          prims.push({ t: "pt", p: c, r: 2.6, c: "#ffffff", ring: "#10151c", bias: -0.01 });
          const n = W.normals[i];
          let len = 0.05;
          if (hl === "vnc" || hl === "vncw") len = (W[hl][i] / vmax) * 0.12;
          if (hl !== "colloc") prims.push({ t: "arrow", p: c, v: [n[0] * len, n[1] * len, n[2] * len], c: hl === "normals" ? COL.normal : len >= 0 ? "#ff8a5c" : "#5cb8ff" });
        });
      });
    }
    if (wakeOn && hl !== "colloc" && hl !== "normals") prims = prims.concat(wakePrims(k, { color: extra.wakeColor, gamMax: gm, a: extra.wakeAlpha, window: extra.window, mono: extra.wakeMono }));
    if (extra.shed) s.w.forEach((W) => W.shed.forEach((q) => {
      prims.push({ t: "poly", p: q, fill: COL.shed, a: 0.35, stroke: COL.shed, lw: 1.6 });
    }));
    if (extra.flow) prims.push({ t: "arrow", p: [BOX.lo[0], BOX.lo[1], BOX.hi[2] * 0.9], v: [0.45, 0, 0], c: COL.u, lw: 3 });
    return { prims, fit: extra.fitWings ? null : BOX };
  }

  function cycleScene(k, o) {
    o = o || {};
    const c = TD.cycle[k];
    let prims = bodyPrims(0).concat(wingPrims(c.w, { only: o.only }));
    // tip trails: outermost node of the tip element (index 4) for every wing
    c.w.forEach((_, w) => {
      if (o.only && !o.only.includes(w)) return;
      const trail = TD.cycle.map((cc) => cc.w[w][4][1]);
      prims.push({ t: "line", p: trail, c: "#ffd166", lw: 1.2, a: 0.55, dash: [3, 3] });
    });
    return { prims, fit: CYCBOX };
  }

  // stage: big interactive canvas + slider + optional film strip of thumbnails
  function stage(host, sceneOf, o) {
    o = o || {};
    const n = o.count || NSTEP;
    let k = o.start != null ? Math.min(o.start, n - 1) : n - 1;
    const wrap = el("div", "stage");
    const cv = el("canvas", "cv3d");
    cv.style.height = (o.h || 330) + "px";
    wrap.appendChild(cv);
    const hud = el("div", "hud");
    wrap.appendChild(hud);
    host.appendChild(wrap);
    const view = G.view3d(cv, () => sceneOf(k), o.cam);
    const bar = el("div", "stepbar");
    const play = el("button", "play"); play.type = "button"; play.textContent = "▶";
    const rng = el("input"); rng.type = "range"; rng.min = 0; rng.max = n - 1; rng.value = k;
    const lab = el("span", "steplab");
    bar.append(play, rng, lab);
    host.appendChild(bar);
    let film = null, thumbs = [];
    if (o.film !== false) {
      film = el("div", "film");
      const idx = o.filmIdx || [...Array(n).keys()];
      idx.forEach((j) => {
        const f = el("button", "frame"); f.type = "button";
        const c = el("canvas"); const t = el("span"); t.textContent = o.frameLabel ? o.frameLabel(j) : "step " + (j + 1);
        f.append(c, t); film.appendChild(f);
        f.addEventListener("click", () => set(j));
        thumbs.push({ j, c, f });
      });
      host.appendChild(film);
    }
    function drawThumbs() {
      const cam = Object.assign({}, view.cam(), { zoom: 1, panX: 0, panY: 0 });
      thumbs.forEach((th) => { G.render(th.c, sceneOf(th.j), cam); th.f.classList.toggle("on", th.j === k); });
    }
    function set(j) {
      k = j; rng.value = j;
      lab.textContent = o.label ? o.label(j) : `step ${j + 1} / ${n} · t = ${TD.steps[j].t.toFixed(1)}`;
      hud.textContent = o.hud ? o.hud(j) : "";
      view.draw();
      thumbs.forEach((th) => th.f.classList.toggle("on", th.j === k));
      if (o.onStep) o.onStep(j);
    }
    rng.addEventListener("input", () => set(+rng.value));
    let timer = null;
    play.addEventListener("click", () => {
      if (timer) { clearInterval(timer); timer = null; play.textContent = "▶"; return; }
      play.textContent = "❚❚";
      timer = setInterval(() => set((k + 1) % n), o.fps || 520);
    });
    cv.addEventListener("pointerup", () => setTimeout(drawThumbs, 0));
    set(k);
    requestAnimationFrame(drawThumbs);
    const api = { set, stop: () => { if (timer) { clearInterval(timer); timer = null; } }, get: () => k };
    (window.PC_STOPS = window.PC_STOPS || []).push(api.stop);
    return api;
  }

  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }

  window.V3 = { stage, sceneFor, cycleScene, wakePrims, wingPrims, bodyPrims, BOX, gamMaxAt, COL, el, NXB, NSTEP, WN };
})();
