// Velocity induced by straight vortex segments. The example is the front-right wake after step 6 (60 rings);
// the browser repeats the same arithmetic and compares with the original code's output (MVD.ref).
(function () {
  "use strict";
  const { S, svg } = G, el = V3.el, note = window.VB_A.note;
  const E = window.MVD.ex, REF = window.MVD.ref, rcut = 1e-10, lcut = E.cut;
  const PT_LABEL = ["wake ring 1, corner 1 (at the end of its own edge)", "wake ring 24, corner 3", "wake ring 48, corner 2"];
  let pIdx = 0, side = 0;

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = (a) => Math.sqrt(dot(a, a));

  // one straight segment, with the original cutoffs
  function seg(P, A, B, gam) {
    const r1 = sub(P, A), r2 = sub(P, B), r0 = sub(B, A);
    const c = crs(r1, r2), SQUARE = dot(c, c), R1 = nrm(r1), R2 = nrm(r2), ROR1 = dot(r0, r1), ROR2 = dot(r0, r2);
    const keep = R1 > rcut && R2 > rcut && Math.sqrt(SQUARE) > lcut;
    const COEF = keep ? gam / (4 * Math.PI * SQUARE) * (ROR1 / R1 - ROR2 / R2) : 0;
    return { r0, r1, r2, c, SQUARE, R1, R2, ROR1, ROR2, keep, COEF, vel: [c[0] * COEF, c[1] * COEF, c[2] * COEF] };
  }
  function point(k) { const [ir, inn] = E.points[k]; return E.rings[ir][inn]; }
  function sideCall(k, s) {
    const P = point(k), out = E.rings.map((q, j) => seg(P, q[s], q[(s + 1) % 4], E.gam[j]));
    const tot = out.reduce((t, o) => (o.keep ? [t[0] + o.vel[0], t[1] + o.vel[1], t[2] + o.vel[2]] : t), [0, 0, 0]);
    return { out, tot };
  }
  const f = (v) => (Math.abs(v) < 1e-4 && v !== 0 ? v.toExponential(3) : v.toFixed(5));
  const rel = (a, b) => nrm(sub(a, b)) / Math.max(nrm(b), 1e-30);

  function controls(host, redraw) {
    const a = el("div", "seg");
    PT_LABEL.forEach((t, k) => { const b = el("button"); b.type = "button"; b.textContent = "point " + (k + 1); b.title = t; b.className = k === pIdx ? "on" : ""; b.onclick = () => { pIdx = k; [...a.children].forEach((c, j) => (c.className = j === pIdx ? "on" : "")); redraw(); }; a.appendChild(b); });
    const s = el("div", "seg");
    ["edge 1→2", "2→3", "3→4", "4→1"].forEach((t, k) => { const b = el("button"); b.type = "button"; b.textContent = t; b.className = k === side ? "on" : ""; b.onclick = () => { side = k; [...s.children].forEach((c, j) => (c.className = j === side ? "on" : "")); redraw(); }; s.appendChild(b); });
    host.append(a, s);
  }

  // concept: one call = the same side of m rings + one point
  function schematic(host) {
    const W = 560, H = 200, root = svg(W, H); host.appendChild(root);
    const rings = [[70, 60], [230, 40], [390, 70]], P = [300, 175];
    rings.forEach(([x, y], k) => {
      const c = [[x, y + 70], [x, y], [x + 110, y + 10], [x + 110, y + 80]];
      for (let s = 0; s < 4; s++) {
        const a = c[s], b = c[(s + 1) % 4], on = s === side;
        const col = on ? "#f0a43a" : "#4a5566", dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, e = [b[0] - ux * 6, b[1] - uy * 6], hs = on ? 9 : 6;
        S(root, "line", { x1: a[0] + ux * 6, y1: a[1] + uy * 6, x2: e[0] - ux * hs * 0.6, y2: e[1] - uy * hs * 0.6, stroke: col, "stroke-width": on ? 3.5 : 1.4 });
        S(root, "polygon", { points: [e, [e[0] - ux * hs - uy * hs * 0.5, e[1] - uy * hs + ux * hs * 0.5], [e[0] - ux * hs + uy * hs * 0.5, e[1] - uy * hs - ux * hs * 0.5]].map((q) => q.join(",")).join(" "), fill: col });
        if (on) S(root, "line", { x1: P[0], y1: P[1], x2: (a[0] + b[0]) / 2, y2: (a[1] + b[1]) / 2, stroke: "#ffd166", "stroke-dasharray": "3 4", opacity: 0.7 });
      }
      c.forEach((q, n) => S(root, "text", { x: q[0] + (n < 2 ? -9 : 9), y: q[1] + 4, class: "tiny" }, String(n + 1)));
      S(root, "text", { x: x + 55, y: y + 50, class: "tick" }, k < 2 ? `ring ${k + 1}` : "… ring m");
    });
    S(root, "circle", { cx: P[0], cy: P[1], r: 7, fill: "#fff" });
    S(root, "text", { x: P[0] + 14, y: P[1] + 4, class: "lab", "text-anchor": "start" }, "point (x, y, z)");
    S(root, "text", { x: 14, y: 18, class: "tick", "text-anchor": "start" }, `one evaluation = edge ${side + 1}→${(side + 1) % 4 + 1} of m rings (orange) + one point → (u, v, w)`);
  }

  // a cube centred on the point, just large enough for its k nearest rings
  function nearBox(P, rings, k) {
    const ds = rings.map((q, j) => [nrm(sub(G.avg(q), P)), j]).sort((a, b) => a[0] - b[0]).slice(0, k);
    let R = 1e-6;
    ds.forEach(([, j]) => rings[j].forEach((p) => (R = Math.max(R, nrm(sub(p, P))))));
    R *= 0.75;
    return { lo: [P[0] - R, P[1] - R, P[2] - R], hi: [P[0] + R, P[1] + R, P[2] + R] };
  }

  function mvScene(host) {
    controls(host, () => { schem.innerHTML = ""; schematic(schem); view.draw(); upd(); });
    const schem = el("div"); host.appendChild(schem); schematic(schem);
    const cv = el("canvas", "cv3d"); cv.style.height = "360px"; host.appendChild(cv);
    const legend = el("div", "legend"); host.appendChild(legend);
    const view = G.view3d(cv, () => {
      const P = point(pIdx), { out, tot } = sideCall(pIdx, side), prims = [];
      let gm = 1e-9; E.gam.forEach((g) => (gm = Math.max(gm, Math.abs(g))));
      const box = nearBox(P, E.rings, 8), ext = Math.max(box.hi[0] - box.lo[0], box.hi[1] - box.lo[1], box.hi[2] - box.lo[2]);
      const rank = out.map((o, j) => [nrm(o.vel), j]).filter((r) => out[r[1]].keep).sort((a, b) => b[0] - a[0]).slice(0, 3).map((r) => r[1]);
      E.rings.forEach((q, j) => {
        prims.push({ t: "line", p: q, close: true, c: "#2c3544", lw: 0.6, a: 0.35 });
        const A = q[side], B = q[(side + 1) % 4], o = out[j], mid = G.avg([A, B]);
        if (!o.keep) {
          prims.push({ t: "line", p: [A, B], c: "#ff5d73", lw: 3.2, dash: [5, 3] });
        } else {
          prims.push({ t: "arrow", p: A, v: sub(B, A), c: G.diverge(E.gam[j], gm), lw: rank.includes(j) ? 3.2 : 1.6 });
          if (rank.includes(j)) prims.push({ t: "text", p: mid, s: "#" + (j + 1), c: "#ffd166", halo: "#0f141c", dy: -10, font: "600 11px 'IBM Plex Sans', sans-serif" });
        }
      });
      const sc = (0.45 * ext) / Math.max(nrm(tot), 1e-9);
      prims.push({ t: "pt", p: P, r: 7, c: "#ffffff", ring: "#0d1117", bias: -1 });
      prims.push({ t: "arrow", p: P, v: [tot[0] * sc, tot[1] * sc, tot[2] * sc], c: "#ffd166", lw: 4 });
      prims.push({ t: "text", p: [P[0] + tot[0] * sc, P[1] + tot[1] * sc, P[2] + tot[2] * sc], s: "(u, v, w)", c: "#ffd166", halo: "#0f141c", dy: -12, font: "700 12px 'IBM Plex Sans', sans-serif", bias: -1 });
      return { prims, fit: box };
    }, { yaw: -0.95, pitch: 0.38 });
    legend.innerHTML = `<span><i style="background:#d9452b"></i>edge, Γ > 0</span><span><i style="background:#2f6fd6"></i>edge, Γ < 0</span><span><i style="background:#ff5d73"></i>dashed: removed by the cutoff</span><span><i style="background:#ffd166"></i>3 largest contributions (#ring) and the result</span><span><i style="background:#fff;border-radius:50%"></i>field point</span>`;
    const tab = el("div"); host.appendChild(tab);
    function upd() {
      const { out, tot } = sideCall(pIdx, side), ref = REF[pIdx].side[side];
      let all = [0, 0, 0]; for (let s = 0; s < 4; s++) { const t = sideCall(pIdx, s).tot; all = [all[0] + t[0], all[1] + t[1], all[2] + t[2]]; }
      tab.innerHTML = `<table class="tbl"><thead><tr><th></th><th>u</th><th>v</th><th>w</th></tr></thead><tbody>
        <tr><td>this edge · browser</td>${tot.map((v) => `<td>${f(v)}</td>`).join("")}</tr>
        <tr><td>this edge · original code</td>${ref.map((v) => `<td>${f(v)}</td>`).join("")}</tr>
        <tr class="sum"><td>4 edges · browser</td>${all.map((v) => `<td>${f(v)}</td>`).join("")}</tr>
        <tr class="sum"><td>4 edges · original code</td>${REF[pIdx].total.map((v) => `<td>${f(v)}</td>`).join("")}</tr></tbody></table>
        <p class="vnote"><b>${PT_LABEL[pIdx]}</b> · m = ${out.length} segments · removed by the cutoff <b>${out.filter((o) => !o.keep).length}</b> · relative difference browser vs original ${rel(tot, ref).toExponential(1)}</p>`;
    }
    upd();
    note(host, "Top: the idea, one evaluation takes the same-numbered edge of all m rings. Below: the real front-right wake after step 6, centred on the point and zoomed to its 8 nearest rings (drag: rotate, wheel: zoom, double click: reset). The numbered thick arrows are the 3 edges that contribute most. The table compares the same arithmetic done in the browser with the original code's own output.");
  }

  // interactive single segment in its own plane
  function mvTriangle(host, p) {
    const W = 560, H = 330, root = svg(W, H); host.appendChild(root);
    const out = el("div", "readout"); host.appendChild(out);
    const sc = 110, ox = 280, oy = 230, A = [-1, 0, 0], B = [1, 0, 0];
    const X = (q) => ox + q[0] * sc, Y = (q) => oy - q[1] * sc;
    let P = [0.35, 0.8, 0];
    G.arrowDefs(root, "ta", "#f0a43a"); G.arrowDefs(root, "tb", "#57e1ff"); G.arrowDefs(root, "tc", "#9be564");
    const g = S(root, "g");
    function draw() {
      g.innerHTML = "";
      const o = seg(P, A, B, 1);
      const d = Math.abs(P[1]);
      S(g, "line", { x1: 0, x2: W, y1: oy, y2: oy, stroke: "#2a3342", "stroke-dasharray": "4 4" });
      S(g, "polygon", { points: [A, B, P].map((q) => X(q) + "," + Y(q)).join(" "), fill: "#ffd166", opacity: p.hl === "square" || p.hl === "cross" ? 0.18 : 0.06 });
      S(g, "line", { x1: X(A), y1: Y(A), x2: X(B), y2: Y(B), stroke: "#f0a43a", "stroke-width": 4, "marker-end": "url(#ta)" });
      S(g, "text", { x: X(A), y: Y(A) + 20, class: "lab" }, "end 1 (X1)"); S(g, "text", { x: X(B), y: Y(B) + 20, class: "lab" }, "end 2 (X2)");
      S(g, "text", { x: (X(A) + X(B)) / 2, y: oy + 38, class: "tick" }, "r0 = X2 − X1, Γ = 1, direction →");
      S(g, "line", { x1: X(A), y1: Y(A), x2: X(P), y2: Y(P), stroke: "#57e1ff", "stroke-width": 2, "marker-end": "url(#tb)" });
      S(g, "line", { x1: X(B), y1: Y(B), x2: X(P), y2: Y(P), stroke: "#9be564", "stroke-width": 2, "marker-end": "url(#tc)" });
      S(g, "text", { x: (X(A) + X(P)) / 2 - 14, y: (Y(A) + Y(P)) / 2, class: "lab", fill: "#57e1ff" }, "r1");
      S(g, "text", { x: (X(B) + X(P)) / 2 + 14, y: (Y(B) + Y(P)) / 2, class: "lab" }, "r2");
      S(g, "line", { x1: X(P), y1: Y(P), x2: X([P[0], 0]), y2: oy, stroke: "#c9d3df", "stroke-dasharray": "3 3" });
      S(g, "text", { x: X(P) + 6, y: oy - 8, class: "dimt", "text-anchor": "start" }, "d = " + d.toFixed(3));
      const a1 = Math.acos(o.ROR1 / (nrm(o.r0) * o.R1)), a2 = Math.acos(o.ROR2 / (nrm(o.r0) * o.R2));
      S(g, "text", { x: X(A) + 26, y: Y(A) - 10, class: "tick" }, "α1 " + (a1 * 57.3).toFixed(0) + "°");
      S(g, "text", { x: X(B) + 30, y: Y(B) - 10, class: "tick" }, "α2 " + (a2 * 57.3).toFixed(0) + "°");
      const into = o.c[2] < 0;
      S(g, "circle", { cx: X(P), cy: Y(P), r: 11, fill: "#10151c", stroke: "#fff", "stroke-width": 2, class: "drag" });
      S(g, "text", { x: X(P), y: Y(P) + 4, class: "lab" }, into ? "⊗" : "⊙");
      S(g, "text", { x: 14, y: 22, class: "tick", "text-anchor": "start" }, "drag the point · ⊙ velocity out of the screen, ⊗ into it (direction of r1 × r2)");
      const vmag = Math.abs(o.COEF) * Math.sqrt(o.SQUARE), formula = (1 / (4 * Math.PI * d)) * (Math.cos(a1) - Math.cos(a2));
      const rows = {
        point: `point (x, y, z) = (${P[0].toFixed(3)}, ${P[1].toFixed(3)}, 0) · distance to the line d = ${d.toFixed(3)}`,
        cross: `|r1 × r2| = 2 × triangle area = |r0|·d = ${Math.sqrt(o.SQUARE).toFixed(4)}`,
        coef: `|u| = Γ/(4πd)·(cos α1 − cos α2) = ${formula.toFixed(5)} · from cross and dot products: ${vmag.toFixed(5)}`,
      };
      const order = ["point", "cross", "coef"];
      out.innerHTML = order.map((k) => `<div class="${k === p.hl ? "hot" : ""}">${rows[k]}</div>`).join("");
    }
    let drag = false;
    const toP = (e) => { const r = root.getBoundingClientRect(), k = W / r.width; return [((e.clientX - r.left) * k - ox) / sc, (oy - (e.clientY - r.top) * k) / sc, 0]; };
    root.addEventListener("pointerdown", (e) => { drag = true; root.setPointerCapture(e.pointerId); P = toP(e); draw(); });
    root.addEventListener("pointermove", (e) => { if (drag) { P = toP(e); draw(); } });
    root.addEventListener("pointerup", () => (drag = false));
    root.style.touchAction = "none"; root.style.cursor = "crosshair";
    draw();
    note(host, "One segment in its own plane, at an abstract scale (|r0| = 2, Γ = 1). Drag the point. The last line gives the speed two ways that must agree: the angle form Γ/(4πd)(cos α1 − cos α2), and the cross- and dot-product form the code uses, which needs no angles.");
  }

  function mvSum(host) {
    const box = el("div");
    controls(host, () => { box.innerHTML = ""; draw(); });
    host.appendChild(box);
    function draw() {
      const { out, tot } = sideCall(pIdx, side), ref = REF[pIdx].side[side];
      const cols = ["#ff8a5c", "#9be564", "#57e1ff"];
      const run = [[0, 0, 0]];
      out.forEach((o) => { const t = run[run.length - 1]; run.push(o.keep ? [t[0] + o.vel[0], t[1] + o.vel[1], t[2] + o.vel[2]] : t.slice()); });
      const t1 = el("div", "charttitle"); t1.textContent = "running sum: u, v, w as rings 1 … m are added"; box.appendChild(t1);
      const masked = out.map((o, j) => (o.keep ? null : [j + 1, ""])).filter(Boolean);
      const ch = G.lineChart(["u", "v", "w"].map((n, c) => ({ pts: run.map((r, j) => [j, r[c]]), c: cols[c], w: 2.4, label: `${n} → ${f(tot[c])}` })),
        { w: 560, h: 230, x0: 0, x1: out.length, xticks: [[0, "0"], [15, "15"], [30, "30"], [45, "45"], [60, "60"]], marks: masked.map((m) => [m[0], "", "#ff5d73"]), xlabel: "rings added (red line: removed by the cutoff)" });
      box.appendChild(ch.root);
      const rank = out.map((o, j) => [nrm(o.vel), j]).filter((r) => out[r[1]].keep).sort((a, b) => b[0] - a[0]).slice(0, 6);
      const t2 = el("div", "charttitle"); t2.textContent = "six largest contributions"; box.appendChild(t2);
      const tb = el("div");
      tb.innerHTML = `<table class="tbl"><thead><tr><th>ring</th><th>Γ</th><th>d = |r1×r2| / |r0|</th><th>U</th><th>V</th><th>W</th></tr></thead><tbody>${rank.map(([, j]) => {
        const o = out[j]; return `<tr><td>${j + 1}</td><td>${f(E.gam[j])}</td><td>${(Math.sqrt(o.SQUARE) / nrm(o.r0)).toFixed(4)}</td>${o.vel.map((v) => `<td>${f(v)}</td>`).join("")}</tr>`;
      }).join("")}</tbody></table>`;
      box.appendChild(tb);
      const r = el("div");
      r.innerHTML = `<table class="tbl"><thead><tr><th></th><th>u</th><th>v</th><th>w</th></tr></thead><tbody>
        <tr class="sum"><td>browser</td>${tot.map((v) => `<td>${f(v)}</td>`).join("")}</tr><tr><td>original code</td>${ref.map((v) => `<td>${f(v)}</td>`).join("")}</tr></tbody></table>`;
      box.appendChild(r);
    }
    draw();
    note(host, "How the sum builds up as each ring's edge is added: near rings make big jumps, far ones small corrections. Removed segments leave the curve flat (zero contribution). The right-hand value is the result.");
  }

  function mvVector(host) {
    const seg4 = el("div", "seg");
    ["edge 1→2", "2→3", "3→4", "4→1"].forEach((t, k) => { const b = el("button"); b.type = "button"; b.textContent = t; b.className = k === side ? "on" : ""; b.onclick = () => { side = k; [...seg4.children].forEach((c, j) => (c.className = j === side ? "on" : "")); box.innerHTML = ""; schematic(box); }; seg4.appendChild(b); });
    host.appendChild(seg4);
    const box = el("div"); host.appendChild(box); schematic(box);
    note(host, "The velocity of a ring is the sum over its four edges. For every wake corner the code therefore evaluates the same edge of all m rings at once (1→2, then 2→3, 3→4, 4→1) and adds the four results.");
  }

  window.MVJS = { seg };
  Object.assign(window.VIZ, { mvScene, mvTriangle, mvSum, mvVector });
})();
