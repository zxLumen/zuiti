import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getMpOwner } from "@/lib/mp";

export async function GET(req: Request) {
  const user = await getMpOwner(req);
  if (!user) return fail("请先登录", 401);

  const escalations = await prisma.escalation.findMany({
    where: { status: "pending", capsule: { ownerId: user.id } },
    orderBy: { createdAt: "asc" },
    include: {
      capsule: { select: { id: true, title: true } },
      thread: { select: { visitorLabel: true } },
    },
  });

  return ok({
    escalations: escalations.map((item) => ({
      id: item.id,
      question: item.question,
      reason: item.reason,
      createdAt: item.createdAt,
      capsuleId: item.capsuleId,
      capsuleTitle: item.capsule.title,
      visitorLabel: item.thread.visitorLabel || "微信好友",
    })),
  });
}
