// Visual builders. Each takes (host, params, ctx) and fills host. ctx = {side, jump(line), name}.
(function () {
  "use strict";
  const TD = window.TD, { S, svg } = G, { stage, sceneFor, cycleScene, el, NXB, NSTEP, WN } = V3;
  const M = TD.mesh;
  const note = (host, html) => { const p = el("p", "vnote"); p.innerHTML = html; host.appendChild(p); return p; };

  // ---------- planform of the wing in its own frame ----------
  function planform(host, hl, o) {
    o = o || {};
    const wings = o.rear ? [["f", "front"], ["r", "rear"]] : [["f", "front"]];
    const W = 560, H = o.rear ? 340 : 230, sc = 600;
    const root = svg(W, H);
    G.arrowDefs(root, "ah", "#c9d3df");
    wings.forEach(([side, name], wi) => {
      const ox = 70, oy = wi === 0 ? 100 : 262;
      const X = (p) => ox + p[1] * sc, Y = (p) => oy + p[0] * sc;
      const mesh = M[side];
      S(root, "text", { x: ox - 36, y: oy + 4, class: "lab" }, name);
      mesh.panels.forEach((q, i) => {
        const isB = i < mesh.nxb;
        let fill = isB ? "#f0a43a" : "#7f9cc0";
        if (hl === "border" && !isB) fill = "#2c3442";
        if (hl === "center" && isB) fill = "#2c3442";
        S(root, "polygon", { points: q.map((p) => X(p) + "," + Y(p)).join(" "), fill, stroke: "#0d1117", "stroke-width": 1 });
        const c = mesh.colloc[i];
        if (hl === "colloc") S(root, "circle", { cx: X(c), cy: Y(c), r: 3.2, fill: "#fff", stroke: "#0d1117" });
        const showNum = hl === "numbers" || o.numbers || (hl === "both" && wi === 0);
        if (showNum && (wi === 0 || hl === "numbers")) S(root, "text", { x: X(c), y: Y(c) + 3.5, class: "pnum" }, String(i + 1));
      });
      if (wi === 0) {
        S(root, "text", { x: ox + 0.23 * sc, y: oy - 0.135 * sc, class: "edge" }, "leading edge · flight direction ↑");
        S(root, "text", { x: ox + 0.23 * sc, y: oy + 0.152 * sc, class: "edge" }, "trailing edge");
        S(root, "text", { x: ox - 6, y: oy - 0.11 * sc, class: "edge", "text-anchor": "start" }, "root");
        S(root, "text", { x: ox + 0.47 * sc, y: oy - 0.11 * sc, class: "edge" }, "tip");
      }
      if (hl === "dims" && wi === 0) {
        const l = M.l[0], c = M.c[0], h = M.h[0];
        S(root, "line", { x1: ox, x2: ox + l * sc, y1: oy + 0.17 * sc, y2: oy + 0.17 * sc, class: "dim", "marker-start": "url(#ah)", "marker-end": "url(#ah)" });
        S(root, "text", { x: ox + (l * sc) / 2, y: oy + 0.17 * sc + 14, class: "dimt" }, `l = ${l.toFixed(3)} (span)`);
        S(root, "line", { x1: ox + l * sc + 14, x2: ox + l * sc + 14, y1: oy - (c / 2) * sc, y2: oy + (c / 2) * sc, class: "dim", "marker-start": "url(#ah)", "marker-end": "url(#ah)" });
        S(root, "text", { x: ox + l * sc + 20, y: oy + 4, class: "dimt", "text-anchor": "start" }, `c = ${c.toFixed(3)}`);
        S(root, "text", { x: ox + l * sc - 60, y: oy - (c / 2) * sc - 6, class: "dimt" }, `h = 0.1·c = ${h.toFixed(4)}`);
      }
    });
    host.appendChild(root);
    const legend = el("div", "legend");
    legend.innerHTML = `<span><i style="background:#f0a43a"></i>border elements · ${M.f.nxb} · shed every step</span><span><i style="background:#7f9cc0"></i>centre elements · ${M.f.nxc} · stay on the wing</span>` +
      (hl === "colloc" ? `<span><i style="background:#fff;border-radius:50%"></i>collocation point</span>` : "");
    host.appendChild(legend);
  }

  // ---------- top view of body + 4 wings ----------
  function bodyTop(host, hl) {
    const W = 560, H = 330, sc = 300, cx = 250, cy = 165;
    const root = svg(W, H);
    G.arrowDefs(root, "ab", "#9be564");
    S(root, "ellipse", { cx: cx - 0.33 * sc, cy, rx: 13, ry: 13, fill: "#56657a" });
    S(root, "rect", { x: cx - 0.3 * sc, y: cy - 16, width: 0.66 * sc, height: 32, rx: 16, fill: "#4a5566" });
    S(root, "rect", { x: cx + 0.36 * sc, y: cy - 8, width: 0.5 * sc, height: 16, rx: 8, fill: "#3e4857" });
    const place = [["f", M.b_f, 1, 0], ["f", M.b_f, -1, 1], ["r", M.b_r, 1, 2], ["r", M.b_r, -1, 3]];
    place.forEach(([side, b, sgn, w]) => {
      const X = (p) => cx + (b + p[0]) * sc, Y = (p) => cy - sgn * p[1] * sc;
      const lit = hl === "all" || hl === "b" || (hl === "lr" && (w === 0 || w === 2)) || hl === "clearance";
      M[side].panels.forEach((q, i) => S(root, "polygon", { points: q.map((p) => X(p) + "," + Y(p)).join(" "), fill: i < NXB ? "#f0a43a" : "#7f9cc0", opacity: lit ? 0.95 : 0.35, stroke: "#0d1117" }));
      const tip = [0, M.l[w] * 0.62, 0];
      S(root, "text", { x: X(tip), y: Y(tip) + 4, class: "wl" }, `${w + 1} · ${WN[w]}`);
    });
    S(root, "line", { x1: 120, x2: 40, y1: 24, y2: 24, stroke: "#9be564", "stroke-width": 2.5, "marker-end": "url(#ab)" });
    S(root, "text", { x: 128, y: 28, class: "lab", "text-anchor": "start" }, "flight direction (−x) · air moves in +x");
    S(root, "text", { x: W - 16, y: H - 12, class: "tick", "text-anchor": "end" }, "top view, wings drawn level (φ = 0) · right wing +y");
    if (hl === "b" || hl === "clearance") {
      const y = H - 44;
      S(root, "line", { x1: cx + M.b_f * sc, x2: cx + M.b_r * sc, y1: y, y2: y, class: "dim" });
      [M.b_f, M.b_r].forEach((b) => S(root, "line", { x1: cx + b * sc, x2: cx + b * sc, y1: y - 6, y2: y + 6, class: "dim" }));
      S(root, "text", { x: cx + M.b_f * sc, y: y + 18, class: "dimt" }, "b_f = −1.5 cm");
      S(root, "text", { x: cx + M.b_r * sc, y: y + 18, class: "dimt" }, "b_r = +1.5 cm");
      S(root, "circle", { cx, cy, r: 4, fill: "#ffd166" });
    }
    host.appendChild(root);
    if (hl === "clearance") note(host, `b_r − b_f = ${(M.b_r - M.b_f).toFixed(3)} ≥ ½(c_r + c_f) = ${(0.5 * (M.c[0] + M.c[2])).toFixed(3)} → <b>the wings do not overlap</b> (nondimensional values).`);
  }

  // ---------- stroke geometry, front view ----------
  function strokeView(host, hl) {
    const W = 560, H = 300, cx = 210, cy = 160, R = 120;
    const root = svg(W, H);
    G.arrowDefs(root, "as", "#ffd166");
    const T = M.phiT[0], B = M.phiB[0];
    const pt = (a, r) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    const [x1, y1] = pt(T, R), [x2, y2] = pt(B, R);
    S(root, "path", { d: `M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}`, fill: "none", stroke: "#ffd166", "stroke-width": 2, "stroke-dasharray": "5 4", "marker-end": "url(#as)" });
    S(root, "line", { x1: cx - 160, x2: cx + 170, y1: cy, y2: cy, class: "grid" });
    S(root, "line", { x1: cx, y1: cy, x2: x1, y2: y1, stroke: "#f0a43a", "stroke-width": 7, "stroke-linecap": "round" });
    S(root, "line", { x1: cx, y1: cy, x2: x2, y2: y2, stroke: "#7f9cc0", "stroke-width": 7, "stroke-linecap": "round", opacity: 0.8 });
    S(root, "circle", { cx, cy, r: 16, fill: "#4a5566" });
    S(root, "text", { x: x1 + 8, y: y1 - 4, class: "lab", "text-anchor": "start" }, "φT = 80° (top)");
    S(root, "text", { x: x2 + 8, y: y2 + 14, class: "lab", "text-anchor": "start" }, "φB = −45° (bottom)");
    S(root, "text", { x: cx + R + 30, y: cy - 30, class: "lab", "text-anchor": "start" }, "downstroke");
    S(root, "text", { x: cx - 150, y: cy - 8, class: "tick", "text-anchor": "start" }, "horizontal");
    S(root, "text", { x: cx, y: H - 10, class: "tick" }, "front view: body axis into the screen");
    const e = M.e[0];
    S(root, "text", { x: W - 14, y: 26, class: "tick", "text-anchor": "end" }, `φ(t) = ½(φT − φB)(cos πt + e), e = ${e.toFixed(2)}`);
    if (hl === "beta") S(root, "text", { x: W - 14, y: 46, class: "tick", "text-anchor": "end" }, "β = 90°: stroke plane normal to the body · a = 0: pitch axis at mid-chord");
    host.appendChild(root);
    stage(host, (k) => cycleScene(k, { only: [0] }), { count: TD.cycle.length, start: 0, h: 230, cam: { yaw: -1.35, pitch: 0.2 },
      filmIdx: [0, 5, 10, 15, 20, 25, 30, 35], frameLabel: (j) => "t = " + TD.cycle[j].t.toFixed(2),
      label: (j) => `t = ${TD.cycle[j].t.toFixed(2)} · φ = ${(TD.cycle[j].phi[0] * 57.3).toFixed(0)}° · θ = ${(TD.cycle[j].theta[0] * 57.3).toFixed(0)}°`, fps: 140 });
  }

  // ---------- phi(t), theta(t) ----------
  function motion(host, hl) {
    const deg = 57.2958;
    const ph = TD.cycle.map((c) => [c.t, c.phi[0] * deg]), th = TD.cycle.map((c) => [c.t, c.theta[0] * deg]);
    const series = [];
    if (hl !== "theta") series.push({ pts: ph, c: "#f0a43a", w: 2.4, label: "φ flapping (°)" });
    if (hl !== "phi") series.push({ pts: th, c: "#57e1ff", w: 2.4, label: "θ pitch (°)" });
    const marks = TD.steps.map((s) => [s.t, "", "rgba(255,209,102,.35)"]);
    const ch = G.lineChart(series, { w: 560, h: 230, x0: 0, x1: 2, xticks: [[0, "0 top"], [0.5, "0.5"], [1, "1 bottom"], [1.5, "1.5"], [2, "2 top"]], bands: [[0, 1, "#f0a43a"]], marks, xlabel: "nondimensional time t (1 = half period)" });
    host.appendChild(ch.root);
    // chord glyphs showing pitch along the cycle
    const W = 560, H = 70, root = svg(W, H);
    for (let i = 0; i <= 16; i++) {
      const c = TD.cycle[Math.min(TD.cycle.length - 1, i * 2.5 | 0)];
      const x = 46 + (c.t / 2) * (W - 60), a = c.theta[0];
      S(root, "line", { x1: x - 13 * Math.cos(a), y1: 35 + 13 * Math.sin(a), x2: x + 13 * Math.cos(a), y2: 35 - 13 * Math.sin(a), stroke: "#7f9cc0", "stroke-width": 4, "stroke-linecap": "round" });
      S(root, "circle", { cx: x - 13 * Math.cos(a), cy: 35 + 13 * Math.sin(a), r: 3, fill: "#f0a43a" });
    }
    S(root, "text", { x: 8, y: 66, class: "tick", "text-anchor": "start" }, "chord section: orange dot = leading edge, tilt = θ");
    host.appendChild(root);
    note(host, "Flapping (φ) is smooth, close to a cosine; pitch (θ) is a smoothed step that changes sign quickly at the stroke ends (t = 0, 1, 2). Dashed yellow lines: the 12 time steps of this run.");
  }

  function timeAxis(host, hl) {
    const W = 560, H = 150, root = svg(W, H), x0 = 30, x1 = 530, X = (t) => x0 + (t / 2) * (x1 - x0);
    S(root, "rect", { x: X(0), y: 40, width: X(1) - X(0), height: 26, fill: "#f0a43a", opacity: 0.18 });
    S(root, "rect", { x: X(1), y: 40, width: X(2) - X(1), height: 26, fill: "#57e1ff", opacity: 0.14 });
    S(root, "text", { x: X(0.5), y: 57, class: "lab" }, "downstroke");
    S(root, "text", { x: X(1.5), y: 57, class: "lab" }, "upstroke");
    for (let i = 0; i <= 20; i++) S(root, "line", { x1: X(i * 0.1), x2: X(i * 0.1), y1: 70, y2: i % 10 ? 78 : 86, stroke: "#8a96a8" });
    TD.steps.forEach((s, i) => S(root, "circle", { cx: X(s.t), cy: 100, r: 4.5, fill: hl === "t" && i === 5 ? "#ffd166" : "#9be564" }));
    S(root, "text", { x: X(0), y: 122, class: "tick", "text-anchor": "start" }, `this run: ${NSTEP} steps (green), dt = ${M.dt}`);
    S(root, "text", { x: X(2), y: 122, class: "tick", "text-anchor": "end" }, "one full stroke = 2 units = 20 steps");
    S(root, "text", { x: X(0), y: 30, class: "tick", "text-anchor": "start" }, "t = 0");
    S(root, "text", { x: X(2), y: 30, class: "tick", "text-anchor": "end" }, "t = 2");
    host.appendChild(root);
    if (hl === "t") note(host, "t = (step − 1)·dt: step 1 → t = 0, step 6 → t = 0.5 (yellow).");
  }

  function units(host) {
    const W = 560, H = 210, root = svg(W, H), cx = 150, cy = 120, R = 95;
    const T = M.phiT[0], B = M.phiB[0];
    const p = (a) => [cx + R * Math.cos(a), cy - R * Math.sin(a)];
    const [x1, y1] = p(T), [x2, y2] = p(B);
    S(root, "path", { d: `M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}`, fill: "none", stroke: "#ffd166", "stroke-width": 4 });
    S(root, "line", { x1: cx, y1: cy, x2: x1, y2: y1, stroke: "#7f9cc0", "stroke-width": 3 });
    S(root, "line", { x1: cx, y1: cy, x2: x2, y2: y2, stroke: "#7f9cc0", "stroke-width": 3 });
    S(root, "text", { x: cx + 18, y: cy - 22, class: "lab", "text-anchor": "start" }, "l");
    S(root, "text", { x: cx + R + 14, y: cy, class: "lab", "text-anchor": "start" }, "d = arc length");
    const l = M.l[0], d = l * (T - B);
    S(root, "text", { x: 300, y: 70, class: "eq", "text-anchor": "start" }, "d = l·φT + l·|φB|");
    S(root, "text", { x: 300, y: 98, class: "eq", "text-anchor": "start" }, `= ${l.toFixed(3)}·(${T.toFixed(3)} + ${(-B).toFixed(3)})`);
    S(root, "text", { x: 300, y: 126, class: "eq", "text-anchor": "start" }, `= ${d.toFixed(3)}  (nondimensional, 1 by definition)`);
    S(root, "text", { x: 300, y: 168, class: "tick", "text-anchor": "start" }, "time unit = T/2 · velocity unit = d / (T/2)");
    host.appendChild(root);
    note(host, `So every length on screen is measured in units of the front-right wing's tip arc: span l = ${l.toFixed(3)}, chord c = ${M.c[0].toFixed(3)}, free stream U = ${M.U[0].toFixed(3)}.`);
  }

  function cutoff(host, hl) {
    const W = 560, H = 230, root = svg(W, H);
    S(root, "rect", { x: 40, y: 92, width: 230, height: 36, fill: "#ff5d73", opacity: 0.16 });
    S(root, "line", { x1: 0, x2: 40, y1: 110, y2: 110, stroke: "#ff5d73", "stroke-dasharray": "4 4" });
    S(root, "line", { x1: 270, x2: 310, y1: 110, y2: 110, stroke: "#ff5d73", "stroke-dasharray": "4 4" });
    S(root, "line", { x1: 40, x2: 270, y1: 110, y2: 110, stroke: "#f0a43a", "stroke-width": 4 });
    S(root, "circle", { cx: 40, cy: 110, r: 4, fill: "#f0a43a" }); S(root, "circle", { cx: 270, cy: 110, r: 4, fill: "#f0a43a" });
    S(root, "text", { x: 40, y: 150, class: "tick" }, "A"); S(root, "text", { x: 270, y: 150, class: "tick" }, "B");
    S(root, "circle", { cx: 150, cy: 102, r: 4, fill: "#fff" }); S(root, "text", { x: 158, y: 88, class: "tick", "text-anchor": "start" }, "u set to 0");
    S(root, "circle", { cx: 150, cy: 40, r: 4, fill: "#9be564" }); S(root, "text", { x: 158, y: 44, class: "tick", "text-anchor": "start" }, "normal Biot–Savart");
    S(root, "text", { x: 155, y: 200, class: "tick" }, "red band: closer than the cutoff radius to the line or its extension (scale exaggerated)");
    const ch = G.lineChart([{ pts: [...Array(60).keys()].map((i) => { const r = 0.02 + i * 0.03; return [r, r < 0.25 ? 0 : 1 / r]; }), c: "#57e1ff", w: 2 }], { w: 250, h: 190, x0: 0, x1: 1.8, bands: [[0, 0.25, "#ff5d73"]], xlabel: "distance" });
    ch.root.setAttribute("x", 300); ch.root.setAttribute("y", 20); ch.root.setAttribute("width", 250); ch.root.setAttribute("height", 190);
    root.appendChild(ch.root);
    host.appendChild(root);
    note(host, hl === "rcut" ? "A second, tiny cutoff (1e−10) skips the division when source and target coincide." : `Cutoff radius = 0.1 × border-strip width = ${M.cut.toFixed(5)} (nondimensional). The 1/r velocity of a vortex line grows without bound near the line, so inside this band it is set to zero.`);
  }

  window.VB_A = { planform, bodyTop, strokeView, motion, timeAxis, units, cutoff, note };
})();
