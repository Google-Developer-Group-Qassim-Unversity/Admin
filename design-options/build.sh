#!/usr/bin/env bash
# Assembles src/ into one self-contained HTML file.
#   design-options/build.sh          -> gdg-admin-designs.html (every design)
#   design-options/build.sh <id>     -> .preview-<id>.html (only src/d*-<id>.js; for agents working in parallel)
set -euo pipefail
cd "$(dirname "$0")"
ONLY="${1:-}" python3 - <<'PY'
import os, pathlib
src = pathlib.Path("src")
only = os.environ.get("ONLY", "")
designs = sorted(p.name for p in src.glob("d[0-9]-*.js") if not only or p.stem.split("-", 1)[1] == only)
parts = ["logo.js", "data.js"] + designs
scripts = "\n".join(f"<script>\n/* {p} */\n{(src / p).read_text()}\n</script>" for p in parts)
html = (src / "harness.html").read_text().replace("<!--SCRIPTS-->", scripts)
out = pathlib.Path(f".preview-{only}.html" if only else "gdg-admin-designs.html")
tmp = out.with_suffix(".tmp")
tmp.write_text(html)
tmp.replace(out)
print("wrote", out, "with", ", ".join(parts))
PY
