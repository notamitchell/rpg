// Build the slatted canvas: each slat shows its own slice of one continuous panning painting.
(function () {
  var host = document.getElementById('slats'); if (!host) return;
  var n = window.innerWidth < 600 ? 11 : 17;
  function build() {
    host.innerHTML = '';
    var w = host.clientWidth, h = host.clientHeight, slatW = w / n;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('div'); s.className = 'slat';
      var scale = h / 1311; // painting is 2400 x 1311 at height h
      s.style.backgroundSize = (2400 * scale) + 'px ' + h + 'px';
      s.style.setProperty('--o', (-i * slatW) + 'px');
      s.style.animationDuration = '90s';
      host.appendChild(s);
    }
    // keep keyframe distance equal to one painting width at this size
    var dist = 2400 * (h / 1311);
    document.documentElement.style.setProperty('--pan', dist + 'px');
    [].forEach.call(host.children, function (s) {
      s.animate && s.getAnimations().forEach(function (a) { a.cancel(); });
      var o = parseFloat(s.style.getPropertyValue('--o'));
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { s.style.backgroundPosition = o + 'px 0'; s.style.animation = 'none'; return; }
      s.style.animation = 'none';
      s.animate([{ backgroundPosition: o + 'px 0' }, { backgroundPosition: (o - dist) + 'px 0' }], { duration: 90000, iterations: Infinity });
    });
  }
  build();
  var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(build, 200); });
})();
// Wigglegram: A, a moment of both, B, a moment of both (300 ms holds, 90 ms blends), after a 3 s strobe warning.
(function () {
  var lens = document.getElementById('lens'), b = lens.querySelector('.r'), btn = document.getElementById('lensToggle');
  var warn = document.getElementById('strobe'), num = document.getElementById('strobeN');
  var HOLD = 300, BLEND = 90, WARN = 3000, raf = 0, t0 = 0, running = false;
  function frame(now) {
    var e = now - t0;
    if (e < WARN) { num.textContent = Math.ceil((WARN - e) / 1000); raf = requestAnimationFrame(frame); return; }
    warn.classList.remove('on');
    var t = (e - WARN) % (2 * (HOLD + BLEND));
    b.style.opacity = t < HOLD ? 0 : t < HOLD + BLEND ? .5 : t < 2 * HOLD + BLEND ? 1 : .5;
    raf = requestAnimationFrame(frame);
  }
  var imgA = document.getElementById('lensA'), title = document.getElementById('cardTitle');
  var chips = document.querySelectorAll('.cards button');
  [].forEach.call(chips, function (c) {
    c.addEventListener('click', function () {
      var id = c.dataset.card, name = c.title, pre = new Image();
      pre.src = 'assets/img/stereo/' + id + '-b.jpg';
      imgA.src = 'assets/img/stereo/' + id + '-a.jpg'; imgA.alt = 'Stereograph: ' + name;
      b.src = pre.src; title.textContent = name;
      [].forEach.call(chips, function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
    });
  });
  btn.addEventListener('click', function () {
    running = !running;
    if (running) { t0 = performance.now(); warn.classList.add('on'); raf = requestAnimationFrame(frame); btn.textContent = 'Hold it still'; }
    else { cancelAnimationFrame(raf); warn.classList.remove('on'); b.style.opacity = 0; btn.textContent = 'Look through the stereoscope'; }
  });
})();
// Triscenorama: slices of the front picture face us; between them, fronds at right angles carry the left and right pictures.
(function () {
  var view = document.getElementById('trisView'), model = document.getElementById('trisModel'), slider = document.getElementById('trisAngle');
  var SLICES = 12, TURN = 45, urls = ['assets/img/tris-left.jpg', 'assets/img/tris-middle.jpg', 'assets/img/tris-right.jpg'], built = 0;
  function build() {
    var vw = view.clientWidth, vh = view.clientHeight; if (!vw || vw === built) return; built = vw;
    view.style.perspective = (vw * 3.1) + 'px'; model.innerHTML = '';
    var sw = vw / SLICES, depth = sw, thick = Math.max(1, vw / 480);
    for (var i = 0; i < SLICES; i++) {
      var g = document.createElement('div'); g.className = 'slice'; g.style.width = sw + 'px';
      urls.forEach(function (u, idx) {
        var p = document.createElement('div'), side = idx !== 1, k = side ? depth / sw : 1;
        p.className = 'pane ' + ['pane-left pane-side', 'pane-center', 'pane-right pane-side'][idx];
        p.style.width = (side ? depth : sw) + 'px';
        if (idx === 0) p.style.transform = 'translateX(' + (-thick / 2) + 'px) rotateY(-90deg)';
        if (idx === 2) { p.style.left = (sw - depth) + 'px'; p.style.transform = 'translateX(' + (thick / 2) + 'px) rotateY(90deg)'; }
        p.style.backgroundImage = 'url(' + u + ')';
        p.style.backgroundSize = (vw * k) + 'px ' + vh + 'px';
        p.style.backgroundPosition = (-i * sw * k) + 'px 0px';
        g.appendChild(p);
      });
      [-thick / 2].concat(i === SLICES - 1 ? [sw - thick / 2] : []).forEach(function (x) {
        var e = document.createElement('div'); e.className = 'pane'; e.style.width = thick + 'px'; e.style.left = x + 'px';
        e.style.background = '#efe6d2'; e.style.filter = 'brightness(.75)'; e.style.transform = 'translateZ(' + depth + 'px)'; g.appendChild(e);
      });
      model.appendChild(g);
    }
  }
  function turn(deg, instant) {
    model.classList.toggle('instant', !!instant); model.style.transform = 'rotateY(' + deg + 'deg)';
    if (instant) void model.offsetWidth; model.classList.remove('instant'); slider.value = deg;
  }
  var btns = document.querySelectorAll('.tris-buttons button');
  [].forEach.call(btns, function (b) { b.addEventListener('click', function () {
    turn({ left: TURN, middle: 0, right: -TURN }[b.dataset.view]);
    [].forEach.call(btns, function (x) { x.classList.toggle('on', x === b); });
  }); });
  slider.addEventListener('input', function () { turn(+slider.value, true); [].forEach.call(btns, function (x) { x.classList.remove('on'); }); });
  build(); turn(TURN, true);
  window.addEventListener('resize', build);
})();
