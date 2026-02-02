# OpenClaw Message Bot 开发文档

> 统一的多渠道消息机器人平台，支持 QQ、飞书、微信、企业微信等

## 📋 目录

1. [项目概述](#项目概述)
2. [架构设计](#架构设计)
3. [功能模块](#功能模块)
4. [技术栈](#技术栈)
5. [开发路线图](#开发路线图)
6. [代码规范](#代码规范)
7. [参考实现](#参考实现)

---

## 项目概述

### 背景

基于对 `openclaw-cn` 和现有 `qqbot` 插件的分析，我们需要构建一个统一的消息机器人平台：

- **openclaw-cn**: 完整的 AI 助手框架，包含 CLI、Web UI、多渠道支持
- **qqbot 插件**: 已实现 QQ Bot API 的基础功能

### 目标

1. **统一架构**: 参考 openclaw-cn 的插件系统，构建可扩展的渠道适配器
2. **CLI 工具**: 提供命令行配置和管理工具
3. **Web 界面**: 可视化的控制和监控界面
4. **多渠道支持**: QQ、飞书、微信、企业微信等

### 项目定位

作为 OpenClaw 的渠道扩展包，专注于国内即时通讯平台的适配。

---

## 架构设计

### 目录结构

```
openclaw-message-bot/
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript 配置
├── README.md                 # 项目说明
├── DEVELOPMENT.md            # 开发文档（本文件）
│
├── src/
│   ├── index.ts              # 主入口
│   │
│   ├── core/                 # 核心框架
│   │   ├── plugin-api.ts     # 插件 API 定义
│   │   ├── channel-manager.ts # 渠道管理器
│   │   ├── config-manager.ts  # 配置管理器
│   │   ├── message-router.ts  # 消息路由
│   │   └── types.ts          # 核心类型定义
│   │
│   ├── channels/             # 渠道适配器
│   │   ├── base/             # 基础适配器类
│   │   │   ├── adapter.ts    # 抽象适配器
│   │   │   └── types.ts      # 适配器类型
│   │   │
│   │   ├── qq/               # QQ Bot 适配器
│   │   │   ├── index.ts      # 导出
│   │   │   ├── adapter.ts    # 适配器实现
│   │   │   ├── api.ts        # QQ API 封装
│   │   │   ├── gateway.ts    # WebSocket 网关
│   │   │   ├── config.ts     # 配置定义
│   │   │   ├── message.ts    # 消息处理
│   │   │   ├── image-server.ts # 图床服务
│   │   │   └── types.ts      # 类型定义
│   │   │
│   │   ├── feishu/           # 飞书适配器
│   │   │   ├── index.ts      # 导出
│   │   │   ├── adapter.ts    # 适配器实现
│   │   │   ├── client.ts     # 飞书 SDK 客户端
│   │   │   ├── bot.ts        # 机器人逻辑
│   │   │   ├── config.ts     # 配置定义
│   │   │   ├── message.ts    # 消息处理
│   │   │   ├── send.ts       # 发送消息
│   │   │   └── types.ts      # 类型定义
│   │   │
│   │   ├── wechat/           # 微信适配器（预留）
│   │   │   └── index.ts      # 占位
│   │   │
│   │   └── wecom/            # 企业微信适配器（预留）
│   │       └── inx.ts      # 占位
│   │
│   ├── cli/                  # 命令行工具
│   │   ├── index.ts          # CLI 入口
│   │   ├── commands/         # 命令实现
│   │   │   ├── channels.ts   # 渠道管理命令
│   │   │   ├── config.ts     # 配置命令
│   │   │   ├── status.ts     # 状态命令
│   │   │   └── onboard.ts    # 配置向导
│   │   └── utils.ts          # CLI 工具函数
│   │
│   ├── ui/                   # Web 控制界面
│   │   ├── index.ts          # UI 服务入口
│   │   ├── server.ts         # HTTP 服务器
│   │   ├── api/              # API 路由
│   │   │   ├── channels.ts   # 渠道 API
│   │   │   ├── config.ts     # 配置 API
│   │   │   └── status.ts     # 状态 API
│   │   └── static/           # 静态资源
│   │       ├── index.html    # 主页面
│   │       ├── app.js        # 前端逻辑
│   │       └── style.css     # 样式
│   │
│   └── utils/                # 工具函数
│       ├── logger.ts         # 日志工具
│       ├── config.ts         # 配置工具
│       └── crypto.ts         # 加密工具
│
├── scripts/                  # 脚本
│   ├── build.sh              # 构建脚本
│   └── upgrade.sh            # 升级脚本
│
└── docs/                     # 文档
    ├── qq.md                 # QQ 渠道文档
    ├── feishu.md             # 飞书渠道文档
    └── api.md                # API 文档
```

### 核心接口设计

#### 1. 渠道适配器接口

```typescript
/**
 * 渠道适配器基础接口
 * 所有渠道适配器必须实现此接口
 */
interface ChannelAdapter {
  /** 渠道唯一标识 */
  readonly id: string;
  
  /** 渠道显示名称 */
  readonly name: string;
  
  /** 渠道描述 */
  readonly description: string;
  
  /** 当前状态 */
  readonly status: ChannelStatus;
  
  /**
   * 初始化适配器
   * @param config 渠道配置
   */
  initialize(config: ChannelConfig): Promise<void>;
  
  /**
   * 启动适配器
   */
  start(): Promise<void>;
  
  /**
   * 停止适配器
   */
  stop(): Promise<void>;
  
  /**
   * 发送消息
   * @param target 目标（用户ID/群ID）
   * @param content 消息内容
   ptions 发送选项
   */
  sendMessage(
    target: string,
    content: MessageContent,
    options?: SendOptions
  ): Promise<SendResult>;
  
  /**
   * 注册消息处理器
   * @param handler 消息处理函数
   */
  onMessage(handler: MessageHandler): void;
  
  /**
   * 获取配置 Schema
   */
  getConfigSchema(): ConfigSchema;
  
  /**
   * 验证配置
   * @param config 待验证的配置
   */
  validateConfig(config: unknown): ConfigValidation;
}

/** 渠道状态 */
interface ChannelStatus {
  running: boolean;
  connected: boolean;
  lastConnectedAt: number | null;
  lastError: string | null;
  messageCount: {
    inbound: number;
    outbound: number;
  };
}

/** 消息内容 */
interface MessageContent {
  text?: string;
  images?: string[];      // 图片路径或 URL
  files?: string[];       // 文件路径
  audio?: string;         // 音频路径
  video?: string;         // 视频路径
  replyTo?: string;       // 回复的消息 ID
}

/** 消息处理器 */
type MessageHandler = (message: InboundMessage) => Promise<void>;

/** 入站消息 */
interface InboundMessage {
  id: string;
  channel: string;
  senderId: string;
  senderName?: string;
  chatId: string;
  chatType: 'dm' | 'group';
  content: MessageContent;
  timestamp: number;
  raw: unknown;           // 原始消``

#### 2. 配置管理接口

```typescript
/**
 * 配置管理器
 */
interface ConfigManager {
  /**
   * 加载配置
   */
  load(): Promise<BotConfig>;
  
  /**
   * 保存配置
   * @param config 配置对象
   */
  save(config: BotConfig): Promise<void>;
  
  /**
   * 获取渠道配置
   * @param channelId 渠道 ID
   */
  getChannelConfig(channelId: string): ChannelConfig | undefined;
  
  /**
   * 设置渠道配置
   * @param channelId 渠道 ID
   * @param config 渠道配置
   */
  setChannelConfig(channelId: string, config: ChannelConfig): Promise<void>;
  
  /**
   * 删除渠道配置
   * @param channelId 渠道 ID
   */
  removeChannelConfig(channeg): Promise<void>;
}

/** 机器人配置 */
interface BotConfig {
  /** 版本号 */
  version: string;
  
  /** 渠道配置 */
  channels: {
    [channelId: string]: ChannelConfig;
  };
  
  /** 全局设置 */
  settings: {
    /** 日志级别 */
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    /** Web UI 端口 */
    uiPort: number;
    /** 数据目录 */
    dataDir: string;
  };
}
```

#### 3. 插件 API 接口

```typescript
/**
 * 插件 API
 * 参考 openclaw-cn 的 ClawdbotPluginApi
 */
interface PluginApi {
  /** 插件 ID */
  readonly id: string;
  
  /** 插件名称 */
  readonly name: string;
  
  /** 日志工具 */
  readonly logger: Logger;
  
  /** 当前配置 */
  readonly config: BotConfig;
  
  /**
   * 注册渠道适配器
   * @param adapter 适配器实例
   */
  registerChannel(adapter: ChannelAdapter): void;
  
  /**
   * 注册 CLI 命令
   * @param command 命令定义
   */
  registerCommand(command: CommandDefinition): void;
  
  /**
   * 注册 HTTP 路由
   * @param route 路由定义
   */
  registerRoute(route: RouteDefinition): void;
  
  /**
   * 注册生命周期钩子
   * @param event 事件名称
   * @param handler 处理函数
   */
  on(event: LifecycleEvent, handler: EventHandler): void;
}
```

---

## 功能模块

### 1. QQ Bot 适配器（已有，需重构）

**现有功能：**
- ✅ C2C 私聊消息
- ✅ 群聊 @消息
- ✅ 频道消息
- ✅ 图片收发
- ✅ 自动重连
- ✅ Token 缓存和刷新
- ✅ 消息序号管理

**需要重构：**
- [ ] 适配新的 ChannelAdapter 接口
- [ ] 分离配置管理
- [ ] 优化错误处理
- [ ] 添加更多注释

### 2. 飞书适配器（参考 openclaw-cn）

**参考 openclaw-cn/src/feishu/ 实现：**

| 文件 | 功能 | 行数 |
|------|------|------|
| bot.ts | 机器人创建和启动 | ~60 |
| client.ts | 飞书 SDK 客户端封装 | ~100 |
| config.ts | 配置解析和验证 | ~90 |
| message.ts | 消息处理核心逻辑 | ~350 |
| send.ts | 消息发送 | ~300 |
| streaming-card.ts | 流式卡片（打字效果） | ~300 |
| download.ts | 媒体下载 | ~150 |
| access.ts | 访问控制 | ~90 |
| pairing-store.ts |储 | ~120 |

**核心依赖：**
```json
{
  "@larksuiteoapi/node-sdk": "^1.x"
}
```

**关键实现：**
```typescript
// 创建飞书机器人
import * as Lark from "@larksuiteoapi/node-sdk";

export function createFeishuBot(opts: { appId: string; appSecret: string }) {
  const client = new Lark.Client({ appId, appSecret });
  
  const eventDispatcher = new Lark.EventDispatcher({}).register({
    "im.message.receive_v1": async (data) => {
      await processFeishuMessage(client, data, appId);
    },
  });
  
  const wsClient = new Lark.WSClient({ appId, appSecret });
  
  return { client, wsClient, eventDispatcher };
}

// 启动机器人
export async function startFeishuBot(bot) {
  await bot.wsClient.start({
    eventDispatcher: bot.eventDispatcher,
  });
}
```

### 3. CLI 命令（参考 openclaw-cn）

**参考 openclaw-cn/src/cli/channels-cli.ts 实现：**

```bash
# 渠道管理
message-bot channels list              # 列出已配置的渠道
message-bot channels status            # 显示渠道状态
message-bot channels add <channel>     # 添加渠道
message-bot channels remove <channel>  # 移除渠道

# QQ 渠道
message-bot channels add qq --token "AppID:AppSecret"

# 飞书渠道
message-bot channels add feishu --app-id xxx --app-secret xxx

# 配置管理
message-bot config show             # 显示配置
message-bot config edit                # 编辑配置
message-bot config reset               # 重置配置

# 服务管理
message-bot start                      # 启动服务
message-bot stop                       # 停止服务
message-bot restart                    # 重启服务
message-bot status                     # 查看状态

# Web UI
message-bot ui                         # 启动 Web 界面
message-bot ui --port 8080             # 指定端口
```

### 4. Web 控制界面

**参考 openclaw-cn/ui/ 实现：**

**页面结构：**
- 📊 **仪表盘**: 概览、消息统计、在线状态
- 📱 **渠道管理**: 添加/编辑/删除渠道
- ⚙️ **配置编辑**: 可视化配置编辑器
- 📝 **日志查看**: 实时日志和错误追踪
- 🔧 **系统设置**: 全局设置

**技术选型：**
- 前端: 原生 JS + CSS（轻量级）
- 后端: Node.js HTTP 服务器
- API: RESTful JSON API

---

## 技术栈

### 核心依赖

```json
{
  "dependencies": {
    // QQ Bot
    "ws": "^8.18.0",
    
    // 飞书
    "@larksuiteoapi/node-sdk": "^1.x",
    
    // CLI
    "commander": "^12.x",
    "inquirer": "^9.x",
    "chalk": "^5.x",
    
    // 工具
    "zod": "^3.x"           // 配置验证
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "@types/ws": "^8.x",
    "vitest": "^1.x"        // 测试
  }
}
```

### 运行环境

- Node.js >= 20
- TypeScript 5.x
- 支持 ESM 模块

---

## 开发路线图

### 阶段 1：核心框架（第 1-2 周）

**目标：** 建立可扩展的插件架构

- [ ] 设计并实现 ChannelAdapter 接口
- [ ] 实现 ConfigManager 配置管理
- [ ] 实现 ChannelManager 渠道管理
- [ ] 实现基础日志系统
- [ ] 编写单元测试

**产出：**
- `src/core/` 目录完成
- 基础类型定义完成
- 配置文件格式确定

### 阶段 2：QQ 适配器重构（第 2-3 周）

**目标：** 将现有 QQ Bot 迁移到新架构

- [ ] 重构为 ChannelAdapter 实现
- [ ] 分离配置管理逻辑
- [ ] 优化错误处理和日志
- [ ] 添加详细注释
- [ ] 保持向后兼容

**产出：**
- `src/channels/qq/` 目录完成
- QQ 渠道文档更新
- 迁移测试通过

### 阶段 3：CLI 工具（第 3-4 周）

**目标：** 实现命令行管理工具

- [ ] 实现 channels 命令组
- [ ] 实现 config 命令组
- [ ] 实现交互式配置向导
- [ ] 实现服务管理命令
- [ ] 编写**产出：**
- `src/cli/` 目录完成
- CLI 使用文档
- 命令帮助信息

### 阶段 4：飞书适配器（第 4-5 周）

**目标：** 参考 openclaw-cn 实现飞书支持

- [ ] 实现 FeishuAdapter
- [ ] 实现消息收发
- [ ] 实现媒体处理
- [ ] 实现访问控制
- [ ] 实现配置向导

**产出：**
- `src/channels/feishu/` 目录完成
- 飞书渠道文档
- 集成测试通过

### 阶段 5：Web 界面（第 5-7 周）

**目标：** 实现可视化控制界面

- [ ] 设计 UI 界面
- [ ] 实现 HTTP 服务器
- [ ] 实现 API 路由
- [ ] 实现前端页面
- [ ] 实现实时状态更新

**产出：**
- `src/ui/` 目录完成
- Web UI 可用
- API 文档

### 阶段 6：扩展和优化（持续）

**目标：** 添加更多渠道，优化性能

- [ ] 微信适配器（需要研究方案）
- [ ] 企业微信适配器
- [ ] 性能优化
- [ ] 文档完善
- [ ] 社区反馈处理

---

## 代码规范

### 1. 文件命名

```
kebab-case.ts       # 普通文件
PascalCase.ts       # 类文件（可选）
*.test.ts           # 测试文件
*.types.ts          # 类型定义文件
```

### 2. 代码注释

```typescript
/**
 * QQ Bot 渠道适配器
 * 
 * 实现 QQ 开放平台 Bot API 的消息收发功能。
 * 
 * 功能特性：
 * - 支持 C2C 私聊、群聊、频道消息
 * - 自动重连和错误恢复
 * - 图片和富媒体支持
 * - Token 自动刷新
 * 
 * @example
 * ```typescript
 * const adapter = new QQAdapter();
 * await adapter.initialize({
 *   appId: "102835502",
 *   clientSecret: "xxx"
 * });
 * await adapter.start();
 * ```
 * 
 * @see htot.q.qq.com/wiki/ QQ 机器人官方文档
 */
export class QQAdapter implements ChannelAdapter {
  /**
   * 渠道唯一标识
   * @readonly
   */
  readonly id = "qq";
  
  /**
   * 发送消息到指定目标
   * 
   * @param target - 目标标识（用户 OpenID 或群 OpenID）
   * @param content - 消息内容
   * @param options - 发送选项
   * @returns 发送结果，包含消息 ID
   * @throws {QQApiError} 当 API 调用失败时
   * 
   * @example
   * ```typescript
   * // 发送文本消息
   * await adapter.sendMessage("user:123", { text: "Hello" });
   * 
   * // 发送图片
   * await adapter.sendMessage("group:456", {
   *   text: "看这张图",
   *   images: ["/path/to/image.png"]
   * });
   * ```
   */
  async sendMessage(
    target: string,
    content: MessageContent,
    options?: SendOptions
  ): Promise<SendResult> {
    // 实现...
  }
}
```

### 3. 错误处理

```typescript
/**
 * 渠道错误基类
 */
export class ChannelError extends Error {
  constructor(
    public readonly channel: string,
    public readonly code: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(`[${channel}] ${message}`);
    this.name = "ChannelError";
  }
}

/**
 * QQ API 错误
 */
export class QQApiError extends ChannelError {
  constructor(
    public readonly statusCode: number,
    public readonly apiCode: number,
    message: string
  ) {
    super("qq", `API_${apiCode}`, message);
    this.name = "QQApiError";
  }
}

// 使用示例
try {
  await sendMessage(...);
} catch (err) {
  if (err instanceof QQApiError) {
    if (err.apiCode === 401) {
      // Token 过期，刷新后重试
      await refreshToken();
      await sendMessage(...);
    }
  }
  throw err;
}
```

### 4. 日志规范

```typescript
// 使用统一的日志接口
const logger = createLogger("qq-adapter");

// 日志级别
logger.debug("详细调试信息");
logger.info("一般信息");
logger.warn("警告信息");
logger.error("错误信息");

// 结构化日志
logger.info({
  event: "message_received",
  senderId: "123",
  chatType: "dm",ength: 100
});
```

---

## 参考实现

### openclaw-cn 关键文件

| 模块 | 文件路径 | 说明 |
|------|----------|------|
| 飞书适配器 | `src/feishu/` | 完整的飞书实现 |
| CLI 渠道命令 | `src/cli/channels-cli.ts` | 渠道管理命令 |
| 插件类型 | `src/plugins/types.ts` | 插件 API 定义 |
| 渠道插件 | `src/channels/plugins/types.ts` | 渠道插件接口 |
| Web UI | `ui/src/ui/` | 前端界面实现 |

### QQ Bot 插件关键文件

| 文件 | 说明 |
|------|------|
| `src/api.ts` | QQ API 封装 |
| `src/gatewaWebSocket 网关 |
| `src/channel.ts` | 渠道插件定义 |
| `src/config.ts` | 配置管理 |
| `src/image-server.ts` | 图床服务 |

---

## 附录

### A. 配置文件示例

```json
{
  "version": "1.0.0",
  "channels": {
    "qq": {
      "enabled": true,
      "appId": "102835502",
      "clientSecret": "xxx",
      "imageServerBaseUrl": "http://your-ip:18765"
    },
    "feishu": {
      "enabled": true,
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "dmPolicy": "pairing",
      "groupPolicy": "open"
    }
  },
  "settings": {
    "logLevel": "info",
    "uiPort": 8080,
    "dataDir": "~/.openclaw-message-bot"
  }
}
```

### B. 环境变量

```bash
# QQ Bot
QQBOT_APP_ID=102835502
QQBOT_CLIENT_SECRET=xxx
QQBOT_IMAGE_SERVER_PORT=18765

# 飞书
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx

# 通用
MESSAGE_BOT_LOG_LEVEL=info
MESSAGE_BOT_UI_PORT=8080
MESSAGE_BOT_DATA_DIR=~/.openclaw-message-bot
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-02-02  
**作者**: OpenClaw Message Bot Team
