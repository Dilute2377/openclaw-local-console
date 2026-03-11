from __future__ import annotations

import json
import os
import secrets
import shutil
import socket
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import winreg
from collections import deque
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
from fnmatch import fnmatch
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


APP_ROOT = Path(__file__).resolve().parent
STATIC_DIR = APP_ROOT / "static"
OPENCLAW_ROOT = Path.home() / ".openclaw"
WORKSPACE_DIR = OPENCLAW_ROOT / "workspace"
OPENCLAW_SKILLS_DIR = OPENCLAW_ROOT / "skills"
CONFIG_PATH = OPENCLAW_ROOT / "openclaw.json"
LOCAL_CONSOLE_STATE_PATH = OPENCLAW_ROOT / "local-console-state.json"
PROFILES_DIR = OPENCLAW_ROOT / "profiles"
SESSIONS_DIR = OPENCLAW_ROOT / "agents" / "main" / "sessions"
OPENCLAW_CMD = Path.home() / "AppData" / "Roaming" / "npm" / "openclaw.cmd"
OPENCLAW_NPM_ROOT = OPENCLAW_CMD.parent
OPENCLAW_PACKAGE_DIR = OPENCLAW_NPM_ROOT / "node_modules" / "openclaw"
NODE_EXE = Path(r"C:\Program Files\nodejs\node.exe")
OPENCLAW_DIST = Path.home() / "AppData" / "Roaming" / "npm" / "node_modules" / "openclaw" / "dist" / "index.js"
AGENTS_SKILLS_DIR = Path.home() / ".agents" / "skills"
CODEX_SKILLS_DIR = Path.home() / ".codex" / "skills"
PERMISSION_MOUNTS_DIR = WORKSPACE_DIR / "_allowed"
PERMISSION_PRESET_DIRS = [
    {"label": "OpenClaw 工作区", "path": WORKSPACE_DIR},
    {"label": "OpenClaw 根目录", "path": OPENCLAW_ROOT},
    {"label": "当前控制台项目", "path": APP_ROOT},
]

DEFAULT_PORT = 8765
GATEWAY_PORT = 18789
GATEWAY_HOST = "127.0.0.1"

LOGS: deque[dict] = deque(maxlen=250)
LOG_LOCK = threading.Lock()

CORE_DOCS = [
    {
        "name": "IDENTITY.md",
        "label": "Identity",
        "description": "定义 OpenClaw 在这个工作区里的身份、角色边界和行为基调。",
        "default_content": "# Identity\nYou are the local OpenClaw assistant. Prioritize finishing tasks end-to-end instead of stopping halfway.\n",
    },
    {
        "name": "SOUL.md",
        "label": "Soul",
        "description": "规定整体人格、协作风格和价值取向，是长期行为的一致性来源。",
        "default_content": "# Soul\nStay calm, practical, and collaborative. Prefer clear next steps over vague advice.\n",
    },
    {
        "name": "USER.md",
        "label": "User",
        "description": "沉淀对当前用户的帮助原则、沟通习惯和长期偏好。",
        "default_content": "# User\nDefault to helping the current user quickly and safely. Ask only when a decision is genuinely required.\n",
    },
    {
        "name": "AGENTS.md",
        "label": "Agents",
        "description": "定义代理协作规则、停顿条件和默认工作方式。",
        "default_content": "# Agents\nClose the loop by default. Pause only when the user must make a key decision, provide credentials, or accept risk.\n",
    },
    {
        "name": "HEARTBEAT.md",
        "label": "Heartbeat",
        "description": "描述系统保持运转、报告阻塞和持续推进的节奏。",
        "default_content": "# Heartbeat\nKeep Gateway healthy, report blockers clearly, and keep momentum.\n",
    },
    {
        "name": "TOOLS.md",
        "label": "Tools",
        "description": "约束工具的使用方式，避免低效或绕路操作。",
        "default_content": "# Tools\nUse the available tools directly, prefer fast checks, and avoid unnecessary detours.\n",
    },
    {
        "name": "MEMORY.md",
        "label": "Memory",
        "description": "记录 durable facts、关键决策和已经验证过的内容。",
        "default_content": "# Memory\nRecord durable facts, important decisions, and what has already been verified.\n",
    },
    {
        "name": "BOOTSTRAP.md",
        "label": "Bootstrap",
        "description": "定义启动时先检查什么、优先走哪条初始化路径。",
        "default_content": "# Bootstrap\nStart by checking config, provider readiness, and channel readiness before deeper actions.\n",
    },
]
CORE_DOCS_BY_NAME = {item["name"]: item for item in CORE_DOCS}
SKILL_SOURCES = {
    "openclaw": OPENCLAW_SKILLS_DIR,
    "agents": AGENTS_SKILLS_DIR,
    "codex": CODEX_SKILLS_DIR,
}

SECRET_ITEMS = [
    ("OPENCLAW_CONSOLE_PROXY", "Console proxy override"),
    ("OPENCLAW_GOOGLE_API_KEY", "Gemini API key"),
    ("OPENCLAW_OPENAI_API_KEY", "ChatGPT / OpenAI API key"),
    ("OPENCLAW_ANTHROPIC_API_KEY", "Claude / Anthropic API key"),
    ("OPENCLAW_NVIDIA_API_KEY", "NVIDIA / Kimi API key"),
    ("OPENCLAW_MINIMAX_API_KEY", "MiniMax API key"),
    ("OPENCLAW_FEISHU_APP_ID", "Feishu App ID"),
    ("OPENCLAW_FEISHU_APP_SECRET", "Feishu App Secret"),
]
SECRET_LABELS = {key: label for key, label in SECRET_ITEMS}
LOCAL_TIMEZONE = datetime.now().astimezone().tzinfo or timezone.utc

PROVIDERS = {
    "google": {
        "label": "Gemini",
        "env_name": "OPENCLAW_GOOGLE_API_KEY",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "test_mode": "openai-chat",
        "default_model": "gemini-2.5-pro",
        "default_alias": "gemini-pro",
        "inputs": ["text", "image"],
        "context_window": 1000000,
        "max_tokens": 8192,
    },
    "openai": {
        "label": "ChatGPT / OpenAI",
        "env_name": "OPENCLAW_OPENAI_API_KEY",
        "base_url": "https://api.openai.com/v1",
        "test_mode": "openai-chat",
        "default_model": "gpt-5.4",
        "default_alias": "chatgpt",
        "inputs": ["text", "image"],
        "context_window": 200000,
        "max_tokens": 8192,
    },
    "anthropic": {
        "label": "Claude",
        "env_name": "OPENCLAW_ANTHROPIC_API_KEY",
        "base_url": "https://api.anthropic.com/v1/",
        "test_mode": "anthropic-messages",
        "default_model": "claude-sonnet-4-6",
        "default_alias": "claude-sonnet",
        "inputs": ["text", "image"],
        "context_window": 200000,
        "max_tokens": 8192,
    },
    "nvidia-kimi": {
        "label": "NVIDIA / Kimi",
        "env_name": "OPENCLAW_NVIDIA_API_KEY",
        "base_url": "https://integrate.api.nvidia.com/v1",
        "test_mode": "openai-chat",
        "default_model": "moonshotai/kimi-k2-instruct",
        "default_alias": "kimi",
        "inputs": ["text"],
        "context_window": 131072,
        "max_tokens": 8192,
    },
    "minimax": {
        "label": "MiniMax",
        "env_name": "OPENCLAW_MINIMAX_API_KEY",
        "base_url": "https://api.minimaxi.com/v1",
        "test_mode": "openai-chat",
        "default_model": "MiniMax-M2.5",
        "default_alias": "minimax",
        "inputs": ["text"],
        "context_window": 100000,
        "max_tokens": 8192,
    },
}


def log(level: str, message: str, details=None) -> None:
    entry = {
        "time": datetime.now().strftime("%H:%M:%S"),
        "level": level,
        "message": message,
        "details": details,
    }
    with LOG_LOCK:
        LOGS.appendleft(entry)


def json_response(handler: SimpleHTTPRequestHandler, payload: dict, status: int = HTTPStatus.OK) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def load_optional_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return load_json(path)


def sanitize_openclaw_config(data: dict) -> dict:
    cleaned = deepcopy(data)
    cleaned.pop("localConsole", None)
    return cleaned


