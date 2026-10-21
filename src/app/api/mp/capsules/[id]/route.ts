import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getMpOwner } from "@/lib/mp";
import { MaterialError, updateCapsuleMaterial } from "@/lib/capsule-material";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getMpOwner(req);
  if (!user) return fail("请先登录", 401);

  const { id } = await params;
  const capsule = await prisma.capsule.findUnique({
    where: { id },
    include: {
      files: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, content: true },
      },
    },
  });

  if (!capsule || capsule.ownerId !== user.id) {
    return fail("找不到这个嘴替", 404);
  }

  return ok({
    capsule: {
      id: capsule.id,
      title: capsule.title,
      subtitle: capsule.subtitle,
      ownerName: capsule.ownerName,
      transparency: capsule.transparency,
      strictness: capsule.strictness,
      notes: capsule.manualContent ?? "",
      files: capsule.files.map((file) => ({
        id: file.id,
        name: file.name,
        chars: file.content.length,
      })),
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getMpOwner(req);
  if (!user) return fail("请先登录", 401);

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("请求格式不正确");
  }

  try {
    await updateCapsuleMaterial({
      capsuleId: id,
      ownerId: user.id,
      deleteFileIds: Array.isArray(body.deleteFileIds)
        ? body.deleteFileIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      newFiles: body.newFiles,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    });
    return ok({});
  } catch (error) {
    if (error instanceof MaterialError) {
      return fail(error.message, error.status);
    }
    console.error("[mp/capsule] 更新材料失败", error);
    return fail("保存失败,请稍后再试", 500);
  }
}
