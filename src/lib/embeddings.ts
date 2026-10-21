const BATCH_SIZE = 16;

function config() {
  return {
    base: (
      process.env.EMBEDDING_BASE_URL ||
      process.env.LLM_BASE_URL ||
      "https://zxlumen.cn/api/ai/v1"
    ).replace(/\/+$/, ""),
    key: process.env.EMBEDDING_API_KEY || process.env.LLM_API_KEY || "",
    model: process.env.EMBEDDING_MODEL || "bge-m3",
  };
}

export function embeddingsConfigured(): boolean {
  return Boolean(config().key);
}

async function requestEmbeddings(input: string[]): Promise<number[][]> {
  const { base, key, model } = config();
  if (!key) throw new Error("未配置 EMBEDDING_API_KEY");

  const res = await fetch(`${base}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
    body: JSON.stringify({ model, input }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Embedding ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as {
    data?: { embedding?: number[] }[];
  };
  const vectors = (data.data ?? []).map((item) => item.embedding ?? []);
  if (vectors.length !== input.length) {
    throw new Error(`Embedding 返回数量不匹配:${vectors.length}/${input.length}`);
  }
  return vectors;
}

/** 批量向量化;失败时逐条重试,尽量不让整次索引失败。 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const cleaned = texts.map((text) => text.trim().slice(0, 4000));
  const vectors: number[][] = [];

  for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
    const batch = cleaned.slice(i, i + BATCH_SIZE);

    try {
      vectors.push(...(await requestEmbeddings(batch)));
    } catch (error) {
      console.warn(
        "[embedding] 批量失败,改为逐条:",
        error instanceof Error ? error.message : error,
      );

      for (const text of batch) {
        try {
          const [vector] = await requestEmbeddings([text]);
          vectors.push(vector ?? []);
        } catch (itemError) {
          console.error(
            "[embedding] 单条失败:",
            itemError instanceof Error ? itemError.message : itemError,
          );
          vectors.push([]);
        }
      }
    }
  }

  return vectors;
}

export function parseEmbedding(raw: string): number[] {
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((n): n is number => typeof n === "number");
  } catch {
    return [];
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
