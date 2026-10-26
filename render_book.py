import asyncio, glob, io, os, shutil, subprocess, sys
from playwright.async_api import async_playwright
from pypdf import PdfReader, PdfWriter

A4_PX = (794, 1123)          # 210 x 297 mm at 96 px per inch

# extra stylesheets added after style.css, per variant
VARIANT_CSS = {
    "digital": [],
    "colour":  ["css/print-colour.css"],
    "bw":      ["css/print-colour.css", "css/print-bw.css"],
}
VARIANT_SUFFIX = {"digital": "-digital", "colour": "-print-colour", "bw": "-print-bw"}

WAIT_FOR_ASSETS = """async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(img => img.complete ? null :
    new Promise(r => { img.onload = img.onerror = r; })));
  return [...document.images].filter(i => !i.naturalWidth).map(i => i.getAttribute('src'));
}"""

# For each .page sheet: how far (in px) content runs past the bottom of the
# sheet, and how far it runs into the page number (folio) at the foot.
OVERFLOW = """() => [...document.querySelectorAll('.page')].map(p => {
  const r = p.getBoundingClientRect(), folio = p.querySelector('.folio');
  const ft = folio ? folio.getBoundingClientRect().top : Infinity;
  let sheet = 0, intoFolio = 0;
  p.querySelectorAll('*').forEach(el => {
    if (el.ownerSVGElement) return;   // parts of a drawing are clipped by the drawing itself
    if (getComputedStyle(el).position === 'absolute') return;
    if (folio && (el === folio || folio.contains(el))) return;
    const b = el.getBoundingClientRect();
    if (!b.height) return;
    sheet = Math.max(sheet, b.bottom - r.bottom);
    // only text-bearing boxes count against the folio (full-bleed photos may run behind it)
    if (el.tagName !== 'IMG' && b.width < r.width - 1 && el.textContent.trim())
      intoFolio = Math.max(intoFolio, b.bottom - ft);
  });
  return [Math.round(sheet), Math.round(intoFolio)];
})"""


async def render(book_dir, out_pdf, png_dir=None, variant="digital"):
    # only the numbered pages (00cover.html, 01page.html ...): anything else in
    # the folder, such as index.html, is a browsing aid and stays out of the PDF
    # alternative drafts (18page_b.html ...) are for side-by-side browsing only
    files = sorted(f for f in glob.glob(os.path.join(book_dir, "[0-9]*.html"))
                   if not os.path.basename(f).endswith("_b.html"))
    if not files:
        sys.exit(f"No HTML files found in {book_dir}")
    writer, problems = PdfWriter(), []

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": A4_PX[0], "height": A4_PX[1]})
        await page.emulate_media(media="print")

        for f in files:
            name = os.path.basename(f)
            # a landscape sheet (.page.landscape) is laid out in a landscape window
            await page.set_viewport_size({"width": A4_PX[0], "height": A4_PX[1]})
            await page.goto("file://" + os.path.abspath(f), wait_until="networkidle")
            if await page.evaluate("!!document.querySelector('.page.landscape')"):
                await page.set_viewport_size({"width": A4_PX[1], "height": A4_PX[0]})
                await page.reload(wait_until="networkidle")
            for css in VARIANT_CSS[variant]:
                await page.add_style_tag(path=os.path.join(book_dir, css))
            missing = await page.evaluate(WAIT_FOR_ASSETS)
            if missing:
                problems.append(f"{name}: image(s) missing: {', '.join(missing)}")
            for sheet, into_folio in await page.evaluate(OVERFLOW):
                if sheet > 0:
                    problems.append(f"{name}: content runs {sheet}px past the bottom of the sheet")
                if into_folio > 0:
                    problems.append(f"{name}: text runs {into_folio}px into the page number")

            pdf = await page.pdf(prefer_css_page_size=True, print_background=True,
                                 margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})
            pages = PdfReader(io.BytesIO(pdf)).pages
            if len(pages) != 1:
                problems.append(f"{name}: printed as {len(pages)} pages instead of 1")
            for pg in pages:
                writer.add_page(pg)
            print(f"  {name}")

        await browser.close()

    with open(out_pdf, "wb") as fh:
        writer.write(fh)
    if variant == "bw":
        to_greyscale(out_pdf)
    print(f"\nSaved {out_pdf} [{variant}] ({len(writer.pages)} pages from {len(files)} files)")

    if png_dir:   # previews are pictures of the PDF itself
        import pymupdf
        os.makedirs(png_dir, exist_ok=True)
        for i, pg in enumerate(pymupdf.open(out_pdf)):
            pg.get_pixmap(dpi=96).save(os.path.join(png_dir, f"{i + 1:02d}.png"))

    print("\nProblems:" if problems else "No problems found.")
    for line in problems:
        print("  - " + line)
    return problems


def to_greyscale(pdf):
    """Rewrite the PDF in greys only, so the printer lays down black toner
    or ink and nothing else. Images keep up to 300 dpi."""
    gs = shutil.which("gs") or shutil.which("gswin64c")
    if not gs:
        sys.exit("The black-and-white PDF needs Ghostscript: install it "
                 "(e.g. `brew install ghostscript`) and run again.")
    tmp = pdf + ".grey.pdf"
    subprocess.run([gs, "-q", "-dNOPAUSE", "-dBATCH", "-dSAFER", "-sDEVICE=pdfwrite",
                    "-dCompatibilityLevel=1.6", "-dPDFSETTINGS=/prepress",
                    "-sColorConversionStrategy=Gray", "-dProcessColorModel=/DeviceGray",
                    "-dAutoRotatePages=/None", "-o", tmp, pdf], check=True)
    os.replace(tmp, pdf)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = {}
    for flag in ("--png", "--variant"):
        if flag in sys.argv:
            opts[flag] = sys.argv[sys.argv.index(flag) + 1]
            args.remove(opts[flag])
    book = args[0] if args else "new"
    out = args[1] if len(args) > 1 else "combined_document.pdf"
    png, variant = opts.get("--png"), opts.get("--variant", "digital")
    if variant not in ("all", *VARIANT_CSS):
        sys.exit(f"--variant must be digital, colour, bw or all, not {variant}")
    if variant != "all":
        asyncio.run(render(book, out, png, variant))
    else:
        stem = os.path.splitext(out)[0]
        for v, suffix in VARIANT_SUFFIX.items():
            asyncio.run(render(book, stem + suffix + ".pdf",
                               png and os.path.join(png, v), v))
