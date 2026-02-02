/**
 * 飞书 API 客户端
 * 
 * 封装飞书开放平台 API
 */

import { createLogger } from '../../core/logger.js';

const logger = createLogger('feishu-api');

/** API 基础地址 */
const API_BASE = 'https://open.feishu.cn/open-apis';

/**
 * Token 缓存
 */
interface TokenCache {
  token: string;
  expiresAt: number;
}

/**
 * 飞书 API 客户端
 */
export class FeishuApi {
  private appId: string;
  private appSecret: string;
  private tokenCache: TokenCache | null = null;
  
  constructor(appId: string, appSecret: string) {
    this.appId = appId;
    this.appSecret = appSecret;
  }
  
  /**
   * 获取 Tenant Access Token
   */
  async getAccessToken(): Promise<string> {
    // 检查缓存，提前 5 分钟刷新
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 5 * 60 * 1000) {
      return this.tokenCache.token;
    }
    
    const response = await fetch(`${API_BASE}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: this.appId,
        app_secret: this.appSecret,
      }),
    });
    
    const data = await response.json() as {
      code: number;
      msg: string;
      tenant_access_token?: string;
      expire?: number;
    };
    
    if (data.code !== 0 || !data.tenant_access_token) {
      throw new Error(`获取飞书 Token 失败: ${data.msg}`);
    }
    
    this.tokenCache = {
      token: data.tenant_access_token,
      expiresAt: Date.now() + (data.expire ?? 7200) * 1000,
    };
    
    logger.info('飞书 Token 已刷新');
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
    body?: unknown,
    options?: { query?: Record<string, string> }
  ): Promise<T> {
    const token = await this.getAccessToken();
    
    let url = `${API_BASE}${path}`;
    if (options?.query) {
      const params = new URLSearchParams(options.query);
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json() as { code: number; msg: string; data?: T };
    
    if (data.code !== 0) {
      throw new Error(`飞书 API 错误 [${path}]: ${data.msg} (code: ${data.code})`);
    }
    
    return data.data as T;
  }
  
  /**
   * 发送文本消息
   * 
   * @param receiveId 接收者 ID
   * @param text 文本内容
   * @param receiveIdType ID 类型: open_id, user_id, union_id, email, chat_id
   */
  async sendText(
    receiveId: string,
    text: string,
    receiveIdType: 'open_id' | 'chat_id' = 'open_id'
  ): Promise<{ message_id: string }> {
    return this.request('POST', '/im/v1/messages', {
      receive_id: receiveId,
      msg_type: 'text',
      content: JSON.stringify({ text }),
    }, {
      query: { receive_id_type: receiveIdType },
    });
  }
  
  /**
   * 发送富文本消息
   */
  async sendPost(
    receiveId: string,
    content: {
      zh_cn?: { title?: string; content: unknown[][] };
      en_us?: { title?: string; content: unknown[][] };
    },
    receiveIdType: 'open_id' | 'chat_id' = 'open_id'
  ): Promise<{ message_id: string }> {
    return this.req'POST', '/im/v1/messages', {
      receive_id: receiveId,
      msg_type: 'post',
      content: JSON.stringify({ post: content }),
    }, {
      query: { receive_id_type: receiveIdType },
    });
  }
  
  /**
   * 发送图片消息
   */
  async sendImage(
    receiveId: string,
    imageKey: string,
    receiveIdType: 'open_id' | 'chat_id' = 'open_id'
  ): Promise<{ message_id: string }> {
    return this.request('POST', '/im/v1/messages', {
      receive_id: receiveId,
      msg_type: 'image',
      content: JSON.stringify({ image_key: imageKey }),
    }, {
      query: { receive_id_type: rIdType },
    });
  }
  
  /**
   * 上传图片
   */
  async uploadImage(imageBuffer: Buffer, fileName: string): Promise<string> {
    const token = await this.getAccessToken();
    
    const formData = new FormData();
    formData.append('image_type', 'message');
    formData.append('image', new Blob([imageBuffer]), fileName);
    
    const response = await fetch(`${API_BASE}/im/v1/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    const data = await response.json() as {
      code: number;
      msg: string;
      data?: { image_key: string };
    };
    
    if (data.code !== 0 || !data.data?.image_key) {
      throw new Error(`上传图片失败: ${data.msg}`);
    }
    
    return data.data.image_key;
  }
  
  /**
   * 下载文件
   */
  async downloadFile(messageId: string, fileKey: string): Promise<Buffer> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `${API_BASE}/im/v1/messages/${messageId}/resources/${fileKey}?type=file`,
      {
        headers: {
          'Authorization': `Boken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`下载文件失败: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  
  /**
   * 回复消息
   */
  async replyMessage(
    messageId: string,
    text: string
  ): Promise<{ message_id: string }> {
    return this.request('POST', `/im/v1/messages/${messageId}/reply`, {
      msg_type: 'text',
      content: JSON.stringify({ text }),
    });
  }
  
  /**
   * 获取用户信息
   */
  async getUserInfo(userId: string, userIdType: 'open_id' | 'user_id' = 'open_id'): Promise<{
    user_id?: string;
    open_id?: string;
    name?: string;
    avatar_url?: string;
  }> {
    return this.request('GET', `/contact/v3/users/${userId}`, undefined, {
      query: { user_id_type: userIdType },
    });
  }
}
