export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY);
}

export function llmModelLabel(): string {
  if (!llmConfigured()) return "演示模式(本地规则)";
  return process.env.LLM_MODEL || "deepseek-v4.1-flash";
}

function modelList(): string[] {
  const primary = process.env.LLM_MODEL || "deepseek-v4.1-flash";
  const fallbacks = (
    process.env.LLM_FALLBACK_MODELS ||
    "glm-5.2,qwen3.8-flash,gpt-6-luna,claude-haiku-5-5"
  )
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return Array.from(new Set([primary, ...fallbacks]));
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

type ChatResponse = {
  choices?: {
    finish_reason?: string;
    message?: { content?: string; reasoning_content?: string };
  }[];
};

/**
 * 调用 OpenAI 兼容接口,返回解析后的 JSON。
 *
 * 推理模型(如 deepseek-v4.1-flash)可能把 token 全花在 reasoning 上,
 * 导致 content 为空。这里按「主模型 → 备用模型」依次尝试,
 * 任何空内容 / JSON 解析失败 / 429 / 5xx 都会自动换下一个模型。
 */
export async function chatJSON<T>(
  messages: LLMMessage[],
  opts: {
    temperature?: number;
    maxTokens?: number;
    validate?: (data: T) => boolean;
  } = {},
): Promise<T> {
  const base = (process.env.LLM_BASE_URL || "https://api.deepseek.com/v1").replace(
    /\/+$/,
    "",
  );
  const models = modelList();

  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LLM_API_KEY}`,
            // 网关前面有 Cloudflare,Node 默认 UA 可能被当成机器人拦截
            "User-Agent":
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: opts.temperature ?? 0.2,
            max_tokens: opts.maxTokens ?? 3000,
            response_format: { type: "json_object" },
            stream: false,
          }),
          signal: AbortSignal.timeout(90_000),
        });

        if (!res.ok) {
          const detail = (await res.text()).slice(0, 300);
          throw new Error(`LLM(${model}) ${res.status}: ${detail}`);
        }

        const data = (await res.json()) as ChatResponse;
        const choice = data.choices?.[0];
        const text = choice?.message?.content;

        if (!text || !text.trim()) {
          // 有些推理模型会把最终 JSON 放在 reasoning_content 里
          const reasoning = choice?.message?.reasoning_content;
          if (reasoning && reasoning.trim()) {
            try {
              const parsed = JSON.parse(extractJson(reasoning)) as T;
              if (!opts.validate || opts.validate(parsed)) return parsed;
            } catch {
              // reasoning 里没有可用 JSON,继续尝试下一个模型
            }
          }

          lastError = new Error(
            `LLM(${model}) 返回空 content(finish_reason=${choice?.finish_reason ?? "unknown"})`,
          );
          console.warn(
            `[llm] ${model} 返回空 content(finish=${choice?.finish_reason ?? "unknown"}, reasoning=${(choice?.message?.reasoning_content || "").length})`,
          );
          break;
        }

        try {
          const parsed = JSON.parse(extractJson(text)) as T;
          if (opts.validate && !opts.validate(parsed)) {
            lastError = new Error(`LLM(${model}) 返回内容未通过校验`);
            console.warn(`[llm] ${model} 返回内容未通过校验,尝试下一个模型`);
            break;
          }
          return parsed;
        } catch (error) {
          lastError = error;
          console.warn(
            `[llm] ${model} 返回的内容不是合法 JSON,尝试下一个模型`,
          );
          break;
        }
      } catch (error) {
        lastError = error;
        console.warn(
          `[llm] ${model} 调用失败(第 ${attempt + 1} 次):`,
          error instanceof Error ? error.message : error,
        );
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("LLM 调用失败");
}
