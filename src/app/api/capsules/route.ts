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
import { randomToken } from "@/lib/tokens";

const TRANSPARENCY = new Set(["transparent", "assistant", "persona"]);
const STRICTNESS = new Set(["high", "medium"]);

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("请先登录", 401);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("请求格式不正确");
  }

  const title = clampText(body.title, 80);
  const subtitle = clampText(body.subtitle, 160);
  const ownerName = clampText(body.ownerName, 40);
  const content = clampText(body.content, MAX_MATERIAL_CHARS);

  if (title.length < 2) return fail("给这个嘴替起个名字吧(至少 2 个字)");

  const parsedFiles = normalizeFiles(body.files);
  if (parsedFiles === null) return fail("文件格式不正确");

  let files = parsedFiles;
  let notes = content;

  // 兼容旧表单:没有文件时,把粘贴的文字当成一个「原始材料」文件
  if (files.length === 0) {
    if (content.length < 20) return fail("材料太短了,至少给 20 个字");
    files = [{ name: "原始材料", content }];
    notes = "";
  }

  const rawContent = composeCapsuleContent(files, notes);
  if (rawContent.length < 20) return fail("材料太短了,至少给 20 个字");
  if (rawContent.length > MAX_MATERIAL_CHARS) {
    return fail(`材料太长了,请控制在 ${MAX_MATERIAL_CHARS.toLocaleString()} 字内`);
  }

  const transparency = TRANSPARENCY.has(String(body.transparency))
    ? String(body.transparency)
    : "persona";
  const strictness = STRICTNESS.has(String(body.strictness))
    ? String(body.strictness)
    : "high";

  const knowledge = await distillCapsule({ title, subtitle, content: rawContent });

  const capsule = await prisma.capsule.create({
    data: {
      ownerId: user.id,
      title,
      subtitle: subtitle || null,
      ownerName: ownerName || null,
      rawContent,
      manualContent: notes.trim() || null,
      knowledge: JSON.stringify(knowledge),
      transparency,
      strictness,
      shareToken: randomToken(9),
      files: {
        create: files.map((file) => ({
          name: file.name,
          content: file.content,
        })),
      },
    },
  });

  await reindexCapsule(capsule.id).catch((error) => {
    console.error("[capsules] 索引失败", error);
  });

  return ok({ id: capsule.id });
}
