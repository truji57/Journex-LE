#!/usr/bin/env python
"""updater.py — Actualiza Journex LE desde GitHub (sincronización completa)."""

import os
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
REPO = os.getenv("JOURNEX_REPO", "truji57/Journex-LE")
BRANCH = os.getenv("JOURNEX_BRANCH", "master")


def _run(cmd, **kw):
    kw.setdefault("cwd", BASE_DIR)
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print(f"  ERROR: {r.stderr.strip()}")
    return r


def _git(*args):
    return _run(["git"] + list(args), timeout=60)


def main():
    print(f"Journex LE Updater — {REPO} ({BRANCH})")
    print("=" * 40)

    # 1. Check internet
    print("[1/4] Verificando conexion...")
    r = _git("fetch", "origin")
    if r.returncode != 0:
        print("  No se pudo conectar con GitHub.")
        return False

    # 2. Check for updates
    print("[2/4] Buscando actualizaciones...")
    local = _git("rev-parse", "HEAD").stdout.strip()
    remote = _git("rev-parse", f"origin/{BRANCH}").stdout.strip()

    if not local or not remote:
        print("  No se pudo detectar la version.")
        return False

    if local == remote:
        print("  Ya esta actualizado.")
        return True

    # 3. Hard sync: working tree identical to GitHub (keeps ignored files:
    #    server/data, .env, PENDIENTES.md, node_modules)
    print("[3/4] Sincronizando con la ultima version de GitHub...")
    r = _git("reset", "--hard", f"origin/{BRANCH}")
    if r.returncode != 0:
        print("  No se pudo sincronizar. Revisa el estado del repositorio.")
        return False
    _git("clean", "-fd")

    # 4. Install dependencies if needed
    print("[4/4] Instalando dependencias...")

    pkg_json = BASE_DIR / "package.json"
    if pkg_json.exists() and (BASE_DIR / "node_modules").exists():
        _run(["npm", "install"], cwd=BASE_DIR, timeout=120, shell=True)

    print("=" * 40)
    print("Actualizacion completada.")
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)