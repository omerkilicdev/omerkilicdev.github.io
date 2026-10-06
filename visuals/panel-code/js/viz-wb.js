// Construction of the border strip of a wing, drawn from the run's mesh data (window.WBD[0] front, [1] rear). Units: cm.
(function () {
  "use strict";
  const { S, svg } = G, el = V3.el, note = window.VB_A.note;
  const SC = ["#ff6b6b", "#f0a43a", "#ffd166", "#57e1ff", "#b38cff"];
  const SN = ["root → front bevel", "leading edge", "tip", "trailing edge", "rear bevel → root"];
  const RED = "#e5484d", BLUE = "#4c7fd9";
  let side = 0;
  const D = () => window.WBD[side];
  const deg = (r) => (r * 180 / Math.PI).toFixed(0) + "°";
  const f3 = (v) => (Math.abs(v) < 5e-6 ? 0 : v).toFixed(3);

  // frame: wing-fixed x (chord) horizontal, y (span) up
  function frame(W, H, o) {
    o = o || {};
    const d = window.WBD[0];
    const s = (o.scale || 1) * Math.min((W * (o.fw || 0.55)) / 2.3, (H - 50) / (d.l + 0.3));
    const cx = o.cx != null ? o.cx : W * 0.32, by = H - 26;
    return { s, X: (p) => cx + p[0] * s, Y: (p) => by - p[1] * s };
  }
  function poly(root, F, pts, attrs) {
    return S(root, "polygon", Object.assign({ points: pts.map((p) => F.X(p).toFixed(1) + "," + F.Y(p).toFixed(1)).join(" ") }, attrs));
  }
  function toggle(host, redraw) {
    const t = el("div", "seg");
    ["front wing · 2 cm sides", "rear wing · 1 cm sides"].forEach((lab, k) => {
      const b = el("button"); b.type = "button"; b.textContent = lab; b.className = k === side ? "on" : "";
      b.addEventListener("click", () => { side = k; [...t.children].forEach((c, j) => (c.className = j === side ? "on" : "")); redraw(); });
      t.appendChild(b);
    });
    host.appendChild(t);
  }
  function panel(host, draw) {
    const box = el("div"); toggle(host, () => { box.innerHTML = ""; draw(box); }); host.appendChild(box); draw(box);
  }

  function outline(root, F, d, o) {
    o = o || {};
    poly(root, F, d.xo, { fill: o.fill || "none", stroke: o.stroke || "#8592a6", "stroke-width": o.w || 1.4, "stroke-dasharray": o.dash || "" });
  }
  function strips(root, F, d, o) {
    o = o || {};
    d.Xb.forEach((e, i) => {
      const I = stripOf(d, i);
      const on = o.only == null || o.only === I;
      poly(root, F, e.slice(0, 4), { fill: o.mono || SC[I], opacity: on ? 0.9 : 0.15, stroke: "#0d1117", "stroke-width": 1 });
      if (o.nums && on) S(root, "text", { x: F.X(e[4]), y: F.Y(e[4]) + 3.5, class: "pnum" }, String(i + 1));
    });
  }
  function stripOf(d, i) { let a = 0; for (let I = 0; I < 5; I++) { a += d.n[I]; if (i < a) return I; } return 4; }

  // ---------- visuals ----------
  function wbPentagon(host, p) {
    panel(host, (box) => {
      const d = D(), W = 560, H = 430, F = frame(W, H, p.hl === "vertices" ? { cx: W / 2 } : {}), root = svg(W, H); box.appendChild(root);
      G.arrowDefs(root, "wp", "#c9d3df");
      strips(root, F, d, { only: p.hl === "strips" || p.hl === "all" || !p.hl ? null : -1, nums: p.hl === "strips" });
      outline(root, F, d, { stroke: "#dbe3ee", w: 1.6 });
      const v = d.xo;
      if (p.hl === "vertices") {
        const fx = ["(0, 0)", "(−lt·sinδ, lt·cosδ)", "(−lt·sinδ, lt·cosδ + lr)", "(lt·sinδ, lt·cosδ + lr)", "(lt·sinδ, lt·cosδ)"];
        v.forEach((q, I) => {
          S(root, "circle", { cx: F.X(q), cy: F.Y(q), r: 5, fill: SC[I], stroke: "#0d1117" });
          const right = q[0] >= 0.01 || I === 0, ax = F.X(q) + (right ? 12 : -12), an = right ? "start" : "end", dy = I === 0 ? -30 : -14;
          S(root, "text", { x: ax, y: F.Y(q) + dy, class: "lab", "text-anchor": an, fill: SC[I] }, `corner ${I + 1}`);
          S(root, "text", { x: ax, y: F.Y(q) + dy + 15, class: "tick", "text-anchor": an }, fx[I]);
          S(root, "text", { x: ax, y: F.Y(q) + dy + 29, class: "dimt", "text-anchor": an }, `= (${f3(q[0])}, ${f3(q[1])})`);
        });
      }
      if (p.hl === "lt" || p.hl === "lr" || p.hl === "c") {
        const seg = p.hl === "lt" ? [v[0], v[1]] : p.hl === "lr" ? [v[1], v[2]] : [v[2], v[3]];
        S(root, "line", { x1: F.X(seg[0]), y1: F.Y(seg[0]), x2: F.X(seg[1]), y2: F.Y(seg[1]), stroke: "#ffd166", "stroke-width": 4 });
        const m = [(seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2];
        const val = p.hl === "lt" ? d.lt : p.hl === "lr" ? d.lr : d.c;
        S(root, "text", { x: F.X(m) - 14, y: F.Y(m) + (p.hl === "c" ? -12 : 0), class: "eq", "text-anchor": "end" }, `${p.hl} = ${f3(val)} cm`);
      }
      if (p.hl === "h") {
        const e = d.Xb[5];
        S(root, "line", { x1: F.X(e[0]), y1: F.Y(e[0]), x2: F.X(e[3]), y2: F.Y(e[3]), stroke: "#ffd166", "stroke-width": 3 });
        S(root, "text", { x: F.X(e[0]) + 40, y: F.Y(e[0]) - 30, class: "eq", "text-anchor": "start" }, `h = 0.1 · c = ${f3(d.h)} cm`);
      }
      if (p.hl !== "vertices") axes(root, F, W, H);
    });
    note(host, "Wing-fixed frame, cm. x along the chord (horizontal), y along the span (up, root at the bottom). Colours: the five strips " + SN.map((s, I) => `<b style="color:${SC[I]}">${I + 1} ${s}</b>`).join(" · ") + ".");
  }
  function axes(root, F, W, H) {
    S(root, "line", { x1: F.X([0, 0]), y1: F.Y([0, 0]), x2: F.X([0, 0]) + 40, y2: F.Y([0, 0]), stroke: "#8592a6", "marker-end": "url(#wp)" });
    S(root, "text", { x: F.X([0, 0]) + 46, y: F.Y([0, 0]) + 4, class: "tick", "text-anchor": "start" }, "x");
    S(root, "text", { x: F.X([0, 0]) - 8, y: F.Y([0, 0]) + 16, class: "tick" }, "(0,0) root");
  }

  function wbFrames(host) {
    panel(host, (box) => {
      const d = D(), W = 560, H = 430, F = frame(W, H), root = svg(W, H); box.appendChild(root);
      outline(root, F, d, { stroke: "#4a5566" });
      d.xo.forEach((q, I) => {
        const a = d.ang[I], L = 46;
        const ex = [Math.cos(a), Math.sin(a)], ey = [-Math.sin(a), Math.cos(a)];
        const o = [F.X(q), F.Y(q)];
        G.arrowDefs(root, "fx" + I, SC[I]);
        S(root, "line", { x1: o[0], y1: o[1], x2: o[0] + ey[0] * L * 1.5, y2: o[1] - ey[1] * L * 1.5, stroke: SC[I], "stroke-width": 3, "marker-end": `url(#fx${I})` });
        S(root, "line", { x1: o[0], y1: o[1], x2: o[0] + ex[0] * L * 0.7, y2: o[1] - ex[1] * L * 0.7, stroke: SC[I], "stroke-width": 1.6, "stroke-dasharray": "3 2", "marker-end": `url(#fx${I})` });
        S(root, "circle", { cx: o[0], cy: o[1], r: 4, fill: SC[I] });
        const right = q[0] > 0.01;
        S(root, "text", { x: o[0] + (right ? 14 : -14), y: o[1] + (I === 0 ? 18 : 4), class: "lab", "text-anchor": right || I === 0 ? "start" : "end", fill: SC[I] }, `${deg(a)}`);
      });
      S(root, "text", { x: W - 12, y: 30, class: "tick", "text-anchor": "end" }, "solid arrow: local y (along the strip)");
      S(root, "text", { x: W - 12, y: 48, class: "tick", "text-anchor": "end" }, "dashed arrow: local x (into the wing, width h)");
    });
    note(host, "The strips start at the root and run clockwise: first the left bevelled edge, then the leading edge, the tip, the trailing edge and the right bevelled edge. At every corner the local y axis turns to the direction of the next edge.");
  }

  function wbStrip(host) {
    panel(host, (box) => {
      const d = D(), W = 560, H = 300, root = svg(W, H); box.appendChild(root);
      const Ls = d.n.map((n, I) => d.wi[I] + n * d.w[I] + d.wf[I]);
      const mx = Math.max(...Ls), x0 = 120, sc = 410 / mx;
      d.n.forEach((n, I) => {
        const y = 22 + I * 44;
        S(root, "text", { x: 10, y: y + 16, class: "lab", "text-anchor": "start", fill: SC[I] }, `${I + 1} ${SN[I]}`);
        let x = x0;
        const seg = (len, fill, lab) => { S(root, "rect", { x, y, width: len * sc, height: 22, fill, stroke: "#0d1117" }); if (len * sc > 26) S(root, "text", { x: x + (len * sc) / 2, y: y + 15, class: "tiny" }, lab); x += len * sc; };
        seg(d.wi[I], "#3a4352", "wi " + d.wi[I].toFixed(3));
        for (let k = 0; k < n; k++) seg(d.w[I], SC[I], "w " + d.w[I].toFixed(3));
        seg(d.wf[I], "#3a4352", "wf " + d.wf[I].toFixed(3));
        S(root, "text", { x: x + 6, y: y + 15, class: "tick", "text-anchor": "start" }, `n = ${n}`);
      });
      S(root, "text", { x: 10, y: 250, class: "eq", "text-anchor": "start" }, `3h = ${f3(3 * d.h)} · n = floor(L / 3h) · w = 3h + remainder / n`);
      S(root, "text", { x: 10, y: 274, class: "tick", "text-anchor": "start" }, `L: strips 1 and 5 = ${f3(d.Lt)}, strips 2 and 4 = ${f3(d.Lr)}, strip 3 = ${f3(d.C)} · corner pieces h·cot δ, h·cot α, h`);
    });
    note(host, "Grey: corner pieces, the extra length a bevelled corner adds. Coloured: the elements in between, kept close to 3h wide and adjusted so they divide the strip exactly.");
  }

  function wbPlace(host) {
    let I = 0, box = null;
    const draw = () => {
      box.innerHTML = "";
      const d = D(), W = 560, H = 420, F = frame(W, H), root = svg(W, H); box.appendChild(root);
      outline(root, F, d, { stroke: "#4a5566", dash: "4 3" });
      const s = d.strips[I];
      s.local.forEach((e, k) => poly(root, F, e.slice(0, 4), { fill: "none", stroke: SC[I], "stroke-dasharray": "3 3", opacity: 0.8 }));
      d.Xb.forEach((e, i) => { const J = stripOf(d, i); if (J < I) poly(root, F, e.slice(0, 4), { fill: SC[J], opacity: 0.55, stroke: "#0d1117" }); });
      s.global.forEach((e, k) => poly(root, F, e.slice(0, 4), { fill: k === 0 || k === s.global.length - 1 ? "#3a4352" : SC[I], opacity: 0.95, stroke: "#0d1117" }));
      const q = d.xo[I];
      S(root, "circle", { cx: F.X(q), cy: F.Y(q), r: 5, fill: "#fff" });
      S(root, "text", { x: W - 12, y: 30, class: "lab", "text-anchor": "end", fill: SC[I] }, `strip ${I + 1} · ${SN[I]}`);
      S(root, "text", { x: W - 12, y: 50, class: "tick", "text-anchor": "end" }, `rotated ${deg(d.ang[I])} · placed at (${f3(q[0])}, ${f3(q[1])})`);
      S(root, "text", { x: W - 12, y: 68, class: "tick", "text-anchor": "end" }, "dashed: the same pieces in their local frame (at the origin)");
      film.querySelectorAll(".frame").forEach((f, j) => f.classList.toggle("on", j === I));
      lab.textContent = `strip ${I + 1} / 5`;
    };
    toggle(host, () => draw());
    box = el("div"); host.appendChild(box);
    const bar = el("div", "stepbar"), rng = el("input"); rng.type = "range"; rng.min = 0; rng.max = 4; rng.value = 0;
    const lab = el("span", "steplab"); bar.append(rng, lab); host.appendChild(bar);
    const film = el("div", "film"); film.style.gridTemplateColumns = "repeat(5, 1fr)";
    for (let k = 0; k < 5; k++) {
      const f = el("button", "frame"); f.type = "button";
      const mini = svg(120, 150); const d = window.WBD[0], F = frame(120, 150, { cx: 60, fw: 0.9 });
      d.Xb.forEach((e, i) => { const J = stripOf(d, i); if (J <= k) poly(mini, F, e.slice(0, 4), { fill: SC[J], opacity: J === k ? 1 : 0.5 }); });
      outline(mini, F, d, { stroke: "#4a5566", w: 0.8 });
      const t = el("span"); t.textContent = "strip " + (k + 1);
      f.append(mini, t); f.addEventListener("click", () => { I = k; rng.value = k; draw(); });
      film.appendChild(f);
    }
    host.appendChild(film);
    rng.addEventListener("input", () => { I = +rng.value; draw(); });
    draw();
    note(host, "One strip per pass: its pieces are built in a local frame (dashed, at the origin), rotated to the edge direction and moved to their corner. The grey ends are corner pieces; the next view shows how they are folded into their neighbours.");
  }

  function wbMerge(host, p) {
    let I = 0, box = null;
    const draw = () => {
      box.innerHTML = "";
      const d = D(), s = d.strips[I], W = 560, H = 360, root = svg(W, H); box.appendChild(root);
      const g = s.global, first = p.part !== "last";
      const pieces = first ? [g[0], g[1]] : [g[g.length - 2], g[g.length - 1]];
      const slot = first ? s.inf - d.n[I] : s.inf - 1;
      const res = d.Xb[slot];
      const pts = pieces.flat().concat(res.slice(0, 4));
      const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const sc = Math.min(230 / (x1 - x0 || 1), 280 / (y1 - y0 || 1));
      const mk = (ox) => ({ X: (q) => ox + 20 + (q[0] - x0) * sc, Y: (q) => H - 40 - (q[1] - y0) * sc });
      const A = mk(10), B = mk(290);
      pieces.forEach((e, k) => {
        const corner = first ? k === 0 : k === 1;
        poly(root, A, e.slice(0, 4), { fill: corner ? "#3a4352" : SC[I], opacity: 0.9, stroke: "#dbe3ee", "stroke-width": 1 });
        e.slice(0, 4).forEach((q, j) => S(root, "text", { x: A.X(q), y: A.Y(q) - 4, class: "tiny" }, String(j + 1)));
      });
      poly(root, B, res.slice(0, 4), { fill: SC[I], opacity: 0.95, stroke: "#dbe3ee", "stroke-width": 1.4 });
      res.slice(0, 4).forEach((q, j) => { S(root, "circle", { cx: B.X(q), cy: B.Y(q), r: 3.5, fill: "#fff" }); S(root, "text", { x: B.X(q) + 8, y: B.Y(q) - 6, class: "lab" }, String(j + 1)); });
      S(root, "text", { x: 140, y: 22, class: "lab" }, first ? "before: corner piece (grey) + first element" : "before: last element + corner piece (grey)");
      S(root, "text", { x: 420, y: 22, class: "lab" }, `after: border element ${slot + 1}`);
      S(root, "text", { x: 280, y: H - 10, class: "tick" }, first
        ? "node 1 is taken from the corner piece, nodes 2–4 from the element"
        : "the element is copied, then node 2 is taken from the corner piece");
      tabs.querySelectorAll("button").forEach((b, j) => (b.className = j === I ? "on" : ""));
    };
    toggle(host, () => draw());
    const tabs = el("div", "seg small");
    for (let k = 0; k < 5; k++) { const b = el("button"); b.type = "button"; b.textContent = "strip " + (k + 1); b.addEventListener("click", () => { I = k; draw(); }); tabs.appendChild(b); }
    host.appendChild(tabs);
    box = el("div"); host.appendChild(box);
    draw();
    note(host, "A corner piece is not kept as its own element: one of its nodes is given to the neighbouring element. The element becomes a bevelled quadrilateral and two strips meet at the corner with no gap and no overlap. On strip 1 the bevel is clear at the 30° root corner.");
  }

  function wbFinal(host, p) {
    panel(host, (box) => {
      const d = D(), W = 560, H = 430, F = frame(W, H), root = svg(W, H); box.appendChild(root);
      d.Xc.forEach((e, i) => { poly(root, F, e.slice(0, 4), { fill: BLUE, opacity: p.hl === "border" ? 0.25 : 0.8, stroke: "#0d1117" }); });
      d.Xb.forEach((e, i) => {
        poly(root, F, e.slice(0, 4), { fill: RED, opacity: 0.92, stroke: "#0d1117" });
        S(root, "text", { x: F.X(e[4]), y: F.Y(e[4]) + 3.5, class: "pnum" }, String(i + 1));
        if (p.nodes) e.slice(0, 4).forEach((q) => S(root, "circle", { cx: F.X(q), cy: F.Y(q), r: 2.2, fill: "#fff" }));
      });
      const x = W * 0.62;
      S(root, "text", { x, y: 60, class: "eq", "text-anchor": "start" }, `${d.nXb} border elements (red)`);
      S(root, "text", { x, y: 86, class: "eq", "text-anchor": "start" }, `${d.nXc} centre elements (blue)`);
      S(root, "text", { x, y: 120, class: "tick", "text-anchor": "start" }, `chord ${f3(d.c)} cm · span ${f3(d.l)} cm · h ${f3(d.h)} cm`);
    });
    note(host, "The meshes actually used in the run, front and rear wing. The 10 red border elements wrap the whole outline: 3–4 leading edge, 5–6 tip, 7–8 trailing edge, 1–2 and 9–10 the bevelled edges either side of the root. The code sheds all of them into the flow at every step.");
  }

  function wbNormal(host) {
    panel(host, (box) => {
      const d = D(), e = d.Xb[0], W = 560, H = 300, root = svg(W, H); box.appendChild(root);
      const xs = e.slice(0, 4).map((q) => q[0]), ys = e.slice(0, 4).map((q) => q[1]);
      const sc = 200 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const F = { X: (q) => 150 + (q[0] - Math.min(...xs)) * sc, Y: (q) => 260 - (q[1] - Math.min(...ys)) * sc };
      G.arrowDefs(root, "n1", "#57e1ff"); G.arrowDefs(root, "n2", "#ffd166");
      poly(root, F, e.slice(0, 4), { fill: RED, opacity: 0.85, stroke: "#dbe3ee" });
      e.slice(0, 4).forEach((q, j) => S(root, "text", { x: F.X(q) + (j === 1 || j === 0 ? -12 : 12), y: F.Y(q) + 4, class: "lab" }, String(j + 1)));
      S(root, "line", { x1: F.X(e[0]), y1: F.Y(e[0]), x2: F.X(e[2]), y2: F.Y(e[2]), stroke: "#57e1ff", "stroke-width": 2.4, "marker-end": "url(#n1)" });
      S(root, "line", { x1: F.X(e[3]), y1: F.Y(e[3]), x2: F.X(e[1]), y2: F.Y(e[1]), stroke: "#ffd166", "stroke-width": 2.4, "marker-end": "url(#n2)" });
      const a = [e[2][0] - e[0][0], e[2][1] - e[0][1]], b = [e[1][0] - e[3][0], e[1][1] - e[3][1]], z = a[0] * b[1] - a[1] * b[0];
      const x = 380;
      S(root, "text", { x, y: 60, class: "eq", "text-anchor": "start", fill: "#57e1ff" }, `3 − 1 = (${f3(a[0])}, ${f3(a[1])}, 0)`);
      S(root, "text", { x, y: 86, class: "eq", "text-anchor": "start", fill: "#ffd166" }, `2 − 4 = (${f3(b[0])}, ${f3(b[1])}, 0)`);
      S(root, "text", { x, y: 120, class: "eq", "text-anchor": "start" }, `× → (0, 0, ${f3(z)})`);
      S(root, "text", { x, y: 146, class: "eq", "text-anchor": "start" }, `n = (${d.Nb[0].map(f3).join(", ")})`);
      S(root, "text", { x, y: 190, class: "tick", "text-anchor": "start" }, "nodes clockwise: 1 → 2 → 3 → 4");
      S(root, "text", { x, y: 208, class: "tick", "text-anchor": "start" }, "the product points to +z: the normal is up");
    });
    note(host, "Element 1, the bevelled element at the root corner. The unit normal is the cross product of the two diagonals, (node 3 − node 1) × (node 2 − node 4), scaled to length 1. All 10 elements give (0, 0, 1).");
  }

  function wbCentroid(host) {
    panel(host, (box) => {
      const d = D(), W = 560, H = 430, F = frame(W, H), root = svg(W, H); box.appendChild(root);
      d.Xb.forEach((e) => {
        poly(root, F, e.slice(0, 4), { fill: RED, opacity: 0.55, stroke: "#0d1117" });
        S(root, "circle", { cx: F.X(e[4]), cy: F.Y(e[4]), r: 3.2, fill: "#fff", stroke: "#0d1117" });
      });
      outline(root, F, d, { stroke: "#4a5566" });
      S(root, "text", { x: W * 0.62, y: 60, class: "eq", "text-anchor": "start" }, "x_c = ¼ (x₁ + x₂ + x₃ + x₄)");
      S(root, "text", { x: W * 0.62, y: 84, class: "tick", "text-anchor": "start" }, "the four corners");
    });
    note(host, "White dots: the fifth node of each element, the mean of its four corners. These are the collocation points where the no-penetration condition is imposed.");
  }

  Object.assign(window.VIZ, { wbPentagon, wbFrames, wbStrip, wbPlace, wbMerge, wbFinal, wbNormal, wbCentroid });
})();
