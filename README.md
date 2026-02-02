# OpenClaw Message Bot

统一的多渠道消息机器人平台，支持 QQ、飞书、微信、企业微信等。

## ✨ 特性

- 🐧 **QQ Bot** - 支持私聊、群聊、频道消息
- 📱 **飞书** - 支持私聊、群聊（开发中）
- 💬 **微信** - 计划中
- 🏢 **企业微信** - 计划中
- 🔧 **CLI 工具** - 命令行配置和管理
- 🖥️ **Web 界面** - 可视化控制（开发中）

## 🚀 快速开始

### 安装

```bash
npm install -g openclaw-message-bot
```

### 配置 QQ Bot

```bash
# 交互式配置
message-bot channels add qq

# 或直接指定参数
message-bot channels add qq --token "AppID:AppSecret"
```

### 启动服务

```bash
message-bot start
```

## 📖 CLI 命令

```bash
# 渠道管理
message-bot channels list              # 列出已配置的渠道
message-bot channels add <channel>     # 添加渠道
message-bot channels remove <channel>  # 删除渠道
message-bot channels enable <channel>  # 启用渠道
message-bot channels disable <channel> # 禁用渠道

# 配置管理
message-bot config show                # 显示配置
message-bot config path                # 显示配置路径
message-bot config reset               # 重置配置

# 服务管理
message-bot start                      # 启动服务
message-bot stop                       # 停止服务
message-bot status                     # 查看状态
```

## 📁 项目结构

```
src/
├── core/                 # 核心框架
│   ├── types.ts          # 类型定义
│   ├── logger.ts         # 日志工具
│   ├── config-manager.ts # 配置管理
│   └── channel-manager.ts # 渠道管理
├── channels/             # 渠道适配器
│   ├── base/             # 基础适配器
│   ├── qq/               # QQ Bot
│   └── feishu/           # 飞书
└── cli/                  # 命令行工具
    └── commands/         # CLI 命令
```

## 🔧 开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 开发模式
npm run dev

# 运行测试
npm test
```

## 📄 License

MIT
