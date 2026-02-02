/**
 * 配置管理器
 * 
 * 负责加载、保存和验证配置文件
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { BotConfig, BaseChannelConfig } from './types.js';
import { createLogger } from './logger.js';

const logger = createLogger('config-manager');

/** 默认配置目录 */
const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.openclaw-message-bot');

/** 配置文件名 */
const CONFIG_FILE = 'config.json';

/** 默认配置 */
const DEFAULT_CONFIG: BotConfig = {
  version: '1.0.0',
  channels: {},
  settings: {
    logLevel: 'info',
    uiPort: 8080,
    dataDir: DEFAULT_CONFIG_DIR,
  },
};

/**
 * 配置管理器类
 */
export class ConfigManager {
  private config: BotConfig;
  private configPath: string;
  
  constructor(configDir?: string) {
    const dir = configDir || DEFAULT_CONFIG_DIR;
    this.configPath = path.join(dir, CONFIG_FILE);
    this.config = { ...DEFAULT_CONFIG };
  }
  
  /**
   * 获取配置目录
     getConfigDir(): string {
    return path.dirname(this.configPath);
  }
  
  /**
   * 确保配置目录存在
   */
  private ensureConfigDir(): void {
    const dir = this.getConfigDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`创建配置目录: ${dir}`);
    }
  }
  
  /**
   * 加载配置
   * 
   * @returns 配置对象
   */
  async load(): Promise<BotConfig> {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        const loaded = JSON.parse(content) as Partial<BotConfig>;
        
  认配置
        this.config = {
          ...DEFAULT_CONFIG,
          ...loaded,
          settings: {
            ...DEFAULT_CONFIG.settings,
            ...loaded.settings,
          },
        };
        
        logger.info(`配置已加载: ${this.configPath}`);
      } else {
        logger.info('使用默认配置');
        this.config = { ...DEFAULT_CONFIG };
      }
    } catch (err) {
      logger.error(`加载配置失败: ${err}`);
      this.config = { ...DEFAULT_CONFIG };
    }
    
    return this.config;
  }
  
  /**
   * 保存配置
   * 
   * @param config 配置对象（可选，不传则保存当前配置）
   */
  ync save(config?: BotConfig): Promis> {
    if (config) {
      this.config = config;
    }
    
    this.ensureConfigDir();
    
    try {
      // 备份旧配置
      if (fs.existsSync(this.configPath)) {
        const backupPath = this.configPath + '.bak';
        fs.copyFileSync(this.configPath, backupPath);
      }
      
      // 写入新配置
      const content = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(this.configPath, content, 'utf-8');
      
      logger.info(`配置已保存: ${this.configPath}`);
    } catch (err) {
      logger.error(`保存配置失败: ${err}`);
      throw err;
    }
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): BotConfig {
return this.config;
  }
  
  /**
   * 获取渠道配置
   * 
   * @param channelId 渠道 ID
   */
  getChannelConfig<T extends BaseChannelConfig>(channelId: string): T | undefined {
    return this.config.channels[channelId] as T | undefined;
  }
  
  /**
   * 设置渠道配置
   * 
   * @param channelId 渠道 ID
   * @param config 渠道配置
   */
  async setChannelConfig<T extends BaseChannelConfig>(
    channelId: string,
    config: T
  ): Promise<void> {
    this.config.channels[channelId] = config;
    await this.save();
    logger.info(`渠道配置已更新: ${channelId}`);
  }
  
  /**
   * 删除渠道配置
   *am channelId 渠道 ID
   */
  async removeChannelConfig(channelId: string): Promise<void> {
    if (this.config.channels[channelId]) {
      delete this.config.channels[channelId];
      await this.save();
      logger.info(`渠道配置已删除: ${channelId}`);
    }
  }
  
  /**
   * 获取所有已配置的渠道 ID
   */
  getChannelIds(): string[] {
    return Object.keys(this.config.channels);
  }
  
  /**
   * 检查渠道是否已配置
   * 
   * @param channelId 渠道 ID
   */
  hasChannel(channelId: string): boolean {
    return channelId in this.config.channels;
  }
  
  /**
   * 更新全局设置
   * 
   * @param settings 设置对象
   */
  async updateSettings(settings: Partial<BotConfig['settings']>): Promise<void> {
    this.config.settings = {
      ...this.config.settings,
      ...settings,
    };
    await this.save();
    logger.info('全局设置已更新');
  }
}

/** 全局配置管理器实例 */
let globalConfigManager: ConfigManager | null = null;

/**
 * 获取全局配置管理器
 */
export function getConfigManager(): ConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager();
  }
  return globalConfigManager;
}

/**
 * 初始化配置管理器
 * 
 * @param configDir 配置目录（可选）
 */
export function initConfigManager(configDir?: string): ConfigManager {
  globalConfigManager = new ConfigManager(configDir);
  return globalConfigManager;
}
