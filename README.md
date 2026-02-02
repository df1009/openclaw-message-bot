# OpenClaw Message Bot

统一的多渠道消息机器人平台，支持 QQ 和飞书。

## ✨ 特性

- 🐧 **QQ Bot** - 支持私聊、群聊、频道消息
- 📱 **飞书** - 支持私聊、群聊消息
- 🔧 **简单配置** - 只需 AppID 和 AppSecret
- 🖥️ **CLI 工具** - 命令行配置和管理
- 🌐 **Web 界面** - 可视化控制

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

### 配置飞书

```bash
# 交互式配置
message-bot channels add feishu

# 或直接指定参数
message-bot channels add feishu --token "AppID:AppSecret"
```

### 启动服务

```bash
message-bot start
```

## 📖 配置说明

### QQ Bot 配置

```json
{
  "channels": {
    "qq": {
      "enabled": true,
      "appId": "你的AppID",
      "clientSecret": "你的AppSecret"
    }
  }
}
```

**获取凭证：**
1. 访问 QQ 开放平台
2. 创建机器人应用
3. 获取 AppID 和 AppSecret

### 飞书配置

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "cli_xxx",
      "appSecret": "你的AppSecret"
    }
  }
}
```

**获取凭证：**
1. 访问飞书开放平台
2. 创建企业自建应用
3. 获取 App ID 和 App Secret
4. 开启机器人能力

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

# 服务管理
message-bot start                      # 启动服务
message-bot stop                       # 停止服务
message-bot status                     # 查看状态

# Web 界面
message-bot ui                         # 启动 Web 控制界面
```

## 📁 配置文件位置

- macOS/Linux: `~/.openclaw-message-bot/config.json`
- Windows: `%USERPROFILE%\.openclaw-message-bot\config.json`

## 🔧 开发

```bash
# 克隆项目
git clone https://github.com/df1009/openclaw-message-bot.git
cd openclaw-message-bot

# 安装依赖
npm install

# 编译
npm run build

# 开发模式
npm run dev
```

## 📄 License

MIT
