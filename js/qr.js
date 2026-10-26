/* ============================================================
   QR CODES — drawn when the page loads.

   To give an image a QR code, put a link straight after it and wrap
   the two in a qr-host span:

     <span class="qr-host">
       <img src="images/NEW.jpg" alt="…">
       <a class="qr" href="https://handle.slv.vic.gov.au/10381/123456"></a>
     </span>

   Optional classes on the link (see css/style.css):
     corner   qr--tl  qr--tr  qr--bl       (bottom-right by default)
     colour   qr--mono  qr--brown          (sepia by default)

   This script only draws the code from the link's href. It does not
   look at the image, so the result is the same wherever the page is
   opened: your browser, or the PDF pipeline.

   Needs js/qrcode.js (Kazuhiko Arase, MIT licence) loaded first.
   ============================================================ */
(function () {
  var BORDER = 2;   // quiet zone around the code, in modules

  document.querySelectorAll('a.qr').forEach(function (a) {
    var url = a.getAttribute('href');
    var parsed = new URL(url, location.href);
    // Capitals let QR use its compact alphanumeric mode (25x25 squares
    // instead of 29x29 for these links). Only safe when the path and
    // query have no lower-case letters; the domain ignores case.
    var compact = !/[a-z]/.test(parsed.pathname + parsed.search + parsed.hash);
    var qr = qrcode(0, 'L');
    qr.addData(compact ? url.toUpperCase() : url, compact ? 'Alphanumeric' : 'Byte');
    qr.make();

    var n = qr.getModuleCount(), d = '';
    for (var r = 0; r < n; r++)
      for (var c = 0; c < n; c++)
        if (qr.isDark(r, c)) d += 'M' + (c + BORDER) + ',' + (r + BORDER) + 'h1v1h-1z';
    var size = n + 2 * BORDER;
    a.innerHTML = '<svg aria-hidden="true" viewBox="0 0 ' + size + ' ' + size +
      '" shape-rendering="crispEdges"><path fill="currentColor" d="' + d + '"/></svg>';
    if (!a.title) a.title = 'Catalogue record';
  });
})();
