/**
 * QQ Bot 类型定义
 */

import type { BaseChannelConfig } from '../../core/types.js';

/**
 * QQ Bot 配置
 */
export interface QQConfig extends BaseChannelConfig {
  /** QQ 机器人 AppID */
  appId: string;
  /** QQ 机器人 AppSecret */
  clientSecret?: string;
  /** AppSecret 文件路径 */
  clientSecretFile?: string;
  /** 图床服务器公网地址 */
  imageServerBaseUrl?: string;
  /** 系统提示词 */
  systemPrompt?: string;
}

/**
 * QQ 消息事件
 */
export interface QQMessageEvent {
  type: 'c2c' | 'group' | 'guild' | 'dm';
  senderId: string;
  senderName?: string;
  chatId: string;
  content: string;
  messageId: string;
  timestamp: number;
  attachments?: QQAttachment[];
}

/**
 * QQ 附件
 */
export interface QQAttachment {
  contentType: string;
  url: string;
  filename?: string;
  size?: number;
}

/**
 * QQ API 响应
 */
export interface QQApiResponse<T = unknown> {
  code?: number;
  message?: string;
  data?: T;
}

/**
 * QQ 网关选项
 */
export interface QQGatewayOptions {
  appId: string;
  clientSecret: string;
  imageServerBaseUrl?: string;
  onMessage: (event: QQMessageEvent) => Promise<void>;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  logger?: {
    debug?: (msg: string) => void;
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
}
