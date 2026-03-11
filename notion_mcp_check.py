import json
import socket
import subprocess
import sys
import urllib.error
import urllib.request
import shutil
import os
from pathlib import Path


CODEX_ROOT = Path.home() / ".codex"
CONFIG_PATH = CODEX_ROOT / "config.toml"
AUTH_PATH = CODEX_ROOT / "auth.json"
NOTION_URL = "https://mcp.notion.com/mcp"
NOTION_HOST = "mcp.notion.com"
NOTION_PORT = 443


def get_codex_command():
    appdata = os.environ.get("APPDATA")
    if appdata:
        candidate = Path(appdata) / "npm" / "codex.cmd"
        if candidate.exists():
            return str(candidate)
    return shutil.which("codex") or "codex"


def run_command(args, timeout=15):
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            shell=False,
        )
        return {
            "ok": result.returncode == 0,
            "code": result.returncode,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
        }
    except Exception as exc:
        return {
            "ok": False,
            "code": -1,
            "stdout": "",
            "stderr": str(exc),
        }


def check_config():
    if not CONFIG_PATH.exists():
        return {"ok": False, "message": f"找不到配置文件：{CONFIG_PATH}"}

    text = CONFIG_PATH.read_text(encoding="utf-8", errors="replace")
    if "[mcp_servers.notion]" not in text or NOTION_URL not in text:
        return {"ok": False, "message": "config.toml 里没有正确配置 Notion MCP 服务。"}

    return {"ok": True, "message": "config.toml 已配置 Notion MCP 服务。"}


def check_auth_file():
    if not AUTH_PATH.exists():
        return {"ok": False, "message": f"找不到认证文件：{AUTH_PATH}"}

    try:
        data = json.loads(AUTH_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"ok": False, "message": f"auth.json 无法解析：{exc}"}

    auth_mode = data.get("auth_mode") or "未知"
    tokens = data.get("tokens") or {}
    has_access = bool(tokens.get("access_token"))
    has_refresh = bool(tokens.get("refresh_token"))

    if not has_access:
        return {"ok": False, "message": "auth.json 里没有可用的 access token。"}

    return {
        "ok": True,
        "message": f"auth.json 可读，当前 auth_mode = {auth_mode}，OpenAI 主认证 token 已存在。",
    }


def check_network():
    try:
        with socket.create_connection((NOTION_HOST, NOTION_PORT), timeout=5):
            return {"ok": True, "message": f"{NOTION_HOST}:{NOTION_PORT} 网络可达。"}
    except Exception as exc:
        return {"ok": False, "message": f"无法连接 {NOTION_HOST}:{NOTION_PORT}：{exc}"}


def check_endpoint():
    try:
        request = urllib.request.Request(
            NOTION_URL,
            method="GET",
            headers={"User-Agent": "openclaw-local-console-notion-check"},
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            return {
                "ok": response.status < 400,
                "message": f"Notion MCP 端点返回 HTTP {response.status}。",
            }
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        if exc.code in (401, 403):
            return {
                "ok": True,
                "message": f"Notion MCP 端点在线，但当前请求未携带可用授权（HTTP {exc.code}）。",
                "details": body[:300],
            }
        return {
            "ok": False,
            "message": f"Notion MCP 端点返回 HTTP {exc.code}。",
            "details": body[:300],
        }
    except Exception as exc:
        return {"ok": False, "message": f"请求 Notion MCP 端点失败：{exc}"}


def check_codex_mcp():
    result = run_command([get_codex_command(), "mcp", "get", "notion"])
    if not result["ok"]:
        return {"ok": False, "message": f"执行 `codex mcp get notion` 失败：{result['stderr'] or result['stdout']}"}

    output = result["stdout"]
    if "enabled: true" not in output:
        return {"ok": False, "message": "Notion MCP 当前不是启用状态。"}
    if NOTION_URL not in output:
        return {"ok": False, "message": "Notion MCP 地址不是预期值。"}

    return {"ok": True, "message": "Codex CLI 能识别 Notion MCP 配置。"}


def print_section(title, result):
    icon = "√" if result.get("ok") else "×"
    print(f"[{icon}] {title}")
    print(f"    {result.get('message', '')}")
    if result.get("details"):
        print(f"    细节：{result['details']}")


def summarize(results):
    failed = [name for name, item in results if not item.get("ok")]

    print()
    print("结论")
    print("----")
    if not failed:
        print("当前检测链路没有发现明显问题。若 Codex 内部仍偶发无法读取 Notion，更像是应用内 OAuth 持久化不稳定。")
        return

    if "网络连通性" in failed:
        print("当前先卡在网络层。先检查代理、防火墙和对 mcp.notion.com:443 的访问。")
        return

    if "端点响应" in failed:
        print("网络通，但 Notion MCP 端点访问异常。优先重试网络和代理，再检查 Notion 服务状态。")
        return

    if "Codex MCP 配置" in failed or "本地配置文件" in failed:
        print("当前优先修配置。先确认 `.codex/config.toml` 里存在 notion server，再重新添加 Notion MCP。")
        return

    print("当前最像认证层问题。建议重新执行 `codex mcp login notion`，完成授权后立刻重启 Codex 再测。")


def run_diagnostics():
    results = [
        ("本地配置文件", check_config()),
        ("本地认证文件", check_auth_file()),
        ("Codex MCP 配置", check_codex_mcp()),
        ("网络连通性", check_network()),
        ("端点响应", check_endpoint()),
    ]

    print()
    print("Notion MCP 检测结果")
    print("====================")
    for title, result in results:
        print_section(title, result)

    summarize(results)


def main():
    action = sys.argv[1].strip().lower() if len(sys.argv) > 1 else "check"
    if action == "login":
        print("准备启动 Notion MCP 重新登录...")
        result = subprocess.run([get_codex_command(), "mcp", "login", "notion"], shell=False)
        raise SystemExit(result.returncode)

    run_diagnostics()


if __name__ == "__main__":
    main()
