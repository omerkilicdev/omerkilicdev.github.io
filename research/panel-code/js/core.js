// Small orthographic 3D renderer on canvas 2D (painter's algorithm), colour maps and SVG helpers.
(function () {
  "use strict";

  const LIGHT = norm([-0.35, -0.55, 0.76]);
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function avg(pts) {
    const s = [0, 0, 0];
    for (const p of pts) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }
    return [s[0] / pts.length, s[1] / pts.length, s[2] / pts.length];
  }

  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(hex, k, alpha) {
    const [r, g, b] = hexToRgb(hex);
    const f = (c) => Math.max(0, Math.min(255, Math.round(c * k)));
    return `rgba(${f(r)},${f(g)},${f(b)},${alpha == null ? 1 : alpha})`;
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
    return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  // diverging map for circulation: blue (−) · ivory (0) · red (+)
  function diverge(v, max) {
    const t = Math.max(-1, Math.min(1, v / (max || 1)));
    return t < 0 ? mix("#efe9dc", "#2f6fd6", -t) : mix("#efe9dc", "#d9452b", t);
  }
  // sequential map for age: young = bright cyan, old = deep violet
  function age(t) { return t < 0.5 ? mix("#57e1ff", "#7b8cff", t * 2) : mix("#7b8cff", "#6a3fb0", (t - 0.5) * 2); }

  function makeCam(opts) {
    return Object.assign({ yaw: -0.85, pitch: 0.42, zoom: 1, panX: 0, panY: 0 }, opts || {});
  }

  function project(p, cam, ctr, s, W, H) {
    const x = p[0] - ctr[0], y = p[1] - ctr[1], z = p[2] - ctr[2];
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const x1 = x * cy - y * sy, y1 = x * sy + y * cy;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const y2 = y1 * cp - z * sp, z2 = y1 * sp + z * cp;
    return [W / 2 + cam.panX + x1 * s, H / 2 + cam.panY - z2 * s, y2];
  }

  function bounds(prims) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const pr of prims) {
      if (pr.nofit) continue;
      const pts = pr.p.length && Array.isArray(pr.p[0]) ? pr.p : [pr.p];
      for (const q of pts) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], q[i]); hi[i] = Math.max(hi[i], q[i]); }
    }
    return { lo, hi };
  }

  // scene: {prims, fit?: {lo,hi}}. prim types: poly, line, pt, arrow, text
  function render(canvas, scene, cam) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const prims = scene.prims;
    const bb = scene.fit || bounds(prims);
    const ctr = [(bb.lo[0] + bb.hi[0]) / 2, (bb.lo[1] + bb.hi[1]) / 2, (bb.lo[2] + bb.hi[2]) / 2];
    const ext = Math.max(bb.hi[0] - bb.lo[0], bb.hi[1] - bb.lo[1], bb.hi[2] - bb.lo[2]) || 1;
    const s = (Math.min(W, H) / ext) * 0.86 * cam.zoom;
    const items = [];
    for (const pr of prims) {
      if (pr.t === "poly") {
        const P = pr.p.map((q) => project(q, cam, ctr, s, W, H));
        const n = norm(cross(sub(pr.p[1], pr.p[0]), sub(pr.p[pr.p.length - 1], pr.p[0])));
        const lit = 0.55 + 0.45 * Math.abs(n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
        items.push({ d: avg(P)[2] + (pr.bias || 0), pr, P, lit });
      } else if (pr.t === "line") {
        const P = pr.p.map((q) => project(q, cam, ctr, s, W, H));
        items.push({ d: avg(P)[2] + (pr.bias || 0), pr, P });
      } else if (pr.t === "arrow") {
        const a = project(pr.p, cam, ctr, s, W, H);
        const b = project([pr.p[0] + pr.v[0], pr.p[1] + pr.v[1], pr.p[2] + pr.v[2]], cam, ctr, s, W, H);
        items.push({ d: (a[2] + b[2]) / 2 - 0.001, pr, P: [a, b] });
      } else {
        const P = [project(pr.p, cam, ctr, s, W, H)];
        items.push({ d: P[0][2] - 0.002 + (pr.bias || 0), pr, P });
      }
    }
    items.sort((A, B) => B.d - A.d);
    for (const it of items) drawItem(g, it);
    return { s, ctr };
  }

  function drawItem(g, it) {
    const { pr, P } = it;
    g.setLineDash(pr.dash || []);
    if (pr.t === "poly") {
      g.beginPath();
      P.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
      g.closePath();
      if (pr.fill) { g.fillStyle = shade(pr.fill, it.lit, pr.a == null ? 0.92 : pr.a); g.fill(); }
      if (pr.stroke) { g.strokeStyle = pr.stroke; g.lineWidth = pr.lw || 1; g.stroke(); }
    } else if (pr.t === "line") {
      g.beginPath();
      P.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
      if (pr.close) g.closePath();
      g.strokeStyle = pr.c; g.globalAlpha = pr.a == null ? 1 : pr.a; g.lineWidth = pr.lw || 1.2;
      g.stroke(); g.globalAlpha = 1;
    } else if (pr.t === "arrow") {
      const [a, b] = P, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      g.strokeStyle = pr.c; g.fillStyle = pr.c; g.lineWidth = pr.lw || 1.6;
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      if (L > 4) {
        const ux = dx / L, uy = dy / L, hs = Math.min(7, L * 0.4);
        g.beginPath(); g.moveTo(b[0], b[1]);
        g.lineTo(b[0] - ux * hs - uy * hs * 0.5, b[1] - uy * hs + ux * hs * 0.5);
        g.lineTo(b[0] - ux * hs + uy * hs * 0.5, b[1] - uy * hs - ux * hs * 0.5);
        g.closePath(); g.fill();
      }
    } else if (pr.t === "pt") {
      g.beginPath(); g.arc(P[0][0], P[0][1], pr.r || 2.5, 0, 7);
      g.fillStyle = pr.c; g.fill();
      if (pr.ring) { g.strokeStyle = pr.ring; g.lineWidth = 1; g.stroke(); }
    } else if (pr.t === "text") {
      g.font = pr.font || "600 11px 'IBM Plex Sans', system-ui, sans-serif";
      g.fillStyle = pr.c || "#dfe6ef"; g.textAlign = pr.align || "center"; g.textBaseline = "middle";
      if (pr.halo) { g.strokeStyle = pr.halo; g.lineWidth = 3; g.strokeText(pr.s, P[0][0] + (pr.dx || 0), P[0][1] + (pr.dy || 0)); }
      g.fillText(pr.s, P[0][0] + (pr.dx || 0), P[0][1] + (pr.dy || 0));
    }
    g.setLineDash([]);
  }

  // Interactive 3D view: drag to orbit, shift-drag to pan, wheel to zoom, double click to reset.
  function view3d(canvas, getScene, camInit) {
    let cam = makeCam(camInit);
    const home = Object.assign({}, cam);
    let drag = null;
    const draw = () => render(canvas, getScene(), cam);
    canvas.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY, pan: e.shiftKey, cam: Object.assign({}, cam) };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      cam = drag.pan
        ? Object.assign({}, cam, { panX: drag.cam.panX + dx, panY: drag.cam.panY + dy })
        : Object.assign({}, cam, { yaw: drag.cam.yaw - dx * 0.008, pitch: Math.max(-1.5, Math.min(1.5, drag.cam.pitch + dy * 0.008)) });
      draw();
    });
    const end = () => { drag = null; };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      cam = Object.assign({}, cam, { zoom: Math.max(0.3, Math.min(8, cam.zoom * Math.exp(-e.deltaY * 0.0015))) });
      draw();
    }, { passive: false });
    canvas.addEventListener("dblclick", () => { cam = Object.assign({}, home); draw(); });
    draw();
    return { draw, cam: () => cam };
  }

  // SVG helpers
  const NS = "http://www.w3.org/2000/svg";
  function svg(w, h, cls) {
    const el = document.createElementNS(NS, "svg");
    el.setAttribute("viewBox", `0 0 ${w} ${h}`);
    el.setAttribute("class", cls || "dia");
    return el;
  }
  function S(parent, tag, attrs, text) {
    const el = document.createElementNS(NS, tag);
    if (tag === "text" && !(attrs && attrs["text-anchor"])) el.setAttribute("text-anchor", "middle");
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    if (text != null) el.textContent = text;
    parent.appendChild(el);
    return el;
  }
  function arrowDefs(root, id, color) {
    const defs = S(root, "defs");
    const m = S(defs, "marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
    S(m, "path", { d: "M0 0L10 5L0 10z", fill: color });
  }

  // simple line chart in SVG: series [{pts:[[x,y]], c, w, dash, label}]
  function lineChart(series, o) {
    const W = o.w || 520, H = o.h || 220, m = { l: 46, r: 14, t: series.some((se) => se.label) ? 30 : 14, b: 30 };
    const root = svg(W, H, "chart");
    let xs = [], ys = [];
    series.forEach((se) => se.pts.forEach((p) => { xs.push(p[0]); ys.push(p[1]); }));
    const x0 = o.x0 != null ? o.x0 : Math.min(...xs), x1 = o.x1 != null ? o.x1 : Math.max(...xs);
    let y0 = Math.min(...ys, o.y0 != null ? o.y0 : Infinity), y1 = Math.max(...ys, o.y1 != null ? o.y1 : -Infinity);
    if (y0 === y1) { y0 -= 1; y1 += 1; }
    const pad = (y1 - y0) * 0.08; y0 -= pad; y1 += pad;
    const X = (v) => m.l + ((v - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
    const Y = (v) => H - m.b - ((v - y0) / (y1 - y0)) * (H - m.t - m.b);
    for (let i = 0; i <= 4; i++) {
      const v = y0 + ((y1 - y0) * i) / 4;
      S(root, "line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: "grid" });
      S(root, "text", { x: m.l - 6, y: Y(v) + 4, class: "tick", "text-anchor": "end" }, fmt(v));
    }
    if (y0 < 0 && y1 > 0) S(root, "line", { x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0), class: "zero" });
    (o.xticks || []).forEach((t) => {
      S(root, "line", { x1: X(t[0]), x2: X(t[0]), y1: m.t, y2: H - m.b, class: "grid" });
      S(root, "text", { x: X(t[0]), y: H - m.b + 16, class: "tick", "text-anchor": "middle" }, t[1]);
    });
    (o.bands || []).forEach((bd) => S(root, "rect", { x: X(bd[0]), y: m.t, width: X(bd[1]) - X(bd[0]), height: H - m.t - m.b, fill: bd[2], opacity: 0.16 }));
    series.forEach((se) => {
      const d = se.pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join("");
      S(root, "path", { d, fill: "none", stroke: se.c, "stroke-width": se.w || 2, "stroke-dasharray": se.dash || "", opacity: se.a == null ? 1 : se.a });
      if (se.dots) se.pts.forEach((p) => S(root, "circle", { cx: X(p[0]), cy: Y(p[1]), r: 2.6, fill: se.c }));
    });
    (o.marks || []).forEach((mk) => {
      S(root, "line", { x1: X(mk[0]), x2: X(mk[0]), y1: m.t, y2: H - m.b, stroke: mk[2] || "#ffd166", "stroke-width": 1.5, "stroke-dasharray": "4 3" });
      if (mk[1]) S(root, "text", { x: X(mk[0]) + 4, y: m.t + 10, class: "mark" }, mk[1]);
    });
    if (o.xlabel) S(root, "text", { x: W - m.r, y: H - 4, class: "axl", "text-anchor": "end" }, o.xlabel);
    let lx = m.l + 8;
    series.filter((se) => se.label).forEach((se) => {
      S(root, "rect", { x: lx, y: 12, width: 12, height: 3, fill: se.c });
      S(root, "text", { x: lx + 16, y: 17, class: "leg", "text-anchor": "start" }, se.label);
      lx += 22 + se.label.length * 6.4;
    });
    return { root, X, Y };
  }
  function fmt(v) {
    const a = Math.abs(v);
    if (a === 0) return "0";
    if (a >= 100 || a < 0.01) return v.toExponential(1);
    return v.toFixed(a >= 10 ? 1 : a >= 1 ? 2 : 3);
  }

  window.G = { render, view3d, svg, S, arrowDefs, lineChart, diverge, age, mix, shade, fmt, avg, makeCam };
})();
