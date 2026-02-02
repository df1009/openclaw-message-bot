#!/usr/bin/env node
/**
 * CLI 入口
 * 
 * 提供命令行管理工具
 */

import { Command } from 'commander';
import { registerChannelsCommand } from './commands/channels.js';
import { registerConfigCommand } from './commands/config.js';
import { registerStatusCommand } from './commands/status.js';
import { registerUiCommand } from './commands/ui.js';

const program = new Command();

program
  .name('message-bot')
  .description('统一的多渠道消息机器人管理工具')
  .version('1.0.0');

// 注册子命令
registerChannelsCommand(program);
registerConfigCommand(program);
registerStatusCommand(program);
registerUiCommand(program);

// 解析命令行参数
program.parse();
