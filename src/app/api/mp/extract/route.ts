import { getMpOwner } from "@/lib/mp";
import { fail, ok } from "@/lib/api";
import { extractTextFromFile } from "@/lib/extract-text";

export async function POST(req: Request) {
  const user = await getMpOwner(req);
  if (!user) return fail("请先登录", 401);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("没有收到文件");

  try {
    const result = await extractTextFromFile(file);
    return ok({ ...result, name: file.name });
  } catch (error) {
    console.error("[mp/extract] 解析失败", error);
    return fail(
      error instanceof Error ? error.message : "文件解析失败,试试直接粘贴文字",
    );
  }
}
