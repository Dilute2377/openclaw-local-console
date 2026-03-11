# OpenClaw Local Console

OpenClaw Local Console is a lightweight local web console for managing an OpenClaw installation on Windows.

It focuses on the operational workflows that are easy to get wrong in terminal-first setups: environment checks, startup and shutdown, provider configuration, channel setup, token usage views, workspace document editing, and skill management.

## What it does

- Start, stop, and restart the OpenClaw gateway
- Check runtime status, port, PID, and active profile
- Configure providers, models, aliases, and related secrets
- Manage channels and connection settings
- View token usage by time range and model
- Edit core workspace Markdown files used by OpenClaw
- Install, inspect, search, and uninstall skills
- Review logs and maintenance actions from one place

## Project structure

- `app.py`: local HTTP server and backend API
- `static/`: frontend HTML, CSS, and JavaScript
- `scripts/encoding_guard.py`: encoding and line-ending checks
- `run_console.bat`: local startup entrypoint
- `notion_mcp_check.py`: helper for checking local Notion MCP availability

## What is intentionally not in this repository

This repository is intended to be safe to publish. It does not include:

- your actual API keys or secrets
- your local `~/.openclaw` workspace data
- generated session files, logs, or caches
- installed skill payloads from your machine
- private environment variables

## Local requirements

- Windows
- Python available as `python`
- Node.js installed locally
- An existing or intended OpenClaw installation on the same machine

## Run locally

```bat
run_console.bat
```

Then open the local address shown by the server, typically:

```text
http://127.0.0.1:8765
```

## Notes

- The console operates against the local machine's OpenClaw directories and environment variables.
- Some actions are intentionally scoped for safety, especially around maintenance and uninstall flows.
- This repo contains the console itself, not a bundled OpenClaw distribution.

## Publishing checklist

Before pushing to GitHub, re-check:

- no `.env` or local config exports were added
- no `__pycache__`, logs, or generated files were staged
- no local workspace files were copied into the repo
- no screenshots or notes reveal private machine details

