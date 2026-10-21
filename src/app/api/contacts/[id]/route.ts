import { getCurrentUser } from "@/lib/auth";
import { clampText, fail, ok } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return fail("请先登录", 401);

  const { id } = await params;
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact || contact.ownerId !== user.id) return fail("找不到这个好友", 404);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("请求格式不正确");
  }

  const name = clampText(body.name, 30);
  if (name.length < 1) return fail("备注名不能为空");

  await prisma.contact.update({
    where: { id },
    data: { name, note: clampText(body.note, 120) || null },
  });

  return ok({});
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return fail("请先登录", 401);

  const { id } = await params;
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact || contact.ownerId !== user.id) return fail("找不到这个好友", 404);

  await prisma.contact.delete({ where: { id } });
  return ok({});
}
