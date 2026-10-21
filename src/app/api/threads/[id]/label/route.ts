import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clampText, fail, ok } from "@/lib/api";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return fail("请先登录", 401);

  const { id } = await params;
  const thread = await prisma.thread.findUnique({
    where: { id },
    include: { capsule: { select: { ownerId: true } } },
  });

  if (!thread || thread.capsule.ownerId !== user.id) {
    return fail("找不到这个对话", 404);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("请求格式不正确");
  }

  const label = clampText(body.label, 30);

  await prisma.thread.update({
    where: { id },
    data: { visitorLabel: label || null },
  });

  return ok({});
}
