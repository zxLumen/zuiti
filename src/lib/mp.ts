import { createHash } from "node:crypto";
import { prisma } from "./db";
import { randomToken } from "./tokens";

const MP_SESSION_DAYS = 30;

/** 给匿名访客一个稳定、不可反推的短标识 */
export function shortOpenId(openid: string): string {
  return createHash("sha256").update(openid).digest("hex").slice(0, 4).toUpperCase();
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/** 小程序主人会话(独立于 Web 的 cookie session) */
export async function createMpOwnerSession(userId: string): Promise<string> {
  const token = randomToken(32);
  await prisma.session.create({
    data: {
      token,
      userId,
      channel: "mp",
      expiresAt: new Date(Date.now() + MP_SESSION_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function getMpOwner(req: Request) {
  const token = bearerToken(req);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.channel !== "mp") return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

/** 小程序访客身份:wx.login → openid → 一条稳定的 token */
export async function getMpVisitor(req: Request) {
  const token = bearerToken(req);
  if (!token) return null;

  const user = await prisma.mpUser.findUnique({ where: { token } });
  if (!user) return null;

  void prisma.mpUser
    .update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {});

  return user;
}

/**
 * 用 wx.login 的 code 换 openid。
 * 没有配置 AppSecret 时,由调用方决定是否走开发模式。
 */
export async function exchangeWxCode(code: string): Promise<string> {
  const appid = process.env.WX_MP_APPID;
  const secret = process.env.WX_MP_SECRET;
  if (!appid || !secret) {
    throw new Error("服务端未配置 WX_MP_APPID / WX_MP_SECRET");
  }

  const url =
    "https://api.weixin.qq.com/sns/jscode2session" +
    `?appid=${encodeURIComponent(appid)}` +
    `&secret=${encodeURIComponent(secret)}` +
    `&js_code=${encodeURIComponent(code)}` +
    "&grant_type=authorization_code";

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const data = (await res.json()) as {
    openid?: string;
    errcode?: number;
    errmsg?: string;
  };

  if (data.errcode || !data.openid) {
    throw new Error(`微信登录失败: ${data.errmsg || data.errcode || "unknown"}`);
  }

  return data.openid;
}

export async function upsertMpUser(openid: string) {
  return prisma.mpUser.upsert({
    where: { openid },
    update: { lastSeenAt: new Date() },
    create: { openid, token: randomToken(24) },
  });
}
