/**
 * 飞书 WebSocket 客户端
 * 
 * 使用飞书 SDK 的 WebSocket 方式接收消息
 */

import { createLogger } from '../../core/logger.js';
import type { FeishuMessageEvent } from './types.js';
import { FeishuApi } from './api.js';

const logger = createLogger('feishu-ws');

/** 飞书 WebSocket 地址 */
const WS_URL = 'wss://open.feishu.cn/open-apis/ws/v1/connect';

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
 * 注意：飞书官方推荐使用 @larksuiteoapi/node-sdk
 * 这里提供一个简化的实现作为备选
 */
export class FeishuWsClient {
  private options: FeishuWsOptions;
  private api: FeishuApi;
  private isRunning = false;
  private reconnectAttempts = 0;
  
  constructor(options: FeishuWsOptions) {
    this.options = options;
    this.api = new FeishuApi(options.appId, options.appSecret);
  }
  
  /**
   * 启动客户端
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    logger.info('飞书客户端启动中...');
    
    // 飞书推荐使用官方 SDK，这里只是占位
    // 实际使用时应该用 @larksuiteoapi/node-sdk
    logger.info('请使用飞书官方 SDK (@larksuiteoapi/node-sdk) 进行消息接收');
    
    this.options.onConnected?.();
  }
  
  /**
   * 停止客户端
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info('飞书客户端已停止');
    this.options.onDisconnected?.();
  }
  
  /**
   * 处理收到的消息事件
   * 
   * 这个方法供外部调用（如 HTTP webhook 或 SDK 回调）
   */
  async handleMessageEvent(data: {
    message: {
      message_id: string;
      chat_id: string;
      chat_type: string;
      content: string;
      message_type: string;
      create_time: string;
      mentions?: Array<{ key: string; id: { open_id: string }; name: string }>;
    };
    sender: {
      sender_id: { open_id: string; user_id?: string };
      sender_type: string;
    };
  }): Promise<void> {
    const { message, sender } = data;
    
    // 解析消息内容
    let content = '';
    try {
      const parsed = JSON.parse(message.content);
      content = parsed.text || '';
    } catch {
      content = message.content;
    }
    
    // 移除 @ 提及
    const mentions = message.mentions || [];
    for (const mention of mentions) {
      if (mention.key) {
        content = content.replace(mention.key, '').trim();
      }
    }
    
    const event: FeishuMessageEvent = {
      type: message.chat_type === 'p2p' ? 'dm' : 'group',
      senderId: sender.sender_id.open_id,
      chatId: message.chat_id,
      content,
      messageId: message.message_id,
      timestamp: parseInt(message.create_time, 10),
      msgType: message.message_type,
      mentioned: mentions.length > 0,
    };
    
    await this.options.onMessage(event);
  }
}
