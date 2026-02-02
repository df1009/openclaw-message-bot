/**
 * OpenClaw Message Bot
 * 
 * 统一的多渠道消息机器人平台
 * 支持 QQ、飞书、微信、企业微信等
 */

// 导出核心模块
export * from './core/index.js';

// 导出渠道适配器
export * from './channels/base/index.js';
export * from './channels/qq/index.js';
export * from './channels/feishu/index.js';
export * from './channels/wecom/index.js';
export * from './channels/wechat/index.js';

// 导出 Web UI
export * from './ui/index.js';

// 版本信息
export const VERSION = '1.0.0';
