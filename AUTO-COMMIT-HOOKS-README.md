# Claude Code 自动Commit Hooks系统

🚀 **智能AI驱动的自动Git提交系统** - 让每次代码修改都自动生成语义化的commit消息

## 📋 系统概览

### ✨ 核心特性
- **🤖 AI智能分析**：基于代码变更自动生成语义化commit消息
- **⚡ 零干预操作**：文件修改后完全自动化，无需手动commit
- **📏 规范化格式**：强制使用conventional commit格式 (feat:, fix:, docs:等)
- **🔄 上下文感知**：多文件变更智能合并描述
- **🛡️ 安全设计**：只commit不推送，避免意外远程推送

### 🏗️ 系统架构
```
文件修改 → Claude Code Hooks → AI分析变更 → 生成commit消息 → 自动提交
```

## 📦 安装配置

### 1. 项目结构要求
```
your-project/
├── .claude/
│   └── settings.json          # 配置文件
├── scripts/
│   └── auto-commit-hook.bat   # AI脚本
└── [your-code-files]
```

### 2. 配置文件设置

**创建 `.claude/settings.json`**：
```json
{
  "permissions": {
    "allow": [
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "scripts\\auto-commit-hook.bat",
            "description": "Auto-commit with AI-generated commit messages"
          }
        ]
      }
    ]
  }
}
```

### 3. AI脚本部署

**创建 `scripts/auto-commit-hook.bat`**：
```batch
@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0\.."

:: Check for changes and stage them
git add . >nul 2>&1
git diff --cached --quiet
if %errorlevel% == 0 exit /b 0

:: Generate AI commit message
git diff --cached --name-status > temp_changes.txt
echo. >> temp_changes.txt
echo Changes to commit: >> temp_changes.txt
git diff --cached --stat >> temp_changes.txt

claude --print "Generate a concise git commit message for the following changes. Use conventional commit format (feat:, fix:, docs:, etc.). Return only the commit message, no explanations. Changes:" < temp_changes.txt > temp_commit_msg.txt 2>nul

:: Extract commit message
set "commit_msg="
for /f "tokens=*" %%i in (temp_commit_msg.txt) do (
    if not "%%i"=="" set "commit_msg=%%i"
)

:: Cleanup
del temp_changes.txt >nul 2>&1
del temp_commit_msg.txt >nul 2>&1

:: Fallback and commit
if "!commit_msg!"=="" set "commit_msg=feat: auto-commit with hooks integration"
set "commit_msg=!commit_msg:"=!"
git commit -m "!commit_msg!" >nul 2>&1
```

## 🎯 使用说明

### 基本使用
1. **自动触发**：任何`Edit`、`MultiEdit`、`Write`操作都会自动触发
2. **智能分析**：AI分析文件变更类型和语义
3. **自动提交**：生成符合规范的commit消息并提交

### Commit消息格式
系统自动使用Conventional Commits格式：
- `feat:` 新功能
- `fix:` 错误修复  
- `docs:` 文档更新
- `style:` 代码格式化
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具变动

### 示例效果
| 变更类型 | 生成消息 |
|---------|-----------|
| 新建配置文件 | `feat: add initial configuration file` |
| 修改多个文件 | `feat: add configuration and temporary test files` |
| 代码重构 | `refactor: improve utility functions structure` |
| 修复错误 | `fix: resolve database connection timeout issue` |

## 🛠️ 故障排除

### 常见问题

**Q: Hooks没有触发？**
- 检查`.claude/settings.json`配置是否正确
- 确认`scripts/auto-commit-hook.bat`文件存在且可执行
- 重启Claude Code会话加载新配置

**Q: 生成的commit消息为空？**
- 检查Claude Code是否有权限执行`claude --print`命令
- 查看`temp_commit_msg.txt`文件确认AI响应
- 系统会使用fallback消息：`feat: auto-commit with hooks integration`

**Q: 脚本执行失败？**
- 确保项目是有效的Git仓库
- 检查Git配置和权限
- 查看`debug-hook.log`文件获取详细错误信息

**Q: 不想自动commit某些文件？**
- 在`.gitignore`中添加文件模式
- 或在脚本中添加文件过滤逻辑

### 调试模式
启用详细日志：在脚本开头添加
```batch
echo [DEBUG] Script started >> debug-hook.log
```

## 🌍 全局配置指南

### 方法1：全局Claude配置目录
将配置文件复制到全局目录：
```
Windows: %USERPROFILE%\.claude\settings.json
macOS/Linux: ~/.claude/settings.json
```

### 方法2：项目模板
创建项目模板包含配置文件：
```
template/
├── .claude/settings.json
├── scripts/auto-commit-hook.bat
└── .gitignore
```

### 方法3：脚本一键安装
创建安装脚本 `install-auto-commit.bat`：
```batch
@echo off
mkdir .claude 2>nul
mkdir scripts 2>nul
copy template\.claude\settings.json .claude\
copy template\scripts\auto-commit-hook.bat scripts\
echo Auto-commit hooks installed successfully!
```

## ⚠️ 注意事项

### 安全考虑
- **不自动推送**：系统只执行本地commit，不会推送到远程仓库
- **权限控制**：通过permissions配置控制脚本权限
- **敏感信息**：确保不在commit消息中暴露敏感信息

### 最佳实践
- **定期检查**：定期查看自动生成的commit历史
- **手动推送**：根据需要手动执行`git push`
- **分支管理**：在开发分支使用，主分支可考虑禁用
- **团队协作**：团队成员统一配置确保一致性

## 🔄 版本历史

- **v1.0.0**: 基础自动commit功能
- **v1.1.0**: 添加AI智能消息生成
- **v1.2.0**: 集成PostToolUse hooks触发
- **v1.3.0**: 完善错误处理和日志记录

## 📞 技术支持

如需帮助或报告问题：
1. 检查本文档的故障排除部分
2. 查看生成的日志文件
3. 确认Claude Code和Git版本兼容性

---

🎉 **享受智能化的Git工作流程！**