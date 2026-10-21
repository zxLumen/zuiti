import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clampText, fail, ok } from "@/lib/api";
import {
  composeCapsuleContent,
  MAX_MATERIAL_CHARS,
  normalizeFiles,
} from "@/lib/capsule-content";
import { distillCapsule } from "@/lib/knowledge";
import { reindexCapsule } from "@/lib/retrieval";

const TRANSPARENCY = new Set(["transparent", "assistant", "persona"]);
const STRICTNESS = new Set(["high", "medium"]);

type WorkingFile = {
  id?: string;
  name: string;
  content: string;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return fail("请先登录", 401);

  const { id } = await params;
  const capsule = await prisma.capsule.findUnique({
    where: { id },
    include: { files: { orderBy: { createdAt: "asc" } } },
  });
  if (!capsule || capsule.ownerId !== user.id) return fail("找不到这个嘴替", 404);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("请求格式不正确");
  }

  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const title = clampText(body.title, 80);
    if (title.length < 2) return fail("标题至少 2 个字");
    data.title = title;
  }
  if (typeof body.subtitle === "string") {
    data.subtitle = clampText(body.subtitle, 160) || null;
  }
  if (typeof body.ownerName === "string") {
    data.ownerName = clampText(body.ownerName, 40) || null;
  }
  if (typeof body.transparency === "string" && TRANSPARENCY.has(body.transparency)) {
    data.transparency = body.transparency;
  }
  if (typeof body.strictness === "string" && STRICTNESS.has(body.strictness)) {
    data.strictness = body.strictness;
  }

  const hasFilesKey = Object.prototype.hasOwnProperty.call(body, "files");
  const hasNewFilesKey = Object.prototype.hasOwnProperty.call(body, "newFiles");
  const notesProvided = typeof body.notes === "string";
  const deleteIds = Array.isArray(body.deleteFileIds)
    ? body.deleteFileIds.filter((x): x is string => typeof x === "string")
    : [];
  const legacyContentProvided =
    typeof body.content === "string" &&
    !hasFilesKey &&
    !hasNewFilesKey &&
    deleteIds.length === 0 &&
    !notesProvided;

  const replacementFiles = hasFilesKey ? normalizeFiles(body.files) : [];
  const appendedFiles = hasNewFilesKey ? normalizeFiles(body.newFiles) : [];
  if (replacementFiles === null || appendedFiles === null) {
    return fail("文件格式不正确");
  }

  const materialTouched =
    hasFilesKey ||
    hasNewFilesKey ||
    deleteIds.length > 0 ||
    notesProvided ||
    legacyContentProvided;

  let replaceAll = false;
  let filesNext: WorkingFile[] = capsule.files.map((file) => ({
    id: file.id,
    name: file.name,
    content: file.content,
  }));
  let toCreate: WorkingFile[] = [];
  let notesNext = capsule.manualContent ?? "";

  if (materialTouched) {
    if (hasFilesKey) {
      filesNext = replacementFiles ?? [];
      replaceAll = true;
    }

    if (legacyContentProvided) {
      filesNext = [
        {
          name: "原始材料",
          content: clampText(body.content, MAX_MATERIAL_CHARS),
        },
      ];
      replaceAll = true;
    }

    if (hasNewFilesKey) {
      filesNext = filesNext.concat(appendedFiles ?? []);
    }

    if (deleteIds.length > 0 && !replaceAll) {
      filesNext = filesNext.filter(
        (file) => !file.id || !deleteIds.includes(file.id),
      );
    }

    if (notesProvided) {
      notesNext = clampText(body.notes, MAX_MATERIAL_CHARS);
    }

    const rawContent = composeCapsuleContent(filesNext, notesNext);
    if (rawContent.length < 20) {
      return fail("材料太短了,至少保留 20 个字");
    }
    if (rawContent.length > MAX_MATERIAL_CHARS) {
      return fail(
        `材料太长了,请控制在 ${MAX_MATERIAL_CHARS.toLocaleString()} 字内`,
      );
    }

    data.manualContent = notesNext.trim() || null;

    if (rawContent !== capsule.rawContent) {
      data.rawContent = rawContent;
      const knowledge = await distillCapsule({
        title: (data.title as string) || capsule.title,
        subtitle:
          (data.subtitle as string) || capsule.subtitle || undefined,
        content: rawContent,
      });
      data.knowledge = JSON.stringify(knowledge);
    }

    toCreate = replaceAll
      ? filesNext
      : hasNewFilesKey
        ? appendedFiles ?? []
        : [];
  }

  const operations: Prisma.PrismaPromise<unknown>[] = [];

  if (materialTouched) {
    if (replaceAll) {
      operations.push(
        prisma.capsuleFile.deleteMany({ where: { capsuleId: id } }),
      );
    } else if (deleteIds.length > 0) {
      operations.push(
        prisma.capsuleFile.deleteMany({
          where: { capsuleId: id, id: { in: deleteIds } },
        }),
      );
    }

    if (toCreate.length > 0) {
      operations.push(
        prisma.capsuleFile.createMany({
          data: toCreate.map((file) => ({
            capsuleId: id,
            name: file.name,
            content: file.content,
          })),
        }),
      );
    }
  }

  operations.push(prisma.capsule.update({ where: { id }, data }));

  await prisma.$transaction(operations);

  if (materialTouched) {
    await reindexCapsule(id).catch((error) => {
      console.error("[capsules] 重新索引失败", error);
    });
  }

  return ok({});
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return fail("请先登录", 401);

  const { id } = await params;
  const capsule = await prisma.capsule.findUnique({ where: { id } });
  if (!capsule || capsule.ownerId !== user.id) return fail("找不到这个嘴替", 404);

  await prisma.capsule.delete({ where: { id } });
  return ok({});
}
