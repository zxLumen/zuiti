import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getMpOwner } from "@/lib/mp";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const user = await getMpOwner(req);
  if (!user) return fail("请先登录", 401);

  const { id, fileId } = await params;
  const capsule = await prisma.capsule.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (!capsule || capsule.ownerId !== user.id) {
    return fail("找不到这个文件", 404);
  }

  const file = await prisma.capsuleFile.findFirst({
    where: { id: fileId, capsuleId: id },
    select: { id: true, name: true, content: true },
  });

  if (!file) return fail("找不到这个文件", 404);

  return ok({ file });
}
