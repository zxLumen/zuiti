import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isEmail } from "@/lib/api";
import { createSession } from "@/lib/auth";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求格式不正确" }, { status: 400 });
  }

  const { email, code } = (body ?? {}) as { email?: unknown; code?: unknown };
  if (!isEmail(email) || typeof code !== "string") {
    return NextResponse.json({ ok: false, error: "参数不正确" }, { status: 400 });
  }

  const record = await prisma.loginCode.findFirst({
    where: { email, used: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.code !== code.trim()) {
    return NextResponse.json({ ok: false, error: "验证码不正确" }, { status: 400 });
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "验证码已过期,请重新获取" }, { status: 400 });
  }

  await prisma.loginCode.update({
    where: { id: record.id },
    data: { used: true },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  await createSession(user.id);

  return NextResponse.json({ ok: true, hasPassword: Boolean(user.passwordHash) });
}
