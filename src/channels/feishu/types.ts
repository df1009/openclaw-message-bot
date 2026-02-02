/**
 * 飞书适配器类型定义
 * 
 * 简化配置，和 QQ Bot 保持一致的风格
 */

import type { BaseChannelConfig } from '../../core/types.js';

/**
 * 飞书配置
 * 
 * 最小配置示例：
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
export interface FeishuConfig extends BaseChannelConfig {
  /** 飞书应用 App ID (必填) */
  appId: string;
  /** 飞书应用 App Secret (必填) */
  appSecret?: string;
  /** App Secret 文件路径 (与 appSecret 二选一) */
  appSecretFile?: string;
  /** 系统提示词 (可选) */
  systemPrompt?: string;
  /** 群聊中是否需要 @ 才响应，默认 true */
  requireMention?: boolean;
}

/**
 * 飞书消息事件
 */
export interface FeishuMessageEvent {
  type: 'dm' | 'group';
  senderId: string;
  senderName?: string;
  chatId: string;
  content: string;
  messageId: string;
  timestamp: number;
  msgType: string;
  mentioned?: boolean;
  attachments?: FeishuAttachment[];
}

/**
 * 飞书附件
 */
export interface FeishuAttachment {
  type: 'image' | 'file' | 'audio' | 'video';
  fileKey: string;
  fileName?: string;
  localPath?: string;
}
