import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getMpOwner } from "@/lib/mp";

export async function GET(req: Request) {
  const user = await getMpOwner(req);
  if (!user) return fail("请先登录", 401);

  const contacts = await prisma.contact.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      capsule: { select: { id: true, title: true, shareToken: true } },
    },
  });

  return ok({
    contacts: contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      capsuleId: contact.capsuleId,
      capsuleTitle: contact.capsule.title,
      shareToken: contact.capsule.shareToken,
      token: contact.token,
    })),
  });
}
