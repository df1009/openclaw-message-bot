/**
 * 日志工具
 * 
 * 提供统一的日志接口，支持不同级别和模块标识
 */

import type { Logger } from './types.js';

/** 日志级别 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/*
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** 日志颜色（ANSI） */
const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',  // 青色
  info: '\x1b[32m',   // 绿色
  warn: '\x1b[33m',   // 黄色
  error: '\x1b[31m',  // 红色
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

/** 当前日志级别 */
let currentLevel: LogLevel = 'info';

/**
 * 设置全局日志级别
 * @param level 日志级别
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * 获取当前日志级别
 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

/**
 * 格式化时间戳
 */
function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * 格式化日志消息
 */
function formatMessage(
  level: LogLevel,
  module: string,
  message: string,
  args: unknown[]
): string {
  const timestamp = formatTimestamp();
  const color = LOG_COLORS[level];
  const levelStr = level.toUpperCase().padEnd(5);
  
  let formattedMessage = message;
  if (args.length > 0) {
    formattedMessage += ' ' + args.map(arg => {
      if g === 'object') {
        return JSON.stringi
      }
      return String(arg);
    }).join(' ');
  }
  
  return `${DIM}${timestamp}${RESET} ${color}${levelStr}${RESET} [${module}] ${formattedMessage}`;
}

/**
 * 输出日志
 */
function log(level: LogLevel, module: string, message: string, args: unknown[]): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) {
    return;
  }
  
  const formatted = formatMessage(level, module, message, args);
  
  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

/**
 * 创建模块日志器
 * 
 * @param module 模块名称
 * @returns Logger 实例
 * 
 * @example
 ript
 * const logger = createLogger('qq-adapter');
 * logger.info('适配器已启动');
 * logger.error('连接失败', error);
 * ```
 */
export function createLogger(module: string): Logger {
  return {
    debug(message: string, ...args: unknown[]) {
      log('debug', module, message, args);
    },
    info(message: string, ...args: unknown[]) {
      log('info', module, message, args);
    },
    warn(message: string, ...args: unknown[]) {
      log('warn', module, message, args);
    },
    error(message: string, ...args: unknown[]) {
      log('error', module, message, args);
    },
  };
}

/**
 * 默认日志器
 */
export const logger = createLogger('message-bot');
