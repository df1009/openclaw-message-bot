/**
 * 核心类型定义
 * 
 * 定义了渠道适配器、消息、配置等核心接口
 * 所有渠道适配器必须实现这些接口
 */

// ============================================================================
// 渠道状态
// ============================================================================

/**
 * 渠道运行状态
 */
export interface ChannelStatus {
  /** 是否正在运行 */
  running: boolean;
  /** 是否已连接 */
  connected: boolean;
  /** 最后连接时间 */
  lastConnectedAt: number | null;
  /** 最后错误信息 */
  lastError: string | null;
  /** 消息统计 */
  messageCount: {
    inbound: number;
    outbound: number;
  };
}

// ============================================================================
// 消息类型
// ============================================================================

/**
 * 消息内容
 */
export interface MessageContent {
  /** 文本内容 */
  text?: string;
  /** 图片路径或 URL 列表 */
  images?: string[];
  /** 文件路径列表 */
  files?: string[];
  /** 音频路径 */
  audio?: string;
  /** 视频路径 */
  video?: string;
  /** 回复的消息 ID */
  replyTo?: string;
}

/**
 * 入站消息（收到的消息）
 */
export interface InboundMessage {
  /** 消息 ID */
  id: string;
  /** 渠道标识 */
  channel: string;
  /** 发送者 ID */
  senderId: string;
  /** 发送者名称 */
  senderName?: string;
  /** 会话 ID（用户 ID 或群 ID） */
  chatId: string;
  /** 会话类型 */
  chatType: 'dm' | 'group' | 'channel';
  /** 消息内容 */
  content: MessageContent;
  /** 时间戳 */
  timestamp: number;
  /** 是否被 @ 提及 */
  mentioned?: boolean;
  /** 原始消息数据 */
  raw?: unknown;
}

/**
 * 发送选项
 */
export interface SendOptions {
  /** 消息类型 */
  msgType?: string;
  /** 回复的消息 ID */
  replyTo?: string;
  /** 是否静默发送 */
  silent?: boolean;
}

/**
 * 发送结果
 */
export interface SendResult {
  /** 是否成功 */
  success: boolean;
  /** 消息 ID */
  messageId?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 消息处理器
 */
export type MessageHandler = (message: InboundMessage) => Promise<void>;

// ============================================================================
// 配置类型
// ============================================================================

/**
 * 配置验证结果
 */
export interface ConfigValidation {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: string[];
}

/**
 * 配置 Schema（JSON Schema 格式）
 */
export interface ConfigSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    required?: boolean;
    default?: unknown;
    sensitive?: boolean;
  }>;
  required?: string[];
}

/**
 * 渠道配置基类
 */
export interface BaseChannelConfig {
  /** 是否启用 */
  enabled?: boolean;
  /** 显示名称 */
  name?: string;
}

// ============================================================================
// 渠道适配器接口
// ============================================================================

/**
 * 渠道适配器元数据
 */
export interface ChannelMeta {
  /** 渠道 ID */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 版本 */
  version: string;
  /** 图标（emoji） */
  icon?: string;
}

/**
 * 渠道适配器接口
 * 
 * 所有渠道适配器必须实现此接口
 * 
 * @example
 * ```typescript
 * class QQAdapter implements ChannelAdapter {
 *   readonly meta = {
 *     id: 'qq',
 *     name: 'QQ Bot',
 *     description: 'QQ 开放平台机器人',
 *     version: '1.0.0'
 *   };
 *   // ...
 * }
 * ```
 */
export interface ChannelAdapter<TConfig extends BaseChannelConfig = BaseChannelConfig> {
  /** 渠道元数据 */
  readonly meta: C
  
  /** 当前状态 */
  readonly status: ChannelStatus;
  
  /**
   * 初始化适配器
   * @param config 渠道配置
   */
  initialize(config: TConfig): Promise<void>;
  
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
   * @param target 目标标识
   * @param content 消息内容
   * @param options 发送选项
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

// ============================================================================
// 机器人配置
// ============================================================================

/**
 * 机器人全局配置
 */
export interface BotConfig {
  /** 配置版本 */
  version: string;
  
  /** 渠道配置 */
  channels: {
    [channelId: string]: BaseChannelConfig & Record<string, unknown>;
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

// ============================================================================
// 日志接口
// ============================================================================

/**
 * 日志接口
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

// ============================================================================
// 事件类型
// ============================================================================

/**
 * 生命周期事件
 */
export type LifecycleEvent = 
  | 'start'
  | 'stop'
  | 'channel:start'
  | 'channel:stop'
  | 'channel:error'
  | 'message:received'
  | 'message:sent';

/**
 * 事件处理器
 */
export type EventHandler = (...args: unknown[]) => void | Promise<void>;
