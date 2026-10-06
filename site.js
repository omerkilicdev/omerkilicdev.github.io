// Shared by the project pages: theme toggle and reading progress.
(function () {
  var root = document.documentElement;
  var btn = document.getElementById('light-toggle');
  if (btn) {
    btn.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme');
      var next = cur === 'light' ? 'dark' : (cur === 'dark' ? null : 'light');
      if (next) { root.setAttribute('data-theme', next); } else { root.removeAttribute('data-theme'); }
      try { next ? localStorage.setItem('theme', next) : localStorage.removeItem('theme'); } catch (e) {}
    });
  }

  var bar = document.getElementById('progress-bar');
  if (!bar) return;
  var ticking = false;
  function update() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(h.scrollTop / max, 1) : 0) + ')';
    ticking = false;
  }
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

// On narrow screens the nav row scrolls sideways; keep the current page in view.
(function () {
  var ul = document.querySelector('.navbar ul'), a = document.querySelector('.navbar a.active');
  if (ul && a && ul.scrollWidth > ul.clientWidth) {
    var r = a.getBoundingClientRect(), u = ul.getBoundingClientRect();
    ul.scrollLeft += (r.left + r.width / 2) - (u.left + u.width / 2);
  }
})();
