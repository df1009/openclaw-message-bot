/**
 * 飞书渠道适配器
 * 
 * 简化版本，和 QQ Bot 保持一致的配置风格
 * 只需要 appId 和 appSecret 即可使用
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
import type { FeishuConfig, FeishuMessageEvent } from './types.js';
import { FeishuWsClient } from './client.js';

/**
 * 飞书适配器
 * 
 * 配置示例：
 * ```json
 * {
 *   "feishu": {
 *     "enabled": true,
 *     "appId": "cli_xxx",
 *     "appSecret": "xxx"
 *   }
 * }
 * ```
 */
export class FeishuAdapter extends BaseAdapter<FeishuConfig> {
  readonly meta: ChannelMeta = {
    id: 'feishu',
    name: '飞书',
    description: '飞书开放平台机器人',
    version: '1.0.0',
    icon: '📱',
  };
  
  private client: FeishuWsClient | null = null;
  
  /**
   * 启动适配器
   */
  protected async doStart(): Promise<void> {
    if (!this.config) {
      throw new Error('配置未初始化');
    }
    
    const { appId, appSecret } = this.config;
    
    if (!appSecret) {
      throw new Error('缺少 appSecret 配置');
    }
    
    this.logger.info(`启动飞书适配器: ${appId}`);
    
    // 初始化客户端
    this.client = new FeishuWsClient({
      appId,
      appSecret,
      onMessage: async (event) => {
        await this.handleMessage(event);
      },
      onConnected: () => {
        this.setConnected(true);
        this.logger.info('飞书已连接');
      },
      onDisconnected: () => {
        this.setConnected(false);
        this.logger.warn('飞书已断开');
      },
      onError: (error) => {
        this.setError(error.message);
        this.logger.error(`飞书错误: ${error.message}`);
      },
    });
    
    await this.client.start();
  }
  
  /**
   * 停止适配器
   */
  protected async doStop(): Promise<void> {
    if (this.client) {
      await this.client.stop();
      this.client = null;
    }
  }
  
  /**
   * 处理收到的消息
   */
  private async handleMessage(event: FeishuMessageEvent): Promise<void> {
    // 群聊中检查是否被 @
    if (event.type === 'group') {
      const requireMention = this.config?.requireMention !== false;
      if (requireMention && !event.mentioned) {
        this.logger.debug('群聊消息未 @，跳过');
        return;
      }
    }
    
    // 构建标准消息格式
    const message: InboundMessage = {
      id: event.messageId,
      channel: 'feishu',
      senderId: event.senderId,
      senderName: event.senderName,
      // 为每个用户/群生成唯一的 chatId
      chatId: event.type === 'dm' 
        ? `user:${event.senderId}` 
        : `group:${event.chatId}`,
      chatType: event.type === 'dm' ? 'dm' : 'group',
      content: {
        text: event.content,
        images: event.attachments
          ?.filter(a => a.type === 'image' && a.localPath)
          .map(a => a.localPath!),
      },
      timestamp: event.timestamp,
      mentioned: event.mentioned,
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
    if (!this.client) {
      return { success: false, error: '客户端未初始化' };
    }
    
    try {
      // 解析目标类型: user:xxx 或 group:xxx
      let receiveIdType: 'open_id' | 'chat_id' = 'open_id';
      let receiveId = target;
      
      if (target.startsWith('user:')) {
        receiveId = target.replace('user:', '');
        receiveIdType = 'open_id';
      } else if (target.startsWith('group:')) {
        receiveId = target.replace('group:', '');
        receiveIdType = 'chat_id';
      } else if (target.startsWith('oc_')) {
        // chat_id 格式
        receiveIdType = 'chat_id';
      }
      
      let messageId: string | undefined;
      
      // 发送文本
      if (content.text) {
        if (options?.replyTo) {
          const result = await this.client.replyText(options.replyTo, content.text);
          messageId = result.messageId;
        } else {
       onst result = await this.client.sendText(receiveId, content.text, receiveIdType);
          messageId = result.messageId;
        }
      }
      
      // 发送图片
      if (content.images?.length) {
        const fs = await import('node:fs');
        for (const imagePath of content.images) {
          try {
            if (imagePath.startsWith('/') || imagePath.startsWith('.')) {
              // 本地文件，先上传
              const buffer = fs.readFileSync(imagePath);
              const imageKey = await this.client.uploadImage(buffer);
              await this.client.sendImage(receiveId, imageKey, receiveIdType);
            } else {
              // 已经是 image_key
              await this.client.sendImage(receiveId, imagePath, receiveIdType);
            }
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
          type: 'boolean',
          description: '是否启用',
          default: true,
        },
        appId: {
          type: 'string',
          description: '飞书应用 App ID',
          required: true,
        },
        appSecret: {
          type: 'string',
          description: '飞书应用 App Secret',
          required: true,
          sensitive: true,
        },
        systemPrompt: {
          type: 'string',
          description: '系统提示词',
        },
        requireMention: {
          type: 'boolean',
          description: '群聊中是否需要 @ 才响应',
          default: true,
        },
 },
      required: ['appId', 'appSecret'],
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
    
    if (!cfg.appSecret && !cfg.appSecretFile) {
      errors.push('appSecret 或 appSecretFile 是必填项');
    }
    
        valid: errors.length ===      errors,
    };
  }
  
  /**
   * 获取客户端
   */
  getClient(): FeishuWsClient | null {
    return this.client;
  }
}
