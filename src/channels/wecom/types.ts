/**
 * 企业微信适配器类型定义
 */

import type { BaseChannelConfig } from '../../core/types.js';

/**
 * 企业微信配置
 */
export interface WecomConfig extends BaseChannelConfig {
  /** 企业 ID */
  corpId: string;
  /** 应用 ID */
  agentId: string;
  /** 应用 Secret */
  secret?: string;
  /** Secret 文件路径 */
  secretFile?: string;
  /** 回调 Token */
  callbackToken?: string;
  /** 回调 EncodingAESKey */
  callbackAesKey?: string;
  /** 允许的用户列表 */
  allowFrom?: string[];
  /** 允许的部门列表 */
  allowDepartments?: string[];
}

/**
 * 企业微信消息事件
 */
export interface WecomMessageEvent {
  type: 'dm' | 'group';
  senderId: string;
  senderName?: string;
  chatId: string;
  content: string;
  messageId: string;
  timestamp: number;
  msgType: 'text' | 'image' | 'voice' | 'video' | 'file' | 'link' | 'miniprogram';
}

/**
 * 企业微信 API 响应
 */
export interface WecomApiResponse<T = unknown> {
  errcode: number;
  errmsg: string;
  data?: T;
}
