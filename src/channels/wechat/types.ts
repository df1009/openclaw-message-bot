/**
 * 微信适配器类型定义（预留）
 */

import type { BaseChannelConfig } from '../../core/types.js';

/**
 * 微信配置
 * 
 * 注意：微信个人号接入需要使用第三方方案
 * 如 wechaty、itchat 等
 */
export interface WechatConfig extends BaseChannelConfig {
  /** 接入方案: wechaty, itchat, web */
  provider?: 'wechaty' | 'itchat' | 'web';
  /** Wechaty Puppet 类型 */
  puppet?: string;
  /** Puppet Token */
  puppetToken?: string;
  /** 是否自动接受好友请求 */
  autoAcceptFriend?: boolean;
  /** 允许的用户列表 */
  allowFrom?: string[];
  /** 允许的群列表 */
  groupAllowFrom?: string[];
}

/**
 * 微信消息事件
 */
export interface WechatMessageEvent {
  type: 'dm' | 'group';
  senderId: string;
  senderName?: string;
  chatId: string;
  content: string;
  messageId: string;
  timestamp: number;
  msgType: 'text' | 'image' | 'voice' | 'video' | 'file';
}
