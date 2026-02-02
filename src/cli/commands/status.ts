/**
 * 状态命令
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import { getConfigManager } from '../../core/config-manager.js';
import { getChannelManager } from '../../core/channel-manager.js';

/**
 * 注册状态命令
 */
export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('显示服务状态')
    .option('--json', '输出 JSON 格式')
    .action(async (options) => {
      const configManager = getConfigManager();
      await configManager.load();
      
      const channelManager = getChannelManager();
      const status = channelManager.getStatus();
      
      if (options.json) {
        console.log(JSON.stringify({
          running: channelManager.isRunning(),
          channels: status,
        }, null, 2));
        return;
      }
      
      console.log(chalk.bold('\n服务状态:\n'));
      
      const running = channelManager.isRunning();
      console.log(
        chalk.cyan('运行状态:'),
        running ? chalk.green('运行中') : chalk.yellow('已停止')
      );
      
      const channelIds = configManager.getChannelIds();
      console.log(chalk.cyan('已配置渠道:'), channelIds.length);
      
      if (channelIds.length > 0) {
        console.log(chalk.bold('\n渠道详情:\n'));
        
        for (const id of channelIds) {
          const config = configManager.getChannelConfig(id);
          const channelStatus = status[id];
          
          const enabled = config?.enabled !== false;
          const connected = channelStatus?.connected ?? false;
          
          let statusIcon: string;
          let statusText: string;
          
          if (!enabled) {
            statusIcon = '○';
            statusText = chalk.dim('已禁用');
          } else if (connected) {
            statusIcon = chalk.green('●');
            statusText = chalk.green('已连接');
          } else if (running) {
            statusIcon = chalk.yellow('●');
            statusText = chalk.yellow('连接中');
          } else {
            statusIcon = chalk.dim('○');
            statusText = chalk.dim('未启动');
          }
          
          console.log(`  ${statusIcon} ${chalk.cyan(id)} ${statusText}`);
          
          if (channelStatus?.lastError) {
            console.log(`    ${chalk.red('错误:')} ${channelStatus.lastError}`);
          }
          
          if (channelStatus?.messageCount) {
            const { inbound, outbound } = channelStatus.messageCount;
            console.log(`    ${chalk.dim(`消息: ↓${inbound} ↑${outbound}`)}`);
          }
        }
      }
      
      console.log();
    });
  
  // 启动服务
  program
    .command('start')
    .description('启动所有渠道')
    .action(async () => {
      console.log(chalk.cyan('正在启动服务...\n'));
      
      const configManager = getConfigManager();
      await configManager.load();
      
      const channelManager = getChannelManager();
      
      // 注册适配器
      const { QQAdapter } = await import('../channels/qq/adapter.js');
      channelManager.registerAdapter(new QQAdapter());
      
      // TODO: 注册其他适配器
      // const { FeishuAdapter } = await import('../channels/feishu/adapter.js');
      // channelManager.registerAdapter(new FeishuAdapter());
      
      // 启动所有渠道
      await channelManager.startAll();
      
      console.log(chalk.green('\n✓ 服务已启动'));
      console.log(chalk.dim('按 Ctrl+C 停止服务'));
      
      // 保持进程运行
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n正在停止服务...'));
        await channelManager.stopAll();
        process.exit(0);
      });
    });
  
  // 停止服务
  program
    .command('stop')
    .description('停止所有渠道')
    .action(async () => {
      const channelManager = getChannelManager();
      await channelManager.stopAll();
      console.log(chalk.green();
    });
}
