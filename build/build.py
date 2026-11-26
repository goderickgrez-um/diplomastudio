#!/usr/bin/env python3
"""Compila src/ en un único index.html offline (fuentes y librerías embebidas, CSP con hashes).
Uso: cd build && npm install && python3 build.py"""
import base64, hashlib, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
NM = pathlib.Path(__file__).resolve().parent / "node_modules"
STYLES = (("normal", 400), ("normal", 700), ("italic", 400))


def b64(p): return base64.b64encode(p.read_bytes()).decode()
def sri(text): return "'sha256-" + base64.b64encode(hashlib.sha256(text.encode()).digest()).decode() + "'"


def fonts():
    css, catalog = [], []
    for f in json.loads((ROOT / "build/fonts.json").read_text()):
        d = NM / "@fontsource" / f["id"] / "files"
        found = [(s, w) for s, w in STYLES if (d / f"{f['id']}-latin-{w}-{s}.woff2").exists()]
        if not found:
            sys.exit(f"Falta la fuente {f['id']} (npm install)")
        for s, w in found:
            css.append(f"@font-face{{font-family:'{f['name']}';font-style:{s};font-weight:{w};"
                       f"src:url(data:font/woff2;base64,{b64(d / f'{f['id']}-latin-{w}-{s}.woff2')}) format('woff2')}}")
        catalog.append({"name": f["name"], "cat": f["cat"]})
    return "".join(css), catalog


def main():
    font_css, catalog = fonts()
    css = font_css + (ROOT / "src/app.css").read_text()
    libs = [(NM / "jspdf/dist/jspdf.umd.min.js").read_text(),
            (NM / "read-excel-file/bundle/read-excel-file.min.js").read_text()]
    order = "util state frames render ui io main".split()
    app = "(()=>{'use strict';\nconst FONTS=" + json.dumps(catalog, ensure_ascii=False) + ";\n" + \
          "\n".join((ROOT / f"src/js/{n}.js").read_text() for n in order) + "\n})();"
    scripts = libs + [app]
    csp = ("default-src 'none'; img-src data: blob:; font-src data:; style-src 'unsafe-inline'; "
           f"script-src {' '.join(sri(s) for s in scripts)}; connect-src https://docs.google.com https://*.googleusercontent.com; "
           "base-uri 'none'; form-action 'none'; object-src 'none'")
    html = (ROOT / "src/index.html").read_text()
    html = html.replace("{{CSP}}", csp).replace("{{CSS}}", css).replace(
        "{{SCRIPTS}}", "".join(f"<script>{s}</script>" for s in scripts))
    (ROOT / "index.html").write_text(html)
    print(f"index.html: {len(html)/1e6:.2f} MB · {len(catalog)} familias de fuentes")


main()
