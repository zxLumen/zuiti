import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return fail("请先登录", 401);

  const { id } = await params;
  const escalation = await prisma.escalation.findUnique({
    where: { id },
    include: { capsule: true },
  });

  if (!escalation || escalation.capsule.ownerId !== user.id) {
    return fail("找不到这个问题", 404);
  }
  if (escalation.status !== "pending") {
    return fail("这个问题已经处理过了", 409);
  }

  const owner = escalation.capsule.ownerName?.trim() || "本人";

  await prisma.$transaction([
    prisma.escalation.update({
      where: { id },
      data: { status: "dismissed", answeredAt: new Date() },
    }),
    prisma.message.create({
      data: {
        threadId: escalation.threadId,
        role: "assistant",
        content: `这个问题需要跟${owner}进一步确认,目前还没有更多信息,建议直接联系 TA。`,
      },
    }),
  ]);

  return ok({});
}
