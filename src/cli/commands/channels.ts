/**
 * 渠道管理命令
 * 
 * 提供渠道的添加、删除、列表等功能
 */

import type { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { getConfigManager } from '../../core/config-manager.js';

/**
 * 注册渠道命令
 */
export function registerChannelsCommand(program: Command): void {
  const channels = program
    .command('channels')
    .description('管理消息渠道');
  
  // 列出渠道
  channels
    .command('list')
    .description('列出已配置的渠道')
    .action(async () => {
      const configManager = getConfigManager();
      await configManager.load();
      
      const channelIds = configManager.getChannelIds();
      
      if (channelIds.length === 0) {
        console.log(chalk.yellow('暂无已配置的渠道'));
        console.log(chalk.dim('使用 message-bot channels add 添加渠道'));
        return;
      }
      
      console.log(chalk.bold('\n已配置的渠道:\n'));
      
      for (const id of channelIds) {
        const config = configManager.getChannelConfig(id);
        const enabled = config?.enabled !== false;
        const status = enabled 
          ? chalk.green('✓ 已启用') 
          : chalk.red('✗ 已禁用');
        
        console.log(`  ${chalk.cyan(id)} ${status}`);
        if (config?.name) {
          console.log(`    名称: ${config.name}`);
        }
      }
      
      console.log();
    });
  
  // 添加渠道
  channels
    .command('add [channel]')
    .description('添加或更新渠道配置')
    .option('--token <token>', 'Token (格式: AppID:AppSecret)')
    .option('--app-id <id>', 'App ID')
    .option('--app-secret <secret>', 'App Secret')
    .action(async (channelArg, options) => {
      const configManager = getConfigManager();
      await configManager.load();
      
      let channelId = channelArg;
      
      // 如果没有指定渠道，交互式选择
      if (!channelId) {
        const { channel } = await inquirer.prompt([
          {
            type: 'list',
            name: 'channel',
            message: '选择要添加的渠道:',
            choices: [
              { name: '🐧 QQ Bot', value: 'qq' },
              { name: '📱 飞书', value: 'feishu' },
              { name: '💬 微信 (开发中)', value: 'wechat', disabled: true },
              { name: '🏢 企业微信 (开发中)', value: 'wecom', disabled: true },
            ],
          },
        ]);
        channelId = channel;
      }
      
      // 根据渠道类型收集配置
      let config: Record<string, unknown> = { enabled: true };
      
      if (channelId === 'qq') {
        config = await collectQQConfig(options);
      } else if (channelId === 'feishu') {
        config = await collectFeishuConfig(options);
      }
      
      // 保存配置
      await configManager.setChannelConfig(channelId, config);
      
      console.log(chalk.green(`\n✓ 渠道 ${channelId} 配置已保存`));
      console.log(chalk.dim('使用 message-bot start 启动服务'));
    });
  
  // 删除渠道
  channels
    .command('remove <channel>')
    .description('删除渠道配置')
    .option('--force', '跳过确认')
    .action(async (channelId, options) => {
      const configManager = getConfigManager();
      await configManager.load();
      
      if (!configManager.hasChannel(channelId)) {
        console.log(chalk.red(`渠道 ${channelId} 不存在`));
        return;
      }
      
      if (!options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `确定要删除渠道 ${channelId} 吗?`,
            default: false,
          },
        ]);
        
        if (!confirm) {
          console.log(chalk.yellow('已取消'));
          return;
        }
      }
      
      await configManager.removeChannelConfig(channelId);
      console.log(chalk.green(`✓ 渠道 ${channelId} 已删除`));
    });
  
  // 启用/禁用渠道
  channels
    .command('enable <channel>')
    .description('启用渠道')
    .action(async (channelId) => {
      const configManager = getConfigManager();
      await configManager.load();
      
      const config = configManager.getChannelConfig(channelId);
      if (!config) {
        console.log(chalk.red(`渠道 ${channelId} 不存在`));
        return;
      }
      
      await configManager.setChannelConfig(channelId, { ...config, enabled: true });
      console.log(chalk.green(`✓ 渠道 ${channelId} 已启用`));
    });
  
  channels
    .command('disable <channel>')
    .descripti用渠道')
    .action(async (channelId) => {
      const configManager = getConfigManager();
      await configManager.load();
      
      const config = configManager.getChannelConfig(channelId);
      if (!config) {
        console.log(chalk.red(`渠道 ${channelId} 不存在`));
        return;
      }
      
      await configManager.setChannelConfig(channelId, { ...config, enabled: false });
      console.log(chalk.green(`✓ 渠道 ${channelId} 已禁用`));
    });
}

/**
 * 收集 QQ 配置
 */
async function collectQQConfig(options: Record<string, unknown>): Promise<Record<string, un{
  let appId = options.appId as string | undefined;
  let clientSecret = options.appSecret as string | undefined;
  
  // 解析 token 格式
  if (options.token) {
    const parts = (options.token as string).split(':');
    if (parts.length === 2) {
      appId = parts[0];
      clientSecret = parts[1];
    }
  }
  
  // 交互式输入
  if (!appId || !clientSecret) {
    console.log(chalk.cyan('\n配置 QQ Bot:\n'));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'appId',
        message: 'App ID:',
        when: !appId,
        validate: (input) => input.length > 0 || '请输入 App ID',
      },
      {
        type: 'password',
        name: 'clientSecret',
        message: 'App Secret:',
        when: !clientSecret,
        validate: (input) => input.length > 0 || '请输入 App Secret',
      },
      {
        type: 'input',
        name: 'imageServerBaseUrl',
        message: '图床服务器地址 (可选，用于发送图片):',
      },
    ]);
    
    appId = appId || answers.appId;
    clientSecret = clientSecret || answers.clientSecret;
    
    return {
      enabled: true,
      appId,
      clientSecret,
      imageServerBaseUrl: answers.imageServerBaseUrl || undefined,
    };
  }
  
  return {
    enabled: true,
    appId,
    clientSecret,
  };
}

/**
 * 收集飞书配置
 */
async function collectFeishuConfig(options: Record<string, unknown>): Promise<Record<string, unknown>> {
  let appId = options.appId as string | undefined;
  let appSecret = options.appSecret as string | undefined;
  
  if (!appId || !appSecret) {
    console.log(chalk.cyan('\n配置飞书:\n'));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'appId',
        message: 'App ID:',
        when: !appId,
        validate: (input) => input.length > 0 || '请输入 App ID',
      },
      {
        type: 'password',
        name: 'appSecret',
        message: 'App Secret:',
        when: !appSecret,
        validate: (input) => input.length > 0 || '请输入 App Secret',
      },
    ]);
    
    appId = appId || answers.appId;
    appSecret = appSecret || answers.appSecret;
  }
  
  return {
    enabled: true,
    appId,
    appSecret,
  };
}
