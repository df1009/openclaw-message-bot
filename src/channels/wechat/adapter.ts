/**
 * 微信适配器（预留）
 * 
 * 微信个人号接入方案说明：
 * 
 * 1. Wechaty (推荐)
 *    - 支持多种 Puppet：web、pad、windows
 *    - 需要付费 Token
 *    - 文档：wechaty.js.org
 * 
 * 2. itchat (Python)
 *    - 基于网页版微信
 *    - 可能被封号风险
 * 
 * 3. 企业微信 API
 *    - 官方支持，稳定
 *    - 见 wecom 适配器
 * 
 * 由于微信官方限制，此适配器暂未实现
 * 建议使用企业微信或其他官方支持的渠道
 */

import type {
  ChannelMeta,
  MessageContent,
  SendOptions,
  SendResult,
  ConfigSchema,
  ConfigValidation,
} from '../../core/types.js';
import { BaseAdapter } from '../base/adapter.js';
import type { WechatConfig } from './types.js';

/**
 * 微信适配器（预留）
 */
export class WechatAdapter extends BaseAdapter<WechatConfig> {
  readonly meta: ChannelMeta = {
    id: 'wechat',
    name: '微信',
    description: '微信个人号机器人（开发中）',
    version: '0.1.0',
    icon: '💬',
  };
  
  protected async doStart(): Promise<void> {
    throw new Error('微信适配器尚未实现，请使用企业微信或其他渠道');
  }
  
  protected async doStop(): Promise<void> {
    // 预留
  }
  
  protected async doSendMessage(
    target: string,
    content: MessageContent,
    options?: SendOptions
  ): Promise<SendResult> {
    return { success: false, error: '微信适配器尚未实现' };
  }
  
  getConfigSchema(): ConfigSchema {
    return {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: '是否启用',
          default: false,
        },
        provider: {
          type: 'string',
          description: '接入方案: wechaty, itchat, web',
        },
        puppetToken: {
          type: 'string',
          description: 'Wechaty Puppet Token',
          sensitive: true,
        },
      },
      required: [],
    };
  }
  
  validateConfig(config: unknown): ConfigValidation {
    return { valid: true, errors: [] };
  }
}
