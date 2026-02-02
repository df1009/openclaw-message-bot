/**
 * 飞书 WebSocket 客户端
 * 
 * 使用飞书官方 SDK (@larksuiteoapi/node-sdk) 接收消息
 */

import * as Lark from '@larksuiteoapi/node-sdk';
import { createLogger } from '../../core/logger.js';
import type { FeishuMessageEvent } from './types.js';

const logger = createLogger('feishu-client');

/**
 * 飞书 WebSocket 选项
 */
export interface FeishuWsOptions {
  appId: string;
  appSecret: string;
  onMessage: (event: FeishuMessageEvent) => Promise<void>;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 飞书 WebSocket 客户端
 * 
 * 基于飞书官方 SDK 实现消息接收
 */
export class FeishuWsClient {
  private options: FeishuWsOptions;
  private client: Lark.Client;
  private wsClient: Lark.WSClient | null = null;
  private eventDispatcher: any = null;
  private isRunning = false;
  
  constructor(options: FeishuWsOptions) {
    this.options = options;
    
    // 创建飞书客户端
    this.client = new Lark.Client({
      appId: options.appId,
      appSecret: options.appSecret,
      disableTokenCache: false,
    });
  }
  
  /**
   * 获取飞书客户端实例
   */
  getClient(): Lark.Client {
    return this.client;
  }
  
  /**
   * 启动客户端
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    logger.info('飞书客户端启动中...');
    
    // 创建事件分发器
    this.eventDispatcher = new Lark.EventDispatcher({}).register({
      'im.message.receive_v1': async (data: any) => {
        try {
          await this.handleMessageEvent(data);
        } catch (err) {
          logger.error(`处理消息失败: ${err}`);
          this.options.onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      },
    });
    
    // 创建 WebSocket 客户端
    this.wsClient = new Lark.WSClient({
      appId: this.options.appId,
      appSecret: this.options.appSecret,
      loggerLevel: Lark.LoggerLevel.INFO,
    });
    
    // 启动 WebSocket 连接
    try {
      await this.wsClient.start({
        eventDispatcher: this.eventDispatcher,
      });
      
      this.isRunning = true;
      logger.info('飞书 WebSocket 已连接');
      this.options.onConnected?.();
    } catch (err) {
      logger.error(`飞书连接失败: ${err}`);
      this.options.onError?.(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }
  
  /**
   * 停止客户端
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    this.wsClient = null;
    this.eventDispatcher = null;
    
    logger.info('飞书客户端已停止');
    this.options.onDisconnected?.();
  }
  
  /**
   * 处理消息事件
   */
  private async handleMessageEvent(data: any): Promise<void> {
    // SDK 2.0 格式：data 直接包含 message, sender 等
    const message = data.message ?? data.event?.message;
    const sender = data.sender ?? data.event?.sender;
    
    if (!message) {
      logger.warn('收到无效消息事件');
      return;
    }
    
    const chatId = message.chat_id;
    const isGroup = message.chat_type === 'group';
    const msgType = message.message_type;
    const senderId = sender?.sender_id?.open_id || sender?.sender_id?.user_id || 'unknown';
    const mentions = message.mentions || [];
    
    // 解析消息内容
    let content = '';
    try {
      if (msgType === 'text') {
        const parsed = JSON.parse(message.content);
        content = parsed.text || '';
      } else {
        content = `[${msgType}]`;
      }
    } catch {
      content = message.content || '';
    }
    
    // 移除 @ 提及
    for (const mention of mentions) {
      if (mention.key) {
        content = content.replace(mention.key, '').trim();
      }
    }
    
    // 构建消息事件
    const event: FeishuMessageEvent = {
      type: isGroup ? 'group' : 'dm',
      senderId,
      senderName: sender?.sender_id?.user_id,
      chatId,
      content,
      messageId: message.message_id,
      timestamp: parseInt(message.create_time, 10),
      msgType,
      mentioned: mentions.length > 0,
    };
    
    logger.info(`收到消息: [${event.type}] ${event.senderId}: ${content.substring(0, 50)}...`);
    
    await this.options.onMessage(event);
  }
  
  /**
   * 发送文本消息
   */
  async sendText(
    receiveId: string,
    text: string,
    receiveIdType: 'open_id' | 'chat_id' = 'open_id'
  ): Promise<{ messageId: string }> {
    const response = await this.client.im.message.create({
    params: {
        receive_id_type: receiveIdType,
      },
      data: {
        receive_id: receiveId,
        msg_type: 'text',
        content: JSON.stringify({ text }),
      },
    });
    
    if (response.code !== 0) {
      throw new Error(`发送消息失败: ${response.msg}`);
    }
    
    return { messageId: response.data?.message_id || '' };
  }
  
  /**
   * 发送富文本消息
   */
  async sendPost(
    receiveId: string,
    title: string,
    content: Array<Array<{ tag: string; text?: string; href?: string }>>,
    receiveIdType: 'open_id' | 'chat_id' = 'open_id'
  ): Promise<{ messageId: string }> {
    const response = await this.client.im.message.create({
      params: {
        receive_id_type: receiveIdType,
      },
      data: {
        receive_id: receiveId,
        msg_type: 'post',
        content: JSON.stringify({
          zh_cn: { title, content },
        }),
      },
    });
    
    if (response.code !== 0) {
      throw new Error(`发送消息失败: ${response.msg}`);
    }
    
    return { messageId: response.data?.message_id || '' };
  }
  
  /**
   * 回复消息
   */
  async replyText(
    messageId: string,
    text: string
  ): Promise<{ messageId: string }> {
    const response = await this.client.im.message.reply({
      path: {
        message_id: messageId,
      },
      data: {
        msg_type: 'text',
        content: JSON.stringify({ text }),
      },
    });
    
    if (response.code !== 0) {
      throw new Error(`回复消息失败: ${response.msg}`);
    }
    
    return { messageId: response.data?.message_id || '' };
  }
  
  /**
   * 上传图片
   */
  async uploadImage(imageBuffer: Buffer): Promise<string> {
    const response = await this.client.im.image.create({
      data: {
        image_type: 'message',
        image: imageBuffer,
      },
    });
    
    if (response.code !== 0) {
      throw new Error(`上传图片失败: ${response.msg}`);
    }
    
    return response.data?.image_key || '';
  }
  
  /**
   * 发送图片消息
   */
  async sendImage(
    receiveId: string,
    imageKey: string,
    receiveIdType: 'open_id' | 'chat_id' = 'open_id'
  ): Promise<{ messageId: string }> {
    const response = await this.client.im.message.create({
      params: {
        receive_id_type: receiveIdType,
      },
      data: {
        receive_id: receiveId,
        msg_type: 'image',
        content: JSON.stringify({ image_key: imageKey }),
      },
    });
    
    if (response.code !== 0) {
      throw new Error(`发送图片失败: ${response.msg}`);
    }
    
    return { messageId: response.data?.message_id || '' };
  }
}
