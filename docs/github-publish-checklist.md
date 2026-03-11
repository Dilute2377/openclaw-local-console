# GitHub 发布前检查

## 这次仓库里可以公开的内容
- 控制台源码：`app.py`、`static/`
- 启动与检测脚本：`run_console.bat`、`check_encoding.bat`、`notion_mcp_check.py`、`notion_mcp_check.bat`
- 编辑规范与设计文档：`docs/`、`.editorconfig`、`.gitattributes`、`.vscode/settings.json`

## 明确不要上传的内容
- `__pycache__/`、`*.pyc`、各类缓存目录
- `.env`、`.env.*`、`*.local`
- 任意日志文件和临时输出
- `~/.openclaw/` 里的工作区、会话、配置、权限映射和本机生成文件
- Windows 用户环境变量中的任何 `OPENCLAW_*` 密钥

## 上传前手动检查
1. 搜一遍敏感关键词，确认只有变量名，没有真实值。
2. 确认仓库里没有 `__pycache__`、日志、导出文件和本机临时文件。
3. 确认没有把 `openclaw.json`、session、工作区 `.md`、本机 skill 安装结果复制进项目目录。
4. 确认批处理和文档里没有私人账号、邮箱、Token、绝对路径截图或浏览器 Cookie 信息。
5. 首次上传建议先建私有仓库，推送后再做一轮 GitHub 网页侧检查。

## 推荐的首次上传顺序
1. 本地初始化 git。
2. 先看 `git status`，只保留预期源码文件。
3. 运行一次敏感信息搜索。
4. 先推到 private repo。
5. 在 GitHub 网页上再核对一次文件树和 diff。

