/**
 * 存档读写的网络 IO —— 全仓唯一与 /api/user/data、/api/auth/login 对话的地方。
 * 只做传输，不懂数据含义（schema 在 schema.ts，装配在 stores/persistence.ts）。
 *
 * S10-T1：鉴权 token 只在这一层挂。登录成功时 setAuthToken，登出时 clearAuthToken。
 *   token 存在内存（模块级），刷新即清——与现有「刷新重登」行为一致（本轮不做持久登录）。
 */
import type { SavePayloadV2 } from './schema';

export interface FetchSaveResult {
  isNewUser: boolean;
  /** isNewUser=false 时为原始存档（可能是任意历史版本，交给 migrate）。 */
  raw: unknown;
}

export interface LoginResult {
  token: string;
  username: string;
}

// --- 模块级 token holder（内存态，刷新即清） ---
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function clearAuthToken(): void {
  authToken = null;
}

function authHeaders(): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

/** 登录/首次注册（claim-on-first-login）。失败时抛错（含状态码语义供上层区分）。 */
export async function loginRequest(username: string, password: string): Promise<LoginResult> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    let message = `登录失败（${response.status}）`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // 忽略非 JSON 错误体
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  return (await response.json()) as LoginResult;
}

export async function fetchUserSave(username: string): Promise<FetchSaveResult> {
  const response = await fetch(`/api/user/data?username=${username}`, {
    headers: { ...authHeaders() },
  });
  if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
  const data = await response.json();
  if (data.isNewUser) return { isNewUser: true, raw: null };
  return { isNewUser: false, raw: data };
}

export interface PushSaveResult {
  /** 后端落盘后给出的权威新版本号。 */
  saveVersion: number;
}

/**
 * 保存到服务器。返回后端给出的权威新版本号（供调用方更新基线）。
 * 后端做乐观并发：payload.saveVersion ≠ 服务端当前值 → 409（抛错）。
 */
export async function pushUserSave(username: string, payload: SavePayloadV2): Promise<PushSaveResult> {
  const response = await fetch('/api/user/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ username, payload }),
  });
  if (!response.ok) {
    const err = new Error(`Server error: ${response.statusText}`) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  const body = await response.json().catch(() => ({}));
  return { saveVersion: typeof body?.saveVersion === 'number' ? body.saveVersion : 0 };
}
