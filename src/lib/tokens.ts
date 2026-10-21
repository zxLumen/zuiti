import { randomBytes } from "node:crypto";

/** URL 安全的随机串 */
export function randomToken(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}

/** 6 位数字验证码 */
export function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
