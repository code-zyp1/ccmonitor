# 🤖 Claude Code Monitor

实时监控Claude Code使用情况的智能工具，帮助您合理规划Token使用，避免达到限额。

## ✨ 特性

### 🎯 核心功能
- **实时监控**: 3秒刷新间隔，即时显示使用情况
- **智能预测**: 多种算法预测何时达到Token限制
- **使用建议**: 基于预测结果提供使用建议
- **模型分析**: 按Claude模型统计使用情况
- **会话追踪**: 自动识别和统计会话信息

### 📊 预测算法
- **线性趋势**: 基于最近使用趋势的线性预测
- **移动平均**: 多时间窗口的平滑预测
- **指数平滑**: 适用于有明确趋势的使用模式

### 🎨 用户界面
- **彩色进度条**: 直观显示使用百分比
- **实时更新**: 自动刷新显示最新状态
- **快捷键操作**: 便捷的键盘控制
- **帮助系统**: 内置使用说明

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建运行
```bash
npm run build
npm start
```

## 💻 使用方法

### 命令行选项
```bash
# 默认设置 (Pro计划)
ccmonitor

# 指定计划类型
ccmonitor --plan max5

# 自定义Token限制
ccmonitor --custom-limit 1000000

# 设置刷新间隔
ccmonitor --refresh 5

# 查看帮助
ccmonitor --help
```

### 快捷键
| 按键 | 功能 |
|------|------|
| `Q` / `Esc` / `Ctrl+C` | 退出程序 |
| `R` | 暂停/恢复实时监控 |
| `P` | 显示/隐藏预测分析 |
| `M` | 显示/隐藏模型统计 |
| `H` / `?` | 显示帮助信息 |

## 📱 界面说明

### 使用量统计
- 当前使用量和进度条
- 最近1小时、6小时使用量
- 当前会话统计
- 平均使用速率

### 预测分析
- 预计达到限制时间
- 当前消耗速率
- 预测置信度
- 使用建议

### 状态指示
- 🟢 **绿色**: 正常使用 (< 60%)
- 🔵 **蓝色**: 注意用量 (60-80%)
- 🟡 **黄色**: 接近限制 (80-95%)
- 🔴 **红色**: 达到限制 (≥ 95%)

## 🛠️ 技术架构

### 项目结构
```
ccmonitor/
├── src/
│   ├── core/              # 核心业务逻辑
│   │   ├── types.ts       # 类型定义
│   │   ├── monitor.ts     # 文件监听
│   │   ├── calculator.ts  # 使用量计算
│   │   └── predictor.ts   # 预测算法
│   ├── interfaces/        # 用户界面
│   │   └── terminal/      # 终端界面
│   ├── shared/            # 共享工具
│   └── main.ts           # 主程序入口
├── package.json
├── tsconfig.json
└── README.md
```

### 技术栈
- **运行时**: Node.js / Bun
- **语言**: TypeScript
- **UI框架**: Blessed (终端界面)
- **文件监听**: Chokidar
- **时间处理**: date-fns
- **颜色输出**: Chalk

## 🔧 配置说明

### 计划类型
| 计划 | Token限制 | 重置周期 |
|------|-----------|----------|
| Pro | 600K | 5小时 |
| Max5 | 2M | 5小时 |
| Max20 | 8M | 5小时 |
| Custom | 自定义 | 5小时 |

### 预警阈值
- **黄色警告**: 80% 使用量
- **红色警告**: 90% 使用量
- **紧急状态**: 95% 使用量

## 🎯 使用场景

### 日常监控
- 开着一个终端窗口持续监控
- 实时了解当前使用情况
- 及时调整使用频率

### 规划导向
- 在重要项目前评估剩余量
- 根据预测合理安排工作
- 避免在关键时刻没有额度

### 学习分析
- 了解个人使用模式
- 分析不同模型的使用效率
- 优化Token使用策略

## 🔮 未来规划

### 阶段2: 数据增强 (2-3周)
- [ ] SQLite历史数据存储
- [ ] 使用趋势图表 (ASCII)
- [ ] 使用模式识别
- [ ] 历史数据分析

### 阶段3: 智能算法 (3-4周)
- [ ] 机器学习预测模型
- [ ] 个人使用习惯学习
- [ ] 预测准确度优化
- [ ] Python混合架构支持

### 阶段4: Web界面 (4-5周)
- [ ] React/Vue前端界面
- [ ] WebSocket实时通信
- [ ] 丰富的图表可视化
- [ ] 移动端适配

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

感谢以下开源项目的启发：
- [ryoppippi/ccusage](https://github.com/ryoppippi/ccusage)
- [Maciek-roboblog/Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor)
- [nwiizo/claudelytics](https://github.com/nwiizo/claudelytics)

---

**Happy Monitoring! 🚀**