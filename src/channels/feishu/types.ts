/**
 * 飞书适配器类型定义
 */

import type { BaseChannelConfig } from '../../core/types.js';

/**
 * 飞书配置
 */
export interface FeishuConfig extends BaseChannelConfig {
  /** 飞书应用 App ID */
  appId: string;
  /** 飞书应用 App Secret */
  appSecret?: string;
  /** App Secret 文件路径 */
  appSecretFile?: string;
  /** DM 策略: open-开放, pairing-配对, allowlist-白名单, disabled-禁用 */
  dmPolicy?: 'open' | 'pairing' | 'allowlist' | 'disabled';
  /** 群聊策略 */
  groupPolicy?: 'open' | 'allowlist' | 'disabled';
  /** 允许的用户列表 */
  allowFrom?: string[];
  /** 群聊允许列表 */
  groupAllowFrom?: string[];
  /** 是否启用流式消息（打字效果） */
  streaming?: boolean;
  /** 文本分块限制 */
  textChunkLimit?: number;
}

/**
 * 飞书消息事件
 */
export interface FeishuMessageEvent {
  /** 消息类型 */
  type: 'dm' | 'group';
  /** 发送者 Open ID */
  senderId: string;
  /** 发送者名称 */
  senderName?: string;
  /** 会话 ID */
  chatId: string;
  /** 消息内容 */
  content: string;
  /** 消息 ID */
  messageId: string;
  /** 时间戳 */
  timestamp: number;
  /** 消息类型 */
  msgType: string;
  /** 是否被 @ */
  mentioned?: boolean;
  /** 附件 */
  attachments?: FeishuAttachment[];
}

/**
 * 飞书附件
 */
export interface FeishuAttachment {
  /** 文件类型 */
  type: 'image' | 'file' | 'audio' | 'video';
  /** 文件 Key */
  fileKey: string;
  /** 文件名 */
  fileName?: string;
  /** 本地路径（下载后） */
  localPath?: string;
}

/**
 * 飞书 API 响应
 */
export interface FeishuApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}
