# OpenClaw Local Console

OpenClaw Local Console is a local web-based control panel for managing an OpenClaw installation on Windows.

Instead of juggling terminal commands, config files, environment variables, and scattered setup steps, this project brings the most common OpenClaw operations into a single local UI.

This is currently a personal utility project for my own local workflow. Most of the implementation work in this repository was written with Codex assistance, then iterated locally around real OpenClaw usage needs.

## Why this exists

OpenClaw is powerful, but real-world setup and maintenance can become fragmented:

- environment readiness lives in one place
- provider and key setup lives in another
- channel configuration is easy to misconfigure
- workspace files and skills are hard to inspect from a single entrypoint
- day-to-day operational checks still tend to fall back to CLI workflows

This console is meant to reduce that friction and make OpenClaw easier to initialize, operate, and maintain locally.

It is still a practical, evolving tool rather than a polished general-purpose product. If you also use OpenClaw and have ideas, suggestions, or better workflow patterns, feedback is very welcome.

## Core capabilities

- Gateway lifecycle management
  - start, stop, and restart the OpenClaw gateway
  - inspect runtime health, port, PID, and active profile
- Provider and secret management
  - manage providers, models, aliases, and related secrets
  - test supported API connections from the UI
- Channel and connection management
  - configure channels and connection settings from one place
- Token usage visibility
  - inspect usage across time ranges and model selections
- Workspace editing
  - read and edit OpenClaw core Markdown files used by the local workspace
- Skill management
  - inspect installed skills
  - browse local candidates
  - search online sources
  - install and uninstall skills
- Maintenance support
  - review logs
  - inspect maintenance actions
  - prepare reset and uninstall workflows with guarded boundaries

## Tech overview

- `app.py`
  - local backend server and API layer
- `static/`
  - frontend HTML, CSS, and JavaScript
- `scripts/encoding_guard.py`
  - encoding and line-ending validation
- `run_console.bat`
  - local startup entrypoint
- `notion_mcp_check.py`
  - helper for checking local Notion MCP availability

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

## Repository boundaries

This repository is intentionally kept safe to publish. It does not include:

- real API keys or secrets
- local `~/.openclaw` workspace data
- generated sessions, logs, or caches
- installed skill payloads copied from the machine
- private environment variables

The repository contains the console itself, not a bundled OpenClaw distribution.

## Current scope

This project is focused on local operations and management, not packaging OpenClaw as a hosted service.

The console currently emphasizes:

- local setup and environment readiness
- operational visibility
- provider, channel, and workspace management
- skill installation and maintenance workflows

## Notes

- The console operates against the local machine's OpenClaw directories and environment variables.
- Some actions are intentionally conservative for safety, especially maintenance and uninstall flows.
- This project currently targets practical usability on a Windows local setup.
- It started as a personal self-use project, so some flows are optimized around that reality first and may continue to evolve over time.
