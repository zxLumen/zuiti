import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getMpOwner } from "@/lib/mp";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getMpOwner(req);
  if (!user) return fail("请先登录", 401);

  const { id } = await params;
  const escalation = await prisma.escalation.findUnique({
    where: { id },
    include: {
      capsule: { select: { id: true, title: true, ownerId: true } },
      thread: { select: { visitorLabel: true } },
    },
  });

  if (!escalation || escalation.capsule.ownerId !== user.id) {
    return fail("找不到这个问题", 404);
  }

  return ok({
    escalation: {
      id: escalation.id,
      question: escalation.question,
      reason: escalation.reason,
      status: escalation.status,
      createdAt: escalation.createdAt,
      capsuleId: escalation.capsuleId,
      capsuleTitle: escalation.capsule.title,
      visitorLabel: escalation.thread.visitorLabel || "微信好友",
      answer: escalation.answer,
    },
  });
}
