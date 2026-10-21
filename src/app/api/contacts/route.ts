import { getCurrentUser } from "@/lib/auth";
import { clampText, fail, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/tokens";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("请先登录", 401);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("请求格式不正确");
  }

  const name = clampText(body.name, 30);
  const note = clampText(body.note, 120);
  const capsuleId = typeof body.capsuleId === "string" ? body.capsuleId : "";

  if (name.length < 1) return fail("给这个好友起个备注名吧");

  const capsule = await prisma.capsule.findUnique({ where: { id: capsuleId } });
  if (!capsule || capsule.ownerId !== user.id) return fail("找不到这个嘴替", 404);

  const contact = await prisma.contact.create({
    data: {
      ownerId: user.id,
      capsuleId,
      name,
      note: note || null,
      token: randomToken(18),
    },
  });

  return ok({ id: contact.id, token: contact.token });
}
