// Visual registry: 3D, matrix and chart visuals plus the mapping from viz id to builder.
(function () {
  "use strict";
  const TD = window.TD, { S, svg } = G, { stage, sceneFor, cycleScene, wakePrims, wingPrims, bodyPrims, BOX, el, NXB, NSTEP, WN, COL } = V3;
  const A = window.VB_A, note = A.note, M = TD.mesh;
  const stepHud = (j) => { const s = TD.steps[j]; return `wake rings: ${s.nxw * 4} (${s.nxw} per wing)`; };

  function tmloop(host) {
    stage(host, (k) => sceneFor("both", k, { wakeAlpha: 0.75 }), { hud: stepHud, start: 5, cam: { yaw: -0.95, pitch: 0.38 } });
    note(host, "Orange: border elements (shed every step). Blue-grey: centre elements. Rings: the wake, coloured by age: <b style='color:#57e1ff'>light blue new</b>, <b style='color:#8b6be0'>purple old</b>. The body flies towards −x and the wake stays behind. Drag: rotate · wheel: zoom · shift+drag: pan · double click: reset.");
  }

  function wing3d(host, p) {
    const hl = p.hl || "both";
    const extra = { wake: !["colloc", "normals"].includes(hl) };
    stage(host, (k) => sceneFor(hl, k, Object.assign({ wakeAlpha: 0.35 }, extra)), { start: p.step != null ? p.step : 5, hud: (j) => hudFor(hl, j), cam: { yaw: -0.95, pitch: 0.38 } });
    const txt = {
      vnc: "Arrows: normal velocity at the collocation points due to the wing's own motion (orange +, blue −), scaled to the largest value.",
      vncw: "Arrows: normal velocity the wake induces at the same collocation points. There is no wake at step 1, so no arrows; they grow as the wake grows.",
      gam: "Panel colour: the strength Γ of that ring. Red positive, blue negative, scaled to the largest |Γ| of each step.",
      bordergam: "Only the border elements are coloured: these 10 values per wing become the strengths of the rings shed next.",
      colloc: "White dots: collocation points (panel centres), where the no-penetration condition is imposed.",
      normals: "Arrows: unit normals, rotating with the wing.",
      border: "Orange: border elements in space.", center: "Blue-grey: centre elements in space.",
    };
    note(host, txt[hl] || "The four wings at this step.");
  }
  function hudFor(hl, j) {
    const s = TD.steps[j];
    if (hl === "gam" || hl === "bordergam") return `max |Γ| = ${V3.gamMaxAt(j).toFixed(3)}`;
    if (hl === "vnc" || hl === "vncw") { let m = 0; s.w.forEach((W) => W[hl].forEach((v) => (m = Math.max(m, Math.abs(v))))); return `max |normal velocity| = ${m.toFixed(3)}`; }
    return `φ = ${(s.phi[0] * 57.3).toFixed(0)}° · θ = ${(s.theta[0] * 57.3).toFixed(0)}°`;
  }

  function flow(host) {
    stage(host, (k) => sceneFor("both", k, { flow: true }), { hud: stepHud, cam: { yaw: -1.25, pitch: 0.3 } });
    note(host, `Green arrow: the air relative to the body (+x). In the space-fixed frame the air is at rest and the body moves towards −x at U = ${M.U[0].toFixed(3)} (nondimensional): step by step the body slides away while the shed rings stay where they were released and form the wake.`);
  }

  function cycle(host) {
    stage(host, (k) => cycleScene(k), { count: TD.cycle.length, start: 8, h: 320, cam: { yaw: -1.2, pitch: 0.25 },
      filmIdx: [0, 5, 10, 15, 20, 25, 30, 35], frameLabel: (j) => "t = " + TD.cycle[j].t.toFixed(2),
      label: (j) => `t = ${TD.cycle[j].t.toFixed(2)} · φ = ${(TD.cycle[j].phi[0] * 57.3).toFixed(0)}° · θ = ${(TD.cycle[j].theta[0] * 57.3).toFixed(0)}°`, fps: 120 });
    note(host, "One full flapping period in the body-fixed frame (no free-stream translation). Dashed yellow: the path of each wing tip.");
  }

  function kin4(host, p) {
    const grid = el("div", "grid4"); host.appendChild(grid);
    const views = [];
    for (let w = 0; w < 4; w++) {
      const cell = el("div", "cell");
      const cv = el("canvas", "cv3d"); cv.style.height = "160px";
      const lab = el("div", "celllab");
      cell.append(cv, lab); grid.appendChild(cell);
      views.push({ cv, lab, w });
    }
    let k = 5;
    const draws = views.map((v) => G.view3d(v.cv, () => {
      const s = TD.steps[k];
      return { prims: bodyPrims(s.t).concat(wingPrims(s.w.map((W) => W.panels), { only: [v.w] })), fit: BOX };
    }, { yaw: -1.25, pitch: 0.3 }));
    const bar = el("div", "stepbar"); const rng = el("input"); rng.type = "range"; rng.min = 0; rng.max = NSTEP - 1; rng.value = k;
    const lab = el("span", "steplab"); bar.append(rng, lab); host.appendChild(bar);
    const upd = () => {
      const s = TD.steps[k];
      lab.textContent = `step ${k + 1} · t = ${s.t.toFixed(1)}`;
      views.forEach((v) => { v.lab.innerHTML = `<b>${v.w + 1} · ${WN[v.w]}</b> φ = ${(s.phi[v.w] * 57.3).toFixed(1)}° · θ = ${(s.theta[v.w] * 57.3).toFixed(1)}°`; });
      draws.forEach((d) => d.draw());
    };
    rng.addEventListener("input", () => { k = +rng.value; upd(); });
    upd();
    note(host, "Each wing gets its own φ and θ. In this run all four wings use the same parameters, so the angles agree; a phase lag or a different frequency would separate them.");
  }

  function L2G(host) {
    const row = el("div", "row2"); host.appendChild(row);
    const left = el("div"); const right = el("div"); row.append(left, right);
    A.planform(left, "both", {});
    stage(right, (k) => ({ prims: bodyPrims(TD.steps[k].t).concat(wingPrims(TD.steps[k].w.map((W) => W.panels))), fit: BOX }), { h: 250, film: false, cam: { yaw: -0.95, pitch: 0.38 } });
    note(host, "Left: the wing-fixed mesh, the same at every step. Right: its space-fixed position, rotated by φ and θ, placed at its root on the body and carried with the body by −U·t. The left wings mirror the right ones.");
  }

  function shed(host) {
    stage(host, (k) => sceneFor("border", k, { shed: true, wakeMono: "#556074", wakeAlpha: 0.5 }), { start: 4, hud: () => "red: rings shed at this step", cam: { yaw: -0.95, pitch: 0.38 } });
    note(host, "At every step the 10 border elements of each wing are released as copies moved forward by their corner velocities times dt (red). Each carries the Γ its border element had at that step. Grey: the wake shed earlier.");
  }

  function convect(host) {
    stage(host, (k) => {
      const prims = bodyPrims(TD.steps[k].t).concat(wingPrims(TD.steps[k].w.map((W) => W.panels), { hl: "border" }));
      if (k > 0) {
        const prev = TD.steps[k - 1], cur = TD.steps[k];
        prev.w.forEach((W, w) => W.wake.forEach((q, i) => {
          prims.push({ t: "line", p: q, close: true, c: "#6b7487", lw: 1, a: 0.6, dash: [3, 3] });
          const q2 = cur.w[w].wake[i];
          prims.push({ t: "line", p: q2, close: true, c: "#57e1ff", lw: 1.3 });
          prims.push({ t: "line", p: [G.avg(q), G.avg(q2)], c: "#ffd166", lw: 1, a: 0.8 });
        }));
      }
      return { prims, fit: BOX };
    }, { start: 6, hud: () => "dashed grey: before · blue: after · yellow: displacement", cam: { yaw: -0.95, pitch: 0.38 } });
    note(host, "x ← x + dt·(u_wings + u_wake): every wake corner moves one step with the velocity at its own position. The velocity has two sources, the bound rings of the four wings and the wake itself. Corners move at different speeds, so the rings also change shape and orientation.");
  }

  function grow(host, p) {
    const W = 560, H = 120, root = svg(W, H);
    stage(host, (k) => sceneFor("both", k, { wakeColor: p && p.color }), { hud: stepHud, start: 5, cam: { yaw: -0.95, pitch: 0.38 }, onStep: (k) => drawBars(k) });
    host.appendChild(root);
    function drawBars(k) {
      root.innerHTML = "";
      const mx = TD.steps[NSTEP - 1].nxw;
      TD.steps.forEach((s, i) => {
        const h = (s.nxw / mx) * 80, x = 30 + i * 43;
        S(root, "rect", { x, y: 92 - h, width: 32, height: h, rx: 3, fill: i === k ? "#57e1ff" : "#34405a" });
        S(root, "text", { x: x + 16, y: 88 - h, class: "tiny" }, String(s.nxw));
        S(root, "text", { x: x + 16, y: 108, class: "tick" }, String(i + 1));
      });
      S(root, "text", { x: W - 8, y: 14, class: "tick", "text-anchor": "end" }, "wake rings per wing at the end of each step");
    }
    note(host, "After every step the wake grows by 10 rings per wing. New rings are appended at the end, so the order of the wake array is the order of birth.");
  }

  function wwcost(host) {
    const W = 560, H = 210, root = svg(W, H); host.appendChild(root);
    const n = 14, cx = 110, cy = 105, R = 80, P = [...Array(n).keys()].map((i) => [cx + R * Math.cos((i / n) * 6.283), cy + R * Math.sin((i / n) * 6.283)]);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) S(root, "line", { x1: P[i][0], y1: P[i][1], x2: P[j][0], y2: P[j][1], stroke: "#57e1ff", "stroke-width": 0.6, opacity: 0.45 });
    P.forEach((q) => S(root, "circle", { cx: q[0], cy: q[1], r: 4, fill: "#ffd166" }));
    S(root, "text", { x: cx, y: H - 6, class: "tick" }, `${n} rings → ${n * (n - 1)} directed interactions`);
    const pts = TD.steps.map((s, i) => { const K = 4 * s.nxw; return [i + 1, K * (K - 1)]; });
    const ch = G.lineChart([{ pts, c: "#ff8a5c", w: 2.4, dots: true, label: "wake–wake interactions K(K−1)" }], { w: 330, h: 200, xticks: [[1, "1"], [4, "4"], [8, "8"], [12, "12"]], xlabel: "step" });
    ch.root.setAttribute("x", 225); ch.root.setAttribute("y", 4); ch.root.setAttribute("width", 330); ch.root.setAttribute("height", 200);
    root.appendChild(ch.root);
    const K = 4 * TD.steps[NSTEP - 1].nxw;
    note(host, `For the wake-to-wake velocity every wake corner sums over every wake ring. At the end of step ${NSTEP} this run has K = ${K} rings, so ${(K * (K - 1)).toLocaleString("en-US")} ring pairs (each 4 corners × 4 edges). K grows by 40 a step, so the work grows with the square of the step count. This is the cost a fast multipole method removes.`);
  }

  function bvel(host) {
    stage(host, (k) => {
      const s = TD.steps[k];
      const prims = bodyPrims(s.t).concat(wingPrims(s.w.map((W) => W.panels), { hl: "border" }));
      s.w.forEach((W) => W.shed.forEach((q, i) => q.forEach((x, n) => {
        const b = W.panels[i][n];
        prims.push({ t: "arrow", p: b, v: [x[0] - b[0], x[1] - b[1], x[2] - b[2]], c: "#ff5d73", lw: 1.4 });
      })));
      return { prims, fit: null };
    }, { start: 5, film: false, hud: () => "arrow = dt × (velocity from wings + velocity from wake)", cam: { yaw: -0.95, pitch: 0.38 } });
    note(host, "The total velocity at every corner of the border elements (from the wings plus from the wake) times dt: the corner of the shed ring goes to the tip of this arrow. Taken from the run as shed position minus border position.");
  }

  function matrix(host, p, ctx) {
    const N = 68, cs = 5, off = 26, W = off + N * cs + 10;
    const cv = el("canvas", "mat"); cv.width = W * 2; cv.height = W * 2; cv.style.width = W + "px"; cv.style.height = W + "px";
    const wrap = el("div", "matwrap"); wrap.appendChild(cv); host.appendChild(wrap);
    const side = el("div", "matside"); wrap.appendChild(side);
    const bar = el("div", "stepbar"); const rng = el("input"); rng.type = "range"; rng.min = 0; rng.max = NSTEP - 1; rng.value = 0;
    const lab = el("span", "steplab"); const tg = el("label", "tog"); tg.innerHTML = `<input type="checkbox" id="mdiff"> difference from step 1`;
    bar.append(rng, lab, tg); host.appendChild(bar);
    let k = 0, diff = false;
    const pair = p.pair;
    function draw() {
      const g = cv.getContext("2d"); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, W, W);
      const Mk = TD.A[k], M1 = TD.A[0];
      let mx = 1e-9;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) mx = Math.max(mx, Math.abs(diff ? Mk[i][j] - M1[i][j] : Mk[i][j]));
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const v = diff ? Mk[i][j] - M1[i][j] : Mk[i][j];
        const t = Math.sign(v) * Math.sqrt(Math.abs(v) / mx);
        g.fillStyle = G.diverge(t, 1);
        if (Math.abs(v) < 1e-12) g.fillStyle = "#151b24";
        g.fillRect(off + j * cs, off + i * cs, cs, cs);
      }
      const bi = Math.floor, blk = (a, b) => [off + b * 17 * cs, off + a * 17 * cs];
      g.strokeStyle = "#0b0f15"; g.lineWidth = 1.5;
      for (let q = 0; q <= 4; q++) {
        g.beginPath(); g.moveTo(off + q * 17 * cs, off); g.lineTo(off + q * 17 * cs, off + N * cs); g.stroke();
        g.beginPath(); g.moveTo(off, off + q * 17 * cs); g.lineTo(off + N * cs, off + q * 17 * cs); g.stroke();
      }
      g.fillStyle = "#c9d3df"; g.font = "600 11px 'IBM Plex Sans', sans-serif"; g.textAlign = "center";
      for (let q = 0; q < 4; q++) { g.fillText(String(q + 1), off + (q + 0.5) * 17 * cs, 16); g.fillText(String(q + 1), 12, off + (q + 0.5) * 17 * cs + 4); }
      const lit = [];
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
        const d = a === b;
        if ((p.hl === "diag" && d) || (p.hl === "off" && !d) || (p.hl === "diagF" && d && a < 2) || (p.hl === "diagR" && d && a >= 2) || (pair && a === pair[0] - 1 && b === pair[1] - 1)) lit.push([a, b]);
      }
      g.strokeStyle = "#ffd166"; g.lineWidth = 2.2;
      lit.forEach(([a, b]) => { const [x, y] = blk(a, b); g.strokeRect(x + 1, y + 1, 17 * cs - 2, 17 * cs - 2); });
      lab.textContent = `step ${k + 1}`;
    }
    side.innerHTML = `<p><b>row</b> = target collocation point<br><b>column</b> = source ring<br>block (i, j): rings of wing j → points of wing i</p>
      <p>1 front-right · 2 front-left<br>3 rear-right · 4 rear-left</p>
      <p class="hint">Move the slider to change step. With "difference from step 1" on, the diagonal blocks stay <b>completely empty</b>: a wing's influence on itself does not change in time. The off-diagonal blocks change every step.</p>`;
    rng.addEventListener("input", () => { k = +rng.value; draw(); });
    tg.querySelector("input").addEventListener("change", (e) => { diff = e.target.checked; draw(); });
    draw();
  }

  function pairViz(host, p) {
    const i = p.i, j = p.j, W = 560, H = 230, root = svg(W, H); host.appendChild(root);
    G.arrowDefs(root, "ap", "#ffd166");
    const pos = [[210, 70], [210, 160], [380, 70], [380, 160]];
    pos.forEach((q, w) => {
      const on = w === i - 1 || w === j - 1;
      S(root, "rect", { x: q[0] - 60, y: q[1] - 26, width: 120, height: 52, rx: 10, fill: w === i - 1 ? "#2b3a24" : w === j - 1 ? "#3a3220" : "#1a2130", stroke: on ? "#ffd166" : "#3a4352" });
      S(root, "text", { x: q[0], y: q[1] - 4, class: "lab" }, `${w + 1} · ${WN[w]}`);
      S(root, "text", { x: q[0], y: q[1] + 14, class: "tick" }, w === i - 1 ? "target: collocation points" : w === j - 1 ? "source: rings" : "");
    });
    const a = pos[j - 1], b = pos[i - 1];
    if (i !== j) {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      const t0 = Math.min(dx ? 64 / Math.abs(dx) : 9, dy ? 30 / Math.abs(dy) : 9) * L, ux = dx / L, uy = dy / L;
      S(root, "line", { x1: a[0] + ux * t0, y1: a[1] + uy * t0, x2: b[0] - ux * (t0 + 4), y2: b[1] - uy * (t0 + 4), stroke: "#ffd166", "stroke-width": 2.6, "marker-end": "url(#ap)" });
    }
    S(root, "text", { x: 60, y: 120, class: "tick" }, "front ↑");
    S(root, "text", { x: 470, y: 216, class: "tick" }, "top view, flying left");
    note(host, `${p.what || "Normal velocity"}: the influence of the rings of <b>wing ${j} (${WN[j - 1]})</b> on <b>wing ${i} (${WN[i - 1]})</b>. The two wings move relative to each other (their distance and angle change), so this block is recomputed at every step.`);
    if (p.matrix) matrix(host, { pair: [i, j] });
  }

  function solve(host) {
    let k = 5;
    const W = 560, H = 150, root = svg(W, H);
    stage(host, (j) => sceneFor("gam", j, { wakeAlpha: 0.3 }), { start: k, h: 260, film: false, cam: { yaw: -0.95, pitch: 0.38 }, onStep: (j) => { k = j; bars(); } });
    host.appendChild(root);
    function bars() {
      root.innerHTML = "";
      const g = [].concat(...TD.steps[k].w.map((W) => W.gam)), mx = Math.max(...g.map(Math.abs));
      const cols = ["#f0a43a", "#e07b39", "#7f9cc0", "#5d7ea8"];
      g.forEach((v, i) => {
        const x = 20 + i * 7.8, h = (v / mx) * 55;
        S(root, "rect", { x, y: h > 0 ? 70 - h : 70, width: 6, height: Math.abs(h), fill: cols[Math.floor(i / 17)] });
      });
      S(root, "line", { x1: 18, x2: 552, y1: 70, y2: 70, stroke: "#8a96a8" });
      for (let q = 0; q < 4; q++) S(root, "text", { x: 20 + (q * 17 + 8.5) * 7.8, y: 142, class: "tick" }, `${q + 1} · ${WN[q]}`);
      S(root, "text", { x: 552, y: 12, class: "tick", "text-anchor": "end" }, `68 unknown Γ, step ${k + 1}`);
    }
    bars();
    note(host, "Solving A·Γ = (wing normal velocity) − (wake normal velocity). Top: Γ as colour on the panels. Bottom: the 68 values in order, first the 17 of the front-right wing (the first 10 are border elements), then front-left, rear-right and rear-left.");
  }

  function split(host) {
    const W = 560, H = 120, root = svg(W, H); host.appendChild(root);
    const cols = ["#f0a43a", "#e07b39", "#7f9cc0", "#5d7ea8"];
    for (let i = 0; i < 68; i++) S(root, "rect", { x: 14 + i * 7.9, y: 30, width: 7, height: 34, fill: cols[Math.floor(i / 17)], opacity: i % 17 < NXB ? 1 : 0.6 });
    ["1 : 17", "18 : 34", "35 : 51", "52 : 68"].forEach((r, q) => {
      S(root, "text", { x: 14 + (q * 17 + 8.5) * 7.9, y: 20, class: "tick" }, `Γ ${r}`);
      S(root, "text", { x: 14 + (q * 17 + 8.5) * 7.9, y: 84, class: "lab" }, `${q < 2 ? "front" : "rear"} wing ${q % 2 + 1}`);
      S(root, "text", { x: 14 + (q * 17 + 8.5) * 7.9, y: 102, class: "tick" }, WN[q]);
    });
    note(host, "The first 10 of each block of 17 (solid) belong to border elements: they are split off and become the strengths of the rings shed next.");
  }

  const REG = {
    tmloop, wing3d, flow, cycle, kin4, L2G, shed, convect, grow, wwcost, bvel, matrix,
    pair: pairViz, solve, split,
    mesh2d: (h, p) => A.planform(h, p.hl || "both", p), body: (h, p) => A.bodyTop(h, p.hl || "all"), stroke: (h, p) => A.strokeView(h, p.hl),
    motion: (h, p) => A.motion(h, p.hl), time: (h, p) => A.timeAxis(h, p.hl), units: (h) => A.units(h), cutoff: (h, p) => A.cutoff(h, p.hl),
  };
  window.VIZ = REG;
})();
