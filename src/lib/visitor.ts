import { createHash } from "node:crypto";

/** 把访客随机 ID 变成一个稳定、不可反推的短标签 */
export function visitorLabel(id: string): string {
  const hash = createHash("sha256").update(id).digest("hex").slice(0, 4).toUpperCase();
  return `访客 ${hash}`;
}

export function visitorBadge(id: string): string {
  return visitorLabel(id).replace("访客 ", "").slice(0, 1);
}
