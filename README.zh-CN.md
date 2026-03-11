# OpenClaw Local Console

语言: [English](README.md) | **中文**

OpenClaw Local Console 是一个面向 Windows 本地环境的 OpenClaw 控制台。

这个项目目前主要是我个人自用的本地工具。仓库里的大部分实现工作由 Codex 协助完成，再结合我自己真实使用 OpenClaw 的过程持续迭代。它现在还是一个不断打磨中的实用项目，如果你也在用 OpenClaw，欢迎提建议、反馈使用体验或指出问题。

## 这个项目是做什么的

它的目标不是替代 OpenClaw，而是把本地使用 OpenClaw 时最常见、最容易分散的操作收进一个统一入口，比如：

- 终端命令
- 配置文件
- 环境变量
- 初始化脚本
- 工作区 Markdown 文件编辑

这样就能更方便地完成本地安装后的初始化、配置、检查和日常维护。

## 主要能力

- 启动、关闭、重启 OpenClaw gateway
- 查看运行状态、端口、PID、当前 Profile
- 管理 provider、模型、别名和相关密钥
- 配置通道和连接设置
- 按模型和时间范围查看 token 用量
- 读取和编辑 OpenClaw 核心工作区 Markdown 文件
- 查看、安装、搜索和卸载 skill
- 在一个界面里查看日志和维护动作

## 快速开始

### 1. 克隆仓库

```powershell
git clone https://github.com/Dilute2377/openclaw-local-console.git
cd openclaw-local-console
```

### 2. 先运行启动辅助脚本

```bat
setup_local_console.bat
```

如果你已经确认本机环境没问题，也可以直接运行：

```bat
run_console.bat
```

### 3. 打开本地控制台

通常是：

```text
http://127.0.0.1:8765
```

## 本地依赖

- Windows
- 本机可直接使用 `python`
- 本机已安装 Node.js
- 同一台机器上已有或准备安装 OpenClaw

这个仓库本身不打包 OpenClaw，但控制台界面会帮助用户完成一部分本地初始化和后续管理。

## 控制台使用说明

- English: [docs/USAGE.md](docs/USAGE.md)
- 中文: [docs/USAGE.zh-CN.md](docs/USAGE.zh-CN.md)

## 代理说明

我自己的本地环境在部分网络场景下会使用基于 V2Ray 的代理，比如访问 GitHub 或某些模型接口时会经过代理。

但这只是作者本机环境说明，不是这个仓库的强制依赖。仓库里**不会**包含任何真实代理地址、本地代理端口或私人代理配置。其他用户如果需要代理，请自行在本机环境里配置。

## 窗口行为说明

在 Windows 上，某些 CLI 动作或辅助进程可能会短暂拉起并关闭一个终端窗口。这是本地命令执行时的 Windows 行为特点，不代表仓库里带了常驻监控窗口或隐藏后台程序。

## 仓库边界

这个仓库在公开前已经尽量做了净化处理，不包含：

- 真实 API Key 或密钥
- 本地 `~/.openclaw` 工作区数据
- session、日志、缓存等运行产物
- 从本机复制出来的已安装 skill 内容
- 私人环境变量
- 私人代理配置

## 项目结构

- `app.py`
  - 本地后端服务和 API
- `static/`
  - 前端 HTML、CSS、JavaScript
- `scripts/encoding_guard.py`
  - 编码和换行检查
- `setup_local_console.bat`
  - 面向首次启动的本地准备与启动脚本
- `run_console.bat`
  - 直接启动控制台
- `notion_mcp_check.py`
  - 检查本地 Notion MCP 状态的辅助脚本

## 当前范围

这个项目目前专注于本地管理和操作，不是一个托管版 OpenClaw 服务。

当前重点在于：

- 本地环境准备
- provider、通道、工作区管理
- token 可视化
- skill 安装与维护流程

## 欢迎反馈

如果你也在用 OpenClaw，欢迎提建议、报 bug，或者分享更顺手的使用流程。

