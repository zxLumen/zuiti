import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import {
  composeCapsuleContent,
  MAX_MATERIAL_CHARS,
  normalizeFiles,
} from "./capsule-content";
import { distillCapsule } from "./knowledge";
import { reindexCapsule } from "./retrieval";

export class MaterialError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function updateCapsuleMaterial(input: {
  capsuleId: string;
  ownerId: string;
  deleteFileIds?: string[];
  newFiles?: unknown;
  notes?: string;
}) {
  const capsule = await prisma.capsule.findUnique({
    where: { id: input.capsuleId },
    include: { files: { orderBy: { createdAt: "asc" } } },
  });

  if (!capsule || capsule.ownerId !== input.ownerId) {
    throw new MaterialError("找不到这个嘴替", 404);
  }

  const newFiles = normalizeFiles(input.newFiles);
  if (newFiles === null) throw new MaterialError("文件格式不正确");

  const deleteIds = Array.isArray(input.deleteFileIds)
    ? input.deleteFileIds.filter((x): x is string => typeof x === "string")
    : [];

  const remaining = capsule.files.filter((file) => !deleteIds.includes(file.id));
  const filesNext = [
    ...remaining.map((file) => ({ name: file.name, content: file.content })),
    ...newFiles,
  ];

  const notesNext =
    typeof input.notes === "string"
      ? input.notes.trim()
      : capsule.manualContent ?? "";

  const rawContent = composeCapsuleContent(filesNext, notesNext);

  if (rawContent.length < 20) {
    throw new MaterialError("材料太短了,至少保留 20 个字");
  }
  if (rawContent.length > MAX_MATERIAL_CHARS) {
    throw new MaterialError(
      `材料太长了,请控制在 ${MAX_MATERIAL_CHARS.toLocaleString()} 字内`,
    );
  }

  let knowledge = capsule.knowledge;
  if (rawContent !== capsule.rawContent) {
    knowledge = JSON.stringify(
      await distillCapsule({
        title: capsule.title,
        subtitle: capsule.subtitle || undefined,
        content: rawContent,
      }),
    );
  }

  const operations: Prisma.PrismaPromise<unknown>[] = [];

  if (deleteIds.length > 0) {
    operations.push(
      prisma.capsuleFile.deleteMany({
        where: { capsuleId: capsule.id, id: { in: deleteIds } },
      }),
    );
  }

  if (newFiles.length > 0) {
    operations.push(
      prisma.capsuleFile.createMany({
        data: newFiles.map((file) => ({
          capsuleId: capsule.id,
          name: file.name,
          content: file.content,
        })),
      }),
    );
  }

  operations.push(
    prisma.capsule.update({
      where: { id: capsule.id },
      data: {
        rawContent,
        manualContent: notesNext || null,
        knowledge,
      },
    }),
  );

  await prisma.$transaction(operations);

  await reindexCapsule(capsule.id).catch((error) => {
    console.error("[material] 重新索引失败", error);
  });

  return { rawContent };
}
