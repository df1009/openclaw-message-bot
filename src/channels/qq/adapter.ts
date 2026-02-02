/**
 * QQ Bot 渠道适配器
 * 
 * 实现 QQ 开放平台 Bot API 的消息收发功能
 * 
 * 功能特性：
 * - 支持 C2C 私聊、群聊、频道消息
 * - 自动重连和错误恢复
 * - 图片和富媒体支持
 * - Token 自动刷新
 * - 每个用户独立会话
 */

import type {
  ChannelMeta,
  MessageContent,
  SendOptions,
  SendResult,
  ConfigSchema,
  ConfigValidation,
  InboundMessage,
} from '../../core/types.js';
import { BaseAdapter } from '../base/adapter.js';
import type { QQConfig } from './types.js';
import { QQGateway } from './gateway.js';
import { QQApi } from './api.js';

/**
 * QQ Bot 适配器
 */
export class QQAdapter extends BaseAdapter<QQConfig> {
  readonly meta: ChannelMeta = {
    id: 'qq',
    name: 'QQ Bot',
    description: 'QQ 开放平台机器人，支持私聊、群聊、频道消息',
    version: '1.0.0',
    icon: '🐧',
  };
  
  private gateway: QQGateway | null = null;
  private api: QQApi | null = null;
  
  /**
   * 启动适配器
   */
  protected async doStart(): Promise<void> {
    if (!this.config) {
      throw new Error('配置未初始化');
    }
    
    const { appId, clientSecret } = this.config;
    
    if (!clientSecret) {
      throw new Error('缺少 clientSecret 配置');
    }
    
    // 初始化 API 客户端
    this.api = new QQApi(appId, clientSecret);
    
    // 初始化并启动网关
    this.gateway = new QQGateway({
      appId,
      clientSecret,
      imageServerBaseUrl: this.config.imageServerBaseUrl,
      onMessage: async (event) => {
        await this.handleMessage(event);
      },
      onConnected: () => {
        this.setConnected(true);
        this.logger.info('QQ WebSocket 已连接');
      },
      onDisconnected: () => {
        this.setConnected(false);
        this.logger.warn('QQ WebSocket 已断开');
      },
      onError: (error) => {
        this.setError(error.message);
        this.logger.error(`QQ 网关错误: ${error.message}`);
      },
      logger: this.logger,
    });
    
    await this.gateway.start();
  }
  
  /**
   * 停止适配器
   */
  protected async doStop(): Promise<void> {
    if (this.gateway) {
      await this.gateway.stop();
      this.gateway = null;
    }
    this.api = null;
  }
  
  /**
   * 处理收到的消息
   */
  private async handleMessage(event: {
    type: 'c2c' | 'group' | 'guild' | 'dm';
    senderId: string;
    senderName?: string;
    chatId: string;
    content: string;
    messageId: string;
    timestamp: number;
    attachments?: Array<{ contentType: string; url: string }>;
  }): Promise<void> {
    // 构建标准消息格式
    const message: InboundMessage = {
      id: event.messageId,
      channel: 'qq',
      senderId: event.senderId,
      senderName: event.senderName,
      chatId: event.chatId,
      chatType: event.type === 'c2c' || event.type === 'dm' ? 'dm' : 'group',
      content: {
        text: event.content,
        images: event.attachments
          ?.filter(a => a.contentType.startsWith('image/'))
          .map(a => a.url),
      },
      timestamp: event.timestamp,
      raw: event,
    };
    
    this.logger.info(`收到消息: [${message.chatType}] ${message.senderId}: ${message.content.text?.substring(0, 50)}...`);
    
    // 分发消息
    await this.dispatchMessage(message);
  }
  
  /**
   * 发送消息
   */
  protected async doSendMessage(
    target: string,
    content: MessageContent,
    options?: SendOptions
  ): Promise<SendResult> {
    if (!this.api) {
      return { success: false, error: 'API 未初始化' };
    }
    
    try {
      // 解析目标类型
      // 格式: user:xxx, group:xxx, channel:xxx
      let type: 'user' | 'group' | 'channel' = 'user';
      let id = target;
      
      if (target.includes(':')) {
        const [t, i] = target.split(':');
        if (t === 'user' || t === 'group' || t === 'channel') {
          type = t;
          id = i;
        }
      }
      
      let messageId: string | undefined;
      
      // 发送文本
      if (content.text) {
        const result = await this.api.sendMessage(type, id, content.text, options?.replyTo);
        messageId = result.id;
      }
      
      // 发送图片
      if (content.images?.length && type !== 'channel') {
        for (const imageUrl nt.images) {
          try {
            await this.api.sendImage(type as 'user' | 'group', id, imageUrl, options?.replyTo);
          } catch (err) {
            this.logger.error(`发送图片失败: ${err}`);
          }
        }
      }
      
      return { success: true, messageId };
    } catch (err) {
      this.logger.error(`发送消息失败: ${err}`);
      return { success: false, error: String(err) };
    }
  }
  
  /**
   * 获取配置 Schema
   */
  getConfigSchema(): ConfigSchema {
    return {
      type: 'object',
      properties: {
        enabled: {
          type: 'boole         description: '是否启用',
    default: true,
        },
        appId: {
          type: 'string',
          description: 'QQ 机器人 AppID',
          required: true,
        },
        clientSecret: {
          type: 'string',
          description: 'QQ 机器人 AppSecret',
          required: true,
          sensitive: true,
        },
        imageServerBaseUrl: {
          type: 'string',
          description: '图床服务器公网地址（用于发送图片）',
        },
        systemPrompt: {
          type: 'string',
          description: '系统提示词',
        },
      },
      required: ['appId', 'clientSecret'],
    };
  }
  
  /**
   * 验证配置
   */
  validateConfig(config: unknown): ConfigValidation {
    const errors: string[] = [];
    
    if (!config || typeof config !== 'object') {
      return { valid: false, errors: ['配置必须是对象'] };
    }
    
    const cfg = config as Record<string, unknown>;
    
    if (!cfg.appId || typeof cfg.appId !== 'string') {
      errors.push('appId 是必填项');
    }
    
    if (!cfg.clientSecret && !cfg.clientSecretFile) {
      errors.push('clientSecret 或 clientSecretFile 是必填项');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * 获取 API 客户端
   */
  getApi(): QQApi | null {
    return this.api;
  }
  
  /**
   * 获取网关
   */
  getGateway(): QQGateway | null {
    return this.gateway;
  }
}
