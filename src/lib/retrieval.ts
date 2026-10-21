import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import {
  cosineSimilarity,
  embedTexts,
  embeddingsConfigured,
  parseEmbedding,
} from "./embeddings";

export const CHAT_CONTEXT_CHARS = 8_000;

type Chunk = {
  source: string;
  content: string;
  index: number;
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

function bigrams(text: string): Set<string> {
  const value = normalize(text);
  const result = new Set<string>();
  if (value.length === 1) result.add(value);
  for (let i = 0; i < value.length - 1; i++) {
    result.add(value.slice(i, i + 2));
  }
  return result;
}

function lexicalScore(question: string, text: string): number {
  const grams = bigrams(question);
  if (!grams.size) return 0;
  const corpus = normalize(text);
  let hits = 0;
  for (const gram of grams) {
    if (corpus.includes(gram)) hits++;
  }
  return hits / grams.size;
}

function chunkText(text: string, maxChars = 1000, overlap = 120): string[] {
  const value = text.replace(/\r\n/g, "\n").trim();
  if (!value) return [];
  if (value.length <= maxChars) return [value];

  const sentences = value
    .split(/(?<=[。！？!?；;\n])/)
    .map((item) => item.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < sentence.length; i += maxChars) {
        chunks.push(sentence.slice(i, i + maxChars));
      }
      continue;
    }

    if (current && current.length + sentence.length > maxChars) {
      chunks.push(current);
      current = current.slice(-overlap) + sentence;
    } else {
      current += sentence;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

async function buildChunks(capsuleId: string): Promise<Chunk[]> {
  const capsule = await prisma.capsule.findUnique({
    where: { id: capsuleId },
    include: { files: { orderBy: { createdAt: "asc" } } },
  });
  if (!capsule) return [];

  const chunks: Chunk[] = [];
  let index = 0;

  for (const file of capsule.files) {
    for (const part of chunkText(file.content)) {
      chunks.push({
        source: file.name,
        content: `【文件:${file.name}】\n${part}`,
        index: index++,
      });
    }
  }

  if (capsule.manualContent?.trim()) {
    for (const part of chunkText(capsule.manualContent)) {
      chunks.push({
        source: "补充说明",
        content: `【补充说明】\n${part}`,
        index: index++,
      });
    }
  }

  // 兼容没有 CapsuleFile 的旧数据
  if (chunks.length === 0 && capsule.rawContent.trim()) {
    for (const part of chunkText(capsule.rawContent)) {
      chunks.push({
        source: "原始材料",
        content: `【原始材料】\n${part}`,
        index: index++,
      });
    }
  }

  return chunks;
}

export async function reindexCapsule(capsuleId: string): Promise<void> {
  const chunks = await buildChunks(capsuleId);
  let vectors: number[][] = [];

  if (chunks.length > 0 && embeddingsConfigured()) {
    try {
      vectors = await embedTexts(chunks.map((chunk) => chunk.content));
    } catch (error) {
      console.error(
        "[retrieval] embedding 失败,chunk 仍保存:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.capsuleChunk.deleteMany({ where: { capsuleId } }),
  ];

  if (chunks.length > 0) {
    operations.push(
      prisma.capsuleChunk.createMany({
        data: chunks.map((chunk, i) => ({
          capsuleId,
          source: chunk.source,
          content: chunk.content,
          embedding: JSON.stringify(vectors[i] ?? []),
          index: chunk.index,
        })),
      }),
    );
  }

  await prisma.$transaction(operations);
}

function selectChunks(
  chunks: { content: string; index: number }[],
  question: string,
  maxChars: number,
): string {
  const scored = chunks.map((chunk) => ({
    ...chunk,
    score: lexicalScore(question, chunk.content),
  }));

  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  const picked: typeof scored = [];
  let total = 0;

  for (const item of scored) {
    if (item.content.length > maxChars) {
      if (picked.length === 0) {
        picked.push({ ...item, content: item.content.slice(0, maxChars) });
        total = maxChars;
      }
      continue;
    }

    if (total + item.content.length > maxChars) continue;
    picked.push(item);
    total += item.content.length;
    if (total >= maxChars * 0.9) break;
  }

  if (picked.length === 0) {
    return chunks
      .slice(0, 8)
      .map((chunk) => chunk.content)
      .join("\n\n")
      .slice(0, maxChars);
  }

  picked.sort((a, b) => a.index - b.index);
  return picked.map((item) => item.content).join("\n\n").slice(0, maxChars);
}

async function lexicalCapsuleContent(
  capsuleId: string,
  question: string,
  maxChars: number,
): Promise<string> {
  const capsule = await prisma.capsule.findUnique({
    where: { id: capsuleId },
    select: { rawContent: true },
  });
  if (!capsule?.rawContent) return "";

  const chunks = chunkText(capsule.rawContent, 1200).map((content, index) => ({
    content,
    index,
  }));
  return selectChunks(chunks, question, maxChars);
}

export async function retrieveCapsuleContext(
  capsuleId: string,
  question: string,
  maxChars = CHAT_CONTEXT_CHARS,
): Promise<string> {
  let chunks = await prisma.capsuleChunk.findMany({
    where: { capsuleId },
    orderBy: { index: "asc" },
  });

  // 旧胶囊第一次聊天时懒加载索引
  if (chunks.length === 0) {
    try {
      await reindexCapsule(capsuleId);
      chunks = await prisma.capsuleChunk.findMany({
        where: { capsuleId },
        orderBy: { index: "asc" },
      });
    } catch (error) {
      console.error(
        "[retrieval] 索引失败,退回关键词:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (chunks.length === 0) {
    return lexicalCapsuleContent(capsuleId, question, maxChars);
  }

  const vectors = chunks.map((chunk) => parseEmbedding(chunk.embedding));
  const hasVectors = embeddingsConfigured() && vectors.some((v) => v.length > 0);

  if (hasVectors) {
    try {
      const [questionVector] = await embedTexts([question]);
      if (questionVector?.length) {
        const scored = chunks
          .map((chunk, i) => ({
            chunk,
            score: cosineSimilarity(questionVector, vectors[i]),
          }))
          .sort((a, b) => b.score - a.score || a.chunk.index - b.chunk.index);

        const picked: typeof scored = [];
        let total = 0;

        for (const item of scored) {
          if (item.chunk.content.length > maxChars) continue;
          if (total + item.chunk.content.length > maxChars) continue;
          picked.push(item);
          total += item.chunk.content.length;
          if (total >= maxChars * 0.9) break;
        }

        if (picked.length > 0) {
          picked.sort((a, b) => a.chunk.index - b.chunk.index);
          return picked
            .map((item) => item.chunk.content)
            .join("\n\n")
            .slice(0, maxChars);
        }
      }
    } catch (error) {
      console.error(
        "[retrieval] 问题向量化失败,退回关键词:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return selectChunks(
    chunks.map((chunk) => ({ content: chunk.content, index: chunk.index })),
    question,
    maxChars,
  );
}
