from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app import self_check  # noqa: E402


def line(label: str, ok: bool, detail: str) -> str:
    mark = "[OK]" if ok else "[MISSING]"
    return f"{mark:<10} {label:<18} {detail}"


def main() -> int:
    check = self_check()

    items = [
        ("Python", check["pythonAvailable"], "python command is available" if check["pythonAvailable"] else "python command not found"),
        ("Node.js", check["nodeExists"], "node runtime is available" if check["nodeExists"] else "node runtime not found"),
        ("npm", check["npmAvailable"], "npm command is available" if check["npmAvailable"] else "npm command not found"),
        ("OpenClaw CLI", check["openclawAvailable"], "openclaw command is available" if check["openclawAvailable"] else "openclaw command not found"),
        ("Base config", check["configExists"], "openclaw.json already exists" if check["configExists"] else "openclaw.json has not been created yet"),
        ("Profiles dir", check["profileDirExists"], "profiles directory exists" if check["profileDirExists"] else "profiles directory is missing"),
    ]

    full_ready = all([check["pythonAvailable"], check["nodeExists"], check["npmAvailable"], check["openclawAvailable"], check["configExists"]])
    console_ready = check["pythonAvailable"]

    print("OpenClaw Local Console Preflight")
    print()
    for label, ok, detail in items:
        print(line(label, ok, detail))

    print()
    if full_ready:
        print("Summary: This machine looks ready for the full local OpenClaw workflow.")
    elif console_ready:
        print("Summary: The console can start, but the full OpenClaw environment is not ready yet.")
        print("Next: Open the console and use the setup guide to install or initialize the missing pieces.")
    else:
        print("Summary: The console cannot start yet because Python is missing.")
        print("Next: Install Python first, then run setup_local_console.bat again.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
