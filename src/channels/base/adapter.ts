/**
 * 基础渠道适配器
 * 
 * 提供渠道适配器的基础实现，子类只需实现特定方法
 */

import type {
  ChannelAdapter,
  ChannelMeta,
  ChannelStatus,
  BaseChannelConfig,
  MessageContent,
  SendOptions,
  SendResult,
  MessageHandler,
  ConfigSchema,
  ConfigValidation,
  Logger,
} from '../core/types.js';
import { createLogger } from '../core/logger.js';

/**
 * 基础适配器抽象类
 * 
 * 提供通用功能的默认实现，子类需要实现：
 * - doStart(): 启动逻辑
 * - doStop(): 停止逻辑
 * - doSendMessage(): 发送消息逻辑
 * - getConfigSchema(): 配置 Schema
 * - validateConfig(): 配置验证
 */
export abstract class BaseAdapter<TConfig extends BaseChannelConfig = BaseChannelConfig>
  implements ChannelAdapter<TConfig>
{
  /** 渠道元数据（子类必须定义） */
  abstract readonly meta: ChannelMeta;
  
  /** 配置 */
  protected config: TConfig | null = null;
  
  /** 日志器 */
  protected logger: Logger;
  
  /** 消息处理器列表 */
  protected messageHandlers: MessageHandler[] = [];
  
  /** 内部状态 */
  protected _status: ChannelStatus = {
    running: false,
    connected: false,
    lastConnectedAt: null,
    lastError: null,
    messageCount: {
      inbound: 0,
      outbound: 0,
    },
  };
  
  constructor() {
    // 延迟初始化 logger，因为 meta 在子类中定义
    this.logger = createLogger('base-adapter');
  }
  
  /**
   * 获取当前状态
   */
  get status(): ChannelStatus {
    return { ...this._status };
  }
  
  /**
   * 初始化适配器
   */
  async initialize(config: TConfig): Promise<void> {
    // 更新 logger 使用正确的模块名
    this.logger = createLogger(`${this.meta.id}-adapter`);
    
    // 验证配置
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
    }
    
    this.config = config;
    this.logger.info('适配器已初始化');
  }
  
  /**
   * 启动适配器
   */
  async start(): Promise<void> {
    if (this._status.running) {
      this.logger.warn('适配器已在运行');
      return;
    }
    
    if (!this.config) {
      throw new Error('适配器未初始化');
    }
    
    try {
      await this.doStart();
      this._status.running = true;
      this._status.lastError = null;
      this.logger.info('适配器已启动');
    } catch (err) {
      this._status.lastError = String(err);
      this.logger.error(`启动失败: ${err}`);
      throw err;
    }
  }
  
  /**
   * 停止适配器
   */
  async stop(): Promise<void> {
    if (!this._status.running) {
      return;
    }
    
    try {
      await this.doStop();
      this._status.running = false;
      this._status.connected = false;
      this.logger.info('适配器已停止');
    } catch (err) {
      this.logger.error(`停止失败: ${err}`);
      throw err;
    }
  }
  
  /**
   * 发送消息
   */
  async sendMessage(
    target: string,
    content: MessageContent,
    options?: SendOptions
  ): Promise<SendResult> {
    if (!this._status.running) {
      return {
        success: false,
        error: '适配器未运行',
      };
    }
    
    try {
      const result = await this.doSendMessage(target, content, options);
      if (result.success) {
        this._status.messageCount.outbound++;
      }
      return result;
    } catch (err) {
     ger.error(`发送消息失败: ${err}`);
      return {
        success: false,
        error: String(err),
      };
    }
  }
  
  /**
   * 注册消息处理器
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }
  
  /**
   * 分发收到的消息
   */
  protected async dispatchMessage(message: Parameters<MessageHandler>[0]): Promise<void> {
    this._status.messageCount.inbound++;
    
    for (const handler of this.messageHandlers) {
      try {
        await handler(message);
      } catch (err) {
        this.logger.error(`消息处理器错误: ${err}`);
      }
    }
  }
  
  /**
   * 更新连接状态
   */
  protected setConnected(connected: boolean): void {
    this._status.connected = connected;
    if (connected) {
      this._status.lastConnectedAt = Date.now();
    }
  }
  
  /**
   * 设置错误信息
   */
  protected setError(error: string | null): void {
    this._status.lastError = error;
  }
  
  // ========== 子类必须实现的方法 ==========
  
  /**
   * 启动逻辑（子类实现）
   */
  protected abstract doStart(): Promise<void>;
  
  /**
   * 停止逻辑（子类实现）
   */
  protected abstract doStop(): Promise<void>;
  
  /**
   * 发送消息逻辑（子类实现）
   */
  protected abstract doSendMessage(
    target:ing,
    content: MessageContent,
    options?: SendOptions
  ): Promise<SendResult>;
  
  /**
   * 获取配置 Schema（子类实现）
   */
  abstract getConfigSchema(): ConfigSchema;
  
  /**
   * 验证配置（子类实现）
   */
  abstract validateConfig(config: unknown): ConfigValidation;
}
