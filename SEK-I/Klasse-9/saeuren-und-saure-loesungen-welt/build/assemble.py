#!/usr/bin/env python3
"""Assembler für die Teilchenwelt "Säuren und saure Lösungen".

Baut aus den modularen Quellen in src/ eine einzige, offline lauffähige
HTML-Datei in dist/. Niemals die Ausgabedatei direkt editieren — immer
hier in src/ arbeiten und neu bauen. Struktur/Assertions übernommen aus
der Schwesterwelt saeuren-basen-welt/build/assemble.py.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
OUTPUT_NAME = "saeuren-und-saure-loesungen-welt.html"
MAX_BYTES = 2_000_000

ENGINE_FILES = [
    "js/engine/chunk.js",
    "js/engine/mesher.js",
    "js/engine/atlas.js",
    "js/engine/renderer.js",
    "js/engine/controls.js",
    "js/engine/physics.js",
]

# Reihenfolge relevant: main.js braucht blocks.js (CODE_BY_ID) und stationen.js
# (baueStationen) bereits geladen.
GAME_FILES = [
    "js/game/blocks.js",
    "js/game/stationen.js",
    "js/game/main.js",
]

CSS_FILES = [
    "css/tokens.css",
    "css/hud.css",
    "css/touch.css",
]

DATA_FILES = {
    "BLOCKS": "data/blocks.json",
    "WORLD": "data/world.json",
}


def read_optional(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def build_css() -> str:
    parts = [read_optional(SRC / rel) for rel in CSS_FILES]
    return "\n".join(p for p in parts if p)


def build_vendor() -> str:
    return read_optional(SRC / "vendor/three.min.js")


def build_data() -> str:
    lines = []
    for var_name, rel in DATA_FILES.items():
        path = SRC / rel
        payload = json.loads(path.read_text(encoding="utf-8")) if path.exists() else ([] if var_name != "WORLD" else {})
        lines.append(f"window.SBW_{var_name} = {json.dumps(payload, ensure_ascii=False)};")
    return "\n".join(lines)


def build_js() -> str:
    parts = []
    for rel in ENGINE_FILES + GAME_FILES:
        content = read_optional(SRC / rel)
        if content:
            parts.append(f"// --- {rel} ---\n{content}")
    return "\n\n".join(parts)


def assemble() -> str:
    template = (SRC / "index.template.html").read_text(encoding="utf-8")
    html = template
    html = html.replace("<!--INJECT:css-->", build_css())
    html = html.replace("<!--INJECT:vendor-->", build_vendor())
    html = html.replace("<!--INJECT:data-->", build_data())
    html = html.replace("<!--INJECT:js-->", build_js())
    return html


def check_no_leftover_placeholders(html: str) -> None:
    assert "<!--INJECT:" not in html, (
        "Assembler-Fehler: mindestens ein <!--INJECT:...--> Platzhalter wurde nicht ersetzt."
    )


def check_no_network_refs(html: str) -> None:
    pattern = re.compile(r'(?:src|href)\s*=\s*["\']https?://', re.IGNORECASE)
    match = pattern.search(html)
    assert match is None, (
        f"Assembler-Fehler: externe Netzwerkreferenz gefunden ({match.group(0)!r})."
    )


def check_all_blocks_used() -> None:
    """Anders als bei der Schwesterwelt stehen Block-IDs hier nicht in world.json
    (das ist nur die grobe Weltgröße/Startposition), sondern als String-Literale
    direkt in stationen.js/main.js (Statuen werden programmatisch gestampft,
    nicht aus einer Zonen-Rezept-JSON gebaut). Prüft deshalb gegen den
    zusammengesetzten JS-Quellcode statt gegen world.json."""
    blocks_path = SRC / "data/blocks.json"
    world_path = SRC / "data/world.json"
    if not blocks_path.exists():
        return
    blocks = json.loads(blocks_path.read_text(encoding="utf-8"))
    js_source = "\n".join(read_optional(SRC / rel) for rel in ENGINE_FILES + GAME_FILES)
    world_source = read_optional(world_path)
    block_ids = {b["id"] for b in blocks}
    missing = [bid for bid in block_ids if f'"{bid}"' not in js_source and f'"{bid}"' not in world_source]
    assert not missing, f"Assembler-Fehler: Blocktypen ohne Vorkommen im JS-Quellcode oder world.json: {missing}"


def check_file_size(html: str) -> None:
    size = len(html.encode("utf-8"))
    assert size < MAX_BYTES, f"Assembler-Fehler: Ausgabedatei zu groß ({size} Bytes >= {MAX_BYTES} Bytes)."


def main() -> int:
    html = assemble()

    check_no_leftover_placeholders(html)
    check_no_network_refs(html)
    check_all_blocks_used()
    check_file_size(html)

    DIST.mkdir(parents=True, exist_ok=True)
    output_path = DIST / OUTPUT_NAME
    output_path.write_text(html, encoding="utf-8")

    size_kb = len(html.encode("utf-8")) / 1024
    print(f"OK: {output_path} geschrieben ({size_kb:.1f} KB)")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError as err:
        print(f"BUILD ABGEBROCHEN: {err}", file=sys.stderr)
        sys.exit(1)
