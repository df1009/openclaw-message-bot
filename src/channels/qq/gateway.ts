/**
 * QQ Bot WebSocket 网关
 * 
 * 管理与 QQ 服务器的 WebSocket 连接
 * 支持自动重连、心跳、消息处理
 */

import WebSocket from 'ws';
import type { QQGatewayOptions, QQMessageEvent } from './types.js';
import { QQApi } from './api.js';

/** 重连延迟（毫秒） */
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

/** QQ Bot Intents */
const INTENTS = {
  PUBLIC_GUILD_MESSAGES: 1 << 30,
  DIRECT_MESSAGE: 1 << 12,
  GROUP_AND_C2C: 1 << 25,
};

/**
 * QQ WebSocket 网关
 */
export class QQGateway {
  private options: QQGatewayOptions;
  private api: QQApi;
  private ws: WebSocket | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private sessionId: string | null = null;
  private lastSeq: number | null = null;
  private isRunning = false;
  
  constructor(options: QQGatewayOptions) {
    this.options = options;
    this.api = new QQApi(options.appId, options.clientSecret);
  }
  
  /**
   * 启动网关
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    await this.connect();
  }
  
  /**
   * 停止网关
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    this.cleanup();
  }
  
  /**
   * 连接到 WebSocket
   */
  private async connect(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    try {
      const gatewayUrl = await this.api.getGatewayUrl();
      this.log('info', `连接到 ${gatewayUrl}`);
      
      this.ws = new WebSocket(gatewayUrl);
      this.setupEventHandlers();
    } catch (err) {
      this.log('error', `连接失败: ${err}`);
      this.scheduleReconnect();
    }
  }
  
  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;
    
    this.ws.on('open', () => {
      this.log('info', 'WebSocket 已连接');
      this.reconnectAttempts = 0;
    });
    
    this.ws.on('message', async (data) => {
      await this.handleMessage(data.toString());
    });
    
    this.ws.on('close', (code, reason) => {
      this.log('info', `WebSocket 已关闭: ${code} ${reason}`);
      this.options.onDisconnected?.();
      
      if (this.isRunning) {
        this.scheduleReconnect();
      }
    });
    
