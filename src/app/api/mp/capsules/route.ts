import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getMpOwner } from "@/lib/mp";

export async function GET(req: Request) {
  const user = await getMpOwner(req);
  if (!user) return fail("请先登录", 401);

  const capsules = await prisma.capsule.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { threads: true, files: true } },
      escalations: { where: { status: "pending" }, select: { id: true } },
    },
  });

  return ok({
    email: user.email,
    capsules: capsules.map((capsule) => ({
      id: capsule.id,
      title: capsule.title,
      subtitle: capsule.subtitle,
      shareToken: capsule.shareToken,
      ownerName: capsule.ownerName,
      transparency: capsule.transparency,
      threads: capsule._count.threads,
      files: capsule._count.files,
      pending: capsule.escalations.length,
    })),
  });
}
