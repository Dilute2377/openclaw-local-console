# OpenClaw Local Console Usage

Language: **English** | [中文](USAGE.zh-CN.md)

## Before you start

1. Make sure `python` works in your terminal.
2. Make sure Node.js is installed.
3. Make sure OpenClaw is already installed locally, or be ready to initialize it from the console.
4. If your network requires a proxy for GitHub or model APIs, configure your own local proxy environment first.

## Recommended startup flow

### First-time users

Run:

```bat
setup_local_console.bat
```

This helper:

- checks Python availability
- runs the encoding guard
- reminds you about local prerequisites
- starts the console

### Returning users

Run:

```bat
run_console.bat
```

## Main sections in the console

### Overview

Use this to quickly inspect:

- service state
- active profile
- basic environment readiness
- shortcut actions into the next configuration step

### Providers and models

Use this area to:

- create or update provider profiles
- save keys
- switch models
- test basic provider connectivity

### Channels and secrets

Use this area to:

- review channel readiness
- edit connection settings
- manage channels
- manage secrets

### Token usage

Use this area to:

- switch models
- inspect recent usage windows
- compare short-term usage trends

### Workspace

Use this area to:

- edit core Markdown files
- inspect local and online skills
- install and uninstall skills
- review maintenance actions carefully

## Safety notes

- Maintenance actions should be reviewed carefully before execution.
- Reset and uninstall flows are intentionally guarded.
- This console manages local state on your machine. Do not use it casually against a setup you do not understand.

