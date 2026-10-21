import { prisma } from "@/lib/db";
import { fail, isEmail, ok } from "@/lib/api";
import { createMpOwnerSession } from "@/lib/mp";
import { verifyPassword } from "@/lib/password";
import { clientIp, rateLimit, resetRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("请求格式不正确");
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!isEmail(email) || password.length < 1) {
    return fail("请输入邮箱和密码");
  }

  const ip = clientIp(req);
  const key = `mp-owner:${ip}:${email}`;
  if (rateLimit(key, 10, 10 * 60 * 1000)) {
    return fail("尝试次数太多,请稍后再试", 429);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return fail("邮箱或密码不正确", 401);
  if (!user.passwordHash) {
    return fail("这个账号还没有设置密码,请先在网页端设置", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return fail("邮箱或密码不正确", 401);

  resetRateLimit(key);
  const token = await createMpOwnerSession(user.id);

  return ok({ token, email: user.email });
}
