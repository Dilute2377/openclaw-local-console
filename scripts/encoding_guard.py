from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent

LF_SUFFIXES = {".py", ".html", ".css", ".js", ".json", ".md", ".txt"}
CRLF_SUFFIXES = {".bat", ".cmd", ".ps1"}
TEXT_SUFFIXES = LF_SUFFIXES | CRLF_SUFFIXES

SUSPICIOUS_TOKENS = [
    "鍒锋柊",
    "鏈湴",
    "鍚姩",
    "鍏抽棴",
    "閲嶅惎",
    "绛夊緟鎿嶄綔",
    "椋炰功",
    "瀵嗛挜",
    "璇锋",
    "鎺у埗鍙",
    "杩愯",
    "閰嶇疆",
    "鏈缃",
]


def safe_text(value: str) -> str:
    return value.encode("ascii", "backslashreplace").decode("ascii")


def iter_files(root: Path):
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in {".git", "__pycache__", ".pytest_cache"} for part in path.parts):
            continue
        if path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        yield path


def expected_eol(path: Path) -> str | None:
    suffix = path.suffix.lower()
    if suffix in LF_SUFFIXES:
        return "\n"
    if suffix in CRLF_SUFFIXES:
        return "\r\n"
    return None


def validate_file(path: Path) -> list[str]:
    issues: list[str] = []
    data = path.read_bytes()

    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        issues.append(f"不是有效的 UTF-8：{exc}")
        return issues

    if "\ufffd" in text:
        issues.append("包含 Unicode replacement character (U+FFFD)，说明曾发生错误解码")

    if path.name != "encoding_guard.py":
        bad_tokens = [token for token in SUSPICIOUS_TOKENS if token in text]
        if bad_tokens:
            issues.append(f"检测到疑似乱码片段：{', '.join(bad_tokens[:5])}")

    wanted = expected_eol(path)
    if wanted == "\n" and b"\r\n" in data:
        issues.append("应为 LF，但检测到 CRLF")
    if wanted == "\r\n":
        if b"\r\n" not in data and b"\n" in data:
            issues.append("应为 CRLF，但检测到 LF")

    if data and not data.endswith(b"\n"):
        issues.append("文件末尾缺少换行")

    return issues


def main() -> int:
    failures: list[tuple[Path, list[str]]] = []

    for path in iter_files(ROOT):
        issues = validate_file(path)
        if issues:
            failures.append((path, issues))

    if not failures:
        print("编码检查通过：未发现 UTF-8、换行或疑似乱码问题。")
        return 0

    print("编码检查失败：")
    for path, issues in failures:
        print(f"- {path}")
        for issue in issues:
            print(f"  - {safe_text(issue)}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
