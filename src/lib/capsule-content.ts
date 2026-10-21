export const MAX_MATERIAL_CHARS = 400_000;

export type MaterialFile = {
  name: string;
  content: string;
};

/**
 * 把「文件 + 补充说明」拼成模型实际读取的材料。
 * 文件标题保留在文本里,便于模型区分来源。
 */
export function composeCapsuleContent(
  files: MaterialFile[],
  notes?: string | null,
): string {
  const parts: string[] = [];

  for (const file of files) {
    const content = file.content.trim();
    if (!content) continue;
    parts.push(`【文件:${file.name.trim() || "未命名文件"}】\n${content}`);
  }

  const extra = notes?.trim();
  if (extra) {
    parts.push(`【补充说明】\n${extra}`);
  }

  return parts.join("\n\n");
}

export function materialLength(
  files: MaterialFile[],
  notes?: string | null,
): number {
  return composeCapsuleContent(files, notes).length;
}

/** 校验前端传来的文件数组,返回规范化后的列表;格式不对返回 null。 */
export function normalizeFiles(input: unknown): MaterialFile[] | null {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) return null;

  const files: MaterialFile[] = [];

  for (const item of input) {
    if (!item || typeof item !== "object") return null;
    const record = item as { name?: unknown; content?: unknown };
    if (typeof record.name !== "string" || typeof record.content !== "string") {
      return null;
    }

    const name = record.name.trim().slice(0, 80) || "未命名文件";
    const content = record.content.trim();
    if (!content) continue;

    files.push({ name, content });
  }

  return files;
}
