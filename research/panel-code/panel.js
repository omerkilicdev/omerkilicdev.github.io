// Tabs for the panel-code gallery: each mounts one visual into the dark stage and shows its explanation.
(function () {
  "use strict";

  const TABS = [
    // ---------------- geometry
    { id: "body", g: "Geometry", label: "Body and wings", v: "body", p: { hl: "all" }, t: "Body and four wings",
      x: ["Four wings in tandem: a front pair and a rear pair, each with a right and a left wing. The front wings sit 1.5 cm ahead of the body centre and the rear wings 1.5 cm behind it.",
        "The body flies towards −x, so in the body's frame the air moves towards +x."] },
    { id: "mesh", g: "Geometry", label: "Wing mesh", v: "mesh2d", p: { hl: "both", rear: true }, t: "Wing mesh",
      x: ["Each right wing is defined first in its own wing-fixed frame and then moved into space; the left wing is its mirror image. The front and rear wings differ: here the rear wing is half the size of the front one.",
        "Every wing has 17 vortex-ring panels: 10 border elements around the outline and 7 centre elements inside."] },
    { id: "strips", g: "Geometry", label: "Border strip", v: "wbPentagon", p: { hl: "all" }, t: "The border strip",
      x: ["The planform is a pentagon: it narrows towards the root like a triangle and then continues as a rectangle. A strip of width h = 0.1 × chord is drawn around the whole outline and cut into quadrilateral elements.",
        "These border elements are the ones released into the flow at every time step; the region left inside becomes the centre panels."] },
    { id: "frames", g: "Geometry", label: "Strip directions", v: "wbFrames", p: {}, t: "Five local frames",
      x: ["Each of the five strips gets its own local axes: y runs along the strip, x points into the wing. Going round clockwise the frame turns at every corner, by δ, 0, −90°, −180° and −(180° + δ), with δ = 30° at the root."] },
    { id: "split", g: "Geometry", label: "Dividing a strip", v: "wbStrip", p: {}, t: "Dividing a strip into elements",
      x: ["For every strip: how many elements, how wide each one is, and how wide the corner pieces at its two ends are. Element widths are kept close to 3h and adjusted so the strip divides exactly."] },
    { id: "place", g: "Geometry", label: "Placing the strips", v: "wbPlace", p: {}, t: "Placing the strips",
      x: ["One strip per pass: it is cut into rectangles in its local frame, then rotated and translated to its corner, X = R(angle)·x + corner. The film strip shows the five passes in order."] },
    { id: "corners", g: "Geometry", label: "Bevelled corners", v: "wbMerge", p: { part: "first" }, t: "Folding in the corner pieces",
      x: ["The corner piece is not kept as an element of its own. The first element takes node 1 from the corner piece and nodes 2–4 from the first regular element; the last element takes node 2 from the end corner piece.",
        "The result is a bevelled quadrilateral, so two strips meet at a corner with no gap and no overlap."] },
    { id: "final", g: "Geometry", label: "Finished mesh", v: "wbFinal", p: {}, t: "The finished mesh",
      x: ["Front and rear wing as used in the run: 10 border elements (red) wrapping the outline and 7 centre elements (blue). Elements 3–4 lie on the leading edge, 5–6 on the tip, 7–8 on the trailing edge, and 1–2 and 9–10 on the bevelled edges beside the root."] },
    { id: "normal", g: "Geometry", label: "Element normal", v: "wbNormal", p: {}, t: "Unit normals",
      x: ["For every element the normal is the cross product of its two diagonals, (node 3 − node 1) × (node 2 − node 4), scaled to length 1. On a flat wing they are all (0, 0, 1)."] },
    { id: "colloc", g: "Geometry", label: "Collocation points", v: "wbCentroid", p: {}, t: "Collocation points",
      x: ["The fifth node of each element is the mean of its four corners. These points are where the no-penetration condition is imposed when the circulations are solved for."] },

    // ---------------- kinematics
    { id: "stroke", g: "Kinematics", label: "Stroke angle", v: "stroke", p: {}, t: "Stroke angles",
      x: ["The wing sweeps from φ_T = 80° at the top to φ_B = −45° at the bottom in one half period (the downstroke) and back in the next.",
        "The stroke plane is normal to the body (β = 90°) and the pitch axis is at mid-chord. The animation below is one full period of the front-right wing."] },
    { id: "angles", g: "Kinematics", label: "Flapping and pitch", v: "motion", p: { hl: "both" }, t: "Flapping and pitch over one period",
      x: ["Each wing has its own flapping angle φ, pitch amplitude and timing, frequency and phase. Wings are numbered 1 front-right, 2 front-left, 3 rear-right, 4 rear-left."] },
    { id: "cycle", g: "Kinematics", label: "One period", v: "cycle", p: {}, t: "One period in 3D",
      x: ["The path of the wings over one period in the body-fixed frame, without the forward motion. The dashed yellow curves trace the wing tips."] },
    { id: "four", g: "Kinematics", label: "Four wings", v: "kin4", p: {}, t: "Four wings, one step",
      x: ["At every step each wing gets its current flapping angle φ, pitch angle θ and their rates. Move the slider to step through the run."] },
    { id: "frames3d", g: "Kinematics", label: "Wing to space", v: "L2G", p: {}, t: "From the wing frame to space",
      x: ["The wing mesh is rotated by φ and θ, placed at its root on the body and carried along with the body by −U·t. The result is the position of every panel of the four wings at this step."] },
    { id: "time", g: "Kinematics", label: "Time steps", v: "time", p: { hl: "t" }, t: "Time stepping",
      x: ["dt = 0.1 in nondimensional time. The unit of time is half a flapping period, so one full stroke is 2 units, or 20 steps. This run has 12 steps."] },
    { id: "units", g: "Kinematics", label: "Units", v: "units", p: {}, t: "Nondimensional units",
      x: ["Lengths are divided by the total arc length of the front-right wing tip, l·φ_T + l·|φ_B|. Time is divided by half a period and velocity by their ratio. From here on every quantity is nondimensional."] },

    // ---------------- wake
    { id: "wake", g: "Wake", label: "Wake growth", v: "flow", p: {}, t: "How the wake builds up",
      x: ["In the space-fixed frame the air is at rest and the body flies towards −x. At every step the border rings of each wing are released and stay roughly where they were shed, so the wake forms behind the body.",
        "Press play, drag the slider, or pick a step from the strip below. Drag the picture to rotate it, use the wheel to zoom."] },
    { id: "grow", g: "Wake", label: "Ring count", v: "grow", p: {}, t: "Rings per step",
      x: ["At every step the 10 border rings of each wing are added to its wake: 10 rings after step 1, 20 after step 2, and so on. The older rings are moved with the flow at every step."] },
    { id: "loop", g: "Wake", label: "Time loop", v: "tmloop", p: {}, t: "The time loop",
      x: ["Each pass of the loop is one time step, t = (step − 1)·dt. The film strip is the run itself: the wings fly towards −x while the rings shed from their edges build up the wake."] },
    { id: "shed", g: "Wake", label: "Shedding", v: "shed", p: {}, t: "Shedding the border rings",
      x: ["Each border element is released as a copy of itself moved one step forward with the velocity at its corners: x_shed = x_border + dt·(u_wings + u_wake). The whole outline is shed: leading edge, tip, trailing edge and the root edges."] },
    { id: "shedvel", g: "Wake", label: "Shedding velocity", v: "bvel", p: {}, t: "Velocity at the border corners",
      x: ["The velocity at every corner of the border elements has two parts: the bound rings of the four wings and the wake. Times dt it gives the arrow along which each shed corner moves."] },
    { id: "convect", g: "Wake", label: "Convection", v: "convect", p: {}, t: "Moving the wake",
      x: ["After the first step every wake corner moves with the velocity at its own position, x ← x + dt·(u_wings + u_wake), a first-order explicit Euler step."] },

    // ---------------- solving
    { id: "matrix", g: "Solving", label: "Influence matrix", v: "matrix", p: { hl: "blocks" }, t: "The influence matrix",
      x: ["A 4 × 4 block matrix. A diagonal block is a wing acting on itself: the wing is rigid, so it does not change in time and is computed once. An off-diagonal block couples two different wings; their distance and angle change, so it is recomputed at every step."] },
    { id: "pair", g: "Solving", label: "Wing pairs", v: "pair", p: { i: 3, j: 1, what: "Normal velocity", matrix: true }, t: "One wing acting on another",
      x: ["The rings of one wing induce velocity at the collocation points of another. There are 12 such source–target pairs among four wings."] },
    { id: "vnc", g: "Solving", label: "Wing motion", v: "wing3d", p: { hl: "vnc", step: 5 }, t: "Normal velocity from the wing's motion",
      x: ["At every collocation point, the normal component of the wing's own motion (flapping, pitching and flight). This is the right-hand side of the no-penetration condition."] },
    { id: "vncw", g: "Solving", label: "Wake on wing", v: "wing3d", p: { hl: "vncw", step: 5 }, t: "Normal velocity from the wake",
      x: ["The normal velocity that all the rings in the four wakes induce at the collocation points. Their strengths are already known, so this moves to the right-hand side with a minus sign. At step 1 there is no wake and it is zero."] },
    { id: "solve", g: "Solving", label: "Solve for Γ", v: "solve", p: {}, t: "Solving for the circulations",
      x: ["A·Γ = (wing normal velocity) − (wake normal velocity), with 68 unknowns: the strengths of the 17 rings on each of the four wings. The system is solved by LU decomposition."] },
    { id: "gam", g: "Solving", label: "Circulation", v: "wing3d", p: { hl: "gam", step: 5 }, t: "Circulation on the wings",
      x: ["Γ of every panel as colour: red positive, blue negative, scaled to the largest |Γ| at each step."] },
    { id: "splitg", g: "Solving", label: "Split per wing", v: "split", p: {}, t: "Splitting Γ per wing",
      x: ["The 68 values are split in order into front-right, front-left, rear-right and rear-left. The first 10 of each 17 belong to border elements: they become the strengths of the rings shed next."] },
    { id: "bgam", g: "Solving", label: "Γ to be shed", v: "wing3d", p: { hl: "bordergam", step: 5 }, t: "Circulation about to be shed",
      x: ["Only the border elements are coloured: these 10 values per wing are carried into the wake by the rings shed at the end of this step."] },

    // ---------------- velocity
    { id: "segment", g: "Velocity", label: "One segment", v: "mvTriangle", p: { hl: "coef" }, t: "Velocity of one straight vortex segment",
      x: ["r1 and r2 run from the two ends of the segment to the field point. Their cross product is normal to the triangle they span; that is the direction of the velocity, and its length is twice the triangle's area.",
        "Magnitude: Γ/(4πd)·(cos α1 − cos α2), the Biot–Savart law for a finite segment."],
      eq: "u = Γ/(4π|r1×r2|²) · (r0·r1/|r1| − r0·r2/|r2|) · (r1 × r2)" },
    { id: "edges", g: "Velocity", label: "Ring edges", v: "mvVector", p: {}, t: "Same edge of every ring",
      x: ["The 'same edge' means the same-numbered edge of each of the m rings, for example every 1→2 edge, directed from its first corner to its second. Array operations evaluate all m segments at once."] },
    { id: "point", g: "Velocity", label: "At a wake point", v: "mvScene", p: {}, t: "Velocity at one wake point",
      x: ["The sum of the velocities induced at one field point by m straight vortex segments, each the same edge of a different ring. The example is from the run: the 60 rings of the front-right wake after step 6. Pick a point and an edge above the picture."] },
    { id: "sum", g: "Velocity", label: "Running sum", v: "mvSum", p: {}, t: "Building up the sum",
      x: ["The contributions of the m segments are added component by component into one (u, v, w). Near rings make big jumps, far rings small corrections."] },
    { id: "sources", g: "Velocity", label: "Wake on wake", v: "vwScene", p: {}, t: "Wake-to-wake velocity",
      x: ["At every corner of a target wake, the velocity induced by all the rings in the four wakes. It is one of the two parts of the velocity that moves the wake. The arrows are from the run: the front-right wake at the end of step 6."] },
    { id: "own", g: "Velocity", label: "One source wake", v: "vwScene", p: { src: 0 }, t: "One source at a time",
      x: ["The same velocity split by source: here only the front-right wake acting on itself. The four sources are evaluated the same way and added."] },
    { id: "corner", g: "Velocity", label: "One corner", v: "vwCorner", p: {}, t: "All the work for one corner",
      x: ["For each target corner: 4 source wakes × 4 edges = 16 evaluations, each over all m rings of that source. Adding them gives the wake-induced velocity at that corner."] },
    { id: "loops", g: "Velocity", label: "Loop nest", v: "vwLoops", p: {}, t: "The loop nest",
      x: ["Four nested loops: source wake, target ring, corner, edge. Each innermost evaluation covers m segments, so the work per step grows with the square of the number of rings."] },
    { id: "cost", g: "Velocity", label: "Cost growth", v: "wwcost", p: {}, t: "Why the wake gets expensive",
      x: ["Three velocities involve the wake: wake on the border corners, wings on the wake, and wake on itself. The last one is every ring against every ring, about K² interactions for K rings, and it is the most expensive part."] },
    { id: "cutoff", g: "Velocity", label: "Near-line cutoff", v: "cutoff", p: { hl: "lcut" }, t: "The near-line cutoff",
      x: ["The velocity of a vortex line grows like 1/r as a point approaches the line. Points closer than a cutoff radius to the line, or to its straight extension, get zero velocity from that segment. The radius is one tenth of the border-strip width."] },
  ];

  const byId = Object.fromEntries(TABS.map((t) => [t.id, t]));
  const DEFAULT = "wake";
  const tabsEl = document.getElementById("pc-tabs");
  const stage = document.getElementById("pc-stage");
  const text = document.getElementById("pc-text");
  let current = null;

  // grouped tab row
  const groups = [...new Set(TABS.map((t) => t.g))];
  tabsEl.setAttribute("role", "tablist");
  groups.forEach((g) => {
    const row = document.createElement("div"); row.className = "pc-group";
    const h = document.createElement("span"); h.textContent = g; row.appendChild(h);
    TABS.filter((t) => t.g === g).forEach((t) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "pc-tab"; b.id = "tab-" + t.id; b.textContent = t.label;
      b.setAttribute("role", "tab"); b.setAttribute("aria-controls", "pc-stage"); b.setAttribute("aria-selected", "false");
      b.addEventListener("click", () => { show(t.id); try { history.replaceState(null, "", "#" + t.id); } catch (e) { /* file:// */ } });
      row.appendChild(b);
    });
    tabsEl.appendChild(row);
  });

  function esc(s) { return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

  function show(id) {
    const t = byId[id] || byId[DEFAULT];
    (window.PC_STOPS || []).splice(0).forEach((stop) => stop());
    current = t.id;
    tabsEl.querySelectorAll(".pc-tab").forEach((b) => b.setAttribute("aria-selected", String(b.id === "tab-" + t.id)));
    const on = document.getElementById("tab-" + t.id), row = on.parentElement;
    if (row.scrollWidth > row.clientWidth) row.scrollLeft = on.offsetLeft - row.offsetLeft - 90;
    stage.innerHTML = "";
    const fn = window.VIZ[t.v];
    try { fn(stage, Object.assign({}, t.p), { jump: () => {}, side: null }); }
    catch (err) { stage.textContent = "This visual could not be drawn: " + err.message; }
    text.innerHTML = `<p class="grp">${esc(t.g)}</p><h3>${esc(t.t)}</h3>` +
      t.x.map((p) => `<p>${esc(p)}</p>`).join("") + (t.eq ? `<p class="eqn">${esc(t.eq)}</p>` : "");
  }

  const start = (location.hash || "").slice(1);
  show(byId[start] ? start : DEFAULT);
  addEventListener("hashchange", () => { const h = location.hash.slice(1); if (byId[h] && h !== current) show(h); });

  // canvases size themselves when drawn, so redraw on a real width change
  let lastW = stage.clientWidth, rt = 0;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (Math.abs(stage.clientWidth - lastW) > 40) { lastW = stage.clientWidth; show(current); } }, 250);
  });
})();
