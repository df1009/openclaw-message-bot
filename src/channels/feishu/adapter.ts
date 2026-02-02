/**
 * 飞书渠道适配器
 * 
 * 实现飞书开放平台的消息收发功能
 * 
 * 功能特性：
 * - 支持私聊和群聊消息
 * - 支持图片和文件
 * - 支持流式消息（打字效果）
 * - 访问控制（白名单、配对）
 * - 基于官方 SDK (@larksuiteoapi/node-sdk)
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
import type { FeishuConfig } from './types.js';
import { FeishuWsClient } from './client.js';

/**
 * 飞书适配器
 */
export class FeishuAdapter extends BaseAdapter<FeishuConfig> {
  readonly meta: ChannelMeta = {
    id: 'feishu',
    name: '飞书',
    description: '飞书开放平台机器人，支持私聊和群聊',
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
    
    // 初始化 WebSocket 客户端
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
  private async handleMessage(event: {
    type:'group';
    senderId: string;
    senderName?: string;
    chatId: string;
    content: string;
    messageId: string;
    timestamp: number;
    msgType: string;
    mentioned?: boolean;
    attachments?: Array<{ type: string; fileKey: string; localPath?: string }>;
  }): Promise<void> {
    // 访问控制检查
    if (!this.checkAccess(event)) {
      this.logger.debug(`消息被访问控制拦截: ${event.senderId}`);
      return;
    }
    
    // 群聊中检查是否被 @（可配置）
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
      chatId: event.chatId,
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
    
    // 分发消息
    await this.dispatchMessage(message);
  }
  
  /**
   * 检查访问权限
   */
  private checkAccess(event: { type: 'dm' | 'group'; senderId: string; chatId: string }): boolean {
    if (!this.config) return false;
    
    const { dmPolicy, groupPolicy, allowFrom, groupAllowFrom } = this.config;
    
    if (event.type === 'dm') {
      // DM 访问控制
      if (dmPolicy === 'disabled') return false;
      if (dmPolicy === 'open') return true;
      if (dmPolicy === 'allowlist' && allowFrom?.length) {
        return allowFrom.includes(event.senderId);
      }
      // pairing 模式：允许所有人，但需要配对确认
      return true;
    } else {
      // 群聊访问控制
      if (groupPolicy === 'disabled') return false;
      if (groupPolicy === 'open') return true;
      if (groupPolicy === 'allowlist' && groupAllowFrom?.length) {
        return groupAllowFrom.includes(event.chatId);
      }
      return true;
    }
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
      // 解析目标类型
      // 格式: open_id 或 chat:chat_id
      const isChat = target.startsWith('oc_') || target.startsWith('chat:');
      const receiveIdType = isChat ? 'chat_id' : 'open_id';
      const receiveId = target.replace('chat:', '');
      
      let messageId: string | undefined;
      
      // 发送文本
      if (content.text) {
        // 如果有 replyTo，使用回复
        if (options?.replyTo) {
          const result = await this.client.replyText(options.replyTo, content.text);
          messageId = result.messageId;
        } else {
          const result = await this.client.sendText(receiveId, content.text, receiveIdType);
          messageId = result.messageId;
        }
      }
      
      // 发送图片
      if (content.images?.length) {
        for (const imagePath of content.images) {
          // 如果是本地路径，需要先上传
          if (imagePath.startsWith('/') || imagePath.startsWith('.')) {
            const fs = await import('node:fs');
            const buffer = fs.readFileSync(imagePa       const imageKey = await this.client.uploadImage(buffer);
            await this.client.sendImage(receiveId, imageKey, receiveIdType);
          } else {
            // 假设是 image_key
            await this.client.sendImage(receiveId, imagePath, receiveIdType);
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
          typ'boolean',
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
        dmPolicy: {
          type: 'string',
          description: 'DM 策略: open(开放), pairing(配对), allowlist(白名单), disabled(禁用)',
          default: 'pairing',
        },
        groupPolicy: {
          type: 'string',
          description: : open(开放), allowlist(白名单), disabled(禁用)',
          default: 'open',
        },
        allowFrom: {
          type: 'array',
          description: '允许的用户 Open ID 列表',
        },
        groupAllowFrom: {
          type: 'array',
          description: '允许的群聊 ID 列表',
        },
        requireMention: {
          type: 'boolean',
          description: '群聊中是否需要 @ 才响应',
          default: true,
        },
        streaming: {
          type: 'boolean',
          description: '是否启用流式消息（打字效果）',
          default: true,
        },
      },
      required: ['appId', 'appSecret'],
    };
  }
  
  /** 验证配置
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
    
    // 验证策略值
    const validDmPolicies = ['open', 'pairing', 'allowlist', 'disabled'];
    if (cfg.dmPolicy && !validDmPolicies.includes(cfg.dmPolicy as string)) {
      errors.push(`dmPolicy 必须是: ${validDmPolicies.join(', ')}`);
    }
    
    const validGroupPolicies = ['open', 'allowlist', 'disabled'];
    if (cfg.groupPolicy && !validGroupPolicies.includes(cfg.groupPolicy as string)) {
      errors.push(`groupPolicy 必须是: ${validGroupPolicies.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * 获取 WebSocket 客户端（供外部调用）
   */
  getClient(): FeishuWsClient | null {
    return this.client;
  }
}