    this.ws.on('error', (err) => {
      this.log('error', `WebSocket 错误: ${err.message}`);
      this.options.onError?.(err);
    });
  }
  
  /**
   * 处理 WebSocket 消息
   */
  private async handleMessage(data: string): Promise<void> {
    try {
      const payload = JSON.parse(data) as {
        op: number;
        d?: unknown;
        s?: number;
        t?: string;
      };
      
      const { op, d, s, t } = payload;
      
      if (s) {
        this.lastSeq = s;
      }
      
      switch (op) {
        case 10: // Hello
          await this.handleHello(d as { heartbeat_interval: number });
          break;
          
        case 0: // Dispatch
          await this.handleDispatch(t!, d);
          break;
          
        case 11: // Heartbeat ACK
          this.log('debug', '心跳 ACK');
          break;
          
        case 7: // Reconnect
          this.log('info', '服务器请求重连');
          this.cleanup();
          this.scheduleReconnect();
          break;
          
        case 9: // Invalid Session
          this.log('warn', '会话无效');
          this.sessionId = null;
          this.lastSeq = null;
          this.cleanup();
          this.scheduleReconnect();
          break;
      }
    } catch (err) {
      this.log('error', `消息解析错误: ${err}`);
    }
  }
  
  /**
   * 处理 Hello 消息
   */
  private async handleHello(data: { heartbeat_interval: number }): Promise<void> {
    // 发送 Identify
    const intents = INTENTS.PUBLIC_GUILD_MESSAGES | INTENTS.GROUP_AND_C2C;
    
    this.send({
      op: 2,
      d: {
        token: `QQBot ${await this.api.getAccessToken()}`,
        intents,
        shard: [0, 1],
      },
    });
    
    // 启动心跳
    this.startHeartbeat(data.heartbeat_interval);
  }
  
  /**
   * 处理 Dispatch 事件
   */
  private async handleDispatch(type: string, data: unknown): Promise<void> {
    switch (type) {
      case 'READY':
        const ready = data as { session_id: string };
        this.sessionId = ready.session_id;
        this.log('info', `会话就绪: ${this.sessionId}`);
        this.options.onConnected?.();
        break;
        
      case 'C2SSAGE_CREATE':
        await this.handleC2CMessage(data);
        break;
        
      case 'GROUP_AT_MESSAGE_CREATE':
        await this.handleGroupMessage(data);
        break;
        
      case 'AT_MESSAGE_CREATE':
        await this.handleGuildMessage(data);
        break;
        
      case 'DIRECT_MESSAGE_CREATE':
        await this.handleDMMessage(data);
        break;
    }
  }
  
  /**
   * 处理 C2C 私聊消息
   */
  private async handleC2CMessage(data: unknown): Promise<void> {
    const event = data as {
      author: { user_openid: string };
      content: string;
      id: string;
      timestamp: string;
      attachments?: Array<{ content_type: string; url: string }>;
    };
    
    const message: QQMessageEvent = {
      type: 'c2c',
      senderId: event.author.user_openid,
      chatId: `user:${event.author.user_openid}`,
      content: event.content,
      messageId: event.id,
      timestamp: new Date(event.timestamp).getTime(),
      attachments: event.attachments?.map(a => ({
        contentType: a.content_type,
        url: a.url,
      })),
    };
    
    await this.options.onMessage(message);
  }
  
  /**
   * 处理群聊消息
   */
  private async handleGroupMessage(data: unknown): Promise<void> {
    const event = data as {
      author: { member_openid: string };
      content: string;
      id: string;
      timestamp: string;
      group_openid: string;
      attachments?: Array<{ content_type: string; url: string }>;
    };
    
    const message: QQMessageEvent = {
      type: 'group',
      senderId: event.author.member_openid,
      chatId: `group:${event.group_openid}`,
      content: event.content,
      messageId: event.id,
      timestamp: new Date(event.timestamp).getTime(),
      attachments: event.atta?.map(a => ({
        contentType: a.content_type,
        url: a.url,
      })),
    };
    
    await this.options.onMessage(message);
  }
  
  /**
   * 处理频道消息
   */
  private async handleGuildMessage(data: unknown): Promise<void> {
    const event = data as {
      author: { id: string; username?: string };
      content: string;
      id: string;
      timestamp: string;
      channel_id: string;
      attachments?: Array<{ content_type: string; url: string }>;
    };
    
    const message: QQMessageEvent = {
      type: 'guild',
      senderId: event.author.id,
      senderName: event.author.username,
      chatId: `channel:${event.channel_id}`,
      content: event.content,
      messageId: event.id,
      timestamp: new Date(event.timestamp).getTime(),
      attachments: event.attachments?.map(a => ({
        contentType: a.content_type,
        url: a.url,
      })),
    };
    
    await this.options.onMessage(message);
  }
  
  /**
   * 处理频道私信
   */
  private async handleDMMessage(data: unknown): Promise<void> {
    const event = data as {
      author: { id: string; username?: string };
      content: string;
      id: string;
      tim: string;
      guild_id: string;
    ments?: Array<{ content_type: string; url: string }>;
    };
    
    const message: QQMessageEvent = {
      type: 'dm',
      senderId: event.author.id,
      senderName: event.author.username,
      chatId: `dm:${event.author.id}`,
      content: event.content,
      messageId: event.id,
      timestamp: new Date(event.timestamp).getTime(),
      attachments: event.attachments?.map(a => ({
        contentType: a.content_type,
        url: a.url,
      })),
    };
    
    await this.options.onMessage(message);
  }
  
  /**
   * 启动心跳
   */
  private startHeartbeat(interval: number): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ op: 1, d: this.lastSeq });
      }
    }, interval);
  }
  
  /**
   * 发送消息
   */
  private send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  /**
   * 清理资源
   */
  private cleanup(): void {
    iftbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (!this.isRunning) {
      return;
    }
    
    const delay = RECONNECT_DELAYS[
      Math.min(this.reconnectAttempts, RECONNECT_DELAYS.length - 1)
    ];
    
    this.reconnectAttempts++;
    this.log('info', `${delay}ms 后重连 (第 ${this.reconnectAttempts} 次)`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  /**
   * 日志输出
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const logger = this.options.logger;
    if (logger) {
      if (level === 'debug' && logger.debug) {
        logger.debug(message);
      } else if (level === 'info') {
        logger.info(message);
      } else if (level === 'warn') {
        logger.warn(message);
      } else if (level === 'error') {
        logger.error(message);
      }
    }
  }
}
