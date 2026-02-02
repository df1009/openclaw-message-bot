/**
 * QQ Bot API 封装
 * 
 * 封装 QQ 开放平台的 HTTP API
 */

const API_BASE = 'https://api.sgroup.qq.com';
const TOKEN_URL = 'https://bots.qq.com/app/getAppAccessToken';

/**
 * Token 缓存
 */
interface TokenCache {
  token: string;
  expiresAt: number;
}

/**
 * QQ API 客户端
 */
export class QQApi {
  private appId: string;
  private clientSecret: string;
  private tokenCache: TokenCache | null = null;
  
  constructor(appId: string, clientSecret: string) {
    this.appId = appId;
    this.clientSecret = clientSecret;
  }
  
  /**
   * 获取 Access Token（带缓存）
   */
  async getAccessToken(): Promise<string> {
    // 检查缓存，提前 5 分钟刷新
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 5 * 60 * 1000) {
      return this.tokenCache.token;
    }
    
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: this.appId,
        clientSecret: this.clientSecret,
      }),
    });
    
    const data = await response.json() as { access_token?: string; expires_in?: number };
    
    if (!data.access_token) {
      throw new Error(`获取 Token 失败: ${JSON.stringify(data)}`);
    }
    
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000,
    };
    
    return this.tokenCache.token;
  }
  
  /**
   * 清除 Token 缓存
   */
  clearTokenCache(): void {
    this.tokenCache = null;
  }
  
  /**
   * 发送 API 请求
   */
  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Authorization': `QQBot ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json() as T;
    
    if (!response.ok) {
      const error = data as { message?: string; code?: number };
      throw new Error(`API 错误 [${path}]: ${error.message ?? JSON.stringify(data)}`);
    }
    
    return data;
  }
  
  /**
   * 获取 WebSocket Gateway URL
   */
  async getGatewayUrl(): Promise<string> {
    const data = await this.request<{ url: string }>('GET', '/gateway');
    return data.url;
  }
  
  /**
   * 发送消息
   * 
   * @param type 消息类型
   * @param target 目标 ID
   * @param content 消息内容
   * @param msgId 回复的消息 ID
   */
  async sendMessage(
    type: 'user' | 'group' | 'channel',
    target: string,
    content: string,
    msgId?: string
  ): Promise<{ id: string }> {
    let path: string;
    const body: Record<string, unknown> = {
      content,
      msg_type: 0,
    };
    
    if (msgId) {
      body.msg_id = msgId;
    }
    
    switch (type) {
      case 'user':
        path = `/v2/users/${target}/messages`;
        break;
      case 'group':
        path = `/v2/groups/${target}/messages`;
        break;
      case 'channel':
        path = `/channels/${target}/messages`;
        break;
      default:
        throw new Error(`不支持的消息类型: ${type}`);
    }
    
    return this.request('POST', path, body);
  }
  
  /**
   * 发送图片消息
   * 
   * @param type 消息类型
   * @param target 目标 ID
   * @param imageUrl 图片 URL
   * @param msgId 回复的消息 ID
   */
  async sendImage(
    type: 'user' | 'group',
    target: string,
    imageUrl: string,
    msgId?: string
  ): Promise<{ id: string }> {
    // 先上传图片
    const uploadPath = type === 'user'
      ? `/v2/users/${target}/files`
      : `/v2/groups/${target}/files`;
    
    const uploadResult = await this.request<{ file_info: string }>(
      'POST',
      uploadPath,
      {
        file_type: 1, // 图片
        url: imageUrl,
        srv_send_msg: false,
      }
    );
    
    // 再发送富媒体消息
    const sendPath = type === 'user'
      ? `/v2/users/${target}/messages`
      : `/v2/groups/${target}/messages`;
    
    const body: Record<string, unknown> = {
      msg_type: 7, // 富媒体
      media: { file_info: uploadResult.file_info },
    };
    
    if (msgId) {
      body.msg_id = msgId;
    }
    
    return this.request('POST', sendPath, body);
  }
}
