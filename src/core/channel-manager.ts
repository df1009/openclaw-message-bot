/**
 * 渠道管理器
 * 
 * 负责管理所有渠道适配器的生命周期
 */

import type { 
  ChannelAdapter, 
  BaseChannelConfig, 
  ChannelStatus,
  MessageHandler,
  InboundMessage 
} from './types.js';
import { createLogger } from './logger.js';
import { getConfigManager } from './config-manager.js';

const logger = createLogger('channel-manager');

/**
 * 渠道管理器类
 */
export class ChannelManager {
  /** 已注册的适配器 */
  private adapters: Map<string, ChannelAdapter> = new Map();
  
  /** 全局消息处理器 */
  private messageHandlers: MessageHandler[] = [];
  
  /** 是否正在运行 */
  private running = false;
  
  /**
   * 注册渠道适配器
   * 
   * @param adapter 适配器实例
   */
  registerAdapter(adapter: ChannelAdapter): void {
    const { id, name } = adapter.meta;
    
    if (this.adapters.has(id)) {
      logger.warn(`适配器已存在，将被覆盖: ${id}`);
    }
    
    this.adapters.set(id, adapter);
    logger.info(`适配器已注册: ${name} (${id})`);
  }
  
  /**
   * 获取适配器
   * 
   * @param channelId 渠道 ID
   */
  getAdapter(channelId: string): ChannelAdapter | undefined {
    return this.adapters.get(channelId);
  }
  
  /**
   * 获取所有已注册的适配器
   */
  getAllAdapters(): ChannelAdapter[] {
    return Array.from(this.adapters.values());
  }
  
  /**
   * 获取所有渠道 ID
   */
  getChannelIds(): string[] {
    return Array.from(this.adapters.keys());
  }
  
  /**
   * 注册全局消息处理器
   * 
   * @param handler 消息处理函数
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }
  
  /**
   * 分发消息到所有处理器
   */
  private async dispatchMessage(message: InboundMessage): Promise<void> {
    for (const handler of this.messageHandlers) {
      try {
        await handler(message);
      } catch (err) {
        logger.error(`消息处理器错误: ${err}`);
      }
    }
  }
  
  /**
   * 初始化并启动指定渠道
   * 
   * @param channelId 渠道 ID
   */
  async startChannel(channelId: string): Promise<void> {
    const adapter = this.adapters.get(channelId);
    if (!adapter) {
      throw new Error(`未找到适配器: ${channelId}`);
    }
    
    const configManager = getConfigManager();
    const config = configManager.getChannelConfig(channelId);
    
    if (!config) {
      throw new Error(`未找到渠道配置: ${channelId}`);
    }
    
    if (config.enabled === false) {
      logger.info(`渠道已禁用，跳过启动: ${channelId}`);
      return;
    }
    
    try {
      // 初始化适配器
      await adapter.initialize(config);
      
      // 注册消息处理
      adapter.onMessage(async (message) => {
        await this.dispatchMessage(message);
      });
      
      // 启动适配器
      await adapter.start();
      
      logger.info(`渠道已启动: ${adapter.meta.name}`);
    } catch (err) {
      logger.error(`启动渠道失败 [${channelId}]: ${err}`);
      throw err;
    }
  }
  
  /**
   * 停止指定渠道
   * 
   * @param channelId 渠道 ID
   */
  async stopChannel(channelId: string): Promise<void> {
    const adapter = this.adapters.get(channelId);
    if (!adapter) {
      return;
    }
    
    try {
      await adapter.stop();
      logger.info(`渠道已停止: ${adapter.meta.name}`);
    } catch (err) {
      logger.error(`停止渠道失败 [${channelId}]: ${err}`);
    }
  }
  
  /**
   * 启动所有已配置的渠道
   */
  async startAll(): Promise<void> {
    if (this.running) {
      logger.warn('渠道管理器已在运行');
      return;
    }
    
    const configManager = getConfigManager();
    const configuredChannels = configManager.getChannelIds();
    
    logger.info(`准备启动 ${configuredChannels.length} 个渠道...`);
    
    const results = await Promise.allSettled(
      configuredChannels.map(id => this.startChannel(id))
    );
    
    // 统计结果
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    logger.info(`渠道启动完成: ${succeeded} 成功, ${failed} 失败`);
    
    this.running = true;
  }
  
  /**
   * 停止所有渠道
   */
  async stopAll(): Promise<void> {
    if (!this.running) {
      return;
    }
    
    logger.info('正在停止所有渠道...');
    
    await Promise.allSettled(
      this.getChannelIds().map(id => this.stopChannel(id))
    );
    
    this.running = false;
    logger.info('所有渠道已停止');
  }
  
  /**
   * 获取所有渠道状态
   */
  getStatus(): Record<string, ChannelStatus & { meta: { id: string; name: string } }> {
    const status: Record<string, ChannelStatus & { meta: { id: string; name: string } }> = {};
    
    for (const [id, adapter] of this.adapters) {
      status[id] = {
        ...adapter.status,
        meta: {
          id: adapter.meta.id,
          name: adapter.meta.name,
        },
      };
    }
    
    return status;
  }
  
  /**
   * 是否正在运行
   */
  isRunning(): boolean {
    return this.running;
  }
}

/** 全局渠道管理器实例 */
let globalChannelManager: ChannelManager | null = null;

/**
 * 获取全局渠道管理器
 */
export function getChannelManager(): ChannelManager {
  if (!globalChannelManager) {
    globalChannelManager = new ChannelManager();
  }
  return globalChannelManager;
}
