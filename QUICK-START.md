# 🚀 Claude Code Auto-Commit Hooks - 快速开始

## 一键安装
1. **下载脚本**：复制 `install-auto-commit-hooks.bat` 到你的Git项目根目录
2. **运行安装**：双击运行脚本或在命令行执行
3. **重启Claude Code**：重新启动Claude Code会话加载配置
4. **开始使用**：使用Edit/MultiEdit/Write修改文件，自动commit！

## 验证安装
```bash
# 检查配置文件
dir .claude\settings.json
dir scripts\auto-commit-hook.bat

# 测试效果 - 创建测试文件
echo test content > test.txt
# 应该自动生成commit消息并提交
```

## 关键特性
- ✅ **智能AI分析**：每次文件修改自动分析并生成语义化commit
- ✅ **零干预操作**：完全自动化，无需手动git命令
- ✅ **规范化格式**：自动使用conventional commits (feat:, fix:, docs:)
- ✅ **安全设计**：只commit不push，避免意外推送

## 生成效果示例
| 操作 | AI生成的Commit消息 |
|-----|------------------|
| 新建配置 | `feat: add initial configuration file` |
| 修改代码 | `feat: add utility functions and clean up temporary files` |
| 创建文档 | `docs: add comprehensive auto-commit hooks documentation` |
| 修复错误 | `fix: resolve database connection timeout issue` |

## 推广到全局
**方法1 - 复制到任何项目**：
```bash
# 复制这3个文件到新项目：
# - install-auto-commit-hooks.bat
# - AUTO-COMMIT-HOOKS-README.md
# - QUICK-START.md
```

**方法2 - 全局Claude配置**：
```bash
# 将设置复制到全局配置
copy .claude\settings.json %USERPROFILE%\.claude\settings.json
```

## 注意事项
⚠️ **不会自动推送** - 系统只执行本地commit，需要手动 `git push`  
⚠️ **重启加载** - 修改配置后需要重启Claude Code  
⚠️ **Git仓库** - 只在有效的Git仓库中工作  

## 完整文档
详细配置和故障排除请参考：`AUTO-COMMIT-HOOKS-README.md`

---
🎉 **享受AI驱动的智能Git工作流！**