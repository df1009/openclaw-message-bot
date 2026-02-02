/**
 * 企业微信 API 客户端
 */

import { createLogger } from '../../core/logger.js';

const logger = createLogger('wecom-api');

/** API 基础地址 */
const API_BASE = 'https://qyapi.weixin.qq.com/cgi-bin';

/**
 * Token 缓存
 */
interface TokenCache {
  token: string;
  expiresAt: number;
}

/**
 * 企业微信 API 客户端
 */
export class WecomApi {
  private corpId: string;
  private secret: string;
  private tokenCache: TokenCache | null = null;
  
  constructor(corpId: string, secret: string) {
    this.corpId = corpId;
    this.secret = secret;
  }
  
  /**
   * 获取 Access Token
   */
  async getAccessToken(): Promise<string> {
    // 检查缓存
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 5 * 60 * 1000) {
      return this.tokenCache.token;
    }
    
    const url = `${API_BASE}/gettoken?corpid=${this.corpId}&corpsecret=${this.secret}`;
    const response = await fetch(url);
    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      access_token?: string;
      expires_in?: number;
    };
    
    if (data.errcode !== 0 || !data.access_token) {
      throw new Error(`获取企业微信 Token 失败: ${data.errmsg}`);
    }
    
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000,
    };
    
    logger.info('企业微信 Token 已刷新');
    return this.tokenCache.token;
  }
  
  /**
   * 发送应用消息
   */
  async sendMessage(params: {
    touser?: string;
    toparty?: string;
    totag?: string;
    msgtype: 'text' | 'image' | 'voice' | 'video' | 'file' | 'textcard' | 'news' | 'markdown';
    agentid: number;
    text?: { content: string };
    image?: { media_id: string };
    markdown?: { content: string };
  }): Promise<{ msgid: string }> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${API_BASE}/message/send?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      msgid?: string;
    };
    
    if (data.errcode !== 0) {
      throw new Error(`发送消息失败: ${data.errmsg}`);
    }
    
    return { msgid: data.msgid || '' };
  }
  
  /**
   * 发送文本消息
   */
  async sendText(
    agentId: number,
    content: string,
    touser?: string,
    toparty?: string
  ): Promise<{ msgid: string }> {
    return this.sendMessage({
      touser,
      toparty,
      msgtype: 'text',
      agentid: agentId,
      text: { content },
    });
  }
  
  /**
   * 发送 Markdown 消息
   */
  async sendMarkdown(
    agentId: number,
    content: string,
    touser?: string,
    toparty?: string
  ): Promise<{ msgid: string }> {
    return this.sendMessage({
      touser,
      toparty,
      msgtype: 'markdown',
      agentid: agentId,
      markdown: { content },
    });
  }
  
  /**
   * 上传临时素材
   */
  async uploadMedia(
    type: 'image' | 'voice' | 'video' | 'file',
    buffer: Buffer,
    filename: string
  ): Promise<string> {
    const token = await this.getAccessToken();
    
    const formData = new FormData();
    formData.append('media', new Blob([buffer]), filename);
    
    const response = await fetch(
      `${API_BASE}/media/upload?access_token=${token}&type=${type}`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      media_id?: string;
    };
    
    if (data.errcode !== 0 || !data.media_id) {
      throw new Error(`上传素材失败: ${data.errmsg}`);
    }
    
    return data.media_id;
  }
  
  /**
   * 获取用户信息
   */
  async getUserInfo(userId: string): Promise<{
    userid: string;
    name: string;
    department: number[];
    mobile?: string;
    email?: string;
    avatar?: string;
  }> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `${API_BASE}/user/get?access_token=${token}&userid=${userId}`
    );
    
    const data = await response.json() as {
      errcode: number;
      errmsg: string;
      userid?: string;
      name?: string;
      department?: number[];
    };
    
    if (data.errcode !== 0) {
      throw new Error(`获取用户信息失败: ${data.errmsg}`);
    }
    
    return data as any;
  }
}
