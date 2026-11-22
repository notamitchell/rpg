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
// Wigglegram: A, a moment of both, B, a moment of both (300 ms holds, 90 ms blends, about 1.3 flicks a second),
// six seconds per card, then on to the next. Runs only while on screen; still for reduced-motion users.
(function () {
  var lens = document.getElementById('lens'), imgA = document.getElementById('lensA'), b = document.getElementById('lensB');
  var title = document.getElementById('cardTitle'), chips = [].slice.call(document.querySelectorAll('.cards button'));
  var HOLD = 300, BLEND = 90, PER_CARD = 6000, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cur = 0, raf = 0, t0 = 0, cardT0 = 0, visible = false, paused = false;
  function src(id, ab) { return 'assets/img/stereo/' + id + '-' + ab + '.jpg'; }
  function show(n) {
    cur = (n + chips.length) % chips.length;
    var c = chips[cur], id = c.dataset.card;
    imgA.src = src(id, 'a'); b.src = src(id, 'b'); imgA.alt = 'Stereograph: ' + c.title; title.textContent = c.title;
    chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
    var nx = chips[(cur + 1) % chips.length].dataset.card; new Image().src = src(nx, 'a'); new Image().src = src(nx, 'b');
    cardT0 = performance.now();
  }
  function frame(now) {
    var t = (now - t0) % (2 * (HOLD + BLEND));
    b.style.opacity = t < HOLD ? 0 : t < HOLD + BLEND ? .5 : t < 2 * HOLD + BLEND ? 1 : .5;
    if (now - cardT0 > PER_CARD) show(cur + 1);
    raf = requestAnimationFrame(frame);
  }
  function update() {
    cancelAnimationFrame(raf); raf = 0;
    if (visible && !paused && !reduce) { t0 = performance.now(); cardT0 = t0; raf = requestAnimationFrame(frame); }
    else b.style.opacity = 0;
    lens.classList.toggle('paused', paused && !reduce);
  }
  chips.forEach(function (c, n) { c.addEventListener('click', function () { show(n); update(); }); });
  function toggle() { paused = !paused; update(); }
  lens.addEventListener('click', toggle);
  lens.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; update(); }, { threshold: .25 }).observe(lens);
  else { visible = true; update(); }
  show(0);
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
  // Turns by itself: left, front, right, front, every 3.5 s. A click or the slider holds it for 12 s.
  var seq = ['left', 'middle', 'right', 'middle'], step = 0, holdUntil = 0;
  function setOn(view) { [].forEach.call(btns, function (x) { x.classList.toggle('on', x.dataset.view === view); }); }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(function () {
    if (Date.now() < holdUntil || document.hidden) return;
    step = (step + 1) % seq.length; turn({ left: TURN, middle: 0, right: -TURN }[seq[step]]); setOn(seq[step]);
  }, 3500);
  [].forEach.call(btns, function (x) { x.addEventListener('click', function () { holdUntil = Date.now() + 12000; step = seq.indexOf(x.dataset.view); }); });
  slider.addEventListener('input', function () { holdUntil = Date.now() + 12000; });
  window.addEventListener('resize', build);
})();

/* Ken Burns pans: any .kb with data-shots="[[ax,ay,az,bx,by,bz,secs],...]" and data-safe="l,t,r,b" */
(function () {
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches, GAP = 2.5;
  [].forEach.call(document.querySelectorAll('.kb[data-shots]'), function (box) {
    var img = box.querySelector('img');
    if (!img || !img.animate) return;
    var SHOTS = JSON.parse(box.dataset.shots.replace(/(^|[^\d])\./g, '$10.')), SAFE = (box.dataset.safe || '0,0,1,1').split(',').map(Number), anim = null;
    function cam(x, y, z, W, H, iw, ih) {
      var s = Math.max(W / ((SAFE[2] - SAFE[0]) * iw), H / ((SAFE[3] - SAFE[1]) * ih)) * z;
      var tx = Math.min(-SAFE[0] * iw * s, Math.max(W - SAFE[2] * iw * s, W / 2 - x * iw * s));
      var ty = Math.min(-SAFE[1] * ih * s, Math.max(H - SAFE[3] * ih * s, H / 2 - y * ih * s));
      return 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
    }
    function build() {
      var iw = img.naturalWidth, ih = img.naturalHeight, W = box.clientWidth, H = box.clientHeight;
      if (!iw || !W) return;
      img.style.width = iw + 'px'; img.style.height = ih + 'px';
      var total = 0, t = 0, frames = [];
      SHOTS.forEach(function (k) { total += k[6] + GAP; });
      SHOTS.forEach(function (k) {
        frames.push({ transform: cam(k[0], k[1], k[2], W, H, iw, ih), offset: t / total, easing: 'ease-in-out' });
        t += k[6];
        frames.push({ transform: cam(k[3], k[4], k[5], W, H, iw, ih), offset: t / total, easing: 'ease-in-out' });
        t += GAP;
      });
      frames.push({ transform: frames[0].transform, offset: 1 });
      var at = anim ? anim.currentTime : 0;
      if (anim) anim.cancel();
      if (still) { img.style.transform = frames[0].transform; return; }
      anim = img.animate(frames, { duration: total * 1000, iterations: Infinity });
      anim.currentTime = at || 0;
    }
    if (img.complete && img.naturalWidth) build(); else img.addEventListener('load', build);
    window.addEventListener('resize', build);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
      if (anim) { if (e[0].isIntersecting) anim.play(); else anim.pause(); }
    }).observe(box);
  });
})();

/* Handout viewer */
(function () {
  var dlg = document.getElementById('viewer');
  if (!dlg || !dlg.showModal) return;
  var img = document.getElementById('viewerImg'), title = document.getElementById('viewerTitle'), count = document.getElementById('viewerCount'), stage = document.getElementById('viewerStage');
  var sheets = [];
  [].forEach.call(document.querySelectorAll('.desk figure'), function (fig) {

    var imgs = [].slice.call(fig.querySelectorAll('.sheet img')).sort(function (a, b) { return a.classList.contains('under') - b.classList.contains('under'); });
    var first = sheets.length;
    imgs.forEach(function (im, i) {
      sheets.push({ src: im.getAttribute('src').replace('/handouts/', '/handouts/large/'), name: im.alt, alt: im.alt });
    });
    fig.querySelector('.sheet').addEventListener('click', function () { open(first); });
  });
  var at = 0;
  function show(n) {
    at = (n + sheets.length) % sheets.length;
    var s = sheets[at];
    stage.classList.remove('zoom'); stage.scrollTop = 0;
    img.src = s.src; img.alt = s.alt; title.textContent = s.name; count.textContent = (at + 1) + ' / ' + sheets.length;
    var nxt = new Image(); nxt.src = sheets[(at + 1) % sheets.length].src;
  }
  function open(n) { show(n); dlg.showModal(); }
  document.getElementById('viewerPrev').addEventListener('click', function () { show(at - 1); });
  document.getElementById('viewerNext').addEventListener('click', function () { show(at + 1); });
  document.getElementById('viewerClose').addEventListener('click', function () { dlg.close(); });
  img.addEventListener('click', function (e) { e.stopPropagation(); stage.classList.toggle('zoom'); });
  stage.addEventListener('click', function (e) { if (e.target === stage) dlg.close(); });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(at - 1);
    if (e.key === 'ArrowRight') show(at + 1);
  });
})();
