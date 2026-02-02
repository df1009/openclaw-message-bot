/**
 * 配置命令
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import { getConfigManager } from '../../core/config-manager.js';

/**
 * 注册配置命令
 */
export function registerConfigCommand(program: Command): void {
  const config = program
    .command('config')
    .description('管理配置');
  
  // 显示配置
  config
    .command('show')
    .description('显示当前配置')
    .option('--json', '输出 JSON 格式')
    .action(async (options) => {
      const configManager = getConfigManager();
      const cfg = await configManager.load();
      
      if (options.json) {
        console.log(JSON.stringify(cfg, null, 2));
        return;
      }
      
      console.log(chalk.bold('\n当前配置:\n'));
      console.log(chalk.cyan('版本:'), cfg.version);
      console.log(chalk.cyan('日志级别:'), cfg.settings.logLevel);
      console.log(chalk.cyan('UI 端口:'), cfg.settings.uiPort);
      console.log(chalk.cyan('数据目录:'), cfg.settings.dataDir);
      console.log(chalk.cyan('渠道数量:'), Object.keys(cfg.channels).length);
      console.log();
    });
  
  // 显示配置路径
  config
    .command('path')
    .description('显示配置文件路径')
    .action(() => {
      const configManager = getConfigManager();
      console.log(configManager.getConfigDir());
    });
  
  // 重置配置
  config
    .command('reset')
    .description('重置为默认配置')
    .option('--force', '跳过确认')
    .action(async (options) => {
      if (!options.force) {
        const inquirer = await import('inquirer');
        const { confirm } = await inquirer.default.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: '确定要重置配置吗? 这将删除所有渠道配置!',
            default: false,
          },
        ]);
        
        if (!confirm) {
          console.log(chalk.yellow('已取消'));
          return;
        }
      }
      
      const configManager = getConfigManager();
      await configManager.save({
        version: '1.0.0',
        channels: {},
        settings: {
          logLevel: 'info',
          uiPort: 8080,
          dataDir: configManager.getConfigDir(),
        },
      });
      
      console.log(chalk.green('✓ 配置已重置'));
    });
}
