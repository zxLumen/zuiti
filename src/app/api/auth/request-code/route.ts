import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isEmail } from "@/lib/api";
import { emailConfigured, sendLoginCode } from "@/lib/email";
import { randomCode } from "@/lib/tokens";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求格式不正确" }, { status: 400 });
  }

  const email = (body as { email?: unknown })?.email;
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: "请输入有效的邮箱地址" }, { status: 400 });
  }

  // 简单限流:同一邮箱 10 分钟内最多 5 次
  const recent = await prisma.loginCode.count({
    where: {
      email,
      createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });
  if (recent >= 5) {
    return NextResponse.json(
      { ok: false, error: "验证码发送太频繁,请稍后再试" },
      { status: 429 },
    );
  }

  const code = randomCode();
  await prisma.loginCode.create({
    data: {
      email,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const sent = await sendLoginCode(email, code);
  const devMode =
    !emailConfigured() &&
    (process.env.AUTH_DEV_MODE === "true" || process.env.NODE_ENV !== "production");

  return NextResponse.json({
    ok: true,
    sent,
    devCode: devMode ? code : undefined,
  });
}
