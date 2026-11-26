"""Regenerate public SEO artifacts using the same generator as the browser CMS."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
subprocess.run(["node", "scripts/generate-seo.js"], cwd=ROOT, check=True)
