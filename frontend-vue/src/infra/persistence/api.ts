/**
 * 存档读写的网络 IO —— 全仓唯一与 /api/user/data 对话的地方。
 * 只做传输，不懂数据含义（schema 在 schema.ts，装配在 stores/persistence.ts）。
 */
import type { SavePayloadV2 } from './schema';

export interface FetchSaveResult {
  isNewUser: boolean;
  /** isNewUser=false 时为原始存档（可能是任意历史版本，交给 migrate）。 */
  raw: unknown;
}

export async function fetchUserSave(username: string): Promise<FetchSaveResult> {
  const response = await fetch(`/api/user/data?username=${username}`);
  if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
  const data = await response.json();
  if (data.isNewUser) return { isNewUser: true, raw: null };
  return { isNewUser: false, raw: data };
}

export async function pushUserSave(username: string, payload: SavePayloadV2): Promise<void> {
  const response = await fetch('/api/user/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, payload }),
  });
  if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
}
