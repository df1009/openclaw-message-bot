/**
 * Web UI 服务器
 * 
 * 提供可视化的控制界面
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '../../core/logger.js';
import { getConfigManager } from '../../core/config-manager.js';
import { getChannelManager } from '../../core/channel-manager.js';

const logger = createLogger('web-ui');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Web UI 服务器
 */
export class WebServer {
  private server: http.Server | null = null;
  private port: number;
  
  constructor(port: number = 8080) {
    this.port = port;
  }
  
  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    if (this.server) {
      return;
    }
    
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });
    
    return new Promise((resolve, reject) => {
      this.server!.listen(this.port, () => {
        logger.info(`Web UI 已启动: http://localhost:${this.port}`);
        resolve();
      });
      
      this.server!.on('error', reject);
    });
  }
  
  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }
    
    return new Promise((resolve) => {
      this.server!.close(() => {
        this.server = null;
        logger.info('Web UI 已停止');
        resolve();
      });
    });
  }
  
  /**
   * 处理请求
   */
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const url = new URL(req.url || '/', `http://localhost:${this.port}`);
    const pathname = url.pathname;
    
    // CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    try {
      // API 路由
      if (pathname.startsWith('/api/')) {
        await this.handleApi(req, res, pathname);
        return;
      }
      
      // 静态文件
      await this.handleStatic(req, res, pathname);
    } catch (err) {
      logger.error(`请求处理错误: ${err}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    }
  }
  
  /**
   * 处理 API 请求
   */
  private async handleApi(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    pathname: string
  ): Promise<void> {
    res.setHeader('Content-Type', 'application/json');
    
    // GET /api/status - 获取状态
    if (pathname === '/api/status' && req.method === 'GET') {
      const channelManager = getChannelManager();
      const status = channelManager.getStatus();
      
      res.writeHead(200);
      res.end(JSON.stringify({
        running: channelManager.isRunning(),
        channels: status,
        timestamp: Date.now(),
      }));
      return;
    }
    
    // GET /api/channels - 获取渠道列表
    if (pathname === '/api/channels' && req.method === 'GET') {
      const configManager = getConfigManager();
      await configManager.load();
      
      const channels = configManager.getChannelIds().map(id => {
        const config = configManager.getChannelConfig(id);
        return {
          id,
          enabled: config?.enabled !== false,
          name: config?.name || id,
        };
      });
      
      res.writeHead(200);
      res.end(JSON.stringify({ channels }));
      return;
    }
    
    // GET /api/config - 获取配置
    if (pathname === '/api/config' && req.method === 'GET') {
      const configManager = getConfigManager();
      const config = await configManager.load();
      
      // 隐藏敏感信息
      const safeConfig = {
        ...config,
        channels: Object.fromEntries(
          Object.entries(config.channels).map(([id, cfg]) => [
            id,
            {
              ...cfg,
              clientSecret: cfg.clientSecret ? '***' : undefined,
              appSecret: (cfg as any).appSecret ? '***' : undefined,
            },
          ])
        ),
      };
      
      res.writeHead(200);
      res.end(JSON.stringify(safeConfig));
      return;
    }
    
    // POST /api/channels/:id/enable - 启用渠道
    const enableMatch = pathname.match(/^\/api\/channels\/([^/]+)\/enable$/);
    if (enableMatch && req.method === 'POST') {
      const channelId = enableMatch[1];
      const configManager = getConfigManager();
      await configManager.load();
      
      const config = configManager.getChannelConfig(channelId);
      if (!config) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: '渠道不存在' }));
        return;
      }
      
      await configManager.setChannelConfig(channelId, { ...config, enabled: true });
      
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
      return;
    }
    
    // POST /api/channels/:id/disable - 禁用渠道
    const disableMatch = pathname.match(/^\/api\/channels\/([^/]+)\/disable$/);
    if (disableMatch && req.method === 'POST') {
      const channelId = disaatch[1];
      const configManager = getConfigManager();
      await configManager.load();
      
      const config = configManager.getChannelConfig(channelId);
      if (!config) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: '渠道不存在' }));
        return;
      }
      
      await configManager.setChannelConfig(channelId, { ...config, enabled: false });
      
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
      return;
    }
    
    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
  
  /**
   *  */
  private async handleStatic(
    reqttp.IncomingMessage,
    res: http.ServerResponse,
    pathname: string
  ): Promise<void> {
    // 默认返回 index.html
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(this.getIndexHtml());
      return;
    }
    
    // CSS
    if (pathname === '/style.css') {
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      res.end(this.getStyleCss());
      return;
    }
    
    // JS
    if (pathname === '/app.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(this.getAppJs());
      return;
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
  
  /**
   * 获取 HTML 内容
   */
  private getIndexHtml(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenClaw Message Bot</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>🤖 OpenClaw Message Bot</h1>
      <p class="subtitle">统一的多渠道消息机器人平台</p>
    </header>
    
    <main>
      <section class="status-card">
        <h2>📊 服务状态</h2>
        <div id="status-content">
          <p class="loading">加载中...</p>
        </div>
      </section>
      
      <section class="channels-card">
        <h2>📱 渠道管理</h2>
        <div id="channels-content">
          <p class="loading">加载中...</p>
        </div>
      </section>
      
      <section class="logs-card">
        <h2>📝 最近日志</h2>
        <div id="logs-content">
          <p class="empty">暂无日志</p>
        </div>
      </section>
    </main>
    
    <footer>
      <p>OpenClaw Message Bot v1.0.0</p>
    </footer>
  </div>
  
  <script src="/app.js"></script>
</body>
</html>`;
  }
  
  /**
   * 获取 CSS 内容
   */
  private getStyleCss(): string {
    return `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  padding: 40px 20px;
  color: white;
}

header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

header .subtitle {
  opacity: 0.9;
  font-size: 1.1rem;
}

main {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

section h2 {
  font-size: 1.3rem;
  margin-bottom: 16px;
  color: #444;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}

.loading {
  color: #888;
  font-style: italic;
}

.empty {
  color: #aaa;
  text-align: center;
  padding: 20px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  font-weight: 500;
}

.status-value {
  font-family: monospace;
}

.status-running {
  color: #22c55e;
  font-weight: bold;
}

.status-stopped {
  color: #ef4444;
}

.channel-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.2s;
}

.channel-item:hover {
  background: #f0f1f2;
}

.channel-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
nel-icon {
  font-size: 1.5rem;
}

.channel-name {
  font-weight: 600;
}

.channel-id {
  font-size: 0.85rem;
  color: #666;
}

.channel-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-dot.connected {
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

.status-dot.disconnected {
  background: #f59e0b;
}

.status-dot.disabled {
  background: #9ca3af;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-enable {
  background: #22c55e;
  color: white;
}

.btn-enable:hover {
  background: #16a34a;
}

.btn-disable {
  background: #ef4444;
  color: white;
}

.btn-disable:hover {
  background: #dc2626;
}

.logs-content {
  max-height: 300px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.85rem;
}

.log-item {
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.log-time {
  color: #888;
  margin-right: 8px;
}

.log-info { color: #3b82f6; }
.log-warn { color: #f59e0b; }
.log-error { color: #ef4444; }

footer {
  text-align: center;
  padding: 30px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  header h1 {
    font-size: 1.8rem;
  }
  
  main {
    grid-template-columns: 1fr;
  }
}`;
  }
  
  /**
   * 获取 JS 内容
   */
  private getAppJs(): string {
    return `// OpenClaw Message Bot Web UI

const CHANNEL_ICONS = {
  qq: '🐧',
  feishu: '📱',
  wechat: '💬',
  wecom: '🏢',
};

// 获取状态
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    renderStatus(data);
  } catch (err) {
    console.error('获取状态失败:', err);
  }
}

// 获取渠道列表
async function fetchChannels() {
  try {
    const res = await fetch('/api/channels');
    const data = await res.json();
    const statusRes = await fetch('/api/status');
    const statusData = await statusRes.json();
    renderChannels(data.channels, statusData.channels);
  } catch (err) {
    console.error('获取渠道失败:', err);
  }
}

// 渲染状态
function renderStatus(data) {
  const container = document.getElementById('status-content');
  const running = data.running;
  const channelCount = Object.keys(data.channels).length;
  const connectedCount = Object.values(data.channels).filter(c => c.connected).length;
  
  container.innerHTML = \`
    <div class="status-item">
      <span class="status-label">运行状态</span>
      <span class="status-value \${running ? 'status-running' : 'status-stopped'}">
        \${running ? '● 运行中' : '○ 已停止'}
      </span>
    </div>
    <div class="status-item">
      <span class="status-label">已配置渠道</span>
      <span class="status-value">\${channelCount} 个</span>
    </div>
  ass="status-item">
      <span class="status-label">已连接渠道</span>
      <span class="status-value">\${connectedCount} / \${channelCount}</span>
    </div>
    <div class="status-item">
      <span class="status-label">更新时间</span>
      <span class="status-value">\${new Date(data.timestamp).toLocaleTimeString()}</span>
    </div>
  \`;
}

// 渲染渠道列表
function renderChannels(channels, statusMap) {
  const container = document.getElementById('channels-content');
  
  if (channels.length === 0) {
    container.innerHTML = '<p class="empty">暂无p>';
    return;
  }
  
  container.innerHTML = channels.map(channel => {
    const status = statusMap[channel.id] || {};
    const icon = CHANNEL_ICONS[channel.id] || '📦';
    
    let statusClass = 'disabled';
    let statusText = '已禁用';
    
    if (channel.enabled) {
      if (status.connected) {
        statusClass = 'connected';
        statusText = '已连接';
      } else {
        statusClass = 'disconnected';
        statusText = '未连接';
      }
    }
    
    const btnClass = channel.enabled ? 'btn-disable' : 'btn-enable';
    const btnText = channel.enabled ? '禁用' : '启用';
    const btnAction = channel.enabled ? 'disable' : 'enable';
    
    return      <div class="channel-item">
        <div class="channel-info">
          <span class="channel-icon">\${icon}</span>
          <div>
            <div class="channel-name">\${channel.name}</div>
            <div class="channel-id">\${channel.id}</div>
          </div>
        </div>
        <div class="channel-status">
          <span class="status-dot \${statusClass}"></span>
          <span>\${statusText}</span>
          <button class="btn \${btnClass}" onclick="toggleChannel('\${channel.id}', '\${btnAction}')">
            \${btnText}
          </button>
        </div>
      </div>
  .join('');
}

// 切换渠道状态
async function toggleChannel(channelId, action) {
  try {
    await fetch(\`/api/channels/\${channelId}/\${action}\`, { method: 'POST' });
    fetchChannels();
  } catch (err) {
    console.error('操作失败:', err);
    alert('操作失败: ' + err.message);
  }
}

// 初始化
function init() {
  fetchStatus();
  fetchChannels();
  
  // 定时刷新
  setInterval(fetchStatus, 5000);
  setInterval(fetchChannels, 10000);
}

init();`;
  }
}

/**
 * 启动 Web UI
 */
export async function startWebUI(port?: number): Promise<WebServer> {
  const configManager = getConfigManager();
  await configManager.load()onst config = configManager.getConfig();
  const server = new WebServer(port || config.settings.uiPort);
  await server.start();
  
  return server;
}
