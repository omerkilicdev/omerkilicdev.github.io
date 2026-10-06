// Wake-to-wake velocity. Data: the run (TD.steps), target = front-right wake, sources = the four wakes;
// the browser repeats the same loops and is compared with the original code's output (VWD).
(function () {
  "use strict";
  const { S, svg } = G, el = V3.el, note = window.VB_A.note, TD = window.TD, seg = () => window.MVJS.seg;
  const WC = ["#f0a43a", "#ff6b6b", "#57e1ff", "#b38cff"], WN = ["front-right", "front-left", "rear-right", "rear-left"];
  const STEPS = [5, 11];
  let stepI = 0, ring = 0, corner = 0;
  const cache = {};
  const f = (v) => (Math.abs(v) < 1e-4 && v !== 0 ? v.toExponential(2) : v.toFixed(5));

  // same loop order as the original: per source, per target ring, per corner, 4 sides; returns per-source parts
  function compute(k) {
    if (cache[k]) return cache[k];
    const st = TD.steps[k], tgt = st.w[0].wake, part = [0, 1, 2, 3].map(() => tgt.map(() => [0, 1, 2, 3].map(() => [0, 0, 0])));
    const sideRes = [];
    st.w.forEach((W, s) => {
      tgt.forEach((q, i) => q.forEach((P, n) => {
        let vel = [0, 0, 0];
        for (let kk = 0; kk < 4; kk++) {
          let t = [0, 0, 0];
          W.wake.forEach((r, j) => { const o = seg()(P, r[kk], r[(kk + 1) % 4], W.wgam[j]); if (o.keep) t = [t[0] + o.vel[0], t[1] + o.vel[1], t[2] + o.vel[2]]; });
          vel = [vel[0] + t[0], vel[1] + t[1], vel[2] + t[2]];
          if (!sideRes[s]) sideRes[s] = {};
          (sideRes[s][i + "," + n] = sideRes[s][i + "," + n] || [])[kk] = t;
        }
        part[s][i][n] = vel;
      }));
    });
    const total = tgt.map((q, i) => q.map((_, n) => [0, 1, 2].map((c) => part[0][i][n][c] + part[1][i][n][c] + part[2][i][n][c] + part[3][i][n][c])));
    return (cache[k] = { part, total, sideRes, st });
  }
  function stepToggle(host, redraw) {
    const t = el("div", "seg");
    STEPS.forEach((k, j) => { const b = el("button"); b.type = "button"; b.textContent = `end of step ${k + 1} · ${TD.steps[k].nxw} rings per wing`; b.className = j === stepI ? "on" : ""; b.onclick = () => { stepI = j; [...t.children].forEach((c, q) => (c.className = q === stepI ? "on" : "")); redraw(); }; t.appendChild(b); });
    host.appendChild(t);
  }
  function maxRel(k) {
    const { total } = compute(k), R = window.VWD[String(k)].vel;
    let num = 0, den = 0;
    total.forEach((q, i) => q.forEach((v, n) => v.forEach((x, c) => { num = Math.max(num, Math.abs(x - R[i][n][c])); den = Math.max(den, Math.abs(R[i][n][c])); })));
    return num / den;
  }

  function vwScene(host, p) {
    const src = p && p.src != null ? p.src : null;
    stepToggle(host, () => { view.draw(); info(); });
    const cv = el("canvas", "cv3d"); cv.style.height = "360px"; host.appendChild(cv);
    const lg = el("div", "legend"); host.appendChild(lg);
    lg.innerHTML = WN.map((n, s) => `<span><i style="background:${WC[s]};opacity:${src == null || src === s ? 1 : 0.3}"></i>source ${s + 1}: ${n} wake</span>`).join("") + `<span><i style="background:#fff"></i>target: corners of the front-right wake</span><span><i style="background:#ffd166"></i>${src == null ? "wake-to-wake velocity (sum of the four sources)" : "this source's contribution"}</span>`;
    const view = G.view3d(cv, () => {
      const k = STEPS[stepI], { part, total, st } = compute(k), prims = [];
      st.w.forEach((W, s) => W.wake.forEach((q) => prims.push({ t: "line", p: q, close: true, c: WC[s], lw: s === src ? 1.4 : 0.8, a: src == null ? 0.5 : s === src ? 0.85 : 0.12 })));
      const vec = (i, n) => (src == null ? total[i][n] : part[src][i][n]);
      let mx = 1e-9; st.w[0].wake.forEach((q, i) => q.forEach((_, n) => (mx = Math.max(mx, Math.hypot(...vec(i, n))))));
      const sc = 0.06 / mx;
      st.w[0].wake.forEach((q, i) => {
        prims.push({ t: "line", p: q, close: true, c: "#ffffff", lw: 0.7, a: 0.35 });
        const v = vec(i, 0);
        prims.push({ t: "arrow", p: q[0], v: [v[0] * sc, v[1] * sc, v[2] * sc], c: "#ffd166", lw: 1.6 });
      });
      return { prims };
    }, { yaw: -0.95, pitch: 0.38, zoom: 1.35 });
    const tb = el("div"); host.appendChild(tb);
    function info() {
      const k = STEPS[stepI], R = window.VWD[String(k)];
      tb.innerHTML = `<table class="tbl"><tbody>
        <tr><td>target rings (front-right wake)</td><td>${R.n} rings × 4 corners = ${R.n * 4} points</td></tr>
        <tr><td>source rings (four wakes)</td><td>${4 * R.n}</td></tr>
        <tr><td>browser vs original code (largest relative difference)</td><td>${maxRel(k).toExponential(1)}</td></tr></tbody></table>`;
    }
    info();
    note(host, src == null
      ? "The four source wakes in colour, the target wake (front-right) in white. Yellow arrows: the wake-induced velocity at corner 1 of each target ring, scaled to the largest. The values are recomputed in the browser with the same loops and checked against the original code's output."
      : `Only source ${src + 1} (the ${WN[src]} wake): yellow arrows are the velocity this wake induces at the target corners. Adding the four sources gives the total.`);
  }

  function vwLoops(host) {
    const W = 560, H = 330, root = svg(W, H); host.appendChild(root);
    const box = (x, y, w, h, t, sub, col) => {
      S(root, "rect", { x, y, width: w, height: h, rx: 10, fill: "#161d27", stroke: col, "stroke-width": 1.5 });
      S(root, "text", { x: x + 12, y: y + 20, class: "lab", "text-anchor": "start", fill: col }, t);
      if (sub) S(root, "text", { x: x + w - 12, y: y + 20, class: "tick", "text-anchor": "end" }, sub);
    };
    box(10, 10, 540, 250, "source wake s = 1…4", "front-right, front-left, rear-right, rear-left", "#f0a43a");
    box(30, 44, 500, 206, "target ring i = 1…m", "", "#c9d3df");
    box(50, 78, 460, 162, "corner n = 1…4", "", "#9be564");
    box(70, 112, 420, 118, "edge k = 1…4  (1→2, 2→3, 3→4, 4→1)", "", "#57e1ff");
    S(root, "rect", { x: 90, y: 146, width: 380, height: 66, rx: 8, fill: "#233046", stroke: "#57e1ff" });
    S(root, "text", { x: 280, y: 172, class: "lab" }, "edge k of all m rings → (u, v, w)");
    S(root, "text", { x: 280, y: 194, class: "tick" }, "no inner loop: the m segments are one array operation");
    const rows = STEPS.map((k) => {
      const n = TD.steps[k].nxw, calls = 4 * n * 4 * 4, segs = calls * n;
      return `<tr><td>end of step ${k + 1}</td><td>${n}</td><td>${calls.toLocaleString("en-US")}</td><td>${segs.toLocaleString("en-US")}</td><td>${(4 * segs).toLocaleString("en-US")}</td></tr>`;
    }).join("");
    const t = el("div");
    t.innerHTML = `<table class="tbl"><thead><tr><th></th><th>m rings</th><th>edge evaluations</th><th>segment evaluations</th><th>per step (4 target wakes)</th></tr></thead><tbody>${rows}</tbody></table>`;
    host.appendChild(t);
    note(host, "The blue box is one edge evaluation. Around it are four loops: 4 sources × m target rings × 4 corners × 4 edges = 64·m evaluations, each over m segments, repeated for the four target wakes every step. The work grows with the square of the ring count (step 6 → 12: twice the rings, four times the work).");
  }

  function vwCorner(host) {
    stepToggle(host, () => draw());
    const ctl = el("div", "stepbar");
    const ri = el("input"); ri.type = "range"; ri.min = 0; ri.value = ring;
    const lab = el("span", "steplab");
    const cs = el("div", "seg small");
    [0, 1, 2, 3].forEach((n) => { const b = el("button"); b.type = "button"; b.textContent = "corner " + (n + 1); b.className = n === corner ? "on" : ""; b.onclick = () => { corner = n; [...cs.children].forEach((c, q) => (c.className = q === corner ? "on" : "")); draw(); }; cs.appendChild(b); });
    ctl.append(ri, lab); host.append(ctl, cs);
    const box = el("div"); host.appendChild(box);
    ri.addEventListener("input", () => { ring = +ri.value; draw(); });
    function draw() {
      const k = STEPS[stepI], { part, total, sideRes } = compute(k), n = TD.steps[k].nxw;
      ri.max = n - 1; if (ring > n - 1) ring = n - 1; ri.value = ring;
      lab.textContent = `target ring ${ring + 1} / ${n}`;
      const key = ring + "," + corner, R = window.VWD[String(k)].vel[ring][corner];
      const mag = (v) => Math.hypot(v[0], v[1], v[2]);
      let mx = 1e-12; for (let s = 0; s < 4; s++) for (let kk = 0; kk < 4; kk++) mx = Math.max(mx, mag(sideRes[s][key][kk]));
      let html = `<div class="charttitle">velocity at corner ${corner + 1} of ring ${ring + 1} = sum of 16 edge evaluations · cell: |u, v, w|</div><table class="tbl heat"><thead><tr><th>source wake</th><th>edge 1→2</th><th>2→3</th><th>3→4</th><th>4→1</th><th>this source (u, v, w)</th></tr></thead><tbody>`;
      for (let s = 0; s < 4; s++) {
        html += `<tr><td style="color:${WC[s]}">${s + 1} · ${WN[s]}</td>`;
        for (let kk = 0; kk < 4; kk++) { const m = mag(sideRes[s][key][kk]); html += `<td style="background:rgba(87,225,255,${(0.08 + 0.5 * m / mx).toFixed(2)})">${f(m)}</td>`; }
        html += `<td>(${part[s][ring][corner].map(f).join(", ")})</td></tr>`;
      }
      html += `<tr class="sum"><td>total · browser</td><td colspan="4"></td><td>(${total[ring][corner].map(f).join(", ")})</td></tr>`;
      html += `<tr><td>total · original code</td><td colspan="4"></td><td>(${R.map(f).join(", ")})</td></tr></tbody></table>`;
      box.innerHTML = html;
    }
    draw();
    note(host, "All the work for one target corner: rows are the four source wakes, columns the four edges. The brighter the cell, the larger that evaluation's contribution. The target's own wake (front-right) usually dominates, because the nearest rings are in it.");
  }

  Object.assign(window.VIZ, { vwScene, vwLoops, vwCorner });
})();
