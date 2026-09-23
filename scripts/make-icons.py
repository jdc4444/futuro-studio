#!/usr/bin/env python3
"""The site's icon: butterflies in squares, after the opening logo animation (study 21, "Butterflies / floating sections",
public/motion/rotating.js: square frames turning against each other, a swarm of butterflies among them).

The butterfly is the study's own outline (the same Bezier curves as butterflyGeometry there, seen from above, wings open);
the squares are its floating sections seen flat. White on black, like the site. An icon is drawn for each size it is
shown at, not scaled down from one drawing: a browser tab's 16 pixels hold one frame and one butterfly, 32 hold two frames
and three, the home-screen icon the whole stack and a swarm.

  python3 scripts/make-icons.py            writes public/futuro-icon-v3-{16,32,48,180}.png, futuro-icon-v3.ico, futuro-icon-v3.svg,
                                           and the plain names crawlers ask for (favicon.ico, favicon.svg, favicon-32.png, apple-touch-icon.png)
Needs rsvg-convert (brew install librsvg). The wordmark icons before this one stay as futuro-icon-v2* and *-wordmark*."""
import os, struct, subprocess, tempfile

PUBLIC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")

# the study's wing outlines, y turned over for SVG (there: fore.moveTo(.008,.05) … hind.closePath()); one side, the other is its mirror
FORE = "M.008-.05C.085-.18 .19-.33 .265-.285C.345-.245 .325-.10 .245-.055C.15-.005 .045.025 .01-.015Z"
HIND = "M.015-.035C.12-.035 .28.005 .24.14C.215.26 .095.285 .026.11Z"
VEINS = [(.258, -.254), (.284, -.163), (.237, -.068), (.219, .092), (.179, .197), (.087, .196)]   # the white marks of the study's wings, here dark on white


def butterfly(x, y, span, turn=0, fold=1.0, body=.02, veins=False, feelers=False, ink="#fff"):
    """one butterfly, `span` wide from wingtip to wingtip when open; fold < 1 is a wing beat caught part way"""
    k = span / .69; wing = f'<path d="{FORE}"/><path d="{HIND}"/>'
    if veins: wing += "".join(f'<path d="M.025-.013Q{ex * .62:.3f} {ey * .48:.3f} {ex} {ey}" fill="none" stroke="#000" stroke-width=".007" stroke-linecap="round"/>' for ex, ey in VEINS)
    out = f'<g transform="translate({x} {y}) rotate({turn}) scale({k:.3f})" fill="{ink}">'
    out += f'<g transform="scale({fold} 1)">{wing}</g><g transform="scale({-fold} 1)">{wing}</g>'
    out += f'<ellipse cx="0" cy=".025" rx="{body}" ry=".13"/>'
    if feelers: out += "".join(f'<path d="M{s * .005}-.085L{s * .03}-.145L{s * .065}-.16" fill="none" stroke="{ink}" stroke-width=".008" stroke-linecap="round" stroke-linejoin="round"/>' for s in (1, -1))
    return out + "</g>"


def frame(c, side, turn, width, opacity=1.0, dx=0, dy=0):
    return f'<rect x="{c - side / 2 + dx}" y="{c - side / 2 + dy}" width="{side}" height="{side}" fill="none" stroke="#fff" stroke-width="{width}" opacity="{opacity}" transform="rotate({turn} {c + dx} {c + dy})"/>'


def icon(px):
    """the drawing for an icon `px` pixels wide, in its own pixels"""
    c = px / 2
    if px <= 16:     # a tab at 1x: one frame, one butterfly, nothing finer than a pixel
        art = frame(c, 11, -14, 1.15) + butterfly(c, c + .2, 7.8, 20, body=.055)   # the frame's corners stay inside the icon
        field = f'<rect width="{px}" height="{px}" rx="3.2" fill="#000"/>'
    elif px <= 32:   # a tab at 2x: two frames turning against each other, three butterflies
        art = frame(c, 21.5, -21, 1.3) + frame(c, 21.5, 9, 1.3, .62)
        art += butterfly(c - 2.6, c - 3.2, 10.6, -24, body=.034) + butterfly(c + 5.4, c + 1.4, 7.4, 31, .78, body=.036) + butterfly(c - 3.4, c + 6.0, 6.8, 12, .78, body=.04)
        field = f'<rect width="{px}" height="{px}" rx="6.4" fill="#000"/>'
    elif px <= 64:   # 48: three frames, five butterflies
        art = frame(c, 32, -24, 1.35) + frame(c, 32, -4, 1.35, .7) + frame(c, 32, 17, 1.35, .45)
        for x, y, s, t, f in ((-5, -6, 14, -26, 1), (8, -1.5, 10.5, 28, .8), (-7.5, 7.5, 9, 14, .62), (4.5, 9.5, 7.5, -38, .9), (1.5, -13, 6.5, 40, .7)):
            art += butterfly(c + x, c + y, s, t, f, body=.03)
        field = f'<rect width="{px}" height="{px}" rx="9.6" fill="#000"/>'
    else:            # the home-screen icon: the whole stack, its floor, a swarm; the phone rounds the corners itself
        u = px / 180
        art = frame(c, 118 * u, -23, 2.2 * u, .34, dy=9 * u)   # the floor, a little larger, a little lower
        art += frame(c, 104 * u, -27, 2.4 * u) + frame(c, 104 * u, -6, 2.4 * u, .72) + frame(c, 104 * u, 16, 2.4 * u, .46)
        swarm = ((-17, -21, 40, -28, 1), (26, -7, 30, 27, .82), (-27, 20, 27, 13, .64), (13, 28, 23, -36, .92), (3, -44, 20, 41, .72),
                 (-44, -6, 17, 52, .85), (42, 27, 15, -15, .58), (-9, 47, 14, 66, .76), (36, -37, 13, -52, .9), (-38, -41, 11, 22, .66), (52, 4, 10, 8, .8), (-52, 33, 9, -30, .7))
        for x, y, s, t, f in swarm: art += butterfly(c + x * u, c + y * u, s * u, t, f, body=.022, veins=s >= 23, feelers=s >= 20)
        field = f'<rect width="{px}" height="{px}" fill="#000"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" viewBox="0 0 {px} {px}">{field}{art}</svg>'


