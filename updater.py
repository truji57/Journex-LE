#!/usr/bin/env python
"""updater.py — Actualiza Journex LE desde GitHub (git pull + dependencias)."""

import os
import shutil
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
REPO = os.getenv("JOURNEX_REPO", "truji57/Journex-LE")
BRANCH = os.getenv("JOURNEX_BRANCH", "master")
STASH_MSG = "updater-auto-stash"


def _run(cmd, **kw):
    kw.setdefault("cwd", BASE_DIR)
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print(f"  ERROR: {r.stderr.strip()}")
    return r


def _git(*args):
    return _run(["git"] + list(args), timeout=60)


def _safe_remove(rel_path):
    p = BASE_DIR / rel_path
    try:
        if p.is_dir() and not p.is_symlink():
            shutil.rmtree(p)
        elif p.exists() or p.is_symlink():
            p.unlink()
        print(f"  Quitado archivo local que venia en GitHub: {rel_path}")
    except Exception as e:
        print(f"  No se pudo quitar {rel_path}: {e}")


def main():
    print(f"Journex LE Updater — {REPO} ({BRANCH})")
    print("=" * 40)

    # 1. Check internet
    print("[1/5] Verificando conexion...")
    r = _git("fetch", "origin")
    if r.returncode != 0:
        print("  No se pudo conectar con GitHub.")
        return False

    # 2. Check for updates
    print("[2/5] Buscando actualizaciones...")
    local = _git("rev-parse", "HEAD").stdout.strip()
    remote = _git("rev-parse", f"origin/{BRANCH}").stdout.strip()

    if not local or not remote:
        print("  No se pudo detectar la version.")
        return False

    if local == remote:
        print("  Ya esta actualizado.")
        return True

    # 3. Remove loose untracked files that the update brings from GitHub,
    #    so the pull does not fail with "already exists, no checkout"
    print("[3/5] Preparando directorio local...")
    untracked = {f.strip() for f in _git("ls-files", "--others", "--exclude-standard").stdout.splitlines() if f.strip()}
    remote_files = {f.strip() for f in _git("ls-tree", "-r", "--name-only", f"origin/{BRANCH}").stdout.splitlines() if f.strip()}
    for f in sorted(untracked & remote_files):
        _safe_remove(f)

    # 4. Pull (fast-forward only), preserving local tracked modifications
    print("[4/5] Descargando actualizacion...")
    stashed = False
    if _git("status", "--porcelain").stdout.strip():
        print("  Guardando cambios locales temporalmente...")
        stashed = _git("stash", "push", "-m", STASH_MSG).returncode == 0

    r = _git("pull", "--ff-only", "origin", BRANCH)
    if r.returncode != 0:
        print("  No se pudo actualizar. Prueba con git pull manual.")
        if stashed:
            _git("stash", "pop")
        return False

    if stashed:
        rp = _git("stash", "pop")
        if rp.returncode != 0:
            print("  Los cambios locales no pudieron restaurarse automaticamente.")
            print(f"  Se conservan en el stash '{STASH_MSG}'. Revisalos con:")
            print("    git stash list / git stash show -p stash@{0} / git stash drop")

    # 5. Install dependencies if needed
    print("[5/5] Instalando dependencias...")

    pkg_json = BASE_DIR / "package.json"
    if pkg_json.exists() and (BASE_DIR / "node_modules").exists():
        _run(["npm", "install"], cwd=BASE_DIR, timeout=120, shell=True)

    print("=" * 40)
    print("Actualizacion completada.")
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)