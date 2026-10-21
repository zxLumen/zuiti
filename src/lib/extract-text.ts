import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_OCR_PAGES = 30;
const OCR_DPI = 140;
const OCR_CONCURRENCY = 4;
const OCR_PAGE_TIMEOUT = 120_000;
const PDF_TEXT_TIMEOUT = 30_000;
const PDF_TEXT_MIN_CHARS = 40;
const MAX_TEXT_CHARS = 200_000;

export type ExtractResult = {
  text: string;
  chars: number;
  ocr?: boolean;
  pages?: number;
  warning?: string;
};

function normalize(text: string): ExtractResult {
  const value = text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\f/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (value.replace(/\s/g, "").length < 10) {
    throw new Error("没能从文件里读到有效文字");
  }

  const textOut = value.slice(0, MAX_TEXT_CHARS);
  return { text: textOut, chars: textOut.length };
}

function meaningfulLength(text: string): number {
  return text
    .replace(/--\s*\d+\s*of\s*\d+\s*--/g, "")
    .replace(/\s/g, "").length;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

async function extractPdf(buffer: Buffer): Promise<ExtractResult> {
  let text = "";
  let pages = 0;

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const parsed = await parser.getText();
      text = parsed.text || "";
      pages = (parsed as { total?: number }).total ?? 0;
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    console.warn("[extract] pdf-parse 读取失败,继续尝试其他方式", error);
  }

  if (meaningfulLength(text) >= 80) {
    return normalize(text);
  }

  const dir = await mkdtemp(join(tmpdir(), "zuiti-pdf-"));
  try {
    const pdfPath = join(dir, "input.pdf");
    await writeFile(pdfPath, buffer);

    // 有些 PDF(例如 Microsoft Print to PDF)其实有文字层,
    // 只是 pdf-parse 读不出来。先让 Poppler 试一次,通常几十毫秒。
    try {
      const result = await run(
        "pdftotext",
        ["-layout", "-enc", "UTF-8", pdfPath, "-"],
        { timeout: PDF_TEXT_TIMEOUT, maxBuffer: 20 * 1024 * 1024 },
      );
      if (meaningfulLength(result.stdout) >= PDF_TEXT_MIN_CHARS) {
        console.log("[extract] 使用 pdftotext 成功提取文字层");
        return normalize(result.stdout);
      }
    } catch (error) {
      console.warn("[extract] pdftotext 失败,继续尝试 OCR", error);
    }

    console.log(
      `[extract] PDF 文字层过短(${meaningfulLength(text)} 字),开始 OCR`,
    );
    return await ocrPdf(pdfPath, dir, pages);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function ocrPdf(
  pdfPath: string,
  dir: string,
  knownPages: number,
): Promise<ExtractResult> {
  let pages = knownPages;
  if (!pages) {
    try {
      const info = await run("pdfinfo", [pdfPath], { timeout: 30_000 });
      pages = Number(/^Pages:\s+(\d+)/m.exec(info.stdout)?.[1] ?? 0);
    } catch (error) {
      console.warn("[extract] pdfinfo 失败", error);
    }
  }
  if (!pages) {
    throw new Error("无法读取 PDF 页数,文件可能已损坏");
  }

  const pagesToOcr = Math.min(pages, MAX_OCR_PAGES);
  const prefix = join(dir, "page");

  try {
    await run(
      "pdftoppm",
      [
        "-png",
        "-gray",
        "-r",
        String(OCR_DPI),
        "-f",
        "1",
        "-l",
        String(pagesToOcr),
        pdfPath,
        prefix,
      ],
      { timeout: 180_000, maxBuffer: 20 * 1024 * 1024 },
    );
  } catch (error) {
    console.warn("[extract] pdftoppm 失败", error);
    throw new Error("PDF 转图片失败,文件可能已损坏");
  }

  const images = (await readdir(dir))
    .filter((name) => name.endsWith(".png"))
    .sort((a, b) => {
      const na = Number(/(\d+)\.png$/.exec(a)?.[1] ?? 0);
      const nb = Number(/(\d+)\.png$/.exec(b)?.[1] ?? 0);
      return na - nb;
    });

  if (images.length === 0) {
    throw new Error("PDF 转图片失败,没有生成可识别的页面");
  }

  console.log(
    `[extract] OCR 开始:${images.length} 页,${OCR_DPI} DPI,并发 ${Math.min(
      OCR_CONCURRENCY,
      images.length,
    )}`,
  );

  const pageResults = await mapLimit(
    images,
    OCR_CONCURRENCY,
    async (image, index) => {
      const page = index + 1;
      try {
        const result = await run(
          "tesseract",
          [
            join(dir, image),
            "stdout",
            "-l",
            "chi_sim+eng",
            // PSM 3(默认版面分析)在中文密集页上虽然慢,但比 PSM 6 稳定;
            // PSM 6 在部分 tesseract 5.3 环境会异常慢甚至卡死。
            "--psm",
            "3",
          ],
          {
            timeout: OCR_PAGE_TIMEOUT,
            maxBuffer: 20 * 1024 * 1024,
            // tesseract 默认会开 OpenMP 多线程。多页并发时线程数会成倍膨胀,
            // 在 8 核机器上反而把单页拖到 1-2 分钟。限制为单线程后,
            // 4 页并发的总耗时从约 54 秒降到约 3 秒。
            env: { ...process.env, OMP_THREAD_LIMIT: "1" },
          },
        );

        const pageText = result.stdout.trim();
        if (!pageText) {
          console.warn(`[extract] 第 ${page} 页没有识别到文字`);
          return { page, text: "", failed: true };
        }
        return { page, text: pageText, failed: false };
      } catch (error) {
        console.warn(`[extract] 第 ${page} 页 OCR 失败`, error);
        return { page, text: "", failed: true };
      }
    },
  );

  const successful = pageResults.filter((page) => !page.failed && page.text);
  if (successful.length === 0) {
    throw new Error(
      "扫描件 OCR 没有识别出文字,可能是图片太模糊或 OCR 超时。可以换更清晰的扫描件,或把文字粘贴到补充说明。",
    );
  }

  const text = successful
    .map((page) => `--- 第 ${page.page} 页 ---\n${page.text}`)
    .join("\n\n");

  const failedPages = pageResults
    .filter((page) => page.failed)
    .map((page) => page.page);

  const warnings: string[] = [];
  if (pages > MAX_OCR_PAGES) {
    warnings.push(`这份 PDF 共 ${pages} 页,OCR 只识别了前 ${MAX_OCR_PAGES} 页`);
  }
  if (failedPages.length > 0) {
    warnings.push(
      `已识别 ${successful.length}/${pageResults.length} 页,第 ${failedPages.join(
        "、",
      )} 页识别失败或超时`,
    );
  }

  let normalized: ExtractResult;
  try {
    normalized = normalize(text);
  } catch {
    throw new Error(
      "扫描件 OCR 没有识别出有效文字,可以换更清晰的扫描件,或把文字粘贴到补充说明。",
    );
  }

  console.log(
    `[extract] OCR 完成:${successful.length}/${pageResults.length} 页,${normalized.chars} 字`,
  );

  return {
    ...normalized,
    ocr: true,
    pages: pagesToOcr,
    warning: warnings.length > 0 ? warnings.join(";") : undefined,
  };
}

export async function extractTextFromFile(file: File): Promise<ExtractResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("文件太大,请控制在 10MB 内");
  }
  if (!file.size) throw new Error("文件是空的");

  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".pdf")) {
    return extractPdf(buffer);
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    return normalize(parsed.value);
  }

  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".csv")
  ) {
    return normalize(buffer.toString("utf8"));
  }

  throw new Error("暂不支持这种格式,请上传 PDF / DOCX / TXT / MD,或直接粘贴文字");
}