def logo_icon(px):
    """The clean FUTURO wordmark in the opening screen's proportions.

    A favicon is too small for the butterfly/square study to remain legible.
    Those remain a separate v3 exploration; the canonical mark is simply the
    all-caps wordmark on the black field.
    """
    c = px / 2
    # Rasterise each size independently, so PNG/ICO fallbacks preserve the
    # wordmark without the browser needing a locally-installed typeface.
    font = max(3.8, px * .178)
    word = (f'<text x="{c}" y="{px * .565:.3f}" text-anchor="middle" fill="#fff" '
            f'font-family="Raleway, sans-serif" font-size="{font:.3f}" font-weight="700" '
            f'letter-spacing="{max(.25, px * .018):.3f}">FUTURO</text>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" viewBox="0 0 {px} {px}">'
            f'<rect width="{px}" height="{px}" rx="{px * .2:.3f}" fill="#000"/>{word}</svg>')


def png(svg, px, path):
    with tempfile.NamedTemporaryFile("w", suffix=".svg", delete=False) as f: f.write(svg)
    try: subprocess.run(["rsvg-convert", "-w", str(px), "-h", str(px), "-o", path, f.name], check=True)
    finally: os.remove(f.name)


def ico(pngs, path):
    """an .ico holding these PNG files as they are (every size its own drawing)"""
    blobs = [(px, open(p, "rb").read()) for px, p in pngs]; offset = 6 + 16 * len(blobs); head = struct.pack("<HHH", 0, 1, len(blobs)); body = b""
    for px, data in blobs:
        head += struct.pack("<BBBBHHII", px % 256, px % 256, 0, 0, 1, 32, len(data), offset + len(body)); body += data
    open(path, "wb").write(head + body)


def main():
    made = {}
    for px in (16, 32, 48, 180):
        made[px] = os.path.join(PUBLIC, f"futuro-icon-v3-{px}.png"); png(icon(px), px, made[px])
    ico([(px, made[px]) for px in (16, 32, 48)], os.path.join(PUBLIC, "futuro-icon-v3.ico"))
    open(os.path.join(PUBLIC, "futuro-icon-v3.svg"), "w").write(icon(32))   # browsers that take a vector icon scale the 32 pixel drawing
    # the plain names, for whoever asks without reading the page (crawlers, feed readers, chat previews)
    ico([(px, made[px]) for px in (16, 32, 48)], os.path.join(PUBLIC, "favicon.ico"))
    open(os.path.join(PUBLIC, "favicon.svg"), "w").write(icon(32))
    for name, px in (("favicon-32.png", 32), ("apple-touch-icon.png", 180)): open(os.path.join(PUBLIC, name), "wb").write(open(made[px], "rb").read())

    # The full site wordmark becomes canonical; the more abstract v3 study
    # remains available but is intentionally not used as the favicon.
    brand = {}
    for px in (16, 32, 48, 180):
        brand[px] = os.path.join(PUBLIC, f"futuro-logo-v1-{px}.png")
        png(logo_icon(px), px, brand[px])
    ico([(px, brand[px]) for px in (16, 32, 48)], os.path.join(PUBLIC, "futuro-logo-v1.ico"))
    open(os.path.join(PUBLIC, "futuro-logo-v1.svg"), "w").write(logo_icon(32))
    ico([(px, brand[px]) for px in (16, 32, 48)], os.path.join(PUBLIC, "favicon.ico"))
    open(os.path.join(PUBLIC, "favicon.svg"), "w").write(logo_icon(32))
    for name, px in (("favicon-32.png", 32), ("apple-touch-icon.png", 180)):
        open(os.path.join(PUBLIC, name), "wb").write(open(brand[px], "rb").read())
    print("icons written to", PUBLIC)


if __name__ == "__main__": main()
