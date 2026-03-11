# 编码与编辑规程

这份规程用来解决本项目反复出现的两类问题：

- 中文文本被错误解码后，乱码又被当成真实内容写回文件。
- Windows 下 `.bat` / `cmd` / PowerShell / UTF-8 / 换行规则混用，导致脚本或页面再次被污染。

## 根因

1. 终端显示出来的乱码，不等于文件真实内容。
2. 在已经被污染的文件上继续打补丁，会把错误扩散到更多地方。
3. 没有固定每种文件的编码与换行规则。
4. 修改后没有自动检查，靠人眼发现太晚。

## 强制规则

1. 所有源码和文档默认使用 UTF-8。
2. Web / Python / JSON / Markdown 文件统一使用 LF。
3. `*.bat` / `*.cmd` / `*.ps1` 统一使用 CRLF。
4. 如果终端里看到中文乱码，禁止直接复制终端输出回写源文件。
5. 如果核心文件已经出现乱码，优先整文件重写，不在脏文件上叠补。
6. 继续开发前，先跑一次编码检查脚本。

## 工作流

1. 开始改文件前，先确认文件类型和目标编码。
2. 如果文件在终端中出现乱码：
   - 优先在编辑器中打开真实文件。
   - 必要时通过脚本按 UTF-8 读取原始文件。
   - 不要把终端打印结果当作真实源内容。
3. 关键文件改动后，运行：

```powershell
python scripts/encoding_guard.py
```

4. 如果检查失败，先修编码/乱码问题，再继续功能开发。

## 这套规则参考了什么

- Git 官方 `gitattributes` 文档：用 `eol` 为不同文件指定工作区换行风格
- GitHub 文档：建议在仓库里提交 `.gitattributes`，统一团队的换行处理
- EditorConfig 官方规范：用 `charset` 和 `end_of_line` 固化编码与换行
- Git 生态里常见的“文本文件显式声明、脚本文件单独处理、提交前自动检查”做法

参考链接：

- https://git-scm.com/docs/gitattributes
- https://docs.github.com/en/get-started/git-basics/configuring-git-to-handle-line-endings
- https://editorconfig.org/
- https://spec.editorconfig.org/

## 当前项目约定

- `app.py`、`static/*.html`、`static/*.css`、`static/*.js`、`docs/*.md`：UTF-8 + LF
- `run_console.bat`、`notion_mcp_check.bat`：UTF-8 + CRLF
- 所有 `.bat` / `.cmd` 入口尽量保持 ASCII-only，避免 `cmd.exe` 再次污染中文文本
- 控制台里的中文界面文本，必须以文件真实内容为准，不能以终端回显为准
