import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/password";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("请先登录", 401);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("请求格式不正确");
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

  const problem = validatePassword(newPassword);
  if (problem) return fail(problem);

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return fail("账号不存在", 404);

  if (dbUser.passwordHash) {
    const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!valid) return fail("当前密码不正确", 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  return ok({});
}
