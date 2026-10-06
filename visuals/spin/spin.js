/* Why a spin needs a rotary-balance test: 3D scenes and step tabs.
   Three.js r128 scene code adapted from my Turkish lesson (rotary-balance.vercel.app).
   Axes: aircraft body axes x forward, y right wing, z down; three.js X forward, Y up, Z right wing.
   The force curves come from a qualitative teaching model, not from data for a real aircraft. */
(function () {
  'use strict';
  var probe = document.createElement('canvas');
  var hasGL = !!(window.WebGLRenderingContext && (probe.getContext('webgl') || probe.getContext('experimental-webgl')));
  if (!hasGL || typeof THREE === 'undefined') {
    var view = document.getElementById('stage-view');
    if (view) view.innerHTML = '<p class="stage-fallback">This browser has no WebGL, so the 3D scenes cannot run. The steps and equations below still read on their own.</p>';
    document.documentElement.classList.add('no-3d');
    return;
  }


  const A2T = (x, y, z) => new THREE.Vector3(x, -z, y);
  const T2A = (v) => ({ x: v.x, y: v.z, z: -v.y });

  const App = (() => {
    const canvas = document.getElementById('c3d');
    const stage = document.getElementById('stage-view');
    const overlay = document.getElementById('overlay');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
    const world = new THREE.Group();
    scene.add(world);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const state = {
      alpha: 5, beta: 0, rhat: 0.10, phat: 0, dr: 0, mode: 0,
      playing: !reducedMotion.matches, labels: true, t: 0,
    };

    const css = () => getComputedStyle(document.documentElement);
    const cssColor = (name) => new THREE.Color(css().getPropertyValue(name).trim() || '#888');
    const themed = [];
    const isDark = () => {
      const t = document.documentElement.getAttribute('data-theme');
      if (t === 'dark') return true;
      if (t === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };
    const palette = {};
    function refreshTheme() {
      ['--okra', '--teal', '--crimson', '--ink', '--slate', '--scene-bg', '--rule', '--paper', '--air'].forEach((k) => {
        palette[k.slice(2)] = cssColor(k);
      });
      scene.background = palette['scene-bg'].clone();
      scene.fog = new THREE.Fog(palette['scene-bg'].clone(), 30, 90);
      const dark = isDark();
      themed.forEach((e) => { e.mat[e.prop || 'color'].set(dark ? e.dark : e.light); });
      hemi.color.set(dark ? '#3b4658' : '#ffffff');
      hemi.groundColor.set(dark ? '#0b0f16' : '#8a8f99');
      grid.material.color.set(dark ? '#243040' : '#c9cfd8');
    }
    function registerThemed(mat, light, dark, prop) { themed.push({ mat, light, dark, prop }); mat[prop || 'color'].set(isDark() ? dark : light); }

    const hemi = new THREE.HemisphereLight('#ffffff', '#8a8f99', 0.85);
    scene.add(hemi);
    const key = new THREE.DirectionalLight('#ffffff', 0.9);
    key.position.set(6, 10, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight('#dfe6ff', 0.35);
    fill.position.set(-8, 3, -6);
    scene.add(fill);

    const grid = new THREE.GridHelper(40, 20, '#c9cfd8', '#c9cfd8');
    grid.material.transparent = true; grid.material.opacity = 0.35;
    grid.position.y = -4.5;
    scene.add(grid);

    const orbit = {
      theta: 0.55, phi: 1.05, radius: 19, target: new THREE.Vector3(-0.6, 0, 0),
      goal: { theta: 0.55, phi: 1.05, radius: 19, target: new THREE.Vector3(-0.6, 0, 0) },
      dragging: false, lastX: 0, lastY: 0, pinch: 0,
    };
    const VIEWS = {
      iso: { theta: 0.55, phi: 1.05, radius: 19 },
      top: { theta: Math.PI, phi: 0.12, radius: 20 },
      side: { theta: Math.PI / 2, phi: Math.PI / 2 - 0.02, radius: 19 },
      front: { theta: 0.0, phi: 1.25, radius: 19 },
      rear: { theta: Math.PI, phi: 1.2, radius: 19 },
    };
    function setView(name, extra) {
      const v = Object.assign({}, VIEWS[name] || VIEWS.iso, extra || {});
      orbit.goal.theta = v.theta; orbit.goal.phi = v.phi; orbit.goal.radius = v.radius;
      if (v.target) orbit.goal.target.copy(v.target); else orbit.goal.target.set(-0.6, 0, 0);
      document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
    }
    function applyCamera(dt) {
      const k = 1 - Math.exp(-dt * 6);
      orbit.theta += (orbit.goal.theta - orbit.theta) * k;
      orbit.phi += (orbit.goal.phi - orbit.phi) * k;
      orbit.radius += (orbit.goal.radius - orbit.radius) * k;
      orbit.target.lerp(orbit.goal.target, k);
      const r = orbit.radius, ph = orbit.phi, th = orbit.theta;
      camera.position.set(
        orbit.target.x + r * Math.sin(ph) * Math.cos(th),
        orbit.target.y + r * Math.cos(ph),
        orbit.target.z + r * Math.sin(ph) * Math.sin(th));
      camera.lookAt(orbit.target);
    }
    function onDown(x, y) { orbit.dragging = true; orbit.lastX = x; orbit.lastY = y; }
    function onMove(x, y) {
      if (!orbit.dragging) return;
      const dx = x - orbit.lastX, dy = y - orbit.lastY;
      orbit.lastX = x; orbit.lastY = y;
      orbit.goal.theta += dx * 0.006; orbit.goal.phi = Math.min(Math.PI - 0.08, Math.max(0.08, orbit.goal.phi - dy * 0.006));
      orbit.theta = orbit.goal.theta; orbit.phi = orbit.goal.phi;
      document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    }
    canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); onDown(e.clientX, e.clientY); });
    canvas.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY));
    canvas.addEventListener('pointerup', () => { orbit.dragging = false; });
    canvas.addEventListener('pointercancel', () => { orbit.dragging = false; });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      orbit.goal.radius = Math.min(60, Math.max(6, orbit.goal.radius * (1 + Math.sign(e.deltaY) * 0.08)));
    }, { passive: false });
    canvas.style.touchAction = 'none';

    const labels = new Map();
    const tmpV = new THREE.Vector3();
    function label(key, html, pos, cls) {
      let e = labels.get(key);
      if (!e) {
        e = { el: document.createElement('div'), pos: null };
        e.el.className = 'lbl';
        overlay.appendChild(e.el);
        labels.set(key, e);
      }
      e.el.className = 'lbl ' + (cls || '');
      e.el.innerHTML = html;
      e.pos = pos;
      return e;
    }
    function clearLabels() { labels.forEach((e) => e.el.remove()); labels.clear(); }
    function removeLabel(key) { const e = labels.get(key); if (e) { e.el.remove(); labels.delete(key); } }
    function updateLabels() {
      const w = stage.clientWidth, h = stage.clientHeight;
      labels.forEach((e) => {
        let p = e.pos;
        if (typeof p === 'function') p = p();
        else if (p && p.isObject3D) { p.getWorldPosition(tmpV); p = tmpV; }
        if (!p) return;
        tmpV.copy(p).project(camera);
        const behind = tmpV.z > 1;
        const x = (tmpV.x * 0.5 + 0.5) * w, y = (-tmpV.y * 0.5 + 0.5) * h;
        e.el.style.left = x + 'px'; e.el.style.top = y + 'px';
        e.el.style.opacity = (state.labels && !behind) ? '' : '0';
      });
    }

    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false);
      const aspect = w / Math.max(1, h);
      camera.aspect = aspect;

      const HFOV = 38;
      camera.fov = aspect < 1.25 ? 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(HFOV / 2)) / aspect)) : 36;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);

    let current = null;
    let last = performance.now();
    function frame(now) {
      const dtReal = Math.min(0.05, (now - last) / 1000);
      last = now;
      const dt = state.playing ? dtReal : 0;
      state.t += dt;

      if (current && current.update) {
        try { current.update(state.t, dt, dtReal); }
        catch (err) { if (!current._failed) { current._failed = true; console.error('[scene] update error:', err); } }
      }
      applyCamera(dtReal);
      try { updateLabels(); } catch (err) {  }
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    function setScene(sc) {
      if (current && current.exit) current.exit();
      current = sc;
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refreshTheme);
    new MutationObserver(refreshTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return {
      canvas, stage, overlay, renderer, scene, camera, world, state, orbit, palette,
      setView, VIEWS, label, removeLabel, clearLabels, resize, setScene, registerThemed, refreshTheme, isDark,
      start() { resize(); refreshTheme(); requestAnimationFrame(frame); },

      frameOnce(now) { frame(now == null ? performance.now() : now); },
    };
  })();


  const Jet = (() => {
    const BODY = { light: '#3f4b5f', dark: '#9aa5b8' };
    const WING = { light: '#cfd6e0', dark: '#6d7a90' };
    const ACC  = { light: '#2a3345', dark: '#c3ccd9' };
    const GLASS = { light: '#c49a3c', dark: '#d8b45a' };

    function mat(pair, opts) {
      const m = new THREE.MeshStandardMaterial(Object.assign({ color: pair.light, metalness: 0.25, roughness: 0.55 }, opts || {}));
      App.registerThemed(m, pair.light, pair.dark);
      return m;
    }

    function build() {
      const g = new THREE.Group();
      g.name = 'jet';
      const parts = {};
      const P = (key, mesh, tr, en, anchor) => { mesh.name = key; parts[key] = { key, mesh, tr, en, anchor }; g.add(mesh); return mesh; };

      const prof = [
        [0.0, 5.2], [0.10, 4.9], [0.22, 4.3], [0.36, 3.5], [0.47, 2.6], [0.55, 1.6], [0.58, 0.4],
        [0.58, -1.2], [0.55, -2.4], [0.50, -3.4], [0.44, -4.2], [0.36, -4.7], [0.0, -4.75],
      ];
      const pts = prof.map(([r, x]) => new THREE.Vector2(r, x));
      const fuseGeo = new THREE.LatheGeometry(pts, 40);
      fuseGeo.rotateZ(-Math.PI / 2);
      fuseGeo.scale(1, 0.92, 1.25);
      const matBody = mat(BODY);
      P('govde', new THREE.Mesh(fuseGeo, matBody), 'Fuselage', 'fuselage', new THREE.Vector3(0.5, 0.75, 0));

      const canGeo = new THREE.SphereGeometry(0.62, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2);
      canGeo.scale(1.9, 0.75, 0.85);
      const canopy = new THREE.Mesh(canGeo, mat(GLASS, { metalness: 0.35, roughness: 0.2, transparent: true, opacity: 0.85 }));
      canopy.position.set(2.15, 0.42, 0);
      P('kanopi', canopy, 'Canopy', 'canopy', new THREE.Vector3(2.4, 1.7, 0));

      const wingShape = (sgn) => {
        const s = new THREE.Shape();
        s.moveTo(1.5, 0.0 * sgn);
        s.lineTo(-1.3, 3.5 * sgn);
        s.lineTo(-2.95, 3.5 * sgn);
        s.lineTo(-3.0, 0.0 * sgn);
        s.lineTo(1.5, 0.0 * sgn);
        return s;
      };
      const wingGeo = (sgn) => {
        const geo = new THREE.ExtrudeGeometry(wingShape(sgn), { depth: 0.11, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
        geo.rotateX(Math.PI / 2);
        geo.translate(0, 0.02, 0);
        return geo;
      };
      const matWingL = mat(WING), matWingR = mat(WING);
      P('kanatSol', new THREE.Mesh(wingGeo(-1), matWingL), 'Left wing', 'left wing', new THREE.Vector3(-1.4, 0.2, -2.3));
      P('kanatSag', new THREE.Mesh(wingGeo(+1), matWingR), 'Right wing', 'right wing', new THREE.Vector3(-1.4, 0.2, 2.3));

      const elevGeo = (sgn) => {
        const s = new THREE.Shape();
        s.moveTo(-2.95, 1.4 * sgn); s.lineTo(-2.95, 3.4 * sgn); s.lineTo(-3.55, 3.4 * sgn); s.lineTo(-3.55, 1.4 * sgn); s.lineTo(-2.95, 1.4 * sgn);
        const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
        geo.rotateX(Math.PI / 2); geo.translate(2.95, 0.04, 0);
        return geo;
      };
      const matAcc = mat(ACC);
      const elL = new THREE.Mesh(elevGeo(-1), matAcc); elL.position.set(-2.95, 0, 0);
      const elR = new THREE.Mesh(elevGeo(+1), matAcc); elR.position.set(-2.95, 0, 0);
      P('elevonSol', elL, 'Left elevon', 'left elevon', new THREE.Vector3(-3.3, 0.15, -2.4));
      P('elevonSag', elR, 'Right elevon', 'right elevon', new THREE.Vector3(-3.3, 0.15, 2.4));

      const canardGeo = (sgn) => {
        const s = new THREE.Shape();
        s.moveTo(3.3, 0.45 * sgn); s.lineTo(2.35, 1.55 * sgn); s.lineTo(1.9, 1.55 * sgn); s.lineTo(2.0, 0.45 * sgn); s.lineTo(3.3, 0.45 * sgn);
        const geo = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false });
        geo.rotateX(Math.PI / 2); geo.translate(0, 0.18, 0);
        return geo;
      };
      P('kanardSol', new THREE.Mesh(canardGeo(-1), matAcc), 'Left canard', 'left canard', new THREE.Vector3(2.4, 0.5, -1.4));
      P('kanardSag', new THREE.Mesh(canardGeo(+1), matAcc), 'Right canard', 'right canard', new THREE.Vector3(2.4, 0.5, 1.4));

      const inGeo = new THREE.BoxGeometry(2.4, 0.55, 0.55);
      [-1, 1].forEach((sgn) => {
        const m = new THREE.Mesh(inGeo, matAcc);
        m.position.set(0.3, -0.15, sgn * 0.78);
        g.add(m);
        if (sgn > 0) parts.alik = { key: 'alik', mesh: m, tr: 'Air intake', en: 'air intake', anchor: new THREE.Vector3(0.2, -1.4, 1.4) };
      });

      const finShape = () => {
        const s = new THREE.Shape();
        s.moveTo(-1.6, 0); s.lineTo(-2.55, 1.35); s.lineTo(-3.05, 1.35); s.lineTo(-3.35, 0); s.lineTo(-1.6, 0);
        return s;
      };
      const rudShape = () => {
        const s = new THREE.Shape();
        s.moveTo(0, 0); s.lineTo(-0.28, 1.3); s.lineTo(-0.62, 1.3); s.lineTo(-0.72, 0); s.lineTo(0, 0);
        return s;
      };
      [-1, 1].forEach((sgn) => {
        const pivot = new THREE.Group();
        pivot.position.set(0, 0.35, sgn * 0.62);
        pivot.rotation.x = -sgn * THREE.MathUtils.degToRad(18);
        const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(finShape(), { depth: 0.07, bevelEnabled: false }), matBody);
        fin.geometry.translate(0, 0, -0.035);
        pivot.add(fin);
        const rudHinge = new THREE.Group();
        rudHinge.position.set(-3.05 + 0.0, 0, 0);
        const rud = new THREE.Mesh(new THREE.ExtrudeGeometry(rudShape(), { depth: 0.06, bevelEnabled: false }), matAcc);
        rud.geometry.translate(0.28, 0, -0.03);
        rudHinge.add(rud);
        pivot.add(rudHinge);
        g.add(pivot);
        const key = sgn > 0 ? 'kuyrukSag' : 'kuyrukSol';
        parts[key] = { key, mesh: fin, tr: sgn > 0 ? 'Right fin' : 'Left fin', en: 'vertical tail (fin)', anchor: new THREE.Vector3(-2.4, 1.9, sgn * 1.05) };
        parts[sgn > 0 ? 'rudderSag' : 'rudderSol'] = { key: 'rudder', mesh: rud, hinge: rudHinge, tr: 'Rudder', en: 'rudder', anchor: new THREE.Vector3(-3.4, 1.1, sgn * 0.95) };
      });

      const nozGeo = new THREE.CylinderGeometry(0.30, 0.36, 0.9, 24, 1, true);
      nozGeo.rotateZ(Math.PI / 2);
      [-1, 1].forEach((sgn) => {
        const m = new THREE.Mesh(nozGeo, mat(ACC, { side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 }));
        m.position.set(-4.55, 0.05, sgn * 0.42);
        g.add(m);
        if (sgn > 0) parts.nozul = { key: 'nozul', mesh: m, tr: 'Nozzle', en: 'exhaust nozzle', anchor: new THREE.Vector3(-5.4, -1.0, 1.1) };
      });

      const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), matAcc);
      pitot.geometry.rotateZ(Math.PI / 2); pitot.position.set(5.6, 0, 0);
      g.add(pitot);
      parts.burun = { key: 'burun', mesh: pitot, tr: 'Nose', en: 'nose', anchor: new THREE.Vector3(5.4, 0.7, 0) };

      const cg = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), mat({ light: '#16233b', dark: '#f2f4f8' }, { metalness: 0, roughness: 0.4 }));
      cg.position.set(-0.6, 0, 0);
      g.add(cg);
      parts.cg = { key: 'cg', mesh: cg, tr: 'Centre of gravity', en: 'center of gravity, CG', anchor: new THREE.Vector3(-0.6, -1.5, -0.8) };

      g.userData = { parts, matWingL, matWingR, matBody, CG: new THREE.Vector3(-0.6, 0, 0),
        span: 3.5, tipL: new THREE.Vector3(-2.1, 0.05, -3.5), tipR: new THREE.Vector3(-2.1, 0.05, 3.5),
        tail: new THREE.Vector3(-2.9, 1.2, 0), rootChord: { le: 1.5, te: -3.0 } };
      return g;
    }

    function setRudder(jet, deg) {
      const p = jet.userData.parts;
      ['rudderSol', 'rudderSag'].forEach((k) => { if (p[k]) p[k].hinge.rotation.y = THREE.MathUtils.degToRad(deg); });
    }
    function setElevons(jet, degL, degR) {
      const p = jet.userData.parts;
      p.elevonSol.mesh.rotation.z = THREE.MathUtils.degToRad(degL);
      p.elevonSag.mesh.rotation.z = THREE.MathUtils.degToRad(degR);
    }

    function setSeparation(jet, sepL, sepR) {
      const ud = jet.userData;
      const dark = App.isDark();
      const base = new THREE.Color(dark ? WING.dark : WING.light);
      const hot = new THREE.Color(dark ? '#e8776e' : '#c4483d');
      ud.matWingL.color.copy(base).lerp(hot, Math.min(1, sepL));
      ud.matWingR.color.copy(base).lerp(hot, Math.min(1, sepR));
    }
    return { build, setRudder, setElevons, setSeparation, WING };
  })();


  const H = (() => {
    const UP = new THREE.Vector3(0, 1, 0);
    const colorOf = (c) => (c && c.isColor) ? c : (App.palette[c] ? App.palette[c].clone() : new THREE.Color(c || '#333'));

    function arrow(from, to, opts) {
      opts = opts || {};
      const col = colorOf(opts.color);
      const dir = new THREE.Vector3().subVectors(to, from);
      const len = dir.length();
      const w = opts.width || 0.06;
      const headLen = Math.min(len * 0.45, opts.head || 0.45);
      const grp = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ color: col, metalness: 0, roughness: 0.6, emissive: col, emissiveIntensity: 0.25 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(w, w, Math.max(0.001, len - headLen), 10), m);
      shaft.position.y = (len - headLen) / 2;
      const head = new THREE.Mesh(new THREE.ConeGeometry(w * 2.6, headLen, 14), m);
      head.position.y = len - headLen / 2;
      grp.add(shaft, head);
      grp.position.copy(from);
      grp.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
      grp.userData.set = (f, t) => {
        const d = new THREE.Vector3().subVectors(t, f); const L = d.length();
        const hl = Math.min(L * 0.45, opts.head || 0.45);
        shaft.scale.y = Math.max(0.001, L - hl) / Math.max(0.001, len - headLen);
        shaft.position.y = (L - hl) / 2; head.position.y = L - hl / 2; head.scale.set(1, hl / headLen, 1);
        grp.position.copy(f); grp.quaternion.setFromUnitVectors(UP, d.normalize());
      };
      return grp;
    }

    function rotArrow(center, axis, radius, angle, opts) {
      opts = opts || {};
      const col = colorOf(opts.color);
      const sense = opts.sense || 1;
      const start = opts.start || 0;
      const n = axis.clone().normalize();
      let u = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      u = new THREE.Vector3().crossVectors(n, u).normalize();
      const v = new THREE.Vector3().crossVectors(n, u).normalize();
      const pts = [];
      const N = 40;
      for (let i = 0; i <= N; i++) {
        const a = start + sense * angle * i / N;
        pts.push(new THREE.Vector3().addScaledVector(u, radius * Math.cos(a)).addScaledVector(v, radius * Math.sin(a)));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.3, roughness: 0.6, metalness: 0 });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, opts.width || 0.05, 8, false), m);
      const end = pts[N], prev = pts[N - 1];
      const tangent = new THREE.Vector3().subVectors(end, prev).normalize();
      const head = new THREE.Mesh(new THREE.ConeGeometry((opts.width || 0.05) * 3, 0.35, 12), m);
      head.position.copy(end);
      head.quaternion.setFromUnitVectors(UP, tangent);
      const grp = new THREE.Group();
      grp.add(tube, head);
      grp.position.copy(center);
      grp.userData.tip = end.clone().add(center);
      return grp;
    }

    function angleArc(center, fromDir, toDir, radius, opts) {
      opts = opts || {};
      const col = colorOf(opts.color);
      const a = fromDir.clone().normalize(), b = toDir.clone().normalize();
      const ang = a.angleTo(b);
      const nrm = new THREE.Vector3().crossVectors(a, b).normalize();
      const grp = new THREE.Group();
      grp.userData.mid = center.clone().addScaledVector(a, radius * 1.25);
      if (ang < 1e-3) { grp.position.copy(center); return grp; }
      const N = 32;
      const pts = [center.clone()];
      const q = new THREE.Quaternion();
      for (let i = 0; i <= N; i++) {
        q.setFromAxisAngle(nrm, ang * i / N);
        pts.push(center.clone().add(a.clone().applyQuaternion(q).multiplyScalar(radius)));
      }

      const geo = new THREE.BufferGeometry();
      const pos = [];
      for (let i = 1; i <= N; i++) { pos.push(...pts[0].toArray(), ...pts[i].toArray(), ...pts[i + 1].toArray()); }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      const fan = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
      const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.slice(1)), new THREE.LineBasicMaterial({ color: col }));
      grp.add(fan, edge);
      q.setFromAxisAngle(nrm, ang / 2);
      grp.userData.mid = center.clone().add(a.clone().applyQuaternion(q).multiplyScalar(radius * 1.25));
      return grp;
    }

    function line(pts, opts) {
      opts = opts || {};
      const m = new THREE.LineDashedMaterial({ color: colorOf(opts.color), dashSize: opts.dash || 0.3, gapSize: opts.dash ? 0.18 : 0, transparent: true, opacity: opts.opacity || 1 });
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m);
      l.computeLineDistances();
      return l;
    }

    function bodyAxes(origin, len, opts) {
      opts = opts || {};
      const g = new THREE.Group();
      const L = len || 3.2;
      g.add(arrow(origin, origin.clone().add(A2T(L, 0, 0)), { color: 'okra', width: 0.045 }));
      g.add(arrow(origin, origin.clone().add(A2T(0, L, 0)), { color: 'teal', width: 0.045 }));
      g.add(arrow(origin, origin.clone().add(A2T(0, 0, L)), { color: 'crimson', width: 0.045 }));
      g.userData.tips = { x: origin.clone().add(A2T(L * 1.12, 0, 0)), y: origin.clone().add(A2T(0, L * 1.12, 0)), z: origin.clone().add(A2T(0, 0, L * 1.12)) };
      return g;
    }

    function flow(cfg) {
      const n = cfg.n || 700;
      const pos = new Float32Array(n * 3);
      const seg = new Float32Array(n * 6);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(seg, 3));

      const mat = new THREE.LineBasicMaterial({ color: colorOf(cfg.color || 'air'), transparent: true, opacity: cfg.opacity || 0.75 });
      App.registerThemed(mat, '#1b5fc9', '#5fc8ff');
      const lines = new THREE.LineSegments(geo, mat);
      lines.frustumCulled = false;
      const box = cfg.box || { x: [-7, 7], y: [-3.2, 3.2], z: [-4.6, 4.6] };
      const v = new THREE.Vector3(), p = new THREE.Vector3(), dir = new THREE.Vector3();
      const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
      function inletDir() { cfg.field(new THREE.Vector3(12, 0, 0), dir); dir.normalize(); return dir; }
      function spawn(i, anywhere) {
        const d = inletDir();
        e1.set(0, 0, 1); e2.crossVectors(d, e1).normalize(); e1.crossVectors(e2, d).normalize();
        const along = anywhere ? (Math.random() * 14 - 7) : -7 - Math.random() * 1.5;
        const a = (Math.random() - 0.5) * 2 * 4.6, b = (Math.random() - 0.5) * 2 * 3.0;
        p.copy(d).multiplyScalar(along).addScaledVector(e1, a).addScaledVector(e2, b);
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      }
      for (let i = 0; i < n; i++) spawn(i, true);
      function update(dt) {
        const k = cfg.streak || 0.18;
        for (let i = 0; i < n; i++) {
          p.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
          cfg.field(p, v);
          p.addScaledVector(v, dt);
          if (p.x < box.x[0] || p.x > box.x[1] || p.y < box.y[0] || p.y > box.y[1] || p.z < box.z[0] || p.z > box.z[1]) { spawn(i, false); p.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); cfg.field(p, v); }
          pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
          seg[i * 6] = p.x; seg[i * 6 + 1] = p.y; seg[i * 6 + 2] = p.z;
          seg[i * 6 + 3] = p.x - v.x * k; seg[i * 6 + 4] = p.y - v.y * k; seg[i * 6 + 5] = p.z - v.z * k;
        }
        geo.attributes.position.needsUpdate = true;
      }
      lines.userData.update = update;
      return lines;
    }

    function wingField(prm) {
      const U = new THREE.Vector3(), tmp = new THREE.Vector3(), rot = new THREE.Vector3();
      return (pos, out) => {
        const a = THREE.MathUtils.degToRad(prm.alphaDeg || 0);
        const s = prm.speed || 6;
        U.set(-Math.cos(a) * s, Math.sin(a) * s, 0);

        if (prm.omega) { rot.crossVectors(prm.omega, pos); U.addScaledVector(rot, -1); }
        out.copy(U);
        const w = prm.wing;
        const span = w.span, le = w.le, te = w.te;
        const zz = Math.abs(pos.z);
        if (zz < span + 0.3 && pos.x < le + 1.5 && pos.x > te - 2.2) {
          const y = pos.y;

          const xle = le - (le - (-1.3)) * Math.min(1, zz / span);
          const inChord = pos.x < xle && pos.x > te;
          const sep = pos.z < 0 ? (prm.sepL || 0) : (prm.sepR || 0);

          if (inChord && Math.abs(y) < 0.9) {
            const wgt = 1 - Math.abs(y) / 0.9;
            out.y -= U.y * wgt * (1 - 0.6 * sep);
            out.x *= 1 + 0.25 * wgt * (y > 0 ? 1 : -0.4);
          }

          if (pos.x >= xle && pos.x < xle + 1.5 && Math.abs(y) < 1.2) out.y += 0.5 * s * (1 - (pos.x - xle) / 1.5) * 0.35;
          if (pos.x <= te && pos.x > te - 2.2 && Math.abs(y) < 1.2 && sep < 0.3) out.y -= 0.35 * s * (1 - (te - pos.x) / 2.2) * 0.3;

          if (sep > 0 && y > -0.1 && y < 1.6 + sep && pos.x < xle - 0.2 && pos.x > te - 1.2) {
            const cx = (xle + te) / 2 - 0.4, cy = 0.55 + 0.4 * sep;
            const dx = pos.x - cx, dy = y - cy;
            const r2 = dx * dx + dy * dy + 0.15;
            const k = sep * 4.5 / r2;
            tmp.set(-dy * k, dx * k, 0);
            out.addScaledVector(tmp, 0.35);
            out.x *= (1 - 0.55 * sep);
            out.x += (Math.random() - 0.5) * 2.2 * sep; out.y += (Math.random() - 0.5) * 2.2 * sep; out.z += (Math.random() - 0.5) * 1.4 * sep;
          }
        }
      };
    }

    function dispose(obj) {
      obj.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose && m.dispose()); }
      });
    }

    return { arrow, rotArrow, angleArc, line, bodyAxes, flow, wingField, dispose, colorOf };
  })();


  const D2R = THREE.MathUtils.degToRad;
  const R2D = THREE.MathUtils.radToDeg;
  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const sepOfAlpha = (a) => smooth((a - 16) / 24);

  const Sc = (() => {
    const defs = {};
    let ac, jet, jl, layer, ac2, jet2, jl2, cur = null;
    function mkAircraft() {
      const pivot = new THREE.Group();
      const j = Jet.build();
      j.position.copy(j.userData.CG).multiplyScalar(-1);
      const extra = new THREE.Group();
      j.add(extra);
      pivot.add(j);
      return { pivot, j, extra };
    }
    function init() {
      const a = mkAircraft(); ac = a.pivot; jet = a.j; jl = a.extra;
      const b = mkAircraft(); ac2 = b.pivot; jet2 = b.j; jl2 = b.extra; ac2.visible = false;
      App.world.add(ac, ac2);
      layer = new THREE.Group(); App.world.add(layer);
    }
    function resetAircraft(p, j, x) {
      p.position.set(0, 0, 0); p.quaternion.identity(); p.scale.set(1, 1, 1); p.visible = true;
      Jet.setRudder(j, 0); Jet.setElevons(j, 0, 0); Jet.setSeparation(j, 0, 0);
      while (x.children.length) { const c = x.children.pop(); H.dispose(c); }
    }
    function def(id, cfg) { defs[id] = cfg; }
    function use(id) {
      const d = defs[id]; if (!d || cur === id) return;
      App.setScene(null);
      App.clearLabels();
      H.dispose(layer); App.world.remove(layer); layer = new THREE.Group(); App.world.add(layer);
      resetAircraft(ac, jet, jl); resetAircraft(ac2, jet2, jl2); ac2.visible = false;
      document.getElementById('stage-title').textContent = d.title;
      document.getElementById('stage-caption').textContent = d.caption || '';
      document.querySelectorAll('.controls .sl').forEach((el) => { el.hidden = !(d.sliders || []).includes(el.dataset.sl); });
      if (d.defaults) Object.assign(App.state, d.defaults);
      if (typeof syncSliders === 'function') syncSliders();
      App.setView(d.view || 'iso', d.viewExtra);
      const sc = d.make({ ac, jet, jl, layer, ac2, jet2, jl2, state: App.state }) || {};
      App.setScene(sc);
      cur = id;
    }

    const qy = new THREE.Quaternion(), qz = new THREE.Quaternion(), qx = new THREE.Quaternion();
    function pose(p, o) {
      qy.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -D2R(o.yaw || 0));
      qz.setFromAxisAngle(new THREE.Vector3(0, 0, 1), D2R(o.alpha || 0));
      qx.setFromAxisAngle(new THREE.Vector3(1, 0, 0), D2R(o.roll || 0));
      p.quaternion.copy(qy).multiply(qz).multiply(qx);
    }
    const W = (obj, v) => obj.localToWorld(v.clone());
    return { init, def, use, pose, W, get current() { return cur; }, get defs() { return defs; } };
  })();

  function yawArrow(center, signAeroR, radius, color, angle) {
    return H.rotArrow(center, new THREE.Vector3(0, 1, 0), radius, angle || Math.PI * 1.1, { color, sense: -Math.sign(signAeroR || 1), width: 0.06 });
  }
  function rollArrow(center, signAeroP, radius, color, angle) {
    return H.rotArrow(center, new THREE.Vector3(1, 0, 0), radius, angle || Math.PI * 1.1, { color, sense: Math.sign(signAeroP || 1), width: 0.06, start: Math.PI / 2 });
  }
  function pitchArrow(center, signAeroQ, radius, color, angle) {
    return H.rotArrow(center, new THREE.Vector3(0, 0, 1), radius, angle || Math.PI * 1.1, { color, sense: Math.sign(signAeroQ || 1), width: 0.06 });
  }

  function sting(parent, len, color) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, len, 12), new THREE.MeshStandardMaterial({ color: color || '#6b7280', roughness: 0.5, metalness: 0.5 }));
    m.geometry.rotateZ(Math.PI / 2);
    m.position.set(-4.4 - len / 2, 0, 0);
    parent.add(m);
    return m;
  }
  function partLabels(jet, keys) {
    const P = jet.userData.parts;
    (keys || Object.keys(P)).forEach((k) => {
      const p = P[k]; if (!p) return;
      App.label('part-' + k, p.tr, () => Sc.W(jet, p.anchor), 'part');
    });
  }

  Sc.def(0, {
    title: 'The aircraft, its axes and rotation rates', view: 'iso', viewExtra: { radius: 19 },
    caption: 'Drag to orbit. Ochre = x (forward), green = y (right wing), red = z (down). The rotation rate about each axis: p, q, r.',
    sliders: [],
    make({ ac, jet, jl }) {
      partLabels(jet, ['burun', 'kanopi', 'kanatSol', 'kanatSag', 'kanardSag', 'kuyrukSol', 'rudderSag', 'elevonSag', 'alik', 'nozul', 'cg']);
      const O = new THREE.Vector3(0, 0, 0);
      const axes = H.bodyAxes(O, 3.4); jl.add(axes);
      axes.position.copy(jet.userData.CG);
      const tips = axes.userData.tips;
      App.label('ax-x', 'x <i>(forward)</i>', () => Sc.W(jet, tips.x.clone().add(jet.userData.CG)), 'math okra');
      App.label('ax-y', 'y <i>(right wing)</i>', () => Sc.W(jet, tips.y.clone().add(jet.userData.CG)), 'math teal');
      App.label('ax-z', 'z <i>(down)</i>', () => Sc.W(jet, tips.z.clone().add(jet.userData.CG)), 'math crimson');
      const cg = jet.userData.CG;
      const rp = rollArrow(cg.clone().add(new THREE.Vector3(2.4, 0, 0)), 1, 0.9, 'okra', Math.PI * 1.5); jl.add(rp);
      const rq = pitchArrow(cg.clone().add(new THREE.Vector3(0, 0, 2.4)), 1, 0.9, 'teal', Math.PI * 1.5); jl.add(rq);
      const rr = yawArrow(cg.clone().add(new THREE.Vector3(0, -2.4, 0)), 1, 0.9, 'crimson', Math.PI * 1.5); jl.add(rr);
      App.label('p', 'p <i>roll rate</i>', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(2.4, 1.3, 0))), 'math okra');
      App.label('q', 'q <i>pitch rate</i>', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(0, 1.3, 2.4))), 'math teal');
      App.label('r', 'r <i>yaw rate</i>', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(0, -3.6, 0))), 'math crimson');
      let t0 = 0;
      return { update(t, dt) { t0 += dt; Sc.pose(ac, { yaw: 12 * Math.sin(t0 * 0.35), alpha: 4 + 3 * Math.sin(t0 * 0.5) }); } };
    },
  });

  Sc.def(1, {
    title: 'Level flight: relative wind and angle of attack', view: 'side', viewExtra: { radius: 23, target: new THREE.Vector3(1.5, 0.4, 0) },
    caption: 'Blue streaks and the blue arrow are the air. The relative wind is horizontal and the nose is raised by α. Beyond about 15° the flow starts to leave the upper surface.',
    sliders: ['alpha'], defaults: { alpha: 5 },
    make({ ac, jet, jl, layer, state }) {
      const prm = { alphaDeg: state.alpha, speed: 6, sepL: 0, sepR: 0, wing: { le: 1.5, te: -3.0, span: 3.5 } };
      const fl = H.flow({ n: 900, field: H.wingField(prm), streak: 0.16 }); jl.add(fl);
      const cg = jet.userData.CG;
      jl.add(H.line([new THREE.Vector3(-4.2, 0, 0), new THREE.Vector3(2.8, 0, 0)], { color: 'okra', dash: 0.25 }));
      const wind = H.arrow(new THREE.Vector3(8.6, -1.9, 0), new THREE.Vector3(6.0, -1.9, 0), { color: 'air', width: 0.07 }); layer.add(wind);
      App.label('vinf', 'V<sub>∞</sub> <i>relative wind</i>', new THREE.Vector3(5.6, -2.8, 0), 'math air');
      App.label('chord', 'chord line', () => Sc.W(jet, new THREE.Vector3(2.6, -0.45, 0)), 'okra');
      let arc = null, lastA = -1;
      partLabels(jet, ['kanatSag', 'kuyrukSag', 'cg']);
      return {
        update() {
          const a = state.alpha;
          Sc.pose(ac, { alpha: a });
          prm.alphaDeg = a; const s = sepOfAlpha(a); prm.sepL = prm.sepR = s; Jet.setSeparation(jet, s, s);
          if (a !== lastA) {
            lastA = a;
            if (arc) { layer.remove(arc); H.dispose(arc); }
            const chordDir = new THREE.Vector3(1, 0, 0).applyQuaternion(ac.quaternion);
            arc = H.angleArc(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), chordDir, 4.2, { color: 'okra' });
            layer.add(arc);
            App.label('alpha', 'α = ' + a + '° <i>angle of attack</i>', arc.userData.mid.clone().add(new THREE.Vector3(0.6, 1.1, 0)), 'math okra');
          }
          fl.userData.update(Math.min(0.05, App.state.playing ? 1 / 60 : 0));
        },
      };
    },
  });

  Sc.def(2, {
    title: 'Do both wings see the same air?', view: 'iso', viewExtra: { theta: 0.35, phi: 1.0, radius: 19 },
    caption: 'No rotation (p = q = r = 0). Both tips see the same speed and the same α. This symmetry is the reference for everything that follows.',
    sliders: ['alpha'], defaults: { alpha: 5 },
    make({ ac, jet, jl, state }) {
      const prm = { alphaDeg: state.alpha, speed: 6, sepL: 0, sepR: 0, wing: { le: 1.5, te: -3.0, span: 3.5 } };
      const fl = H.flow({ n: 700, field: H.wingField(prm), streak: 0.16, opacity: 0.35 }); jl.add(fl);
      const ud = jet.userData;
      const mk = (tip, key, txt) => {
        const a = D2R(state.alpha);
        const dir = new THREE.Vector3(-Math.cos(a), Math.sin(a), 0);
        const from = tip.clone().addScaledVector(dir, -3.2), to = tip.clone().addScaledVector(dir, -0.3);
        const ar = H.arrow(from, to, { color: 'air', width: 0.055 }); jl.add(ar);
        const arc = H.angleArc(tip.clone().addScaledVector(dir, -2.4), new THREE.Vector3(1, 0, 0), dir.clone().negate(), 1.1, { color: 'okra' }); jl.add(arc);
        App.label(key, txt, () => Sc.W(jet, from.clone().add(new THREE.Vector3(0.4, 0.6, 0))), 'math');
        return { ar, arc, from, to };
      };
      const L = ud.tipL.clone().add(new THREE.Vector3(0, 0, -0.4)), R = ud.tipR.clone().add(new THREE.Vector3(0, 0, 0.4));
      mk(L, 'vl', 'V<sub>left</sub> = V<sub>∞</sub>, α<sub>left</sub> = α'); mk(R, 'vr', 'V<sub>right</sub> = V<sub>∞</sub>, α<sub>right</sub> = α');
      partLabels(jet, ['kanatSol', 'kanatSag']);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(11, 5), new THREE.MeshBasicMaterial({ color: '#1a6b58', transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
      plane.position.set(0.3, 0.4, 0); jl.add(plane);
      App.label('sym', 'plane of symmetry', () => Sc.W(jet, new THREE.Vector3(-4.8, 2.4, 0)), 'teal');
      return { update() { Sc.pose(ac, { alpha: state.alpha }); prm.alphaDeg = state.alpha; fl.userData.update(App.state.playing ? 1 / 60 : 0); } };
    },
  });

  Sc.def(3, {
    title: 'Rudder input: the yawing moment N and its coefficient Cn', view: 'iso', viewExtra: { theta: 2.6, phi: 0.75, radius: 20 },
    caption: 'The δr slider deflects the rudder. The rudder makes a side force; force × arm is the yawing moment N about the CG.',
    sliders: ['dr'], defaults: { dr: 15 },
    make({ ac, jet, jl, state }) {
      const ud = jet.userData;
      const tailPt = new THREE.Vector3(-3.3, 1.0, 0);
      let force = null, mom = null, lever = null, last = null;
      jl.add(H.line([ud.CG.clone(), tailPt.clone()], { color: 'slate', dash: 0.2 }));
      App.label('lt', 'l<sub>t</sub> <i>tail arm</i>', () => Sc.W(jet, new THREE.Vector3(-1.9, 0.55, 0)), 'math');
      partLabels(jet, ['rudderSag', 'kuyrukSag', 'cg']);
      return {
        update() {
          const d = state.dr;
          Jet.setRudder(jet, d);
          if (d !== last) {
            last = d;
            [force, mom].forEach((o) => { if (o) { jl.remove(o); H.dispose(o); } });
            const F = Math.sign(d) * (0.6 + Math.abs(d) / 25 * 2.2);
            force = H.arrow(tailPt.clone(), tailPt.clone().add(new THREE.Vector3(0, 0, F)), { color: 'okra', width: 0.07 }); jl.add(force);
            mom = yawArrow(ud.CG.clone().add(new THREE.Vector3(0, -1.6, 0)), -Math.sign(d || 1), 1.6, 'crimson', Math.PI * (0.6 + Math.abs(d) / 25)); jl.add(mom);
            App.label('F', 'F<sub>y</sub> <i>rudder side force</i>', () => Sc.W(jet, tailPt.clone().add(new THREE.Vector3(0, 0.6, F))), 'math okra');
            App.label('N', 'N <i>yawing moment</i>' + (d === 0 ? ' = 0' : ''), () => Sc.W(jet, ud.CG.clone().add(new THREE.Vector3(2.4, -2.6, 0))), 'math crimson');
            App.label('dr', 'δ<sub>r</sub> = ' + d + '°', () => Sc.W(jet, new THREE.Vector3(-3.9, 2.2, 1.1)), 'math');
          }
        },
      };
    },
  });

  Sc.def(4, {
    title: 'The aircraft yaws: r̂ and Cnr', view: 'top', viewExtra: { radius: 24, target: new THREE.Vector3(1.6, 0, 0) },
    caption: 'Mode 1, the geometry of r̂: the circle is b/2 from the CG. At the tips (A) the blue V and the ochre r·b/2 add along one line; at P ahead of the CG (B) they form a right triangle with tan φ = r̂. Mode 2, the tail: it sweeps left, the air reaches it from the left (angle β_t), it is pushed right and the moment turns the nose left.',
    sliders: ['rhat'], defaults: { rhat: 0.25, mode: 0 },
    make({ ac, jet, jl, state }) {
      const ud = jet.userData, cg = ud.CG.clone();
      let key = null, objs = [];
      const add = (o) => { jl.add(o); objs.push(o); return o; };
      const clear = () => { objs.forEach((o) => { jl.remove(o); H.dispose(o); }); objs = []; App.clearLabels(); };
      const LV = 3.6;
      function buildGeom() {
        const rh = state.rhat;
        add(yawArrow(cg.clone().add(new THREE.Vector3(0, -1.2, 0)), 1, 1.3, 'okra'));
        App.label('r', 'r > 0', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(-1.2, -1.2, 1.7))), 'math okra');

        const ring = new THREE.Mesh(new THREE.TorusGeometry(SPAN, 0.03, 6, 96), new THREE.MeshBasicMaterial({ color: H.colorOf('slate') }));
        ring.geometry.rotateX(Math.PI / 2); ring.position.copy(cg).add(new THREE.Vector3(0, 0.08, 0)); add(ring);
        App.label('R', 'radius b/2', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(-SPAN * 0.72, 0.1, -SPAN * 0.72))), '');

        const y = 0.32;
        const tL = new THREE.Vector3(cg.x, y, -SPAN), tR = new THREE.Vector3(cg.x, y, SPAN);
        [tL, tR].forEach((t) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color: H.colorOf('ink') })); m.position.copy(t); add(m); });
        add(H.arrow(tL, tL.clone().add(new THREE.Vector3(LV, 0, 0)), { color: 'air', width: 0.055 }));
        add(H.arrow(tL.clone().add(new THREE.Vector3(LV, 0, 0)), tL.clone().add(new THREE.Vector3(LV + LV * rh + 0.001, 0, 0)), { color: 'okra', width: 0.055, head: 0.3 }));
        App.label('A1', 'A · left tip: V + r·b/2 = ' + (60 * (1 + rh)).toFixed(0) + ' m/s', () => Sc.W(jet, tL.clone().add(new THREE.Vector3(LV / 2, 0, -1.1))), 'math');
        add(H.arrow(tR, tR.clone().add(new THREE.Vector3(LV, 0, 0)), { color: 'air', width: 0.055 }));
        add(H.arrow(tR.clone().add(new THREE.Vector3(LV, 0, 0)), tR.clone().add(new THREE.Vector3(LV - LV * rh - 0.001, 0, 0)), { color: 'okra', width: 0.055, head: 0.3 }));
        App.label('A2', 'A · right tip: V − r·b/2 = ' + (60 * (1 - rh)).toFixed(0) + ' m/s', () => Sc.W(jet, tR.clone().add(new THREE.Vector3(LV / 2, 0, 1.1))), 'math');

        const P = new THREE.Vector3(cg.x + SPAN, y + 0.3, 0);
        const pm = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: H.colorOf('ink') })); pm.position.copy(P); add(pm);
        const vEnd = P.clone().add(new THREE.Vector3(LV, 0, 0));
        const sEnd = vEnd.clone().add(new THREE.Vector3(0, 0, LV * rh));
        add(H.arrow(P, vEnd, { color: 'air', width: 0.06 }));
        add(H.arrow(vEnd, sEnd.clone().add(new THREE.Vector3(0, 0, 0.001)), { color: 'okra', width: 0.06, head: 0.3 }));
        add(H.arrow(P, sEnd, { color: 'ink', width: 0.045 }));
        const arc = H.angleArc(P, new THREE.Vector3(1, 0, 0), new THREE.Vector3(LV, 0, LV * rh), 2.0, { color: 'okra' }); add(arc);
        App.label('P', 'P · b/2 ahead of the CG', () => Sc.W(jet, P.clone().add(new THREE.Vector3(-0.2, 0, -1.3))), '');
        App.label('V', 'V', () => Sc.W(jet, P.clone().add(new THREE.Vector3(LV * 0.55, 0, -0.55))), 'math air');
        App.label('S', 'r·b/2 (sideways, normal to V)', () => Sc.W(jet, vEnd.clone().add(new THREE.Vector3(0.9, 0, LV * rh / 2))), 'math okra');
        App.label('phi', 'φ: tan φ = r̂ = ' + rh.toFixed(2) + ' → ' + R2D(Math.atan(rh)).toFixed(0) + '°', () => Sc.W(jet, arc.userData.mid.clone().add(new THREE.Vector3(0.6, 0, 0.9))), 'math okra');
        App.label('res', 'actual path', () => Sc.W(jet, sEnd.clone().add(new THREE.Vector3(0.4, 0, 0.5))), 'math');
      }
      function buildTail() {
        const rh = state.rhat;
        const tailPt = new THREE.Vector3(-3.2, 0.9, 0);
        const lt = cg.x - tailPt.x;
        const side = LV * rh * (lt / SPAN);
        add(yawArrow(cg.clone().add(new THREE.Vector3(0, -1.2, 0)), 1, 1.6, 'okra'));
        add(H.line([cg.clone().add(new THREE.Vector3(0, 0.9, 0)), tailPt.clone()], { color: 'slate', dash: 0.2 }));

        add(H.arrow(tailPt.clone(), tailPt.clone().add(new THREE.Vector3(0, 0, -1.8)), { color: 'slate', width: 0.05 }));

        const from = tailPt.clone().add(new THREE.Vector3(LV, 0, -side));
        add(H.arrow(from, from.clone().add(new THREE.Vector3(-LV, 0, 0)), { color: 'air', width: 0.05 }));
        add(H.arrow(from.clone().add(new THREE.Vector3(-LV, 0, 0)), tailPt.clone().add(new THREE.Vector3(0, 0, -0.001)), { color: 'air', width: 0.05, head: 0.25 }));
        add(H.arrow(from, tailPt.clone(), { color: 'ink', width: 0.04 }));
        const arc = H.angleArc(tailPt.clone(), new THREE.Vector3(1, 0, 0), new THREE.Vector3(LV, 0, -side), 2.2, { color: 'okra' }); add(arc);

        add(H.arrow(tailPt.clone().add(new THREE.Vector3(-0.3, 0, 0)), tailPt.clone().add(new THREE.Vector3(-0.3, 0, 1.7)), { color: 'teal', width: 0.07 }));
        add(yawArrow(cg.clone().add(new THREE.Vector3(0, 1.1, 0)), -1, 2.2, 'teal'));
        App.label('r', 'r > 0 <i>yaw to the right</i>', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(0.4, -1.2, 2.4))), 'math okra');
        App.label('lt', 'l<sub>t</sub>', () => Sc.W(jet, new THREE.Vector3(-1.9, 0.9, 0.7)), 'math');
        App.label('vt', 'tail velocity r·l<sub>t</sub> (to the left)', () => Sc.W(jet, tailPt.clone().add(new THREE.Vector3(-1.1, 0, -3.0))), '');
        App.label('V', 'V', () => Sc.W(jet, from.clone().add(new THREE.Vector3(-LV * 0.5, 0, -0.75))), 'math air');
        App.label('rl', 'r·l<sub>t</sub>', () => Sc.W(jet, tailPt.clone().add(new THREE.Vector3(-0.8, 0, -side - 0.7))), 'math air');
        App.label('bt', 'β<sub>t</sub>: tan β<sub>t</sub> = r·l<sub>t</sub>/V = ' + (rh * lt / SPAN).toFixed(3), () => Sc.W(jet, arc.userData.mid.clone().add(new THREE.Vector3(1.0, 0, -1.7))), 'math okra');
        App.label('F', 'F<sub>y</sub> <i>side force (to the right)</i>', () => Sc.W(jet, tailPt.clone().add(new THREE.Vector3(-1.0, 0, 2.8))), 'math teal');
        App.label('N', 'N = −F<sub>y</sub>·l<sub>t</sub> < 0 <i>nose to the left: damping</i>', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(2.4, 1.1, -3.4))), 'math teal');
      }
      let yaw = 0;
      return {
        update(t, dt) {
          yaw += R2D(state.rhat * ((state.mode || 0) === 0 ? 1.2 : 4.5) * dt); Sc.pose(ac, { yaw, alpha: 0 });
          const k = (state.mode || 0) + '|' + state.rhat;
          if (k !== key) {
            const modeChanged = key === null || key.split('|')[0] !== String(state.mode || 0);
            key = k; clear();
            if ((state.mode || 0) === 0) { buildGeom(); if (modeChanged) App.setView('top', { radius: 24, target: new THREE.Vector3(1.6, 0, 0) }); }
            else { buildTail(); if (modeChanged) App.setView('top', { radius: 17, target: new THREE.Vector3(-1.8, 0, 0) }); }
          }
        },
      };
    },
  });

  Sc.def(5, {
    title: 'Yaw damping: the rotation slows itself down', view: 'top', viewExtra: { radius: 21 },
    caption: 'The aircraft is given a yaw rate and released. The damping moment (green) opposes the rotation and the rate decays exponentially. The loop restarts every 7 s.',
    sliders: [], defaults: {},
    make({ ac, jet, jl, state }) {
      const ud = jet.userData;
      let r = 1.2, yaw = 0, clock = 0;
      let rot = null, dmp = null;
      App.label('r', 'r <i>(instantaneous)</i>', () => Sc.W(jet, ud.CG.clone().add(new THREE.Vector3(-1.2, -1.2, 2.2))), 'math okra');
      App.label('N', 'N = C<sub>nr</sub>·r̂·q̄Sb (opposing)', () => Sc.W(jet, ud.CG.clone().add(new THREE.Vector3(2.4, 1.1, -1.8))), 'math teal');
      return {
        update(t, dt) {
          clock += dt;
          if (clock > 7) { clock = 0; r = 1.2; }
          r *= Math.exp(-dt * 0.55);
          yaw += R2D(r * dt);
          Sc.pose(ac, { yaw });
          const ang = Math.max(0.15, r / 1.2) * Math.PI * 1.2;
          [rot, dmp].forEach((o) => { if (o) { jl.remove(o); H.dispose(o); } });
          rot = yawArrow(ud.CG.clone().add(new THREE.Vector3(0, -1.2, 0)), 1, 1.6, 'okra', ang); jl.add(rot);
          dmp = yawArrow(ud.CG.clone().add(new THREE.Vector3(0, 1.1, 0)), -1, 2.2, 'teal', ang * 0.8); jl.add(dmp);
          App.label('rv', 'r = ' + r.toFixed(2) + ' rad/s', () => Sc.W(jet, ud.CG.clone().add(new THREE.Vector3(0, -1.2, -2.6))), 'math okra');
        },
      };
    },
  });

  Sc.def(6, {
    title: 'Linear superposition: the contributions add', view: 'top', viewExtra: { radius: 22 },
    caption: 'Acting together: sideslip β (ochre), yaw rate r̂ (green, a brake) and rudder δr (red). The classical model computes each one separately and adds them.',
    sliders: ['rhat', 'dr'], defaults: { rhat: 0.15, dr: 10 },
    make({ ac, jet, jl, layer, state }) {
      const ud = jet.userData;
      const cg = ud.CG.clone();
      const beta = 8;
      const wind = H.arrow(new THREE.Vector3(9.5, 0, 0), new THREE.Vector3(6.5, 0, 0), { color: 'air', width: 0.07 }); layer.add(wind);
      App.label('vinf', 'V<sub>∞</sub>', new THREE.Vector3(8, 0, 1.2), 'math air');
      App.label('beta', 'β = ' + beta + '° <i>sideslip</i>', () => Sc.W(jet, new THREE.Vector3(4.4, 0, -1.5)), 'math okra');
      const arcs = {};
      const rebuild = () => {
        Object.values(arcs).forEach((o) => { jl.remove(o); H.dispose(o); });
        const cB = 0.9, cR = -Math.min(1.6, state.rhat * 6), cD = -Math.sign(state.dr) * Math.abs(state.dr) / 25 * 1.3;
        arcs.b = yawArrow(cg.clone().add(new THREE.Vector3(0, -1.0, 0)), Math.sign(cB), 1.3, 'okra', Math.abs(cB)); jl.add(arcs.b);
        arcs.r = yawArrow(cg.clone().add(new THREE.Vector3(0, -1.0, 0)), Math.sign(cR || 1), 1.9, 'teal', Math.abs(cR) || 0.01); jl.add(arcs.r);
        arcs.d = yawArrow(cg.clone().add(new THREE.Vector3(0, -1.0, 0)), Math.sign(cD || 1), 2.5, 'crimson', Math.abs(cD) || 0.01); jl.add(arcs.d);
        const tot = cB + cR + cD;
        arcs.t = yawArrow(cg.clone().add(new THREE.Vector3(0, 1.4, 0)), Math.sign(tot || 1), 3.1, 'ink', Math.abs(tot) || 0.01); jl.add(arcs.t);
        App.label('tot', 'C<sub>n</sub> total ' + (tot > 0 ? '(to the right)' : '(to the left)'), () => Sc.W(jet, cg.clone().add(new THREE.Vector3(3.3, 1.4, 0))), 'math');
      };
      App.label('cb', 'C<sub>nβ</sub>·β', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(1.5, -1, 0.6))), 'math okra');
      App.label('cr', 'C<sub>nr</sub>·r̂', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(-2.1, -1, 0.9))), 'math teal');
      App.label('cd', 'C<sub>nδr</sub>·δ<sub>r</sub>', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(-2.7, -1, -1.4))), 'math crimson');
      let k = null;
      return { update() { Sc.pose(ac, { yaw: -beta }); Jet.setRudder(jet, state.dr); const key = state.rhat + '|' + state.dr; if (key !== k) { k = key; rebuild(); } } };
    },
  });

  Sc.def(7, {
    title: 'α = 40°: the flow separates', view: 'side', viewExtra: { radius: 23, theta: Math.PI / 2 + 0.25, phi: 1.35, target: new THREE.Vector3(1.0, 1.2, 0) },
    caption: 'The flow no longer follows the upper surface: a reversed, vortical region covers the wing and the tail. The wing colour shows how far the flow has separated.',
    sliders: ['alpha'], defaults: { alpha: 40 },
    make({ ac, jet, jl, layer, state }) {
      const prm = { alphaDeg: 40, speed: 6, sepL: 1, sepR: 1, wing: { le: 1.5, te: -3.0, span: 3.5 } };
      const fl = H.flow({ n: 1200, field: H.wingField(prm), streak: 0.15 }); jl.add(fl);
      const wind = H.arrow(new THREE.Vector3(9.2, -1.5, 0), new THREE.Vector3(7.0, -1.5, 0), { color: 'air', width: 0.07 }); layer.add(wind);
      App.label('vinf', 'V<sub>∞</sub>', new THREE.Vector3(7.6, -0.7, 0), 'math air');
      let arc = null, lastA = -1;
      App.label('sep', 'separated flow', () => Sc.W(jet, new THREE.Vector3(-1.2, 1.9, 2.0)), 'crimson');
      App.label('vtx', 'vortex', () => Sc.W(jet, new THREE.Vector3(-0.6, 1.0, -2.4)), 'crimson');
      App.label('tb', 'tail blanketing', () => Sc.W(jet, new THREE.Vector3(-3.6, 2.4, 0.8)), 'crimson');
      return {
        update() {
          const a = state.alpha; Sc.pose(ac, { alpha: a });
          prm.alphaDeg = a; const s = sepOfAlpha(a); prm.sepL = prm.sepR = s; Jet.setSeparation(jet, s, s);
          if (a !== lastA) {
            lastA = a;
            if (arc) { layer.remove(arc); H.dispose(arc); }
            const chordDir = new THREE.Vector3(1, 0, 0).applyQuaternion(ac.quaternion);
            arc = H.angleArc(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), chordDir, 4.6, { color: 'okra' }); layer.add(arc);
            App.label('alpha', 'α = ' + a + '°', arc.userData.mid.clone(), 'math okra');
          }
          fl.userData.update(App.state.playing ? 1 / 60 : 0);
        },
      };
    },
  });

  Sc.def(8, {
    title: 'Keep it turning: steady r > 0', view: 'iso', viewExtra: { theta: 2.4, phi: 0.55, radius: 22 },
    caption: 'Not an oscillation any more: the aircraft keeps turning the same way. The angular velocity ω = r·ẑ points along the body z axis (down).',
    sliders: ['rhat'], defaults: { rhat: 0.2 },
    make({ ac, jet, jl, state }) {
      const ud = jet.userData;
      const cg = ud.CG.clone();
      const om = H.arrow(cg.clone(), cg.clone().add(new THREE.Vector3(0, -3.2, 0)), { color: 'crimson', width: 0.07 }); jl.add(om);
      const rot = yawArrow(cg.clone().add(new THREE.Vector3(0, -2.0, 0)), 1, 2.4, 'okra', Math.PI * 1.6); jl.add(rot);
      App.label('om', 'ω = r·ẑ <i>angular velocity</i>', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(0, -3.9, 0))), 'math crimson');
      App.label('r', 'r > 0, constant', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(2.9, -2.0, 0))), 'math okra');
      let yaw = 0;
      return { update(t, dt) { yaw += R2D(state.rhat * 4.5 * dt); Sc.pose(ac, { yaw }); App.label('turn', 'turns: ' + Math.floor(yaw / 360), () => Sc.W(jet, cg.clone().add(new THREE.Vector3(-1, 2.2, 0))), ''); } };
    },
  });


  const SPAN = 3.5;
  const V0 = 60;

  function trail(layer, N, color) {
    const pts = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    geo.setDrawRange(0, 0);
    const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: H.colorOf(color || 'okra'), transparent: true, opacity: 0.8 }));
    l.frustumCulled = false; layer.add(l);
    let n = 0;
    return {
      push(p) {
        if (n < N) { pts.set([p.x, p.y, p.z], n * 3); n++; }
        else { pts.copyWithin(0, 3); pts.set([p.x, p.y, p.z], (N - 1) * 3); }
        geo.setDrawRange(0, n); geo.attributes.position.needsUpdate = true;
      },
      reset() { n = 0; geo.setDrawRange(0, 0); },
    };
  }

  function spinPose(ac, alpha, yawDeg) { Sc.pose(ac, { yaw: yawDeg, alpha }); }

  Sc.def(9, {
    title: 'The left and right wings see different airspeeds', view: 'top', viewExtra: { radius: 21 },
    caption: 'Turning right, the left wing sweeps forward (faster air) and the right wing falls back (slower air). Arrow lengths are proportional to V∞ ± r·y, not exaggerated.',
    sliders: ['rhat'], defaults: { rhat: 0.25 },
    make({ ac, jet, jl, state }) {
      const ud = jet.userData, cg = ud.CG.clone();
      const rot = yawArrow(cg.clone().add(new THREE.Vector3(0, -1.2, 0)), 1, 1.5, 'okra'); jl.add(rot);
      const stations = [-3.4, -2.55, -1.7, -0.85, 0.85, 1.7, 2.55, 3.4];
      const arrows = stations.map((z) => { const a = H.arrow(new THREE.Vector3(5, 0.15, z), new THREE.Vector3(2.2, 0.15, z), { color: z < 0 ? 'teal' : 'crimson', width: 0.045 }); jl.add(a); return a; });
      let last = null;
      App.label('r', 'r > 0', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(-1.4, -1.2, 1.9))), 'math okra');
      let yaw = 0;
      return {
        update(t, dt) {
          yaw += R2D(state.rhat * 4.5 * dt); Sc.pose(ac, { yaw });
          if (state.rhat !== last) {
            last = state.rhat;
            stations.forEach((z, i) => {
              const xle = 1.5 - 2.8 * Math.abs(z) / SPAN;
              const f = 1 - state.rhat * (z / SPAN);
              arrows[i].userData.set(new THREE.Vector3(xle + 0.4 + 2.6 * f, 0.15, z), new THREE.Vector3(xle + 0.4, 0.15, z));
            });
            const vl = (V0 * (1 + state.rhat)).toFixed(0), vr = (V0 * (1 - state.rhat)).toFixed(0);
            App.label('vl', 'V<sub>∞</sub> + r·|y| = ' + vl + ' m/s <i>left tip</i>', () => Sc.W(jet, new THREE.Vector3(2.2, 0.3, -4.6)), 'math teal');
            App.label('vr', 'V<sub>∞</sub> − r·y = ' + vr + ' m/s <i>right tip</i>', () => Sc.W(jet, new THREE.Vector3(2.2, 0.3, 4.6)), 'math crimson');
          }
        },
      };
    },
  });

  Sc.def(10, {
    title: 'Lift goes with the square of the speed', view: 'iso', viewExtra: { theta: 2.4, phi: 0.9, radius: 21 },
    caption: 'Lift arrows scale with (V_local/V∞)². The left wing lifts more, so the aircraft gets a rolling moment to the right: yaw has produced roll.',
    sliders: ['rhat'], defaults: { rhat: 0.25 },
    make({ ac, jet, jl, state }) {
      const ud = jet.userData, cg = ud.CG.clone();
      jl.add(yawArrow(cg.clone().add(new THREE.Vector3(0, -1.2, 0)), 1, 1.5, 'okra'));
      const pL = new THREE.Vector3(-1.4, 0.12, -2.4), pR = new THREE.Vector3(-1.4, 0.12, 2.4);
      const aL = H.arrow(pL, pL.clone().add(new THREE.Vector3(0, 2, 0)), { color: 'teal', width: 0.07 }); jl.add(aL);
      const aR = H.arrow(pR, pR.clone().add(new THREE.Vector3(0, 2, 0)), { color: 'crimson', width: 0.07 }); jl.add(aR);
      let roll = null, last = null, yaw = 0;
      return {
        update(t, dt) {
          yaw += R2D(state.rhat * 4.5 * dt); Sc.pose(ac, { yaw });
          if (state.rhat !== last) {
            last = state.rhat;
            const y = 2.4 / SPAN;
            const fL = (1 + state.rhat * y) ** 2, fR = (1 - state.rhat * y) ** 2;
            aL.userData.set(pL, pL.clone().add(new THREE.Vector3(0, 2.0 * fL, 0)));
            aR.userData.set(pR, pR.clone().add(new THREE.Vector3(0, 2.0 * fR, 0)));
            if (roll) { jl.remove(roll); H.dispose(roll); }
            roll = rollArrow(cg.clone().add(new THREE.Vector3(3.4, 0, 0)), 1, 1.1, 'crimson', Math.PI * Math.min(1.7, 0.4 + 6 * state.rhat)); jl.add(roll);
            App.label('ll', 'L<sub>left</sub> ∝ (1 + r·|y|/V)² = ' + fL.toFixed(2), () => Sc.W(jet, pL.clone().add(new THREE.Vector3(0, 2.0 * fL + 0.6, -0.6))), 'math teal');
            App.label('lr', 'L<sub>right</sub> ∝ (1 − r·y/V)² = ' + fR.toFixed(2), () => Sc.W(jet, pR.clone().add(new THREE.Vector3(0, 2.0 * fR + 0.6, 0.6))), 'math crimson');
            App.label('rollm', 'rolling moment → right wing down', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(3.4, 1.8, 0))), 'crimson');
          }
        },
      };
    },
  });

  function tipAlphas(alphaDeg, phat, rhat) {
    const a = D2R(alphaDeg);
    return {
      R: Math.atan2(Math.sin(a) + phat, Math.cos(a) - rhat),
      L: Math.atan2(Math.sin(a) - phat, Math.cos(a) + rhat),
    };
  }
  function tipWindGraphics(jl, jet, state, key) {
    const ud = jet.userData;
    const tips = { L: ud.tipL.clone().add(new THREE.Vector3(0, 0, -0.5)), R: ud.tipR.clone().add(new THREE.Vector3(0, 0, 0.5)) };
    const objs = {};
    return function rebuild() {
      Object.values(objs).forEach((o) => { jl.remove(o); H.dispose(o); });
      const al = tipAlphas(state.alpha, state.phat, state.rhat);
      ['L', 'R'].forEach((s) => {
        const ang = al[s];
        const from = new THREE.Vector3(Math.cos(ang), -Math.sin(ang), 0);
        const tip = tips[s];
        objs['w' + s] = H.arrow(tip.clone().addScaledVector(from, 3.3), tip.clone().addScaledVector(from, 0.4), { color: 'air', width: 0.055 }); jl.add(objs['w' + s]);
        objs['a' + s] = H.angleArc(tip.clone().addScaledVector(from, 2.5), new THREE.Vector3(1, 0, 0), from, 1.2, { color: s === 'L' ? 'teal' : 'crimson' }); jl.add(objs['a' + s]);
        App.label(key + s, 'α<sub>' + (s === 'L' ? 'left' : 'right') + '</sub> = ' + R2D(ang).toFixed(0) + '°', () => Sc.W(jet, tip.clone().addScaledVector(from, 2.5).add(new THREE.Vector3(1.0, 0.9, s === 'L' ? -0.6 : 0.6))), 'math ' + (s === 'L' ? 'teal' : 'crimson'));
      });
      return al;
    };
  }
  Sc.def(11, {
    title: 'The local angles of attack differ too', view: 'iso', viewExtra: { theta: 0.45, phi: 1.05, radius: 18 },
    caption: 'On the rotating aircraft the two tips see air from different directions: a larger α at the right tip, a smaller one at the left. Redness marks separation.',
    sliders: ['alpha', 'phat', 'rhat'], defaults: { alpha: 40, phat: 0.1, rhat: 0.1 },
    make({ ac, jet, jl, state }) {
      const rebuild = tipWindGraphics(jl, jet, state, 'ta');
      let key = null, yaw = 0;
      return {
        update(t, dt) {
          yaw += R2D(state.rhat * 3 * dt); spinPose(ac, state.alpha, yaw);
          const k = [state.alpha, state.phat, state.rhat].join('|');
          if (k !== key) { key = k; const al = rebuild(); Jet.setSeparation(jet, sepOfAlpha(R2D(al.L)), sepOfAlpha(R2D(al.R))); }
        },
      };
    },
  });

  Sc.def(12, {
    title: 'The classical method: test A (static) + test B (forced oscillation)', view: 'iso', viewExtra: { theta: 0.5, phi: 1.05, radius: 31 },
    caption: 'One model is held fixed and the loads are measured. The other is rocked left and right at small amplitude; Cnr comes from the rate-dependent part of the measured moment.',
    sliders: ['alpha'], defaults: { alpha: 30 },
    make({ ac, jet, jl, ac2, jet2, jl2, state }) {
      ac.position.set(0, 0, -6); ac2.visible = true; ac2.position.set(0, 0, 6);
      sting(jl, 3.2); sting(jl2, 3.2);
      App.label('A', 'Test A · static', () => Sc.W(jet, new THREE.Vector3(0, 3.2, 0)), 'okra');
      App.label('B', 'Test B · forced oscillation', () => Sc.W(jet2, new THREE.Vector3(0, 3.2, 0)), 'okra');
      App.label('B2', '±8°, small amplitude', () => Sc.W(jet2, new THREE.Vector3(-4.5, -1.5, 0)), 'math');
      let t0 = 0;
      return { update(t, dt) { t0 += dt; Sc.pose(ac, { alpha: state.alpha }); Sc.pose(ac2, { alpha: state.alpha, yaw: 8 * Math.sin(t0 * 2.2) }); } };
    },
  });

  Sc.def(13, {
    title: 'Is an oscillation the same physical state as a spin?', view: 'iso', viewExtra: { theta: 0.5, phi: 1.1, radius: 34 },
    caption: 'One model goes right, stops, left, stops. The other turns the same way without stopping, descending along a helix; its asymmetry is permanent.',
    sliders: ['rhat'], defaults: { rhat: 0.25 },
    make({ ac, jet, jl, ac2, jet2, jl2, layer, state }) {
      ac2.visible = true; ac2.position.set(0, 0, -7); sting(jl2, 3.0);
      const tr = trail(layer, 240, 'okra');
      App.label('B', 'forced oscillation', () => Sc.W(jet2, new THREE.Vector3(0, 3.2, 0)), 'okra');
      App.label('S', 'spin: steady rotation + descent', () => Sc.W(jet, new THREE.Vector3(0, 3.4, 0)), 'crimson');
      let t0 = 0, yaw = 0, sepT = 0;
      return {
        update(t, dt) {
          t0 += dt; yaw += R2D(state.rhat * 3.2 * dt);
          Sc.pose(ac2, { alpha: 30, yaw: 8 * Math.sin(t0 * 2.2) });
          const ph = D2R(yaw);
          ac.position.set(1.4 * Math.cos(ph), 5 - ((t0 * 1.1) % 10), 6 + 1.4 * Math.sin(ph));
          spinPose(ac, 45, yaw);
          if (((t0 * 1.1) % 10) < dt * 1.1 * 1.5) tr.reset();
          tr.push(Sc.W(jet, jet.userData.CG));
          sepT += dt; Jet.setSeparation(jet, 0.45, 1.0);
        },
      };
    },
  });

  Sc.def(14, {
    title: 'The rotary-balance rig', view: 'iso', viewExtra: { theta: 0.75, phi: 1.15, radius: 24, target: new THREE.Vector3(-2.5, 0, 0) },
    caption: 'The tunnel flow is horizontal. The model sits on an arm with its CG on the tunnel axis, and a motor turns the arm about the flow axis at constant Ω. A balance inside the model measures the forces and moments.',
    sliders: ['alpha', 'rhat'], defaults: { alpha: 45, rhat: 0.2 },
    make({ ac, jet, jl, layer, state }) {

      const tun = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 30, 48, 1, true), new THREE.MeshBasicMaterial({ color: '#7f8ea6', transparent: true, opacity: 0.07, side: THREE.BackSide, depthWrite: false }));
      tun.geometry.rotateZ(Math.PI / 2); layer.add(tun);
      [-15, 15].forEach((x) => { const r = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.08, 8, 64), new THREE.MeshBasicMaterial({ color: '#7f8ea6', transparent: true, opacity: 0.5 })); r.geometry.rotateY(Math.PI / 2); r.position.x = x; layer.add(r); });

      const fl = H.flow({ n: 900, streak: 0.14, opacity: 0.35, box: { x: [-15, 15], y: [-7, 7], z: [-7, 7] }, field: (p, o) => { o.set(-6, 0, 0); } }); layer.add(fl);

      const rig = new THREE.Group(); layer.add(rig);
      const metal = new THREE.MeshStandardMaterial({ color: '#6b7280', metalness: 0.6, roughness: 0.45 });
      const cyl = (a, b, r) => { const d = new THREE.Vector3().subVectors(b, a); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 14), metal); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); return m; };
      let arm = null, lastA = null;
      const motor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 1.8), metal); motor.position.set(-12.5, 0, 0); rig.add(motor);
      rig.add(cyl(new THREE.Vector3(-14, 0, 0), new THREE.Vector3(-3.5, 0, 0), 0.18));
      const om = H.arrow(new THREE.Vector3(-11, 0, 0), new THREE.Vector3(-7.5, 0, 0), { color: 'crimson', width: 0.08 }); layer.add(om);
      layer.add(H.rotArrow(new THREE.Vector3(-9.5, 0, 0), new THREE.Vector3(1, 0, 0), 1.6, Math.PI * 1.5, { color: 'crimson', sense: 1, width: 0.06 }));
      App.label('om', 'Ω <i>constant rate</i>, parallel to the flow', new THREE.Vector3(-9.5, 2.6, 0), 'math crimson');
      App.label('motor', 'motor and drive', new THREE.Vector3(-12.5, -1.8, 0), '');
      App.label('flow', 'tunnel flow V<sub>∞</sub>', new THREE.Vector3(3.5, 6.4, 0), 'math air');
      App.label('bal', 'balance <i>(internal, six components)</i>', () => Sc.W(jet, jet.userData.CG.clone().add(new THREE.Vector3(0.4, -2.6, 0))), 'okra');
      App.label('sting', 'sting and arm', () => Sc.W(jet, new THREE.Vector3(-6.3, 0.3, 0)), '');
      const wind = H.arrow(new THREE.Vector3(9.5, 5, 0), new THREE.Vector3(5.5, 5, 0), { color: 'air', width: 0.07 }); layer.add(wind);

      let pArr = null, rArr = null;
      const cg = jet.userData.CG.clone();
      let phase = 0;
      return {
        update(t, dt) {
          const a = state.alpha, Om = state.rhat * 3.0;
          phase += Om * dt;
          rig.rotation.x = phase;
          const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), phase);
          const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), D2R(a));
          ac.quaternion.copy(qx).multiply(qz);
          if (a !== lastA) {
            lastA = a;
            if (arm) { rig.remove(arm); H.dispose(arm); }
            while (jl.children.length) { const c = jl.children.pop(); H.dispose(c); }
            sting(jl, 1.4);
            const tail = new THREE.Vector3(-4.15 - 1.4, 0, 0).applyQuaternion(qz);
            arm = new THREE.Group();
            arm.add(cyl(new THREE.Vector3(tail.x, 0, 0), tail, 0.16));
            arm.add(cyl(new THREE.Vector3(-3.5, 0, 0), new THREE.Vector3(tail.x, 0, 0), 0.18));
            rig.add(arm);
            const L = 2.2 + state.rhat * 4;
            pArr = H.arrow(cg.clone(), cg.clone().add(new THREE.Vector3(L * Math.cos(D2R(a)), 0, 0)), { color: 'okra', width: 0.06 }); jl.add(pArr);
            rArr = H.arrow(cg.clone(), cg.clone().add(new THREE.Vector3(0, -L * Math.sin(D2R(a)), 0)), { color: 'teal', width: 0.06 }); jl.add(rArr);
            App.label('p', 'p = Ω·cos α', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(L * Math.cos(D2R(a)) + 0.7, 0.4, 0))), 'math okra');
            App.label('r', 'r = Ω·sin α', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(0.6, -L * Math.sin(D2R(a)) - 0.5, 0))), 'math teal');
            App.label('alpha', 'α = ' + a + '°', () => Sc.W(jet, new THREE.Vector3(3.8, 1.2, 0)), 'math');
          }
          fl.userData.update(App.state.playing ? 1 / 60 : 0);
        },
      };
    },
  });

  Sc.def(15, {
    title: 'Tangent or curve? The true Cn(r̂)', view: 'iso', viewExtra: { theta: 2.4, phi: 0.7, radius: 22 },
    caption: 'Same r̂ and α as the chart. Moment arrow: green opposes the rotation (damping), red follows it (autorotation). Its length is proportional to |Cn|.',
    sliders: ['alpha', 'rhat'], defaults: { alpha: 45, rhat: 0.15 },
    make({ ac, jet, jl, state }) {
      const cg = jet.userData.CG.clone();
      let mom = null, rot = null, key = null, yaw = 0;
      return {
        update(t, dt) {
          yaw += R2D(state.rhat * 3.2 * dt); spinPose(ac, state.alpha, yaw);
          const k = state.alpha + '|' + state.rhat;
          if (k !== key) {
            key = k;
            [mom, rot].forEach((o) => { if (o) { jl.remove(o); H.dispose(o); } });
            rot = yawArrow(cg.clone().add(new THREE.Vector3(0, -1.3, 0)), 1, 1.5, 'okra', Math.PI * Math.min(1.6, 0.3 + state.rhat * 4)); jl.add(rot);
            const Cn = Model.Cn(state.rhat, state.alpha);
            const col = Cn > 0 ? 'crimson' : 'teal';
            mom = yawArrow(cg.clone().add(new THREE.Vector3(0, 1.2, 0)), Math.sign(Cn || -1), 2.3, col, Math.min(Math.PI * 1.7, 0.15 + Math.abs(Cn) * 90)); jl.add(mom);
            App.label('cn', 'C<sub>n</sub>(r̂ = ' + state.rhat.toFixed(2) + ') = ' + Cn.toFixed(4) + (Cn > 0 ? ' → autorotation' : ' → damping'), () => Sc.W(jet, cg.clone().add(new THREE.Vector3(2.6, 1.4, -1.2))), 'math ' + col);
            const s = sepOfAlpha(state.alpha); Jet.setSeparation(jet, s * 0.5, s);
          }
        },
      };
    },
  });

  Sc.def(16, {
    title: 'Autorotation: the moment feeds the rotation', view: 'iso', viewExtra: { theta: 2.4, phi: 0.75, radius: 17 },
    caption: 'Ochre arrow: the rotation. Red arrow: the aerodynamic moment, in the same direction. Rotation → asymmetric separation → moment → more rotation. Red wing: separated.',
    sliders: ['rhat'], defaults: { rhat: 0.2, alpha: 45 },
    make({ ac, jet, jl, state }) {
      const cg = jet.userData.CG.clone();
      jl.add(yawArrow(cg.clone().add(new THREE.Vector3(0, -1.3, 0)), 1, 1.5, 'okra', Math.PI * 1.2));
      jl.add(yawArrow(cg.clone().add(new THREE.Vector3(0, 1.2, 0)), 1, 2.3, 'crimson', Math.PI * 1.2));
      App.label('rot', 'rotation r > 0', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(-1.6, -1.3, 1.9))), 'math okra');
      App.label('mom', 'C<sub>n</sub> > 0, same direction', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(2.6, 1.4, -1.4))), 'math crimson');
      App.label('sL', 'partly attached', () => Sc.W(jet, new THREE.Vector3(-1.5, 0.6, -2.6)), 'teal');
      App.label('sR', 'fully separated', () => Sc.W(jet, new THREE.Vector3(-1.5, 0.6, 2.6)), 'crimson');
      Jet.setSeparation(jet, 0.35, 1.0);
      let yaw = 0;
      return { update(t, dt) { yaw += R2D(state.rhat * 3.2 * dt); spinPose(ac, 45, yaw); } };
    },
  });

  Sc.def(17, {
    title: 'Flow memory: phase lag versus steady rotation', view: 'iso', viewExtra: { theta: 0.5, phi: 1.05, radius: 31 },
    caption: 'On the oscillating model the force (red) lags the motion (grey), and forced oscillation can measure that lag. On the steadily turning model the flow has settled and the asymmetry is permanent.',
    sliders: [], defaults: {},
    make({ ac, jet, jl, ac2, jet2, jl2, state }) {
      ac2.visible = true; ac2.position.set(0, 0, -6.5); ac.position.set(0, 0, 6.5);
      sting(jl2, 3.0); sting(jl, 3.0);
      const tail = new THREE.Vector3(-3.2, 1.0, 0);
      const mv = H.arrow(tail, tail.clone().add(new THREE.Vector3(0, 0, 1)), { color: 'slate', width: 0.05 }); jl2.add(mv);
      const fc = H.arrow(tail.clone().add(new THREE.Vector3(-0.4, 0, 0)), tail.clone().add(new THREE.Vector3(-0.4, 0, 1)), { color: 'crimson', width: 0.07 }); jl2.add(fc);
      App.label('mv', 'tail motion', () => Sc.W(jet2, tail.clone().add(new THREE.Vector3(0.9, 0.9, 0))), '');
      App.label('fc', 'force, lagging by φ', () => Sc.W(jet2, tail.clone().add(new THREE.Vector3(-1.2, -1.2, 0))), 'crimson');
      App.label('B', 'forced oscillation: time-dependent response', () => Sc.W(jet2, new THREE.Vector3(0, 3.4, 0)), 'okra');
      App.label('S', 'rotary balance: steady, settled flow', () => Sc.W(jet, new THREE.Vector3(0, 3.4, 0)), 'okra');
      Jet.setSeparation(jet, 0.35, 1.0);
      let t0 = 0, yaw = 0;
      return {
        update(t, dt) {
          t0 += dt; yaw += R2D(0.6 * dt);
          const w = 2.2, phi = D2R(60);
          Sc.pose(ac2, { alpha: 30, yaw: 8 * Math.sin(w * t0) });
          const vel = Math.cos(w * t0), force = -Math.cos(w * t0 - phi);
          mv.userData.set(tail, tail.clone().add(new THREE.Vector3(0, 0, -1.6 * vel || 0.01)));
          fc.userData.set(tail.clone().add(new THREE.Vector3(-0.4, 0, 0)), tail.clone().add(new THREE.Vector3(-0.4, 0, -1.6 * force || 0.01)));
          spinPose(ac, 30, yaw);
        },
      };
    },
  });

  Sc.def(18, {
    title: 'Derivation: how p and r change the local α along the span', view: 'iso', viewExtra: { theta: 0.35, phi: 1.0, radius: 18 },
    caption: 'The curve above the wing is α_local(y) − α along the span. p̂ tilts it (one tip up, the other down); r̂ adds in the same sense through the speed difference. Tip arrows show where the air comes from.',
    sliders: ['alpha', 'phat', 'rhat'], defaults: { alpha: 30, phat: 0.15, rhat: 0.1 },
    make({ ac, jet, jl, state }) {
      const cg = jet.userData.CG.clone();
      const rebuild = tipWindGraphics(jl, jet, state, 'ea');
      let key = null, prof = null, ref = null, pA = null, rA = null;
      App.label('prof', 'α<sub>local</sub>(y) − α <i>along the span</i>', () => Sc.W(jet, new THREE.Vector3(-1.0, 1.4, 0)), 'math');
      return {
        update() {
          Sc.pose(ac, { alpha: 0 });
          const k = [state.alpha, state.phat, state.rhat].join('|');
          if (k !== key) {
            key = k;
            [prof, ref, pA, rA].forEach((o) => { if (o) { jl.remove(o); H.dispose(o); } });
            const a = D2R(state.alpha), pts = [];
            for (let i = 0; i <= 40; i++) {
              const z = -SPAN + 2 * SPAN * i / 40, eta = z / SPAN;
              const al = Math.atan2(Math.sin(a) + state.phat * eta, Math.cos(a) - state.rhat * eta);
              pts.push(new THREE.Vector3(-1.0, 0.55 + R2D(al - a) * 0.055, z));
            }
            prof = H.line(pts, { color: 'okra' }); jl.add(prof);
            ref = H.line([new THREE.Vector3(-1.0, 0.55, -SPAN), new THREE.Vector3(-1.0, 0.55, SPAN)], { color: 'slate', dash: 0.2 }); jl.add(ref);
            const L = 1.6;
            pA = H.arrow(cg.clone(), cg.clone().add(new THREE.Vector3(L + 12 * Math.abs(state.phat), 0, 0)), { color: 'okra', width: 0.05 }); jl.add(pA);
            rA = H.arrow(cg.clone(), cg.clone().add(new THREE.Vector3(0, -(L + 12 * state.rhat), 0)), { color: 'teal', width: 0.05 }); jl.add(rA);
            App.label('pv', 'p̂ = ' + state.phat.toFixed(2), () => Sc.W(jet, cg.clone().add(new THREE.Vector3(L + 12 * Math.abs(state.phat) + 0.8, 0.3, 0))), 'math okra');
            App.label('rv', 'r̂ = ' + state.rhat.toFixed(2), () => Sc.W(jet, cg.clone().add(new THREE.Vector3(0.6, -(L + 12 * state.rhat) - 0.5, 0))), 'math teal');
            const al = rebuild();
            Jet.setSeparation(jet, sepOfAlpha(R2D(al.L)), sepOfAlpha(R2D(al.R)));
          }
        },
      };
    },
  });

  Sc.def(19, {
    title: 'Derivation: roll damping changes sign', view: 'iso', viewExtra: { theta: 0.25, phi: 1.1, radius: 18 },
    caption: 'The aircraft rolls right at p̂. At small α the descending (right) wing lifts more, so the moment opposes the roll (green). Past the stall peak the same wing lifts less and the moment drives the roll (red).',
    sliders: ['alpha', 'phat'], defaults: { alpha: 12, phat: 0.15 },
    make({ ac, jet, jl, state }) {
      const cg = jet.userData.CG.clone();
      const pL = new THREE.Vector3(-1.4, 0.12, -2.4), pR = new THREE.Vector3(-1.4, 0.12, 2.4);
      const aL = H.arrow(pL, pL.clone().add(new THREE.Vector3(0, 2, 0)), { color: 'ink', width: 0.07 }); jl.add(aL);
      const aR = H.arrow(pR, pR.clone().add(new THREE.Vector3(0, 2, 0)), { color: 'ink', width: 0.07 }); jl.add(aR);
      let roll = null, key = null, rollAng = 0, rotA = null;
      return {
        update(t, dt) {
          rollAng += R2D(state.phat * 2.5 * dt); Sc.pose(ac, { alpha: state.alpha, roll: rollAng });
          const k = state.alpha + '|' + state.phat;
          if (k !== key) {
            key = k;
            const eta = 2.4 / SPAN, a = D2R(state.alpha);
            const aR_ = R2D(Math.atan2(Math.sin(a) + state.phat * eta, Math.cos(a)));
            const aL_ = R2D(Math.atan2(Math.sin(a) - state.phat * eta, Math.cos(a)));
            const cL = Model.CL(aL_), cR = Model.CL(aR_);
            aL.userData.set(pL, pL.clone().add(new THREE.Vector3(0, 1.6 * cL, 0)));
            aR.userData.set(pR, pR.clone().add(new THREE.Vector3(0, 1.6 * cR, 0)));
            [roll, rotA].forEach((o) => { if (o) { jl.remove(o); H.dispose(o); } });
            rotA = rollArrow(cg.clone().add(new THREE.Vector3(4.2, 0, 0)), Math.sign(state.phat || 1), 0.9, 'okra', Math.PI * 1.3); jl.add(rotA);
            const dC = cR - cL;
            const sense = dC > 0 ? -Math.sign(state.phat || 1) : Math.sign(state.phat || 1);
            const col = dC * Math.sign(state.phat || 1) > 0 ? 'teal' : 'crimson';
            roll = rollArrow(cg.clone().add(new THREE.Vector3(2.6, 0, 0)), sense, 1.5, col, Math.min(Math.PI * 1.6, 0.2 + Math.abs(dC) * 8)); jl.add(roll);
            App.label('cl', 'C<sub>L,left</sub>(α = ' + aL_.toFixed(0) + '°) = ' + cL.toFixed(2), () => Sc.W(jet, pL.clone().add(new THREE.Vector3(0, 1.6 * cL + 0.6, -0.5))), 'math');
            App.label('cr', 'C<sub>L,right</sub>(α = ' + aR_.toFixed(0) + '°) = ' + cR.toFixed(2), () => Sc.W(jet, pR.clone().add(new THREE.Vector3(0, 1.6 * cR + 0.6, 0.5))), 'math');
            App.label('p', 'p̂ = ' + state.phat.toFixed(2), () => Sc.W(jet, cg.clone().add(new THREE.Vector3(4.2, 1.5, 0))), 'math okra');
            App.label('m', col === 'teal' ? 'roll damping' : 'autorotation', () => Sc.W(jet, cg.clone().add(new THREE.Vector3(2.6, -2.2, 0))), col);
            Jet.setSeparation(jet, sepOfAlpha(aL_), sepOfAlpha(aR_));
          }
        },
      };
    },
  });

  Sc.def(20, {
    title: 'One picture', view: 'iso', viewExtra: { theta: 0.6, phi: 1.1, radius: 26 },
    caption: 'High α + finite p and r + asymmetric separated flow = spin. The rotary balance measures the loads in exactly this state.',
    sliders: ['rhat'], defaults: { rhat: 0.25 },
    make({ ac, jet, jl, layer, state }) {
      const tr = trail(layer, 300, 'okra');
      const cg = jet.userData.CG.clone();
      jl.add(yawArrow(cg.clone().add(new THREE.Vector3(0, -1.3, 0)), 1, 1.5, 'okra', Math.PI * 1.2));
      jl.add(yawArrow(cg.clone().add(new THREE.Vector3(0, 1.2, 0)), 1, 2.2, 'crimson', Math.PI * 1.2));
      Jet.setSeparation(jet, 0.4, 1.0);
      let t0 = 0, yaw = 0;
      return {
        update(t, dt) {
          t0 += dt; yaw += R2D(state.rhat * 3.2 * dt);
          const ph = D2R(yaw);
          ac.position.set(1.6 * Math.cos(ph), 5 - ((t0 * 1.0) % 10), 1.6 * Math.sin(ph));
          spinPose(ac, 45, yaw);
          if (((t0 * 1.0) % 10) < dt * 1.5) tr.reset();
          tr.push(Sc.W(jet, jet.userData.CG));
        },
      };
    },
  });


  const Model = (() => {

    const K = [[0, 0], [6, 0.58], [12, 1.12], [16, 1.36], [19, 1.42], [23, 1.2], [28, 0.98], [35, 0.9], [45, 0.82], [55, 0.68], [65, 0.5]];
    function CL(a) {
      a = Math.max(0, Math.min(65, a));
      let i = 0; while (i < K.length - 2 && K[i + 1][0] < a) i++;
      const p0 = K[Math.max(0, i - 1)], p1 = K[i], p2 = K[i + 1], p3 = K[Math.min(K.length - 1, i + 2)];
      const t = (a - p1[0]) / (p2[0] - p1[0]);
      const t2 = t * t, t3 = t2 * t;
      return 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
    }
    const dCLda = (a) => (CL(a + 0.5) - CL(a - 0.5)) / 1.0;
    const Clp = (a) => -(dCLda(a) * 57.3) / 6;
    const s = (a) => { const x = Math.min(1, Math.max(0, (a - 22) / 22)); return x * x * (3 - 2 * x); };

    function Cn(rh, a) {
      const w = s(a);
      const lin = -0.25 * rh;
      const hi = rh * (-0.06 + 1.2 * rh - 3.0 * rh * rh);
      return (1 - w) * lin + w * hi;
    }
    const Cnr0 = (a) => (1 - s(a)) * (-0.25) + s(a) * (-0.06);
    return { CL, dCLda, Clp, Cn, Cnr0, s };
  })();

  const Charts = (() => {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (n, attrs, txt) => { const e = document.createElementNS(NS, n); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (txt != null) e.textContent = txt; return e; };
    const fmt = (x, d) => Number(x).toFixed(d == null ? 2 : d);

    function frame(W, H, dom, opts) {
      const m = { l: 46, r: 14, t: 14, b: 34 };
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.aria || '' });
      svg.style.fontFamily = 'var(--f-head)'; svg.style.fontSize = '11px';
      const X = (x) => m.l + (x - dom.x0) / (dom.x1 - dom.x0) * (W - m.l - m.r);
      const Y = (y) => H - m.b - (y - dom.y0) / (dom.y1 - dom.y0) * (H - m.t - m.b);

      (opts.xt || []).forEach((x) => { svg.appendChild(el('line', { x1: X(x), x2: X(x), y1: m.t, y2: H - m.b, stroke: 'currentColor', 'stroke-opacity': 0.12 })); svg.appendChild(el('text', { x: X(x), y: H - m.b + 15, 'text-anchor': 'middle', fill: 'currentColor' }, opts.xf ? opts.xf(x) : x)); });
      (opts.yt || []).forEach((y) => { svg.appendChild(el('line', { x1: m.l, x2: W - m.r, y1: Y(y), y2: Y(y), stroke: 'currentColor', 'stroke-opacity': y === 0 ? 0.5 : 0.12 })); svg.appendChild(el('text', { x: m.l - 6, y: Y(y) + 4, 'text-anchor': 'end', fill: 'currentColor' }, opts.yf ? opts.yf(y) : y)); });
      svg.appendChild(el('text', { x: W - m.r, y: H - 4, 'text-anchor': 'end', fill: 'currentColor', 'font-style': 'italic' }, opts.xl || ''));
      svg.appendChild(el('text', { x: 4, y: m.t + 2, fill: 'currentColor', 'font-style': 'italic' }, opts.yl || ''));
      return { svg, X, Y, m };
    }
    const path = (pts, X, Y) => pts.map((p, i) => (i ? 'L' : 'M') + fmt(X(p[0]), 1) + ' ' + fmt(Y(p[1]), 1)).join(' ');
    const col = (name) => getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();

    function cnR(host) {
      const st = App.state, a = st.alpha, rh = st.rhat;
      const W = 560, Hh = 300;
      const f = frame(W, Hh, { x0: 0, x1: 0.45, y0: -0.05, y1: 0.02 }, { xt: [0, 0.1, 0.2, 0.3, 0.4], yt: [-0.04, -0.02, 0, 0.02], xf: (x) => x.toFixed(1), yf: (y) => y.toFixed(2), xl: 'r̂ = rb / 2V', yl: 'Cₙ', aria: 'Yawing-moment coefficient against nondimensional yaw rate: the tangent line against the true curve' });
      const { svg, X, Y } = f;

      svg.appendChild(el('text', { x: X(0.43), y: Y(0.012), 'text-anchor': 'end', fill: col('crimson'), 'font-weight': 600 }, 'Cₙ > 0: autorotation'));
      svg.appendChild(el('text', { x: X(0.43), y: Y(-0.045), 'text-anchor': 'end', fill: col('teal'), 'font-weight': 600 }, 'Cₙ < 0: damping'));
      const N = 90, curve = [], tang = [];
      for (let i = 0; i <= N; i++) { const x = 0.45 * i / N; curve.push([x, Model.Cn(x, a)]); tang.push([x, Model.Cnr0(a) * x]); }

      const M = Math.max(1, Math.round(rh / 0.45 * N));
      const band = curve.slice(0, M + 1).concat(tang.slice(0, M + 1).reverse());
      svg.appendChild(el('path', { d: path(band, X, Y) + ' Z', fill: col('crimson'), 'fill-opacity': 0.18, stroke: 'none' }));
      svg.appendChild(el('path', { d: path(tang, X, Y), fill: 'none', stroke: col('slate'), 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }));
      svg.appendChild(el('path', { d: path(curve, X, Y), fill: 'none', stroke: col('okra'), 'stroke-width': 2.4 }));
      const cy = Model.Cn(rh, a), ty = Model.Cnr0(a) * rh;
      svg.appendChild(el('line', { x1: X(rh), x2: X(rh), y1: Y(cy), y2: Y(ty), stroke: col('crimson'), 'stroke-width': 1.5 }));
      svg.appendChild(el('circle', { cx: X(rh), cy: Y(cy), r: 5, fill: col('okra') }));
      svg.appendChild(el('circle', { cx: X(rh), cy: Y(ty), r: 4, fill: col('slate') }));
      svg.appendChild(el('text', { x: X(rh) + 8, y: Y(cy) - 6, fill: col('okra'), 'font-weight': 600 }, 'measured ' + fmt(cy, 4)));
      svg.appendChild(el('text', { x: X(rh) + 8, y: Y(ty) + 14, fill: col('slate') }, 'tangent estimate ' + fmt(ty, 4)));
      svg.appendChild(el('text', { x: X(0.02), y: Y(-0.03), fill: col('slate') }, 'slope = Cₙᵣ(α=' + a + '°) = ' + fmt(Model.Cnr0(a), 3)));
      host.replaceChildren(svg);
    }

    function clAlpha(host) {
      const st = App.state, a = st.alpha, ph = st.phat;
      const eta = 0.69, ar = Math.atan2(Math.sin(D2R(a)) + ph * eta, Math.cos(D2R(a))) * 57.3, al = Math.atan2(Math.sin(D2R(a)) - ph * eta, Math.cos(D2R(a))) * 57.3;
      const W = 560, Hh = 280;
      const f = frame(W, Hh, { x0: 0, x1: 60, y0: 0, y1: 1.6 }, { xt: [0, 10, 20, 30, 40, 50, 60], yt: [0, 0.5, 1.0, 1.5], yf: (y) => y.toFixed(1), xl: 'α (degrees)', yl: 'C_L', aria: 'Lift curve with the two points seen by the descending and the rising wing' });
      const { svg, X, Y } = f;
      const pts = []; for (let i = 0; i <= 120; i++) { const x = 60 * i / 120; pts.push([x, Model.CL(x)]); }
      svg.appendChild(el('path', { d: path(pts, X, Y), fill: 'none', stroke: col('ink'), 'stroke-width': 2.2 }));
      svg.appendChild(el('line', { x1: X(19), x2: X(19), y1: Y(0), y2: Y(1.55), stroke: col('crimson'), 'stroke-dasharray': '4 4', 'stroke-opacity': 0.7 }));
      svg.appendChild(el('text', { x: X(19) + 4, y: Y(1.5), fill: col('crimson') }, 'stall peak'));
      const cl = Model.CL(al), cr = Model.CL(ar);
      svg.appendChild(el('line', { x1: X(al), x2: X(ar), y1: Y(cl), y2: Y(cr), stroke: col('okra'), 'stroke-width': 2 }));
      svg.appendChild(el('circle', { cx: X(al), cy: Y(cl), r: 5, fill: col('teal') }));
      svg.appendChild(el('circle', { cx: X(ar), cy: Y(cr), r: 5, fill: col('crimson') }));
      svg.appendChild(el('text', { x: X(al) - 6, y: Y(cl) - 9, 'text-anchor': 'end', fill: col('teal'), 'font-weight': 600 }, 'rising (left) ' + fmt(al, 0) + '°'));
      svg.appendChild(el('text', { x: X(ar) + 6, y: Y(cr) + 16, fill: col('crimson'), 'font-weight': 600 }, 'descending (right) ' + fmt(ar, 0) + '°'));
      const dC = cr - cl;
      svg.appendChild(el('text', { x: X(31), y: Y(0.25), fill: dC > 0 ? col('teal') : col('crimson'), 'font-weight': 600 }, 'ΔC_L = C_L,right − C_L,left = ' + fmt(dC, 2) + (dC > 0 ? ' → damping' : ' → autorotation')));
      host.replaceChildren(svg);
    }

    function derivAlpha(host) {
      const st = App.state, a = st.alpha;
      const W = 560, Hh = 260;
      const f = frame(W, Hh, { x0: 0, x1: 60, y0: -0.6, y1: 0.3 }, { xt: [0, 10, 20, 30, 40, 50, 60], yt: [-0.6, -0.4, -0.2, 0, 0.2], yf: (y) => y.toFixed(1), xl: 'α (degrees)', yl: 'derivative', aria: 'Roll-damping derivative and effective yaw-damping derivative against angle of attack, and where they change sign' });
      const { svg, X, Y } = f;
      const p1 = [], p2 = [];
      for (let i = 0; i <= 120; i++) { const x = 60 * i / 120; p1.push([x, Math.max(-0.6, Math.min(0.3, Model.Clp(x)))]); p2.push([x, Math.max(-0.6, Math.min(0.3, Model.Cn(0.2, x) / 0.2))]); }
      svg.appendChild(el('path', { d: path(p1, X, Y), fill: 'none', stroke: col('okra'), 'stroke-width': 2.2 }));
      svg.appendChild(el('path', { d: path(p2, X, Y), fill: 'none', stroke: col('teal'), 'stroke-width': 2.2, 'stroke-dasharray': '7 4' }));
      svg.appendChild(el('line', { x1: X(a), x2: X(a), y1: Y(-0.6), y2: Y(0.3), stroke: col('slate'), 'stroke-dasharray': '3 3' }));
      svg.appendChild(el('text', { x: X(a) + 4, y: Y(0.27), fill: col('slate') }, 'α = ' + a + '°'));
      svg.appendChild(el('text', { x: X(2), y: Y(-0.5), fill: col('okra'), 'font-weight': 600 }, 'C_lp (roll damping)'));
      svg.appendChild(el('text', { x: X(2), y: Y(-0.56) + 12, fill: col('teal'), 'font-weight': 600 }, 'Cₙ(r̂=0.2)/r̂ (effective yaw damping)'));
      svg.appendChild(el('text', { x: X(36), y: Y(0.2), fill: col('crimson'), 'font-weight': 600 }, '> 0: autorotation region'));
      host.replaceChildren(svg);
    }

    const registry = { 'cn-r': cnR, 'cl-alpha': clAlpha, 'deriv-alpha': derivAlpha };
    function refresh() {
      document.querySelectorAll('[data-chart]').forEach((h) => { const fn = registry[h.dataset.chart]; if (fn) fn(h); });
      document.querySelectorAll('.chart-controls [data-state]').forEach((inp) => {
        const k = inp.dataset.state; inp.value = App.state[k];
        const b = inp.parentElement.querySelector('b'); if (b) b.textContent = k === 'alpha' ? App.state[k] + '°' : Number(App.state[k]).toFixed(2);
      });
    }
    function init() {
      document.querySelectorAll('.chart-controls [data-state]').forEach((inp) => {
        inp.addEventListener('input', () => { App.state[inp.dataset.state] = Number(inp.value); if (typeof syncSliders === 'function') syncSliders(); refresh(); });
      });
      refresh();
      new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refresh);
    }
    return { init, refresh };
  })();

  /* ---------- app: tabs drive the scene and the step panel ---------- */
  function syncSliders() {
    document.querySelectorAll('.controls .sl').forEach(function (lab) {
      var k = lab.dataset.sl, inp = lab.querySelector('input'), b = lab.querySelector('b');
      var v = App.state[k];
      inp.value = v;
      b.textContent = (k === 'alpha' || k === 'dr') ? v + '°' : Number(v).toFixed(2);
    });
    if (typeof Charts !== 'undefined') Charts.refresh();
  }

  function typeset(el) {
    if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
      MathJax.typesetPromise([el]).catch(function (err) { console.warn('[spin] MathJax:', err && err.message); });
    }
  }

  (function main() {
    Sc.init();
    App.start();

    var panels = Array.prototype.slice.call(document.querySelectorAll('.spin-step[data-step]'));
    var tablist = document.getElementById('spin-tabs');
    var ids = panels.map(function (p) { return Number(p.dataset.step); });
    var tabs = panels.map(function (p) {
      var id = Number(p.dataset.step);
      var b = document.createElement('button');
      b.type = 'button';
      b.id = 'tab-' + id;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', p.id);
      b.innerHTML = '<span class="n">' + id + '</span>' + p.dataset.tab;
      b.addEventListener('click', function () { activate(id, true); });
      tablist.appendChild(b);
      p.setAttribute('role', 'tabpanel');
      p.setAttribute('aria-labelledby', b.id);
      p.tabIndex = 0;
      return b;
    });

    var active = -1;
    function activate(id, fromUser) {
      if (ids.indexOf(id) < 0) id = ids[0];
      if (fromUser) {
        try { history.replaceState(null, '', '#step-' + id); } catch (e) { /* file:// may refuse */ }
      }
      if (id === active) return;
      active = id;
      panels.forEach(function (p, i) {
        var on = ids[i] === id;
        p.hidden = !on;
        tabs[i].setAttribute('aria-selected', String(on));
        tabs[i].tabIndex = on ? 0 : -1;
      });
      Sc.use(id);
      var panel = panels[ids.indexOf(id)];
      typeset(panel);
      Charts.refresh();
      var tab = tabs[ids.indexOf(id)];
      if (tablist.scrollWidth > tablist.clientWidth) {
        var tr = tab.getBoundingClientRect(), lr = tablist.getBoundingClientRect();
        tablist.scrollLeft += (tr.left + tr.width / 2) - (lr.left + lr.width / 2);
      }
      var scroller = document.getElementById('spin-panel');
      if (scroller) scroller.scrollTop = 0;
    }
    window.SpinActivate = activate;

    tablist.addEventListener('keydown', function (e) {
      var k = ids.indexOf(active), next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = ids[(k + 1) % ids.length];
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = ids[(k - 1 + ids.length) % ids.length];
      else if (e.key === 'Home') next = ids[0];
      else if (e.key === 'End') next = ids[ids.length - 1];
      if (next === null) return;
      e.preventDefault();
      activate(next, true);
      tabs[ids.indexOf(next)].focus();
    });

    document.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = Sc.defs[Sc.current] || {};
        App.setView(b.dataset.view, b.dataset.view === (d.view || 'iso') ? d.viewExtra : null);
      });
    });
    var play = document.getElementById('btn-play');
    function setPlay(on) {
      App.state.playing = on;
      play.setAttribute('aria-pressed', String(on));
      play.textContent = on ? 'Pause' : 'Play';
    }
    setPlay(App.state.playing);
    play.addEventListener('click', function () { setPlay(!App.state.playing); });
    var lb = document.getElementById('btn-labels');
    lb.addEventListener('click', function () {
      App.state.labels = !App.state.labels;
      lb.setAttribute('aria-pressed', String(App.state.labels));
    });
    document.querySelectorAll('.controls .sl input').forEach(function (inp) {
      inp.addEventListener('input', function () { App.state[inp.parentElement.dataset.sl] = Number(inp.value); syncSliders(); });
    });
    document.querySelectorAll('[data-set]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.dataset.set.split(';').forEach(function (kv) {
          var parts = kv.split('=');
          if (parts[0] && parts[1] !== undefined) App.state[parts[0].trim()] = Number(parts[1]);
        });
        if (b.dataset.view) App.setView(b.dataset.view);
        syncSliders();
      });
    });

    Charts.init();
    syncSliders();

    function fromHash() {
      var m = /^#step-(\d+)$/.exec(location.hash || '');
      return m ? Number(m[1]) : ids[0];
    }
    addEventListener('hashchange', function () { activate(fromHash(), false); });
    activate(fromHash(), false);
    if (!App.state.playing) setPlay(false);
  })();
})();
