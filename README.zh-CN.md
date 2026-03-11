# OpenClaw Local Console

语言: [English](README.md) | **中文**

OpenClaw Local Console 是一个面向 Windows 本地环境的 OpenClaw 控制台。

这个项目目前主要是我自己日常在本地使用的工具。仓库里的大部分实现工作由 Codex 协助完成，再结合我自己真实使用 OpenClaw 的过程一点点往前迭代。它现在还是一个偏实用、持续打磨中的项目，如果你也在用 OpenClaw，欢迎提建议、反馈体验，或者告诉我哪些地方还能做得更顺手。

## 项目预览

![OpenClaw Local Console 预览图](assets/console-preview.png)

这里放的是一张真实控制台界面的脱敏截图，上传前已经把本地敏感信息遮掉了。

## 这个项目是做什么的

它的目标不是替代 OpenClaw，而是把本地使用 OpenClaw 时那些最常见、也最容易散落在不同地方的操作，尽量收进一个统一入口，比如：

- 终端命令
- 配置文件
- 环境变量
- 初始化脚本
- 工作区 Markdown 文件编辑

这样一来，本地安装后的初始化、配置检查和日常维护就会顺手很多。

## 主要能力

- 启动、关闭、重启 OpenClaw gateway
- 查看运行状态、端口、PID、当前 Profile
- 管理 provider、模型、别名和相关密钥
- 配置通道和连接设置
- 按模型和时间范围查看 token 用量
- 读取和编辑 OpenClaw 核心工作区 Markdown 文件
- 查看、安装、搜索和卸载 skill
- 在一个界面里查看日志和维护相关动作

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

这个脚本现在会在启动前先打印一份“本地就绪报告”，明确告诉用户：

- 控制台本身能不能启动
- Node.js 和 npm 是否已经就绪
- OpenClaw CLI 有没有安装
- 基础配置有没有创建

也就是说，就算 OpenClaw 还没完全装好，只要 Python 已经可用，用户依然可以先打开控制台，再按照页面里的引导继续补环境。

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

这个仓库本身不打包 OpenClaw，但控制台会帮助用户完成一部分本地初始化和后续管理。

## 安装重试策略

为了让新用户更容易直接照着仓库把项目跑起来，现在本地安装链会按下面的顺序处理：

- Python 和 Node.js 先走系统默认安装方式
- OpenClaw 先走默认 npm 源
- 如果 OpenClaw 安装失败，会自动切到预设的国内 npm 镜像再重试一次

所以它现在更接近“可以直接照着仓库在本地抄作业”的启动入口，但还不算完全零依赖的一键安装器。`setup_local_console.bat` 的作用，就是先把这台机器当前到底缺什么讲清楚。

## 控制台使用说明

- English: [docs/USAGE.md](docs/USAGE.md)
- 中文: [docs/USAGE.zh-CN.md](docs/USAGE.zh-CN.md)

## 代理说明

我自己的本地环境在部分网络场景下会使用基于 V2Ray 的代理，比如访问 GitHub 或某些模型接口时会走代理。

但这只是作者本机环境的说明，不是这个仓库的强制依赖。仓库里**不会**包含任何真实代理地址、本地代理端口或私人代理配置。如果其他用户也需要代理，请在自己的本机环境里单独配置。

## 窗口行为说明

在 Windows 上，某些 CLI 动作或辅助进程可能会短暂拉起又关闭一个终端窗口。这是本地命令执行时常见的 Windows 行为，不代表仓库里带了常驻监控窗口或隐藏后台程序。

## 仓库边界

这个仓库在公开前已经尽量做过净化处理，不包含：

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

这个项目目前主要专注在本地管理和本地操作，不是一个托管版的 OpenClaw 服务。

当前重点在于：

- 本地环境准备
- provider、通道、工作区管理
- token 可视化
- skill 安装与维护流程

## 欢迎反馈

如果你也在用 OpenClaw，欢迎提建议、报 bug，或者分享你自己的使用流程。
