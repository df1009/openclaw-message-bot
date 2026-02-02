/**
 * Web UI 命令
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import { startWebUI } from '../../ui/server.js';
import { getConfigManager } from '../../core/config-manager.js';
import { getChannelManager } from '../../core/channel-manager.js';

/**
 * 注册 UI 命令
 */
export function registerUiCommand(program: Command): void {
  program
    .command('ui')
    .description('启动 Web 控制界面')
    .option('-p, --port <port>', '端口号', '8080')
    .option('--no-open', '不自动打开浏览器')
    .action(async (options) => {
      const port = parseInt(options.port, 10);
      
      console.log(chalk.cyan('正在启动 Web UI...\n'));
      
      // 加载配置
      const configManager = getConfigManager();
      await configManager.load();
      
      // 注册适配器
      const channelManager = getChannelManager();
      
      try {
        const { QQAdapter } = await import('../../channels/qq/adapter.js');
        channelManager.registerAdapter(new QQAdapter());
      } catch (err) {
        // 忽略
      }
      
      try {
        const { FeishuAdapter } = await import('../../channels/feishu/adapter.js');
        channelManager.registerAdapter(new FeishuAdapter());
      } catch (err) {
        // 忽略
      }
      
      // 启动 Web UI
      const server = await startWebUI(port);
      
      console.log(chalk.green(`\n✓ Web UI 已启动`));
      console.log(chalk.cyan(`  地址: http://localhost:${port}`));
      console.log(chalk.dim('\n按 Ctrl+C 停止服务'));
      
      // 保持进程运行
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n正在停止...'));
        await server.stop();
        process.exit(0);
      });
    });
}
