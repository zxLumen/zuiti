import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword, validatePassword } from "@/lib/password";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("请先登录", 401);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("请求格式不正确");
  }

  const password = typeof body.password === "string" ? body.password : "";
  const problem = validatePassword(password);
  if (problem) return fail(problem);

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return fail("账号不存在", 404);
  if (dbUser.passwordHash) {
    return fail("已经设置过密码,请使用「修改密码」");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password) },
  });

  return ok({});
}