def save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def backup_config() -> Path | None:
    if not CONFIG_PATH.exists():
        return None
    backup = CONFIG_PATH.with_name(f"openclaw.json.bak_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    shutil.copy2(CONFIG_PATH, backup)
    return backup


def get_subprocess_kwargs(*, allow_console: bool = False) -> dict:
    kwargs: dict = {}
    if os.name != "nt" or allow_console:
        return kwargs

    kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    startupinfo_cls = getattr(subprocess, "STARTUPINFO", None)
    if startupinfo_cls:
        startupinfo = startupinfo_cls()
        startupinfo.dwFlags |= getattr(subprocess, "STARTF_USESHOWWINDOW", 0)
        startupinfo.wShowWindow = 0
        kwargs["startupinfo"] = startupinfo
    return kwargs


def run_command(args: list[str], timeout: int = 60) -> dict:
    try:
        completed = subprocess.run(
            args,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            shell=False,
            **get_subprocess_kwargs(),
        )
        return {
            "ok": completed.returncode == 0,
            "returncode": completed.returncode,
            "stdout": completed.stdout.strip(),
            "stderr": completed.stderr.strip(),
        }
    except subprocess.TimeoutExpired as exc:
        return {
            "ok": False,
            "returncode": 124,
            "stdout": (exc.stdout or "").strip(),
            "stderr": ((exc.stderr or "").strip() + "\nCommand timed out.").strip(),
        }


def get_openclaw_cli() -> str:
    if OPENCLAW_CMD.exists():
        return str(OPENCLAW_CMD)
    return shutil.which("openclaw") or "openclaw"


def get_winget_command() -> str:
    return shutil.which("winget") or "winget"


def get_npm_command() -> str:
    return shutil.which("npm") or "npm"


def get_secret(name: str) -> str:
    value = os.environ.get(name)
    if value:
        return value
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment")
        value = winreg.QueryValueEx(key, name)[0]
        winreg.CloseKey(key)
        return value if isinstance(value, str) else ""
    except OSError:
        return ""


def get_gateway_port(config: dict | None = None) -> int:
    data = config if config is not None else load_optional_json(LOCAL_CONSOLE_STATE_PATH)
    local_console = (data.get("localConsole") or data)
    connection = (local_console.get("connection") or {})
    raw_value = connection.get("gatewayPort")
    try:
        value = int(raw_value)
        if 1 <= value <= 65535:
            return value
    except (TypeError, ValueError):
        pass
    return GATEWAY_PORT


def set_secret(name: str, value: str) -> None:
    key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment", 0, winreg.KEY_SET_VALUE)
    try:
        winreg.SetValueEx(key, name, 0, winreg.REG_EXPAND_SZ, value)
    finally:
        winreg.CloseKey(key)
    os.environ[name] = value


def delete_secret(name: str) -> None:
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment", 0, winreg.KEY_SET_VALUE)
        try:
            winreg.DeleteValue(key, name)
        finally:
            winreg.CloseKey(key)
    except OSError:
        pass
    os.environ.pop(name, None)


def preview_secret(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 12:
        return "Configured"
    return f"{value[:4]} ... {value[-4:]}"


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        return {}
    return load_json(CONFIG_PATH)


def load_local_console_state() -> dict:
    return load_optional_json(LOCAL_CONSOLE_STATE_PATH)


def save_local_console_state(data: dict) -> None:
    save_json(LOCAL_CONSOLE_STATE_PATH, data)


def save_config(config: dict) -> Path | None:
    backup = backup_config()
    save_json(CONFIG_PATH, sanitize_openclaw_config(config))
    return backup


def normalize_directory_path(value: str) -> str:
    raw = str(value or "").strip().strip('"').strip("'")
    if not raw:
        return ""
    path = Path(raw).expanduser()
    try:
        return str(path.resolve(strict=False))
    except OSError:
        return str(path)


def dedupe_directory_paths(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        normalized = normalize_directory_path(value)
        if not normalized:
            continue
        lowered = normalized.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        result.append(normalized)
    return result


def slugify_mount_name(path_value: str) -> str:
    normalized = normalize_directory_path(path_value)
    base = Path(normalized).name or "root"
    safe = "".join(ch.lower() if ch.isalnum() else "-" for ch in base).strip("-") or "path"
    suffix = abs(hash(normalized.lower())) % 100000
    return f"{safe}-{suffix}"


def create_directory_junction(link_path: Path, target_path: Path) -> None:
    if link_path.exists():
        return
    link_path.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            f"New-Item -ItemType Junction -Path '{link_path}' -Target '{target_path}' | Out-Null",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=30,
        **get_subprocess_kwargs(),
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "创建目录映射失败。"
        raise RuntimeError(detail)


def remove_directory_junction(link_path: Path) -> None:
    if not link_path.exists():
        return
    result = subprocess.run(
        ["cmd", "/c", "rmdir", str(link_path)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=30,
        **get_subprocess_kwargs(),
    )
    if result.returncode != 0 and link_path.exists():
        detail = result.stderr.strip() or result.stdout.strip() or "移除目录映射失败。"
        raise RuntimeError(detail)


def sync_permission_mounts(scope: dict) -> list[dict]:
    PERMISSION_MOUNTS_DIR.mkdir(parents=True, exist_ok=True)
    mounted_targets = dedupe_directory_paths((scope.get("allowedDirs") or []) + (scope.get("extraDirs") or []))
    mounts: list[dict] = []
    keep_names: set[str] = set()
    for target in mounted_targets:
        target_path = Path(target)
        if not target_path.exists():
            mounts.append({"path": target, "mountPath": "", "exists": False})
            continue
        mount_name = slugify_mount_name(target)
        keep_names.add(mount_name.lower())
        mount_path = PERMISSION_MOUNTS_DIR / mount_name
        create_directory_junction(mount_path, target_path)
        mounts.append({"path": target, "mountPath": str(mount_path), "exists": True})

    for child in PERMISSION_MOUNTS_DIR.iterdir():
        if child.name.lower() not in keep_names:
            remove_directory_junction(child)
    return mounts


def sanitize_permission_scope(payload: dict | None) -> dict:
    data = payload if isinstance(payload, dict) else {}
    mode = str(data.get("mode") or "restricted").strip().lower()
    if mode not in {"restricted", "full"}:
        mode = "restricted"
    allowed_dirs = dedupe_directory_paths(data.get("allowedDirs") or [])
    exec_dirs = dedupe_directory_paths(data.get("execDirs") or [])
    extra_dirs = dedupe_directory_paths(data.get("extraDirs") or [])
    sandbox_mode = str(data.get("sandboxMode") or "off").strip().lower()
    if sandbox_mode not in {"off", "non-main", "all"}:
        sandbox_mode = "off"
    exec_ask = str(data.get("execAsk") or "on-miss").strip().lower()
    if exec_ask not in {"on", "on-miss", "off"}:
        exec_ask = "on-miss"
    return {
        "mode": mode,
        "allowedDirs": allowed_dirs,
        "execDirs": exec_dirs,
        "extraDirs": extra_dirs,
        "sandboxMode": sandbox_mode,
        "execAsk": exec_ask,
    }


def infer_permission_scope_from_config(config: dict) -> dict:
    local_console = (load_local_console_state().get("permissions") or {})
    defaults = ((config.get("agents") or {}).get("defaults") or {})
    tools = config.get("tools") or {}
    fs_tools = tools.get("fs") or {}
    exec_tools = tools.get("exec") or {}
    sandbox = defaults.get("sandbox") or {}

    mode = str(local_console.get("mode") or "").strip().lower()
    if mode not in {"restricted", "full"}:
        workspace_only = fs_tools.get("workspaceOnly") is True
        mode = "full" if not workspace_only else "restricted"

    allowed_dirs = dedupe_directory_paths(local_console.get("allowedDirs") or [str(WORKSPACE_DIR)])
    exec_dirs = dedupe_directory_paths(local_console.get("execDirs") or [])
    extra_dirs = dedupe_directory_paths(local_console.get("extraDirs") or [])
    sandbox_mode = str(local_console.get("sandboxMode") or sandbox.get("mode") or "off").strip().lower()
    if sandbox_mode not in {"off", "non-main", "all"}:
        sandbox_mode = "off"
    exec_ask = str(local_console.get("execAsk") or exec_tools.get("ask") or "on-miss").strip().lower()
    if exec_ask not in {"on", "on-miss", "off"}:
        exec_ask = "on-miss"
    return sanitize_permission_scope(
        {
            "mode": mode,
            "allowedDirs": allowed_dirs,
            "execDirs": exec_dirs,
            "extraDirs": extra_dirs,
            "sandboxMode": sandbox_mode,
            "execAsk": exec_ask,
        }
    )


def ensure_permission_scope_defaults(scope: dict) -> dict:
    if scope["mode"] == "restricted" and not scope["allowedDirs"]:
        scope["allowedDirs"] = [str(WORKSPACE_DIR)]
    if scope["mode"] == "restricted" and not scope["execDirs"]:
        scope["execDirs"] = list(scope["allowedDirs"])
    return scope


def build_permission_summary(scope: dict) -> str:
    if scope["mode"] == "full":
        return "当前为最高权限模式：OpenClaw 可访问本机任意目录，并允许关闭命令审批。"
    return (
        f"当前为白名单模式：可读写 {len(scope['allowedDirs'])} 个目录，"
        f"可执行 {len(scope['execDirs'])} 个工作目录，额外访问 {len(scope['extraDirs'])} 个目录。"
    )


def get_permission_data() -> dict:
    config = load_config()
    scope = ensure_permission_scope_defaults(infer_permission_scope_from_config(config))
    mounts = sync_permission_mounts(scope) if scope["mode"] == "restricted" else []
    configured_dirs = []
    for label, key in (
        ("文件白名单", "allowedDirs"),
        ("可执行目录", "execDirs"),
        ("额外访问目录", "extraDirs"),
    ):
        for path_value in scope[key]:
            configured_dirs.append({"group": label, "path": path_value, "exists": Path(path_value).exists()})
    return {
        "scope": scope,
        "summary": build_permission_summary(scope),
        "presets": [
            {"label": item["label"], "path": str(item["path"]), "exists": item["path"].exists()}
            for item in PERMISSION_PRESET_DIRS
        ],
        "configuredDirs": configured_dirs,
        "mounts": mounts,
        "configPath": str(CONFIG_PATH),
        "mountsRoot": str(PERMISSION_MOUNTS_DIR),
    }


def apply_permission_scope(payload: dict | None) -> dict:
    config = load_config()
    scope = ensure_permission_scope_defaults(sanitize_permission_scope(payload))
    if scope["mode"] == "restricted" and not scope["allowedDirs"]:
        return {"ok": False, "message": "白名单模式下至少要保留一个允许目录。"}

    tools = config.setdefault("tools", {})
    fs_tools = tools.setdefault("fs", {})
    exec_tools = tools.setdefault("exec", {})
    agents = config.setdefault("agents", {})
    defaults = agents.setdefault("defaults", {})
    sandbox = defaults.setdefault("sandbox", {})
    if scope["mode"] == "full":
        fs_tools["workspaceOnly"] = False
        exec_tools["ask"] = scope["execAsk"]
        sandbox["mode"] = scope["sandboxMode"]
    else:
        fs_tools["workspaceOnly"] = True
        exec_tools["ask"] = scope["execAsk"]
        sandbox["mode"] = scope["sandboxMode"]
        defaults["workspace"] = str(WORKSPACE_DIR)

    backup = save_config(config)
    local_console_state = load_local_console_state()
    local_console_state["permissions"] = scope
    save_local_console_state(local_console_state)
    if scope["mode"] == "restricted":
        sync_permission_mounts(scope)
    elif PERMISSION_MOUNTS_DIR.exists():
        for child in PERMISSION_MOUNTS_DIR.iterdir():
            remove_directory_junction(child)
    scope = ensure_permission_scope_defaults(infer_permission_scope_from_config(load_config()))
    return {
        "ok": True,
        "message": "权限范围已写入 openclaw.json。重启 OpenClaw 后会按新的权限策略运行。",
        "backup": str(backup) if backup else "",
        "data": get_permission_data(),
    }


def normalize_proxy_value(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    if "=" in value and "://" not in value:
        parts = [part.strip() for part in value.split(";") if part.strip()]
        for prefix in ("https=", "http=", "socks="):
            for part in parts:
                if part.lower().startswith(prefix):
                    candidate = part.split("=", 1)[1].strip()
                    return candidate if "://" in candidate else f"http://{candidate}"
        value = parts[0].split("=", 1)[-1].strip()
    return value if "://" in value else f"http://{value}"


def get_proxy_info() -> dict:
    override = get_secret("OPENCLAW_CONSOLE_PROXY")
    if override:
        return {"value": normalize_proxy_value(override), "source": "Console override"}

    for env_name in ("HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"):
        value = os.environ.get(env_name)
        if value:
            return {"value": normalize_proxy_value(value), "source": f"Environment variable {env_name}"}

    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Internet Settings")
        enabled = winreg.QueryValueEx(key, "ProxyEnable")[0]
        server = winreg.QueryValueEx(key, "ProxyServer")[0]
        auto_config_url = ""
        try:
            auto_config_url = winreg.QueryValueEx(key, "AutoConfigURL")[0]
        except OSError:
            auto_config_url = ""
        winreg.CloseKey(key)
        if enabled and server:
            return {"value": normalize_proxy_value(server), "source": "Windows 系统代理"}
        if auto_config_url:
            return {"value": "", "source": f"PAC 脚本 {auto_config_url}"}
    except OSError:
        pass

    return {"value": "", "source": "Not detected"}


def get_windows_proxy() -> str:
    return get_proxy_info()["value"]


def build_opener() -> urllib.request.OpenerDirector:
    proxy = get_windows_proxy()
    if proxy:
        return urllib.request.build_opener(urllib.request.ProxyHandler({"http": proxy, "https": proxy}))
    return urllib.request.build_opener()


def resolve_env_placeholders(value):
    if isinstance(value, str) and value.startswith("__ENV__:"):
        return get_secret(value.split(":", 1)[1])
    if isinstance(value, list):
        return [resolve_env_placeholders(item) for item in value]
    if isinstance(value, dict):
        return {key: resolve_env_placeholders(item) for key, item in value.items()}
    return value


def parse_list_field(raw: str) -> list[str]:
    items = []
    for piece in (raw or "").replace("?", ",").split(","):
        cleaned = piece.strip()
        if cleaned and cleaned not in items:
            items.append(cleaned)
    return items


def parse_optional_int_field(value, *, minimum: int, maximum: int, field_label: str) -> int | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        parsed = int(raw)
    except ValueError:
        raise ValueError(f"{field_label} must be an integer.")
    if parsed < minimum or parsed > maximum:
        raise ValueError(f"{field_label} must be between {minimum} and {maximum}.")
    return parsed


def get_agent_timeout_seconds(config: dict | None = None) -> int | None:
    data = config if config is not None else load_config()
    raw_value = (((data.get("agents") or {}).get("defaults") or {}).get("timeoutSeconds"))
    if isinstance(raw_value, bool):
        return None
    if isinstance(raw_value, (int, float)):
        parsed = int(raw_value)
        return parsed if parsed >= 0 else None
    return None


def get_console_state(config: dict | None = None) -> dict:
    data = config if config is not None else load_local_console_state()
    local_console = data.setdefault("localConsole", {})
    tests = local_console.setdefault("tests", {})
    tests.setdefault("providers", {})
    tests.setdefault("channels", {})
    return local_console


def mark_provider_test(provider_key: str, ok: bool) -> None:
    if not provider_key:
        return
    state = load_local_console_state()
    tests = get_console_state(state)["tests"]["providers"]
    if ok:
        tests[provider_key] = {
            "ok": True,
            "time": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        }
    else:
        tests.pop(provider_key, None)
    save_local_console_state(state)


def mark_channel_test(channel: str, ok: bool) -> None:
    if not channel:
        return
    state = load_local_console_state()
    tests = get_console_state(state)["tests"]["channels"]
    if ok:
        tests[channel] = {
            "ok": True,
            "time": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        }
    else:
        tests.pop(channel, None)
    save_local_console_state(state)


def has_persisted_recent_test(test_type: str, key: str, seconds: int = 1800) -> bool:
    if not key:
        return False
    state = load_local_console_state()
    tests = ((get_console_state(state).get("tests") or {}).get(test_type) or {})
    item = tests.get(key) or {}
    if not item or not item.get("ok"):
        return False
    stamp = item.get("time") or ""
    if not stamp:
        return False
    try:
        when = datetime.fromisoformat(stamp.replace("Z", "+00:00")).timestamp()
    except Exception:
        return True
    return when >= time.time() - seconds


def is_port_open(host: str = GATEWAY_HOST, port: int | None = None, timeout: float = 0.5) -> bool:
    target_port = port or get_gateway_port()
    try:
        with socket.create_connection((host, target_port), timeout=timeout):
            return True
    except OSError:
        return False


def get_gateway_pids() -> list[int]:
    gateway_port = get_gateway_port()
    result = run_command(["netstat", "-ano"], timeout=10)
    if not result["ok"] and not result["stdout"]:
        return []

    pids: list[int] = []
    for line in result["stdout"].splitlines():
        if f":{gateway_port}" not in line:
            continue
        parts = line.split()
        if len(parts) < 5:
            continue
        if "LISTENING" not in parts:
            continue
        pid = parts[-1]
        if pid.isdigit():
            value = int(pid)
            if value not in pids:
                pids.append(value)
    return pids


def gateway_health() -> dict:
    if not shutil.which(get_openclaw_cli()) and not OPENCLAW_CMD.exists():
        return {"ok": False, "message": "OpenClaw CLI is not installed."}
    result = run_command([get_openclaw_cli(), "gateway", "health"], timeout=15)
    if result["ok"]:
        message = (result["stdout"] or "OK").strip()
        if "Gateway Health" in message:
            lines = [line.strip() for line in message.splitlines() if line.strip()]
            lines = [
                line
                for line in lines
                if not line.startswith("|")
                and not line.startswith("+")
                and not line.startswith("o ")
                and "Doctor" not in line
                and "Config " not in line
                and "Unknown config keys" not in line
            ]
            message = "\n".join(lines) if lines else "OK"
        return {"ok": True, "message": message or "OK"}
    return {"ok": False, "message": result["stderr"] or result["stdout"] or "Health check failed."}


def start_gateway() -> dict:
    gateway_port = get_gateway_port()
    if not NODE_EXE.exists() or not OPENCLAW_DIST.exists():
        return {"ok": False, "message": "Missing node.exe or OpenClaw dist entry; cannot start Gateway."}
    if is_port_open():
        return {"ok": True, "message": "OpenClaw is already running."}

    command = [
        "powershell",
        "-NoProfile",
        "-Command",
        (
            f"Start-Process -FilePath '{NODE_EXE}' "
            f"-ArgumentList @('{OPENCLAW_DIST}','gateway','--port','{gateway_port}') "
            f"-WorkingDirectory '{OPENCLAW_ROOT}' -WindowStyle Hidden"
        ),
    ]
    result = run_command(command, timeout=20)
    if not result["ok"]:
        return {"ok": False, "message": result["stderr"] or "Failed to start OpenClaw."}

    # Fresh installs can take longer to warm the gateway process and bind the port.
    for _ in range(60):
        if is_port_open():
            return {"ok": True, "message": "OpenClaw started."}
        time.sleep(0.5)
    return {"ok": False, "message": f"Start command ran, but port {gateway_port} did not come up."}


def stop_gateway() -> dict:
    pids = get_gateway_pids()
    if not pids:
        return {"ok": True, "message": "OpenClaw is not running."}

    failed = []
    for pid in pids:
        result = run_command(["taskkill", "/PID", str(pid), "/F"], timeout=20)
        if not result["ok"]:
            failed.append({"pid": pid, "stderr": result["stderr"]})
    if failed:
        return {"ok": False, "message": "Some processes could not be stopped.", "failed": failed}

    for _ in range(20):
        if not is_port_open():
            return {"ok": True, "message": "OpenClaw stopped."}
        time.sleep(0.3)
    return {"ok": False, "message": "Stop command ran, but the port is still occupied."}


def restart_gateway() -> dict:
    stopped = stop_gateway()
    if not stopped["ok"]:
        return stopped
    time.sleep(1.0)
    return start_gateway()


def get_profiles() -> list[dict]:
    profiles: list[dict] = []
    if not PROFILES_DIR.exists():
        return profiles
    for path in sorted(PROFILES_DIR.glob("*.json"), key=lambda item: item.name.lower()):
        if path.name == "profile.template.json":
            continue
        try:
            data = load_json(path)
            provider = data.get("provider") or {}
            models = provider.get("models") or []
            model = models[0] if models else {}
            aliases = data.get("aliases") or {}
            alias = next(iter(aliases.values()), "")
            profiles.append(
                {
                    "fileName": path.name,
                    "profileName": data.get("profileName", path.stem),
                    "providerKey": data.get("providerKey", ""),
                    "modelId": model.get("id", ""),
                    "alias": alias,
                }
            )
        except Exception as exc:
            profiles.append(
                {
                    "fileName": path.name,
                    "profileName": path.stem,
                    "providerKey": "",
                    "modelId": "",
                    "alias": "",
                    "error": str(exc),
                }
            )
    return profiles


def get_active_profile(primary_model: str) -> str:
    if not primary_model:
        return ""
    for item in get_profiles():
        if item.get("error"):
            continue
        profile = load_json(PROFILES_DIR / item["fileName"])
        if profile.get("primaryModel") == primary_model:
            return item["fileName"]
    return ""


def get_primary_provider_key() -> str:
    config = load_config()
    primary_model = ((((config.get("agents") or {}).get("defaults") or {}).get("model") or {}).get("primary") or "")
    if "/" not in primary_model:
        return ""
    return primary_model.split("/", 1)[0]


def has_recent_provider_test(provider_key: str, seconds: int = 1800) -> bool:
    if not provider_key:
        return False
    if has_persisted_recent_test("providers", provider_key, seconds):
        return True
    cutoff = time.time() - seconds
    with LOG_LOCK:
        entries = list(LOGS)
    for entry in entries:
        if entry.get("message") != "/api/tests/provider":
            continue
        details = entry.get("details") or {}
        provider = (((details.get("input") or {}).get("providerKey")) or "")
        if provider != provider_key:
            continue
        try:
            stamp = datetime.strptime(entry["time"], "%H:%M:%S").time()
            now = datetime.now()
            entry_ts = datetime.combine(now.date(), stamp).timestamp()
            if entry_ts >= cutoff:
                return True
        except Exception:
            return True
    return False


def has_recent_channel_test(channel: str, seconds: int = 1800) -> bool:
    if has_persisted_recent_test("channels", channel, seconds):
        return True
    cutoff = time.time() - seconds
    with LOG_LOCK:
        entries = list(LOGS)
    for entry in entries:
        if entry.get("message") != "/api/tests/channel":
            continue
        details = entry.get("details") or {}
        input_data = details.get("input") or {}
        if (input_data.get("channel") or "") != channel:
            continue
        result = details.get("result") or {}
        if not result.get("ok"):
            continue
        try:
            stamp = datetime.strptime(entry["time"], "%H:%M:%S").time()
            now = datetime.now()
            entry_ts = datetime.combine(now.date(), stamp).timestamp()
            if entry_ts >= cutoff:
                return True
        except Exception:
            return True
    return False


def apply_profile_file(file_name: str) -> dict:
    path = PROFILES_DIR / file_name
    if not path.exists():
        return {"ok": False, "message": f"Profile not found: {file_name}"}

    profile = load_json(path)
    provider_key = profile.get("providerKey")
    provider_config = deepcopy(profile.get("provider") or {})
    primary_model = profile.get("primaryModel", "")
    aliases = deepcopy(profile.get("aliases") or {})
    channels = deepcopy(profile.get("channels") or {})

    if not provider_key or not provider_config or not primary_model:
        return {"ok": False, "message": "Profile is missing providerKey, provider, or primaryModel."}

    resolved_provider = resolve_env_placeholders(provider_config)
    if not resolved_provider.get("apiKey"):
        return {"ok": False, "message": f"Applying {file_name} failed: matching API key is missing from the environment."}

    config = load_config()
    config.setdefault("models", {}).setdefault("providers", {})
    config["models"]["mode"] = "merge"
    config["models"]["providers"][provider_key] = resolved_provider
    config.setdefault("agents", {}).setdefault("defaults", {}).setdefault("model", {})
    config["agents"]["defaults"]["model"]["primary"] = primary_model
    config["agents"]["defaults"].setdefault("models", {})
    for model_key, alias in aliases.items():
        config["agents"]["defaults"]["models"].setdefault(model_key, {})
        config["agents"]["defaults"]["models"][model_key]["alias"] = alias

    skipped_channels = []
    if channels:
        config.setdefault("channels", {})
        for channel_name, channel_config in channels.items():
            resolved = resolve_env_placeholders(channel_config)
            missing = [
                value.split(":", 1)[1]
                for value in channel_config.values()
                if isinstance(value, str) and value.startswith("__ENV__:") and not resolve_env_placeholders(value)
            ]
            if missing:
                skipped_channels.append({"channel": channel_name, "missing": missing})
                continue
            config["channels"][channel_name] = resolved

    backup = save_config(config)
    message = f"Applied profile: {file_name}"
    if skipped_channels:
        message += "; Changes have been synchronized into the current environment."
    return {"ok": True, "message": message, "backup": str(backup) if backup else "", "skippedChannels": skipped_channels}


def apply_profile_and_restart(file_name: str) -> dict:
    apply_result = apply_profile_file(file_name)
    if not apply_result.get("ok"):
        return apply_result

    restart_result = restart_gateway()
    if not restart_result.get("ok"):
        message = f"{apply_result['message']}; however, OpenClaw could not be restarted automatically: {restart_result['message']}"
        return {
            "ok": False,
            "message": message,
            "applied": True,
            "restarted": False,
            "status": get_status(),
        }

    restart_message = restart_result.get("message") or "OpenClaw restarted."
    skipped_channels = apply_result.get("skippedChannels") or []
    message = f"已应用 {file_name}，并完成 OpenClaw 重启。{restart_message}"
    if skipped_channels:
        message += " 部分通道因缺少环境变量，暂未一起写入当前配置。"
    return {
        "ok": True,
        "message": message,
        "applied": True,
        "restarted": True,
        "status": get_status(),
    }


def update_profile_model(file_name: str, model_id: str, alias: str, apply_now: bool) -> dict:
    path = PROFILES_DIR / file_name
    if not path.exists():
        return {"ok": False, "message": f"Profile not found: {file_name}"}
    profile = load_json(path)
    provider_key = profile.get("providerKey")
    if not provider_key:
        return {"ok": False, "message": "Profile is missing providerKey."}

    models = ((profile.get("provider") or {}).get("models") or [])
    if not models:
        return {"ok": False, "message": "Profile has no editable model configuration."}

    models[0]["id"] = model_id
    models[0]["name"] = model_id
    profile["primaryModel"] = f"{provider_key}/{model_id}"
    profile["aliases"] = {profile["primaryModel"]: alias or model_id.replace("/", "-").replace(".", "-")}
    save_json(path, profile)

    if apply_now:
        result = apply_profile_file(file_name)
        if result["ok"]:
            result["message"] = f"Updated the model in {file_name} and applied it to the current OpenClaw session."
        return result
    return {"ok": True, "message": f"Updated the model configuration in {file_name}."}


def delete_profile(file_name: str) -> dict:
    if file_name == "profile.template.json":
        return {"ok": False, "message": "Template files cannot be deleted."}
    path = PROFILES_DIR / file_name
    if not path.exists():
        return {"ok": False, "message": f"Profile not found: {file_name}"}
    path.unlink()
    return {"ok": True, "message": f"Deleted profile: {file_name}"}


def create_profile(
    profile_name: str,
    provider_key: str,
    model_id: str,
    alias: str,
    apply_now: bool,
    api_key: str = "",
    test_now: bool = False,
) -> dict:
    profile_name = profile_name.strip()
    if not profile_name:
        return {"ok": False, "message": "Please enter a new profile name."}
    if provider_key not in PROVIDERS:
        return {"ok": False, "message": "Unsupported provider."}
    if not model_id.strip():
        return {"ok": False, "message": "Please enter a model ID."}

    safe_name = "".join(ch for ch in profile_name if ch.isalnum() or ch in {"-", "_", "."}).strip("._-")
    if not safe_name:
        return {"ok": False, "message": "Profile name may only contain letters, numbers, hyphens, underscores, and dots."}

    provider = PROVIDERS[provider_key]
    primary_model = f"{provider_key}/{model_id.strip()}"
    profile_data = {
        "profileName": safe_name,
        "providerKey": provider_key,
        "provider": {
            "baseUrl": provider["base_url"],
            "apiKey": f"__ENV__:{provider['env_name']}",
            "api": "openai-completions",
            "models": [
                {
                    "id": model_id.strip(),
                    "name": model_id.strip(),
                    "reasoning": False,
                    "input": provider["inputs"],
                    "contextWindow": provider["context_window"],
                    "maxTokens": provider["max_tokens"],
                }
            ],
        },
        "primaryModel": primary_model,
        "aliases": {primary_model: alias.strip() or provider["default_alias"]},
    }
    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    file_name = f"{safe_name}.json"
    path = PROFILES_DIR / file_name
    if path.exists():
        return {"ok": False, "message": f"Profile already exists: {file_name}"}
    save_json(path, profile_data)

    secret_saved = False
    api_key = api_key.strip()
    if api_key:
        set_secret(provider["env_name"], api_key)
        secret_saved = True

    apply_result = None
    test_result = None

    if apply_now:
        apply_result = apply_profile_file(file_name)

    if test_now:
        test_result = run_provider_test(provider_key)

    if apply_result and apply_result["ok"]:
        message = f"Created and applied profile: {file_name}"
    elif apply_result:
        message = f"Created profile: {file_name}, but it could not be applied immediately. Reason: {apply_result['message']}"
    else:
        message = f"Created profile: {file_name}"

    if secret_saved:
        message += "; API key saved to the matching environment variable."
    if test_result and test_result["ok"]:
        message += f"; Connectivity test passed ({provider['label']})."
    elif test_result:
        message += f"; Connectivity test failed: {test_result['message']}"

    result = {
        "ok": True,
        "message": message,
        "fileName": file_name,
    }
    if apply_result and not apply_result["ok"]:
        result["applyError"] = apply_result["message"]
    if test_result:
        result["test"] = test_result
    return result


def get_secrets_data() -> list[dict]:
    data = []
    for key, label in SECRET_ITEMS:
        value = get_secret(key)
        provider_key = next((name for name, provider in PROVIDERS.items() if provider["env_name"] == key), None)
        data.append(
            {
                "key": key,
                "label": label,
                "configured": bool(value),
                "preview": preview_secret(value),
                "providerKey": provider_key,
            }
        )
    return data


def get_channel_data() -> list[dict]:
    config = load_config()
    channels = config.get("channels") or {}
    feishu = channels.get("feishu") or {}
    telegram = channels.get("telegram") or {}
    allow_from = telegram.get("allowFrom") or []
    group_allow_from = telegram.get("groupAllowFrom") or []
    owner_user_id = allow_from[0] if allow_from else (group_allow_from[0] if group_allow_from else "")
    return [
        {
            "channel": "feishu",
            "label": "Feishu",
            "configured": bool(feishu.get("appId") and feishu.get("appSecret")),
            "tested": has_recent_channel_test("feishu"),
            "summary": "更适合当前这套本地 OpenClaw 配置。配好以后就能直接在飞书私聊或群里使用；如果 GPT 系模型在真实消息里超时，可以适当调大 listener 和 worker 的超时预算。",
            "fields": {
                "enabled": bool(feishu.get("enabled", True)),
                "appId": feishu.get("appId", ""),
                "appSecret": feishu.get("appSecret", ""),
                "domain": feishu.get("domain", "feishu"),
                "renderMode": feishu.get("renderMode", "auto"),
                "streaming": bool(feishu.get("streaming", False)),
                "listenerTimeout": ((feishu.get("eventQueue") or {}).get("listenerTimeout")),
                "inboundWorkerRunTimeoutMs": ((feishu.get("inboundWorker") or {}).get("runTimeoutMs")),
            },
        },
        {
            "channel": "telegram",
            "label": "Telegram",
            "configured": bool(telegram.get("botToken")) and bool(allow_from or group_allow_from),
            "tested": has_recent_channel_test("telegram"),
            "summary": "Telegram 往往不只是填一个 bot token 就够了；通常还需要用户 ID 或 allowlist，这样接好之后才真的有人能用。",
            "fields": {
                "enabled": bool(telegram.get("enabled", True)),
                "botToken": telegram.get("botToken", ""),
                "streaming": bool(telegram.get("streaming", False)),
                "ownerUserId": owner_user_id,
                "allowFrom": ", ".join(allow_from),
                "groupAllowFrom": ", ".join(group_allow_from),
                "dmPolicy": telegram.get("dmPolicy", "allowlist"),
                "groupPolicy": telegram.get("groupPolicy", "allowlist"),
            },
        },
    ]


def save_channel(channel: str, payload: dict) -> dict:
    config = load_config()
    config.setdefault("channels", {})

    if channel == "feishu":
        app_id = (payload.get("appId") or "").strip()
        app_secret = (payload.get("appSecret") or "").strip()
        if not app_id or not app_secret:
            return {"ok": False, "message": "Feishu requires both App ID and App Secret."}
        try:
            listener_timeout = parse_optional_int_field(
                payload.get("listenerTimeout"),
                minimum=1000,
                maximum=120000,
                field_label="Feishu listener timeout",
            )
            inbound_worker_timeout = parse_optional_int_field(
                payload.get("inboundWorkerRunTimeoutMs"),
                minimum=0,
                maximum=1800000,
                field_label="Feishu worker timeout",
            )
        except ValueError as exc:
            return {"ok": False, "message": str(exc)}
        config["channels"]["feishu"] = {
            "enabled": bool(payload.get("enabled", True)),
            "appId": app_id,
            "appSecret": app_secret,
            "domain": (payload.get("domain") or "feishu").strip() or "feishu",
            "renderMode": (payload.get("renderMode") or "auto").strip() or "auto",
            "streaming": bool(payload.get("streaming", False)),
        }
        if listener_timeout is not None:
            config["channels"]["feishu"]["eventQueue"] = {"listenerTimeout": listener_timeout}
        if inbound_worker_timeout is not None:
            config["channels"]["feishu"]["inboundWorker"] = {"runTimeoutMs": inbound_worker_timeout}
        set_secret("OPENCLAW_FEISHU_APP_ID", app_id)
        set_secret("OPENCLAW_FEISHU_APP_SECRET", app_secret)
        backup = save_config(config)
        return {"ok": True, "message": "Feishu channel configuration saved.", "backup": str(backup) if backup else ""}

    if channel == "telegram":
        bot_token = (payload.get("botToken") or "").strip()
        owner_user_id = (payload.get("ownerUserId") or "").strip()
        allow_from = parse_list_field(payload.get("allowFrom") or "")
        group_allow_from = parse_list_field(payload.get("groupAllowFrom") or "")
        dm_policy = (payload.get("dmPolicy") or "allowlist").strip() or "allowlist"
        group_policy = (payload.get("groupPolicy") or "allowlist").strip() or "allowlist"

        if not bot_token:
            return {"ok": False, "message": "Telegram requires a bot token."}
        if owner_user_id:
            if owner_user_id not in allow_from:
                allow_from.insert(0, owner_user_id)
            if owner_user_id not in group_allow_from:
                group_allow_from.insert(0, owner_user_id)
        if dm_policy == "allowlist" and not allow_from:
            return {"ok": False, "message": "When DM policy is allowlist, at least one user ID is required."}
        if group_policy in {"allowlist", "open"} and not group_allow_from:
            return {"ok": False, "message": "When group policy is enabled, at least one authorized user ID is required."}

        config["channels"]["telegram"] = {
            "enabled": bool(payload.get("enabled", True)),
            "botToken": bot_token,
            "streaming": bool(payload.get("streaming", False)),
            "dmPolicy": dm_policy,
            "groupPolicy": group_policy,
            "allowFrom": allow_from,
            "groupAllowFrom": group_allow_from,
        }
        backup = save_config(config)
        return {"ok": True, "message": "Telegram channel configuration saved.", "backup": str(backup) if backup else ""}

    return {"ok": False, "message": f"Unsupported channel: {channel}"}


def delete_channel(channel: str) -> dict:
    config = load_config()
    channels = config.get("channels") or {}
    if channel not in channels:
        return {"ok": True, "message": f"{channel} has no saved configuration right now."}
    del channels[channel]
    config["channels"] = channels
    backup = save_config(config)
    return {"ok": True, "message": f"Deleted the {channel} channel configuration.", "backup": str(backup) if backup else ""}


def get_channel_status() -> dict:
    items = get_channel_data()
    configured = [item["label"] for item in items if item["configured"]]
    tested = [item["label"] for item in items if item["configured"] and has_recent_channel_test(item["channel"])]
    recommended_channel_key = "feishu"
    if any(item["channel"] == "feishu" and item["configured"] for item in items):
        recommended_channel_key = "telegram" if not any(item["channel"] == "telegram" and item["configured"] for item in items) else "feishu"
    return {
        "feishuConfigured": any(item["channel"] == "feishu" and item["configured"] for item in items),
        "telegramConfigured": any(item["channel"] == "telegram" and item["configured"] for item in items),
        "configuredChannels": configured,
        "testedChannels": tested,
        "hasConfiguredChannel": bool(configured),
        "hasTestedChannel": bool(tested),
        "recommendedChannelKey": recommended_channel_key,
    }


def get_provider_status() -> dict:
    configured = []
    configured_keys = []
    for provider_key, provider in PROVIDERS.items():
        if get_secret(provider["env_name"]):
            configured.append(provider["label"])
            configured_keys.append(provider_key)
    profiles = [item for item in get_profiles() if not item.get("error")]
    profile_provider_keys = sorted({item["providerKey"] for item in profiles if item.get("providerKey")})
    active_provider_key = get_primary_provider_key()
    recommended_provider_key = "openai"
    if recommended_provider_key in configured_keys and len(configured_keys) < len(PROVIDERS):
        recommended_provider_key = next((key for key in PROVIDERS if key not in configured_keys), recommended_provider_key)
    elif not configured_keys and "openai" not in PROVIDERS:
        recommended_provider_key = next(iter(PROVIDERS), "")
    elif configured_keys:
        recommended_provider_key = configured_keys[0]
    return {
        "configuredProviders": configured,
        "configuredProviderKeys": configured_keys,
        "profileProviderKeys": profile_provider_keys,
        "profileCount": len(profiles),
        "hasProviderSecret": bool(configured_keys),
        "hasProviderProfile": bool(profiles),
        "hasAppliedPrimaryProvider": bool(active_provider_key),
        "activeProviderKey": active_provider_key,
        "recommendedProviderKey": recommended_provider_key,
        "hasConfiguredProvider": bool(configured_keys) and bool(profiles) and bool(active_provider_key),
    }


def get_connection_settings() -> dict:
    state = load_local_console_state()
    config = load_config()
    proxy_info = get_proxy_info()
    return {
        "gatewayPort": get_gateway_port(state),
        "defaultGatewayPort": GATEWAY_PORT,
        "consolePort": DEFAULT_PORT,
        "timeoutSeconds": get_agent_timeout_seconds(config),
        "defaultTimeoutSeconds": 600,
        "proxyOverride": get_secret("OPENCLAW_CONSOLE_PROXY"),
        "proxyPreview": preview_secret(get_secret("OPENCLAW_CONSOLE_PROXY")) or "未设置",
        "currentProxy": proxy_info["value"] or "未检测到",
        "proxySource": proxy_info["source"],
    }


def save_connection_settings(payload: dict) -> dict:
    state = load_local_console_state()
    config = load_config()
    local_console = get_console_state(state)
    connection = local_console.setdefault("connection", {})

    raw_port = str(payload.get("gatewayPort", "")).strip()
    if raw_port:
        try:
            gateway_port = int(raw_port)
        except ValueError:
            return {"ok": False, "message": "Gateway port must be a number."}
        if not 1 <= gateway_port <= 65535:
            return {"ok": False, "message": "Gateway port must be between 1 and 65535."}
        connection["gatewayPort"] = gateway_port
    else:
        connection.pop("gatewayPort", None)

    try:
        timeout_seconds = parse_optional_int_field(
            payload.get("timeoutSeconds"),
            minimum=0,
            maximum=7200,
            field_label="Agent timeout",
        )
    except ValueError as exc:
        return {"ok": False, "message": str(exc)}

    agents_defaults = (config.setdefault("agents", {})).setdefault("defaults", {})
    if timeout_seconds is None:
        agents_defaults.pop("timeoutSeconds", None)
    else:
        agents_defaults["timeoutSeconds"] = timeout_seconds

    proxy_override = str(payload.get("proxyOverride", "")).strip()
    if proxy_override:
        set_secret("OPENCLAW_CONSOLE_PROXY", proxy_override)
    else:
        delete_secret("OPENCLAW_CONSOLE_PROXY")

    save_local_console_state(state)
    return {
        "ok": True,
        "message": "Connection settings saved. Restart Gateway if needed for the new values to apply.",
        "data": get_connection_settings(),
        "backup": str(backup) if backup else "",
    }


def migrate_local_console_state() -> None:
    config = load_config()
    dirty = False
    if "localConsole" in config:
        state = load_local_console_state()
        state["localConsole"] = deepcopy(config.get("localConsole") or {})
        save_local_console_state(state)
        config.pop("localConsole", None)
        dirty = True
    if dirty:
        save_config(config)


def get_status() -> dict:
    config = load_config()
    primary_model = (((config.get("agents") or {}).get("defaults") or {}).get("model") or {}).get("primary", "")
    bind = ((config.get("gateway") or {}).get("bind") or "loopback")
    gateway_port = get_gateway_port(config)
    pids = get_gateway_pids()
    health = gateway_health() if pids or is_port_open() else {"ok": False, "message": "Gateway is not running."}
    providers = get_provider_status()
    proxy_info = get_proxy_info()
    return {
        "running": bool(pids or is_port_open()),
        "port": gateway_port,
        "bind": bind,
        "pids": pids,
        "primaryModel": primary_model,
        "activeProfile": get_active_profile(primary_model),
        "timeoutSeconds": get_agent_timeout_seconds(config),
        "proxy": proxy_info["value"] or "Not detected",
        "proxySource": proxy_info["source"],
        "healthMessage": health["message"],
        "channels": get_channel_status(),
        "providers": providers,
    }


def self_check() -> dict:
    config = load_config()
    primary_model = (((config.get("agents") or {}).get("defaults") or {}).get("model") or {}).get("primary", "")
    providers = get_provider_status()
    proxy_info = get_proxy_info()
    return {
        "pythonAvailable": bool(shutil.which("python")),
        "openclawAvailable": bool(shutil.which("openclaw") or OPENCLAW_CMD.exists()),
        "nodeExists": NODE_EXE.exists() or bool(shutil.which("node")),
        "npmAvailable": bool(shutil.which("npm")),
        "wingetAvailable": bool(shutil.which("winget")),
        "configExists": CONFIG_PATH.exists(),
        "profileDirExists": PROFILES_DIR.exists(),
        "gatewayScriptExists": (OPENCLAW_ROOT / "gateway.cmd").exists(),
        "openclawDistExists": OPENCLAW_DIST.exists(),
        "profilesCount": len(get_profiles()),
        "primaryModel": primary_model,
        "gatewayPort": get_gateway_port(config),
        "proxy": proxy_info["value"] or "Not detected",
        "proxySource": proxy_info["source"],
        "hasConfiguredProvider": providers["hasConfiguredProvider"],
        "configuredProviders": providers["configuredProviders"],
    }


def ensure_workspace_skeleton() -> dict:
    OPENCLAW_ROOT.mkdir(parents=True, exist_ok=True)
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
    (OPENCLAW_ROOT / "agents" / "main" / "sessions").mkdir(parents=True, exist_ok=True)
    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    OPENCLAW_SKILLS_DIR.mkdir(parents=True, exist_ok=True)

    for item in CORE_DOCS:
        path = WORKSPACE_DIR / item["name"]
        if not path.exists():
            path.write_text(item["default_content"], encoding="utf-8", newline="\n")

    if not CONFIG_PATH.exists():
        config = {
            "meta": {
                "lastTouchedVersion": "local-console",
                "lastTouchedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            },
            "wizard": {
                "lastRunAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
                "lastRunVersion": "local-console",
                "lastRunCommand": "create_base_config",
                "lastRunMode": "local",
            },
            "models": {"mode": "merge", "providers": {}},
            "agents": {
                "defaults": {
                    "model": {"primary": ""},
                    "models": {},
                    "workspace": str(WORKSPACE_DIR),
                    "contextTokens": 120000,
                    "bootstrapMaxChars": 16000,
                    "bootstrapTotalMaxChars": 90000,
                    "compaction": {"mode": "default", "memoryFlush": {"enabled": True}},
                    "thinkingDefault": "medium",
                    "verboseDefault": "off",
                    "typingMode": "message",
                    "maxConcurrent": 4,
                    "subagents": {"maxConcurrent": 8},
                }
            },
            "tools": {"web": {"search": {"enabled": True}, "fetch": {"enabled": True}}},
            "commands": {"native": "auto", "nativeSkills": "auto", "restart": True, "ownerDisplay": "raw"},
            "channels": {},
            "gateway": {"mode": "local", "bind": "loopback", "auth": {"token": secrets.token_urlsafe(24)}},
            "plugins": {"entries": {"feishu": {"enabled": True}}},
        }
        save_json(CONFIG_PATH, config)
        save_local_console_state(
            {
                "permissions": {
                    "mode": "restricted",
                    "allowedDirs": [str(WORKSPACE_DIR)],
                    "execDirs": [str(WORKSPACE_DIR)],
                    "extraDirs": [],
                    "sandboxMode": "off",
                    "execAsk": "on-miss",
                }
            }
        )
    return {"ok": True, "message": "Created the base OpenClaw config and workspace skeleton."}


def install_python() -> dict:
    if shutil.which("python"):
        return {"ok": True, "message": "Python is already installed."}
    result = run_command(
        [
            get_winget_command(),
            "install",
            "-e",
            "--id",
            "Python.Python.3.12",
            "--accept-package-agreements",
            "--accept-source-agreements",
        ],
        timeout=1800,
    )
    result["message"] = "Python install command executed."
    return result


def install_node() -> dict:
    if NODE_EXE.exists() or shutil.which("node"):
        return {"ok": True, "message": "Node.js is already installed."}
    result = run_command(
        [
            get_winget_command(),
            "install",
            "-e",
            "--id",
            "OpenJS.NodeJS.LTS",
            "--accept-package-agreements",
            "--accept-source-agreements",
        ],
        timeout=1800,
    )
    result["message"] = "Node.js install command executed."
    return result


def install_openclaw() -> dict:
    if OPENCLAW_CMD.exists() or shutil.which("openclaw"):
        return {"ok": True, "message": "OpenClaw is already installed."}
    if not (NODE_EXE.exists() or shutil.which("node")):
        node_result = install_node()
        if not node_result["ok"]:
            return {"ok": False, "message": "Node.js install failed, so OpenClaw installation cannot continue.", "details": node_result}
    result = run_command([get_npm_command(), "install", "-g", "openclaw@latest"], timeout=1800)
    if result["ok"]:
        return {"ok": True, "message": "OpenClaw installation completed.", "details": result}
    return {"ok": False, "message": result["stderr"] or "OpenClaw installation failed.", "details": result}


def execute_setup_action(action_id: str) -> dict:
    if action_id == "install_python":
        return install_python()
    if action_id == "install_node":
        return install_node()
    if action_id == "install_openclaw":
        return install_openclaw()
    if action_id == "create_base_config":
        return ensure_workspace_skeleton()
    if action_id == "start_gateway":
        return start_gateway()
    if action_id == "test_primary_provider":
        provider_key = get_primary_provider_key()
        if not provider_key:
            return {"ok": False, "message": "There is no primary provider available for testing yet."}
        return run_provider_test(provider_key)
    if action_id == "test_feishu_channel":
        return run_channel_test("feishu")
    if action_id == "test_telegram_channel":
        return run_channel_test("telegram")
    return {"ok": False, "message": f"Unsupported setup action: {action_id}"}


def get_setup_guide() -> dict:
    check = self_check()
    channels = get_channel_status()
    providers = get_provider_status()
    status = get_status()
    primary_provider_key = get_primary_provider_key()
    provider_test_ready = providers["hasConfiguredProvider"] and has_recent_provider_test(primary_provider_key)
    configured_channel_key = "feishu" if channels["feishuConfigured"] else ("telegram" if channels["telegramConfigured"] else "")
    channel_test_ready = channels["hasTestedChannel"]
    recommended_provider_key = providers.get("recommendedProviderKey") or "openai"
    recommended_provider_label = PROVIDERS.get(recommended_provider_key, {}).get("label", recommended_provider_key)
    items = []

    items.append(
        {
            "id": "python",
            "title": "Python 已就绪" if check["pythonAvailable"] else "缺少 Python",
            "summary": "控制台服务和辅助脚本已经可以使用 Python。" if check["pythonAvailable"] else "本地控制台和辅助脚本依赖 Python。",
            "status": "ok" if check["pythonAvailable"] else "todo",
            "actions": [] if check["pythonAvailable"] else [{"label": "安装 Python", "actionId": "install_python", "kind": "primary"}],
        }
    )
    items.append(
        {
            "id": "node",
            "title": "Node.js 已就绪" if check["nodeExists"] else "缺少 Node.js",
            "summary": "这台机器已经可以使用 Node.js。" if check["nodeExists"] else "OpenClaw 本身依赖 Node.js LTS。",
            "status": "ok" if check["nodeExists"] else "todo",
            "actions": [] if check["nodeExists"] else [{"label": "安装 Node.js", "actionId": "install_node", "kind": "primary"}],
        }
    )
    items.append(
        {
            "id": "openclaw",
            "title": "OpenClaw 已就绪" if check["openclawAvailable"] else "缺少 OpenClaw",
            "summary": "OpenClaw CLI 已可用。" if check["openclawAvailable"] else "请先安装 OpenClaw CLI，再继续配置 Provider 和通道。",
            "status": "ok" if check["openclawAvailable"] else "todo",
            "actions": [] if check["openclawAvailable"] else [{"label": "安装 OpenClaw", "actionId": "install_openclaw", "kind": "primary"}],
        }
    )
    items.append(
        {
            "id": "config",
            "title": "基础配置已存在" if check["configExists"] else "OpenClaw 尚未初始化",
            "summary": "已经找到 openclaw.json。" if check["configExists"] else "还没有发现 openclaw.json，控制台可以生成一份最小可用配置和工作区骨架。",
            "status": "ok" if check["configExists"] else "todo",
            "actions": [] if check["configExists"] else [{"label": "创建基础配置", "actionId": "create_base_config", "kind": "primary"}],
        }
    )
    items.append(
        {
            "id": "provider",
            "title": "Provider 已配置" if providers["hasConfiguredProvider"] else "Provider 尚未配置",
            "summary": (
                f"已配置的 Provider：{' / '.join(providers['configuredProviders'])}；当前主力 Provider：{PROVIDERS.get(providers['activeProviderKey'], {}).get('label', providers['activeProviderKey'])}。"
                if providers["hasConfiguredProvider"]
                else (
                    f"推荐下一步先保存一个 {recommended_provider_label} 密钥，再创建 Provider Profile，并立刻应用。"
                    if not providers["hasProviderSecret"]
                    else (
                        "当前已经保存了 Provider 密钥，但还没有本地 Profile。请打开 Provider 向导创建一个 Profile。"
                        if not providers["hasProviderProfile"]
                        else "当前已经有 Profile，但还没有应用到这次 OpenClaw 会话。请先从左侧列表里应用一个 Profile。"
                    )
                )
            ),
            "status": "ok" if providers["hasConfiguredProvider"] else "todo",
            "actions": (
                []
                if providers["hasConfiguredProvider"]
                else (
                    [
                        {
                            "label": f"保存 {recommended_provider_label} 密钥",
                            "target": "secret-form",
                            "providerKey": recommended_provider_key,
                            "kind": "primary",
                            "note": "如果这台机器还没有 Provider 密钥，就从这里开始。控制台会自动预选对应的环境变量。",
                        },
                        {
                            "label": f"创建 {recommended_provider_label} Profile",
                            "target": "provider-wizard-panel",
                            "configTab": "provider",
                            "providerKey": recommended_provider_key,
                            "note": "打开 Provider 向导创建 Profile，并在完成后立刻应用，必要时顺手做一次最小测试。",
                        },
                    ]
                    if not providers["hasProviderSecret"]
                    else (
                        [
                            {
                                "label": "创建 Provider Profile",
                                "target": "provider-wizard-panel",
                                "configTab": "provider",
                                "providerKey": recommended_provider_key,
                                "kind": "primary",
                                "note": "API Key 已经存在，这一步主要是补齐 Profile，并把它应用进 OpenClaw。",
                            }
                        ]
                        if not providers["hasProviderProfile"]
                        else [
                            {
                                "label": "打开 Profiles 列表",
                                "target": "profiles-list",
                                "note": "请从左侧选择一个已有 Profile 并点击应用，让当前 OpenClaw 会话真正拿到主模型。",
                            }
                        ]
                    )
                )
            ),
        }
    )
    items.append(
        {
            "id": "channel",
            "title": "消息通道已配置" if channels["configuredChannels"] else "消息通道尚未配置",
            "summary": (
                f"已配置的消息通道：{' / '.join(channels['configuredChannels'])}"
                if channels["configuredChannels"]
                else "建议至少先接入一个消息通道，例如飞书或 Telegram，再继续做端到端消息链路验证。"
            ),
            "status": "ok" if channels["configuredChannels"] else "todo",
            "actions": (
                []
                if channels["configuredChannels"]
                else [
                    {
                        "label": "打开飞书表单",
                        "target": "channels-panel",
                        "channel": "feishu",
                        "kind": "primary",
                        "note": "这里更推荐先接飞书。填好 App ID 和 App Secret 后直接保存即可。",
                    },
                    {
                        "label": "打开 Telegram 表单",
                        "target": "channels-panel",
                        "channel": "telegram",
                        "note": "Telegram 也可以，但至少需要 bot token 和一个授权用户 ID。",
                    },
                ]
            ),
        }
    )
    items.append(
        {
            "id": "gateway",
            "title": "Gateway 已启动" if status["running"] else "Gateway 尚未启动",
            "summary": "Gateway 已经运行，可以继续做后续验证。" if status["running"] else "完成配置后，请先启动 Gateway，再去验证 Provider 和消息通道。",
            "status": "ok" if status["running"] else "todo",
            "actions": [] if status["running"] else [{"label": "启动 OpenClaw", "actionId": "start_gateway", "kind": "primary"}],
        }
    )
    items.append(
        {
            "id": "provider-test",
            "title": "主力 Provider 已验证" if provider_test_ready else "主力 Provider 尚未验证",
            "summary": (
                f"最近一次已验证的主力 Provider：{primary_provider_key or 'unknown'}。"
                if provider_test_ready
                else "Gateway 启动后，请立刻对当前主力 Provider 做一次最小连通性测试。"
            ),
            "status": "ok" if provider_test_ready else "todo",
            "actions": [] if provider_test_ready else [{"label": "测试主力 Provider", "actionId": "test_primary_provider", "kind": "primary"}],
        }
    )
    items.append(
        {
            "id": "channel-test",
            "title": "消息通道已验证" if channel_test_ready else "消息通道尚未验证",
            "summary": (
                f"最近一次已验证的消息通道：{channels['testedChannels'][0]}。"
                if channel_test_ready and channels["testedChannels"]
                else "主力 Provider 通过后，请继续做一次最小消息通道连通性测试。"
            ),
            "status": "ok" if channel_test_ready else "todo",
            "actions": (
                []
                if channel_test_ready or not configured_channel_key
                else [
                    {
                        "label": "测试飞书通道" if configured_channel_key == "feishu" else "测试 Telegram 通道",
                        "actionId": "test_feishu_channel" if configured_channel_key == "feishu" else "test_telegram_channel",
                        "kind": "primary",
                    }
                ]
            ),
        }
    )

    step_order = ["python", "node", "openclaw", "config", "provider", "channel", "gateway", "provider-test", "channel-test"]
    current_step = next((item for item in items if item["status"] != "ok"), None)
    completed_count = sum(1 for item in items if item["status"] == "ok")

    if current_step:
        next_action = current_step["actions"][0] if current_step.get("actions") else {}
        summary = {
            "completedCount": completed_count,
            "totalCount": len(items),
            "currentStepId": current_step["id"],
            "currentStepTitle": current_step["title"],
            "nextAction": next_action,
            "nextActionLabel": next_action.get("label", "继续当前步骤"),
            "nextActionId": next_action.get("actionId", ""),
            "nextActionTarget": next_action.get("target", ""),
            "nextActionNote": next_action.get("note", current_step["summary"]),
        }
    else:
        summary = {
            "completedCount": completed_count,
            "totalCount": len(items),
            "currentStepId": "",
            "currentStepTitle": "当前步骤已完成。",
            "nextAction": {},
            "nextActionLabel": "当前没有必做动作。",
            "nextActionId": "",
            "nextActionTarget": "",
            "nextActionNote": "当前步骤区域没有待执行动作。",
        }

    return {
        "items": items,
        "summary": summary,
        "steps": [
            {
                "id": item["id"],
                "title": item["title"],
                "done": item["status"] == "ok",
                "current": bool(current_step and item["id"] == current_step["id"]),
                "index": step_order.index(item["id"]) + 1 if item["id"] in step_order else 0,
            }
            for item in items
        ],
        "channels": channels,
        "windowNote": {
            "title": "启动窗口说明",
            "summary": "控制台这个窗口本身可以关闭。如果 Gateway 是由控制台启动的，这个版本不会额外弹出一个需要手动操作的第二窗口；如果以后某些安装动作必须打开外部安装窗口，UI 会明确告诉你哪个窗口可以关、哪个不要关。",
        },
    }


def run_provider_test(provider_key: str) -> dict:
    if provider_key not in PROVIDERS:
        return {"ok": False, "message": f"Unsupported provider: {provider_key}"}

    provider = PROVIDERS[provider_key]
    api_key = get_secret(provider["env_name"])
    if not api_key:
        return {"ok": False, "message": f"The key for {provider['label']} is not configured."}

    opener = build_opener()
    headers = {"Content-Type": "application/json"}

    if provider["test_mode"] == "anthropic-messages":
        url = provider["base_url"].rstrip("/") + "/messages"
        headers["x-api-key"] = api_key
        headers["anthropic-version"] = "2023-06-01"
        payload = {
            "model": provider["default_model"],
            "max_tokens": 32,
            "messages": [{"role": "user", "content": "Reply with OK."}],
        }
    else:
        url = provider["base_url"].rstrip("/") + "/chat/completions"
        headers["Authorization"] = f"Bearer {api_key}"
        payload = {
            "model": provider["default_model"],
            "messages": [{"role": "user", "content": "Reply with OK."}],
        }
        if provider_key == "openai":
            payload["max_completion_tokens"] = 32
        else:
            payload["max_tokens"] = 32

    request = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    try:
        with opener.open(request, timeout=40) as response:
            body = response.read().decode("utf-8", errors="replace")
            data = json.loads(body)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        return {"ok": False, "message": f"{provider['label']} 测试失败：HTTP {exc.code}", "preview": detail[:500]}
    except Exception as exc:
        return {"ok": False, "message": f"{provider['label']} test failed: {exc}"}

    preview = ""
    if provider["test_mode"] == "anthropic-messages":
        blocks = data.get("content") or []
        if blocks:
            preview = blocks[0].get("text", "")
        model_name = data.get("model", provider["default_model"])
    else:
        choices = data.get("choices") or []
        if choices:
            preview = (((choices[0].get("message") or {}).get("content")) or "")
        model_name = data.get("model", provider["default_model"])

    result = {"ok": True, "message": f"{provider['label']} 测试通过。模型：{model_name}", "preview": preview[:500]}
    mark_provider_test(provider_key, True)
    return result


def run_channel_test(channel: str) -> dict:
    config = load_config()
    channels = config.get("channels") or {}
    opener = build_opener()

    if channel == "feishu":
        feishu = channels.get("feishu") or {}
        app_id = (feishu.get("appId") or "").strip()
        app_secret = (feishu.get("appSecret") or "").strip()
        if not app_id or not app_secret:
            return {"ok": False, "message": "Feishu channel is missing App ID or App Secret."}
        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        payload = {"app_id": app_id, "app_secret": app_secret}
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        try:
            with opener.open(request, timeout=40) as response:
                body = response.read().decode("utf-8", errors="replace")
                data = json.loads(body)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            return {"ok": False, "message": f"Feishu channel test failed: HTTP {exc.code}", "preview": detail[:500]}
        except Exception as exc:
            return {"ok": False, "message": f"Feishu channel test failed: {exc}"}
        if data.get("code") != 0 or not data.get("tenant_access_token"):
            return {
                "ok": False,
                "message": f"Feishu channel test failed: {data.get('msg') or 'tenant_access_token was not returned'}",
                "preview": json.dumps(data, ensure_ascii=False)[:500],
            }
        expire = data.get("expire", "")
        preview = f"tenant_access_token acquired successfully. expire={expire}" if expire else "tenant_access_token acquired successfully."
        result = {"ok": True, "message": "Feishu channel test passed.", "preview": preview}
        mark_channel_test("feishu", True)
        return result

    if channel == "telegram":
        telegram = channels.get("telegram") or {}
        token = (telegram.get("botToken") or "").strip()
        if not token:
            return {"ok": False, "message": "Telegram channel is missing bot token."}
        url = f"https://api.telegram.org/bot{urllib.parse.quote(token, safe='')}/getMe"
        request = urllib.request.Request(url, method="GET")
        try:
            with opener.open(request, timeout=40) as response:
                body = response.read().decode("utf-8", errors="replace")
                data = json.loads(body)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            return {"ok": False, "message": f"Telegram 通道测试失败：HTTP {exc.code}", "preview": detail[:500]}
        except Exception as exc:
            return {"ok": False, "message": f"Telegram channel test failed: {exc}"}
        if not data.get("ok"):
            return {
                "ok": False,
                "message": f"Telegram channel test failed: {data.get('description') or 'API returned a failure'}",
                "preview": json.dumps(data, ensure_ascii=False)[:500],
            }
        result = data.get("result") or {}
        username = result.get("username") or "unknown"
        bot_id = result.get("id") or ""
        preview = f"Bot username: @{username}; bot id: {bot_id}"
        result = {"ok": True, "message": "Telegram channel test passed.", "preview": preview}
        mark_channel_test("telegram", True)
        return result

    return {"ok": False, "message": f"Unsupported channel test: {channel}"}


def get_logs_data() -> list[dict]:
    with LOG_LOCK:
        return list(LOGS)


def clear_logs_data() -> dict:
    with LOG_LOCK:
        LOGS.clear()
    return {"ok": True, "message": "已清空最近操作日志。"}


def parse_session_timestamp(value: str) -> datetime | None:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        return None


def iter_usage_entries() -> list[dict]:
    if not SESSIONS_DIR.exists():
        return []

    entries: list[dict] = []
    for path in sorted(SESSIONS_DIR.glob("*.jsonl"), key=lambda item: item.stat().st_mtime, reverse=True):
        try:
            with path.open("r", encoding="utf-8") as handle:
                for raw_line in handle:
                    line = raw_line.strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    if record.get("type") != "message":
                        continue

                    message = record.get("message") or {}
                    usage = message.get("usage") or {}
                    total_tokens = usage.get("totalTokens")
                    if total_tokens in (None, 0):
                        continue

                    timestamp = parse_session_timestamp(record.get("timestamp") or "")
                    if not timestamp:
                        continue

                    entries.append(
                        {
                            "timestamp": timestamp,
                            "provider": message.get("provider") or "",
                            "model": message.get("model") or "unknown",
                            "inputTokens": int(usage.get("input") or 0),
                            "outputTokens": int(usage.get("output") or 0),
                            "totalTokens": int(total_tokens or 0),
                            "costTotal": float((((usage.get("cost") or {}).get("total")) or 0)),
                            "sessionFile": path.name,
                        }
                    )
        except OSError:
            continue
    return entries


def get_token_usage_data(days: int) -> dict:
    return get_token_usage_data_filtered(days, configured_only=False)


def get_configured_profile_model_keys() -> set[tuple[str, str]]:
    configured: set[tuple[str, str]] = set()
    for item in get_profiles():
        provider_key = item.get("providerKey") or ""
        model_id = item.get("modelId") or ""
        provider = PROVIDERS.get(provider_key)
        if not provider or not model_id:
            continue
        if not get_secret(provider["env_name"]):
            continue
        configured.add((provider_key, model_id))
    return configured


def get_token_usage_data_filtered(days: int, configured_only: bool) -> dict:
    days = max(1, min(days, 365))
    now_utc = datetime.now(timezone.utc)
    start_utc = now_utc - timedelta(days=days)
    entries = [item for item in iter_usage_entries() if item["timestamp"] >= start_utc]
    configured_model_keys = get_configured_profile_model_keys()
    if configured_only:
        entries = [
            item
            for item in entries
            if (item["provider"], item["model"]) in configured_model_keys
        ]

    by_model: dict[str, dict] = {}
    start_local_date = start_utc.astimezone(LOCAL_TIMEZONE).date()
    end_local_date = now_utc.astimezone(LOCAL_TIMEZONE).date()
    day_keys: list[str] = []
    cursor = start_local_date
    while cursor <= end_local_date:
        day_keys.append(cursor.isoformat())
        cursor += timedelta(days=1)
    if not day_keys:
        day_keys.append(now_utc.astimezone(LOCAL_TIMEZONE).date().isoformat())
    timeline = [
        {
            "date": day_key,
            "label": datetime.fromisoformat(day_key).strftime("%m-%d"),
        }
        for day_key in day_keys
    ]
    timeline_index = {item["date"]: index for index, item in enumerate(timeline)}
    overall_daily = [0 for _ in timeline]
    total_tokens = 0
    total_input = 0
    total_output = 0
    total_cost = 0.0

    for item in entries:
        model_key = item["model"]
        item_local_date = item["timestamp"].astimezone(LOCAL_TIMEZONE).date().isoformat()
        day_index = timeline_index.get(item_local_date)
        bucket = by_model.setdefault(
            model_key,
            {
                "model": model_key,
                "provider": item["provider"],
                "inputTokens": 0,
                "outputTokens": 0,
                "totalTokens": 0,
                "costTotal": 0.0,
                "calls": 0,
                "dailyTokens": [0 for _ in timeline],
                "dailyCalls": [0 for _ in timeline],
            },
        )
        bucket["inputTokens"] += item["inputTokens"]
        bucket["outputTokens"] += item["outputTokens"]
        bucket["totalTokens"] += item["totalTokens"]
        bucket["costTotal"] += item["costTotal"]
        bucket["calls"] += 1
        if day_index is not None:
            bucket["dailyTokens"][day_index] += item["totalTokens"]
            bucket["dailyCalls"][day_index] += 1
            overall_daily[day_index] += item["totalTokens"]

        total_tokens += item["totalTokens"]
        total_input += item["inputTokens"]
        total_output += item["outputTokens"]
        total_cost += item["costTotal"]

    for provider_key, model_id in configured_model_keys:
        by_model.setdefault(
            model_id,
            {
                "model": model_id,
                "provider": provider_key,
                "inputTokens": 0,
                "outputTokens": 0,
                "totalTokens": 0,
                "costTotal": 0.0,
                "calls": 0,
                "dailyTokens": [0 for _ in timeline],
                "dailyCalls": [0 for _ in timeline],
            },
        )

    models = sorted(by_model.values(), key=lambda item: item["totalTokens"], reverse=True)
    return {
        "rangeDays": days,
        "configuredOnly": configured_only,
        "generatedAt": now_utc.isoformat(),
        "windowStart": start_utc.isoformat(),
        "windowEnd": now_utc.isoformat(),
        "configuredModels": [
            {"provider": provider, "model": model}
            for provider, model in sorted(configured_model_keys, key=lambda item: (item[0], item[1]))
        ],
        "summary": {
            "totalTokens": total_tokens,
            "inputTokens": total_input,
            "outputTokens": total_output,
            "totalCost": round(total_cost, 6),
            "messageCount": len(entries),
            "modelCount": len(models),
        },
        "models": models,
        "timeline": timeline,
        "series": {
            "all": {
                "label": "全部模型",
                "dailyTokens": overall_daily,
            },
            "models": [
                {
                    "provider": item["provider"],
                    "model": item["model"],
                    "label": f"{item['provider']} / {item['model']}",
                    "dailyTokens": item["dailyTokens"],
                    "dailyCalls": item["dailyCalls"],
                }
                for item in models
            ],
        },
    }


def get_core_docs_data() -> list[dict]:
    data = []
    for item in CORE_DOCS:
        path = WORKSPACE_DIR / item["name"]
        exists = path.exists()
        stat = path.stat() if exists else None
        data.append(
            {
                "name": item["name"],
                "label": item["label"],
                "description": item["description"],
                "path": str(path),
                "exists": exists,
                "size": stat.st_size if stat else 0,
                "updatedAt": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S") if stat else "",
            }
        )
    return data


def read_core_doc(name: str) -> dict:
    item = CORE_DOCS_BY_NAME.get(name)
    if not item:
        return {"ok": False, "message": f"不支持的核心文件：{name}"}
    path = WORKSPACE_DIR / name
    if not path.exists():
        return {"ok": False, "message": f"{name} 当前还不存在。", "missing": True, "data": {"name": name, "path": str(path)}}
    return {
        "ok": True,
        "data": {
            "name": name,
            "label": item["label"],
            "path": str(path),
            "content": path.read_text(encoding="utf-8"),
            "exists": True,
        },
    }


def save_core_doc(name: str, content: str) -> dict:
    item = CORE_DOCS_BY_NAME.get(name)
    if not item:
        return {"ok": False, "message": f"不支持的核心文件：{name}"}
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
    path = WORKSPACE_DIR / name
    path.write_text(content, encoding="utf-8", newline="\n")
    return {"ok": True, "message": f"已保存 {name}。", "path": str(path)}


def create_default_core_doc(name: str) -> dict:
    item = CORE_DOCS_BY_NAME.get(name)
    if not item:
        return {"ok": False, "message": f"不支持的核心文件：{name}"}
    return save_core_doc(name, item["default_content"])


def create_missing_core_docs() -> dict:
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
    created: list[str] = []
    for item in CORE_DOCS:
        path = WORKSPACE_DIR / item["name"]
        if path.exists():
            continue
        path.write_text(item["default_content"], encoding="utf-8", newline="\n")
        created.append(item["name"])
    if not created:
        return {"ok": True, "message": "核心文件都已经存在了。", "created": []}
    return {"ok": True, "message": f"已为 {len(created)} 个缺失核心文件补齐默认模板。", "created": created}


def get_skill_readme_preview(skill_dir: Path) -> tuple[bool, str]:
    readme = skill_dir / "SKILL.md"
    if not readme.exists():
        return False, ""
    try:
        text = readme.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = readme.read_text(encoding="utf-8", errors="replace")
    return True, text


def list_skills_in_dir(source_key: str, root: Path) -> list[dict]:
    if not root.exists():
        return []
    items = []
    for child in sorted((item for item in root.iterdir() if item.is_dir()), key=lambda p: p.name.lower()):
        if child.name.startswith("."):
            continue
        has_readme, preview = get_skill_readme_preview(child)
        items.append(
            {
                "name": child.name,
                "source": source_key,
                "path": str(child),
                "hasSkillMd": has_readme,
                "preview": preview[:2000],
            }
        )
    return items


def get_skills_data() -> dict:
    installed = {item["name"]: item for item in list_skills_in_dir("openclaw", OPENCLAW_SKILLS_DIR)}
    available: list[dict] = []
    for source_key in ("agents", "codex"):
        for item in list_skills_in_dir(source_key, SKILL_SOURCES[source_key]):
            item["installed"] = item["name"] in installed
            installed_item = installed.get(item["name"])
            item["installedPath"] = installed_item["path"] if installed_item else ""
            available.append(item)
    return {"installed": list(installed.values()), "available": available}


def search_online_skills(query_text: str) -> dict:
    query_text = (query_text or "").strip()
    if not query_text:
        return {"ok": False, "message": "请先输入要搜索的 skill 关键词。"}

    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "OpenClaw-Local-Console",
    }
    encoded_query = urllib.parse.quote_plus(query_text)
    search_urls = [
        (
            "code",
            "https://api.github.com/search/code"
            f"?q={encoded_query}+filename%3ASKILL.md&per_page=10",
        ),
        (
            "repo",
            "https://api.github.com/search/repositories"
            f"?q={encoded_query}+openclaw+skill&sort=stars&order=desc&per_page=10",
        ),
    ]

    query_terms = [term.lower() for term in query_text.replace("/", " ").replace("-", " ").split() if term.strip()]
    results: dict[str, dict] = {}
    for mode, url in search_urls:
        request_obj = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request_obj, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            if exc.code == 401 and mode == "code":
                continue
            if exc.code == 403:
                return {"ok": False, "message": "GitHub 搜索暂时被限流了，请稍后再试。", "detail": detail}
            return {"ok": False, "message": f"GitHub 搜索失败：HTTP {exc.code}", "detail": detail}
        except Exception as exc:
            return {"ok": False, "message": f"在线搜索失败：{exc}"}

        for item in payload.get("items") or []:
            repo = item.get("repository") if mode == "code" else item
            if not repo:
                continue
            full_name = repo.get("full_name") or ""
            if not full_name or full_name in results:
                continue
            html_url = repo.get("html_url") or f"https://github.com/{full_name}"
            clone_url = repo.get("clone_url") or f"{html_url}.git"
            searchable = " ".join(
                [
                    full_name,
                    repo.get("name") or "",
                    repo.get("description") or "",
                    item.get("path") or "",
                ]
            ).lower()
            score = 0
            if mode == "code":
                score += 60
            if "skill.md" in searchable:
                score += 25
            if "openclaw" in searchable:
                score += 18
            if ".codex" in searchable or ".agents" in searchable:
                score += 14
            if "skill" in searchable:
                score += 10
            for term in query_terms:
                if term in full_name.lower():
                    score += 10
                elif term in searchable:
                    score += 4
            results[full_name] = {
                "name": repo.get("name") or full_name.split("/")[-1],
                "fullName": full_name,
                "description": repo.get("description") or "",
                "htmlUrl": html_url,
                "cloneUrl": clone_url,
                "stars": int(repo.get("stargazers_count") or 0),
                "updatedAt": repo.get("updated_at") or "",
                "source": "github",
                "matchType": "code" if mode == "code" else "repo",
                "skillPath": item.get("path") if mode == "code" else "",
                "score": score,
            }

    ordered = sorted(results.values(), key=lambda item: (-item["score"], item["matchType"] != "code", -item["stars"], item["fullName"].lower()))
    return {"ok": True, "data": {"query": query_text, "results": ordered}}


def preview_skill(skill_name: str, source: str) -> dict:
    root = SKILL_SOURCES.get(source)
    if not root:
        return {"ok": False, "message": f"不支持的 skill 来源：{source}"}
    skill_dir = root / skill_name
    if not skill_dir.exists():
        return {"ok": False, "message": f"没有找到 skill：{skill_name}"}
    has_readme, preview = get_skill_readme_preview(skill_dir)
    if not has_readme:
        return {"ok": False, "message": f"{skill_name} 没有可预览的 SKILL.md。"}
    return {"ok": True, "data": {"name": skill_name, "source": source, "path": str(skill_dir), "content": preview}}


def resolve_skill_dir(base_dir: Path) -> tuple[Path | None, str]:
    if not base_dir.exists() or not base_dir.is_dir():
        return None, "给定路径不是有效目录。"
    if (base_dir / "SKILL.md").exists():
        return base_dir, ""

    matches = sorted(
        {path.parent for path in base_dir.rglob("SKILL.md") if path.is_file()},
        key=lambda item: str(item).lower(),
    )
    if not matches:
        return None, "没有找到包含 SKILL.md 的 skill 目录。"
    if len(matches) > 1:
        sample = " / ".join(path.name for path in matches[:3])
        return None, f"找到了多个候选 skill 目录，请改为更具体的路径。候选：{sample}"
    return matches[0], ""


def install_skill_directory(source_dir: Path, source_label: str) -> dict:
    skill_dir, error = resolve_skill_dir(source_dir)
    if not skill_dir:
        return {"ok": False, "message": error}

    skill_name = skill_dir.name
    target_dir = OPENCLAW_SKILLS_DIR / skill_name
    if target_dir.exists():
        return {"ok": False, "message": f"{skill_name} 已经安装过了。"}

    OPENCLAW_SKILLS_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copytree(skill_dir, target_dir)
    return {
        "ok": True,
        "message": f"已从 {source_label} 安装 {skill_name}。",
        "path": str(target_dir),
        "name": skill_name,
    }


def install_skill(skill_name: str, source: str) -> dict:
    root = SKILL_SOURCES.get(source)
    if source not in {"agents", "codex"} or not root:
        return {"ok": False, "message": f"不支持从这个来源安装：{source}"}
    source_dir = root / skill_name
    if not source_dir.exists():
        return {"ok": False, "message": f"没有找到要安装的 skill：{skill_name}"}
    return install_skill_directory(source_dir, source)


def install_skill_from_path(path_value: str) -> dict:
    if not path_value.strip():
        return {"ok": False, "message": "请先填写本地 skill 路径。"}
    source_dir = Path(path_value).expanduser()
    return install_skill_directory(source_dir, f"本地路径 {source_dir}")


def install_skill_from_repo(repo_url: str) -> dict:
    repo_url = repo_url.strip()
    if not repo_url:
        return {"ok": False, "message": "请先填写仓库地址。"}
    parsed = urllib.parse.urlparse(repo_url)
    if parsed.scheme not in {"http", "https", "ssh", "git"} and not repo_url.endswith(".git"):
        return {"ok": False, "message": "仓库地址格式不正确。"}

    with tempfile.TemporaryDirectory(prefix="openclaw-skill-") as temp_dir:
        clone_dir = Path(temp_dir) / "repo"
        result = subprocess.run(
            ["git", "clone", "--depth", "1", repo_url, str(clone_dir)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
            **get_subprocess_kwargs(),
        )
        if result.returncode != 0:
            detail = result.stderr.strip() or result.stdout.strip() or "git clone 失败。"
            return {"ok": False, "message": f"仓库拉取失败：{detail}"}
        return install_skill_directory(clone_dir, f"仓库 {repo_url}")


def uninstall_skill(skill_name: str) -> dict:
    target_dir = OPENCLAW_SKILLS_DIR / skill_name
    if not target_dir.exists():
        return {"ok": False, "message": f"{skill_name} 当前不在 OpenClaw skills 里。"}
    shutil.rmtree(target_dir)
    return {"ok": True, "message": f"已卸载 {skill_name}。", "path": str(target_dir)}


def get_workspace_maintenance_data() -> dict:
    reset_targets = [
        {
            "label": "OpenClaw 工作区根目录",
            "path": str(OPENCLAW_ROOT),
            "exists": OPENCLAW_ROOT.exists(),
            "kind": "directory",
            "note": "包含核心 .md、profiles、skills、sessions、权限映射和本地控制台状态。",
        },
        {
            "label": "已保存的 OpenClaw 环境变量",
            "path": "HKCU\\Environment",
            "exists": True,
            "kind": "environment",
            "note": "会清掉控制台保存的 Provider / 通道密钥与代理变量。",
        },
    ]
    uninstall_targets = reset_targets + [
        {
            "label": "全局 npm OpenClaw 包",
            "path": str(OPENCLAW_PACKAGE_DIR),
            "exists": OPENCLAW_PACKAGE_DIR.exists(),
            "kind": "directory",
            "note": "只清 openclaw 这个全局包，不动 Node.js / npm 本体。",
        },
        {
            "label": "OpenClaw 启动脚本",
            "path": str(OPENCLAW_CMD),
            "exists": OPENCLAW_CMD.exists(),
            "kind": "file",
            "note": "包括 npm 生成的 openclaw.cmd / openclaw.ps1 / openclaw 启动残留。",
        },
    ]
    return {
        "reset": {
            "title": "重置 OpenClaw 工作区",
            "summary": "删除 OpenClaw 当前工作区数据与本地权限状态，然后重建一份干净骨架，控制台项目本身会保留。",
            "targets": reset_targets,
            "keeps": [
                str(APP_ROOT),
                str(AGENTS_SKILLS_DIR),
                str(CODEX_SKILLS_DIR),
                str(Path(r"C:\Program Files\nodejs")),
            ],
        },
        "uninstall": {
            "title": "完整卸载 OpenClaw",
            "summary": "在重置范围基础上，继续卸载全局 npm openclaw 包和已知启动脚本，尽量恢复到没装 OpenClaw 之前的状态。",
            "targets": uninstall_targets,
            "keeps": [
                str(APP_ROOT),
                str(AGENTS_SKILLS_DIR),
                str(CODEX_SKILLS_DIR),
                str(Path(r"C:\Program Files\nodejs")),
            ],
        },
    }


def delete_known_openclaw_secrets() -> list[str]:
    cleared: list[str] = []
    for key, _label in SECRET_ITEMS:
        delete_secret(key)
        cleared.append(key)
    return cleared


def delete_path_if_exists(path: Path, removed: list[str], warnings: list[str]) -> None:
    if not path.exists() and not path.is_symlink():
        return
    try:
        if path.is_dir() and not path.is_symlink():
            shutil.rmtree(path)
        else:
            path.unlink()
        removed.append(str(path))
    except Exception as exc:
        warnings.append(f"{path}: {exc}")


def cleanup_openclaw_npm_artifacts(removed: list[str], warnings: list[str]) -> None:
    candidates = [
        OPENCLAW_CMD,
        OPENCLAW_NPM_ROOT / "openclaw",
        OPENCLAW_NPM_ROOT / "openclaw.ps1",
        OPENCLAW_PACKAGE_DIR,
    ]
    seen: set[str] = set()
    for path in candidates:
        key = str(path).lower()
        if key in seen:
            continue
        seen.add(key)
        delete_path_if_exists(path, removed, warnings)


def reset_openclaw_workspace() -> dict:
    stopped = stop_gateway()
    if not stopped.get("ok"):
        return stopped

    removed: list[str] = []
    warnings: list[str] = []
    secrets_cleared = delete_known_openclaw_secrets()
    delete_path_if_exists(OPENCLAW_ROOT, removed, warnings)
    recreated = ensure_workspace_skeleton()
    message = "已把 OpenClaw 工作区重置为一份新的最小骨架。控制台项目本身未删除。"
    if warnings:
        message += " 但有少量路径没有删干净，请看 warnings。"
    return {
        "ok": True,
        "message": message,
        "stopped": stopped,
        "removed": removed,
        "warnings": warnings,
        "secretsCleared": secrets_cleared,
        "recreated": recreated,
    }


def uninstall_openclaw_workspace() -> dict:
    stopped = stop_gateway()
    if not stopped.get("ok"):
        return stopped

    removed: list[str] = []
    warnings: list[str] = []
    secrets_cleared = delete_known_openclaw_secrets()
    delete_path_if_exists(OPENCLAW_ROOT, removed, warnings)

    if shutil.which(get_npm_command()) or OPENCLAW_PACKAGE_DIR.exists() or OPENCLAW_CMD.exists():
        npm_result = run_command([get_npm_command(), "uninstall", "-g", "openclaw"], timeout=1800)
        if not npm_result["ok"]:
            detail = npm_result["stderr"] or npm_result["stdout"] or "npm uninstall -g openclaw failed."
            warnings.append(f"npm uninstall -g openclaw: {detail}")
    else:
        warnings.append("没有找到 npm 或全局 openclaw 记录，改走残留文件清理。")

    cleanup_openclaw_npm_artifacts(removed, warnings)
    message = "已执行 OpenClaw 完整卸载清理。控制台项目目录被保留，方便继续查看结果或重新安装。"
    if warnings:
        message += " 但有少量残留需要手动确认，请看 warnings。"
    return {
        "ok": True,
        "message": message,
        "stopped": stopped,
        "removed": removed,
        "warnings": warnings,
        "secretsCleared": secrets_cleared,
    }


def pick_local_paths(kind: str, multiple: bool = False) -> dict:
    kind = (kind or "").strip().lower()
    if kind not in {"file", "directory"}:
        return {"ok": False, "message": "不支持的选择类型。"}

    if kind == "file":
        script = r"""
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Multiselect = $true
$dialog.CheckFileExists = $true
$dialog.Title = '选择要加入白名单的文件'
if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
  Write-Output '{"cancelled": true, "paths": []}'
  exit 0
}
$paths = @($dialog.FileNames | ForEach-Object { $_ })
$json = @{ cancelled = $false; paths = $paths } | ConvertTo-Json -Compress
Write-Output $json
"""
    else:
        script = r"""
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '选择要加入白名单的目录'
$dialog.UseDescriptionForTitle = $true
if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
  Write-Output '{"cancelled": true, "paths": []}'
  exit 0
}
$json = @{ cancelled = $false; paths = @($dialog.SelectedPath) } | ConvertTo-Json -Compress
Write-Output $json
"""

    result = subprocess.run(
        ["powershell", "-NoProfile", "-STA", "-Command", script],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
        **get_subprocess_kwargs(),
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "本地路径选择失败。"
        return {"ok": False, "message": detail}

    output = result.stdout.strip() or '{"cancelled": true, "paths": []}'
    data = json.loads(output)
    selected = dedupe_directory_paths(
        [
            str(Path(path).parent if kind == "file" else Path(path))
            for path in data.get("paths") or []
        ]
    )
    if data.get("cancelled"):
        return {"ok": True, "message": "已取消选择。", "data": {"paths": [], "cancelled": True}}
    return {"ok": True, "message": f"已选中 {len(selected)} 个路径。", "data": {"paths": selected, "cancelled": False}}


class ConsoleHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def log_message(self, format, *args):
        return

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self.handle_get_api()
        if self.path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        if not self.path.startswith("/api/"):
            return json_response(self, {"ok": False, "message": "Unknown endpoint."}, status=HTTPStatus.NOT_FOUND)
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            return json_response(self, {"ok": False, "message": "Request body is not valid JSON."}, status=HTTPStatus.BAD_REQUEST)

        try:
            if self.path == "/api/gateway/start":
                result = start_gateway()
            elif self.path == "/api/gateway/stop":
                result = stop_gateway()
            elif self.path == "/api/gateway/restart":
                result = restart_gateway()
            elif self.path == "/api/profiles/switch":
                result = apply_profile_file(payload.get("fileName", ""))
            elif self.path == "/api/profiles/apply-restart":
                result = apply_profile_and_restart(payload.get("fileName", ""))
            elif self.path == "/api/profiles/model":
                file_name = payload.get("fileName", "")
                model_id = payload.get("modelId", "")
                alias = payload.get("alias", "")
                apply_now = bool(payload.get("applyNow"))
                if not file_name or not model_id:
                    return json_response(self, {"ok": False, "message": "Missing fileName or modelId."}, status=HTTPStatus.BAD_REQUEST)
                result = update_profile_model(file_name, model_id, alias, apply_now)
            elif self.path == "/api/profiles/delete":
                result = delete_profile(payload.get("fileName", ""))
            elif self.path == "/api/profiles/create":
                result = create_profile(
                    payload.get("profileName", ""),
                    payload.get("providerKey", ""),
                    payload.get("modelId", ""),
                    payload.get("alias", ""),
                    bool(payload.get("applyNow")),
                    payload.get("apiKey", ""),
                    bool(payload.get("testNow")),
                )
            elif self.path == "/api/tests/provider":
                result = run_provider_test(payload.get("providerKey", ""))
            elif self.path == "/api/tests/channel":
                result = run_channel_test(payload.get("channel", ""))
            elif self.path == "/api/secrets/set":
                key = payload.get("key", "")
                value = payload.get("value", "")
                if key not in SECRET_LABELS:
                    return json_response(self, {"ok": False, "message": "Unsupported secret item."}, status=HTTPStatus.BAD_REQUEST)
                if not value:
                    return json_response(self, {"ok": False, "message": "Please enter a secret value."}, status=HTTPStatus.BAD_REQUEST)
                set_secret(key, value)
                result = {"ok": True, "message": f"{SECRET_LABELS[key]} saved to the user environment."}
            elif self.path == "/api/secrets/delete":
                key = payload.get("key", "")
                if key not in SECRET_LABELS:
                    return json_response(self, {"ok": False, "message": "Unsupported secret item."}, status=HTTPStatus.BAD_REQUEST)
                delete_secret(key)
                result = {"ok": True, "message": f"{SECRET_LABELS[key]} cleared."}
            elif self.path == "/api/connection-settings":
                result = save_connection_settings(payload)
            elif self.path == "/api/channels/save":
                result = save_channel(payload.get("channel", ""), payload)
            elif self.path == "/api/channels/delete":
                result = delete_channel(payload.get("channel", ""))
            elif self.path == "/api/setup/action":
                result = execute_setup_action(payload.get("actionId", ""))
            elif self.path == "/api/core-docs/save":
                result = save_core_doc(payload.get("name", ""), payload.get("content", ""))
            elif self.path == "/api/core-docs/create-default":
                result = create_default_core_doc(payload.get("name", ""))
            elif self.path == "/api/core-docs/create-missing-defaults":
                result = create_missing_core_docs()
            elif self.path == "/api/skills/install":
                result = install_skill(payload.get("name", ""), payload.get("source", ""))
            elif self.path == "/api/skills/install-path":
                result = install_skill_from_path(payload.get("path", ""))
            elif self.path == "/api/skills/install-repo":
                result = install_skill_from_repo(payload.get("repoUrl", ""))
            elif self.path == "/api/skills/uninstall":
                result = uninstall_skill(payload.get("name", ""))
            elif self.path == "/api/workspace/reset":
                result = reset_openclaw_workspace()
            elif self.path == "/api/workspace/uninstall":
                result = uninstall_openclaw_workspace()
            elif self.path == "/api/permissions/pick-paths":
                result = pick_local_paths(payload.get("kind", ""), bool(payload.get("multiple")))
            elif self.path == "/api/permissions/save":
                result = apply_permission_scope(payload)
            elif self.path == "/api/logs/clear":
                result = clear_logs_data()
            else:
                return json_response(self, {"ok": False, "message": "Unknown endpoint."}, status=HTTPStatus.NOT_FOUND)
        except Exception as exc:
            log("error", "鎺ュ彛寮傚父", {"path": self.path, "error": str(exc)})
            return json_response(self, {"ok": False, "message": str(exc)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)

        if self.path != "/api/logs/clear":
            log("info" if result.get("ok") else "error", self.path, {"input": payload, "result": result})
        return json_response(self, result, status=HTTPStatus.OK if result.get("ok") else HTTPStatus.BAD_REQUEST)

    def handle_get_api(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)
        if path == "/api/status":
            return json_response(self, {"ok": True, "data": get_status()})
        if path == "/api/self-check":
            return json_response(self, {"ok": True, "data": self_check()})
        if path == "/api/profiles":
            return json_response(self, {"ok": True, "data": get_profiles()})
        if path == "/api/secrets":
            return json_response(self, {"ok": True, "data": get_secrets_data()})
        if path == "/api/connection-settings":
            return json_response(self, {"ok": True, "data": get_connection_settings()})
        if path == "/api/channels":
            return json_response(self, {"ok": True, "data": get_channel_data()})
        if path == "/api/setup-guide":
            return json_response(self, {"ok": True, "data": get_setup_guide()})
        if path == "/api/logs":
            return json_response(self, {"ok": True, "data": get_logs_data()})
        if path == "/api/tokens/usage":
            days_raw = query.get("days", ["7"])[0]
            configured_only_raw = (query.get("configured_only", ["1"])[0] or "1").strip().lower()
            try:
                days = int(days_raw)
            except ValueError:
                return json_response(self, {"ok": False, "message": "days must be an integer."}, status=HTTPStatus.BAD_REQUEST)
            configured_only = configured_only_raw not in {"0", "false", "no"}
            return json_response(self, {"ok": True, "data": get_token_usage_data_filtered(days, configured_only)})
        if path == "/api/core-docs":
            return json_response(self, {"ok": True, "data": get_core_docs_data()})
        if path == "/api/core-docs/read":
            return json_response(self, read_core_doc(query.get("name", [""])[0]), status=HTTPStatus.OK)
        if path == "/api/skills":
            return json_response(self, {"ok": True, "data": get_skills_data()})
        if path == "/api/skills/preview":
            return json_response(
                self,
                preview_skill(query.get("name", [""])[0], query.get("source", [""])[0]),
                status=HTTPStatus.OK,
            )
        if path == "/api/skills/search-online":
            return json_response(
                self,
                search_online_skills(query.get("q", [""])[0]),
                status=HTTPStatus.OK,
            )
        if path == "/api/permissions":
            return json_response(self, {"ok": True, "data": get_permission_data()})
        if path == "/api/workspace/maintenance":
            return json_response(self, {"ok": True, "data": get_workspace_maintenance_data()})
        return json_response(self, {"ok": False, "message": "Unknown endpoint."}, status=HTTPStatus.NOT_FOUND)


def main() -> None:
    migrate_local_console_state()
    log("info", "Console started", {"root": str(APP_ROOT)})
    server = ThreadingHTTPServer((GATEWAY_HOST, DEFAULT_PORT), ConsoleHandler)
    print(f"OpenClaw local console started: http://{GATEWAY_HOST}:{DEFAULT_PORT}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
