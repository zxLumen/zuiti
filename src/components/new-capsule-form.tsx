"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DISTILL_HINTS = [
  "正在读材料…",
  "正在提炼关键点…",
  "正在划定它能回答的边界…",
  "正在预判对方会问什么…",
  "快好了,正在收拢…",
];

const transparencyOptions = [
  {
    value: "persona",
    title: "以我的名义(推荐)",
    desc: "用第一人称、以你的名字回复。对方看到的就像你在回消息。",
  },
  {
    value: "assistant",
    title: "助理身份",
    desc: "以“你的沟通助理”出现,不假装成本人。",
  },
  {
    value: "transparent",
    title: "透明",
    desc: "明确告诉对方:这是 AI 代表,基于你的材料回答。",
  },
];

const strictnessOptions = [
  {
    value: "high",
    title: "严格(推荐)",
    desc: "拿不准就转给你。宁可多问,不替你做主。",
  },
  {
    value: "medium",
    title: "宽松",
    desc: "只有明显超纲或涉及决策/承诺时才转给你。",
  },
];

export function NewCapsuleForm({
  demo,
  defaultOwnerName = "",
}: {
  demo: boolean;
  defaultOwnerName?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [ownerName, setOwnerName] = useState(defaultOwnerName);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<
    { name: string; content: string; chars: number }[]
  >([]);
  const [transparency, setTransparency] = useState("persona");
  const [strictness, setStrictness] = useState("high");

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState(0);

  const totalChars =
    files.reduce((sum, file) => sum + file.chars, 0) +
    content.trim().length;

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => {
      setHint((h) => (h + 1) % DISTILL_HINTS.length);
    }, 2600);
    return () => clearInterval(timer);
  }, [busy]);

  async function onFiles(list: FileList) {
    setError(null);
    setFileNote(null);
    setUploading(true);

    const added: { name: string; content: string; chars: number }[] = [];

    try {
      for (const file of Array.from(list)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/extract", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(`${file.name}:${data.error || "解析失败"}`);
          continue;
        }
        added.push({
          name: file.name,
          content: data.text,
          chars: data.chars,
        });
      }

      if (added.length > 0) {
        setFiles((prev) => [...prev, ...added]);
        setFileNote(`已添加 ${added.length} 个文件。`);
      }
    } catch {
      setError("文件上传失败,请重试或直接粘贴文字");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (title.trim().length < 2) {
      setError("先给这个嘴替起个名字(至少 2 个字)");
      return;
    }
    if (totalChars < 20) {
      setError("材料太短了,至少给 20 个字,它才有东西可讲");
      return;
    }

    setBusy(true);
    setHint(0);
    try {
      const res = await fetch("/api/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle,
          ownerName,
          content,
          files: files.map((file) => ({
            name: file.name,
            content: file.content,
          })),
          transparency,
          strictness,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "创建失败,请稍后再试");
        setBusy(false);
        return;
      }
      router.push(`/dashboard/capsules/${data.id}`);
      router.refresh();
    } catch {
      setError("网络出了点问题,请再试一次");
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="card flex min-h-[520px] flex-col items-center justify-center px-8 py-16 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-amber-300/30 [animation-duration:2.4s]" />
          <div className="absolute inset-3 animate-breathe rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-rose-400 blur-[2px]" />
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-amber-100 to-orange-200" />
          <span className="relative text-[22px] font-black text-orange-950">替</span>
        </div>

        <h2 className="mt-8 text-[1.2rem] font-semibold text-stone-900">
          {DISTILL_HINTS[hint]}
        </h2>
        <p className="mt-2 max-w-sm text-[13px] leading-6 text-stone-500">
          {demo
            ? "演示模式下会立刻完成。配置模型后,这一步会由大模型真正读懂你的材料。"
            : "正在把材料浓缩成知识底座、边界和预设问答,通常需要 10–30 秒。"}
        </p>

        <div className="mt-7 flex gap-1.5">
          {DISTILL_HINTS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= hint ? "w-6 bg-amber-500" : "w-1.5 bg-stone-200"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="card p-6 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">
              这个嘴替叫什么 <span className="text-amber-700">*</span>
            </label>
            <input
              id="title"
              required
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如:星辰项目汇报 / 十一出行方案 / 关于换工作的想法"
              className="field"
            />
          </div>

          <div>
            <label className="label" htmlFor="subtitle">
              一句话说明(可选)
            </label>
            <input
              id="subtitle"
              maxLength={160}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="对方打开链接时看到的第一句话"
              className="field"
            />
          </div>

          <div>
            <label className="label" htmlFor="ownerName">
              你的称呼(可选)
            </label>
            <input
              id="ownerName"
              maxLength={40}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="例如:张三。超纲时会说“已转给张三本人”"
              className="field"
            />
          </div>
        </div>
      </div>

      <div className="card p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <label className="label mb-0">项目文件</label>
            <p className="mt-1 text-[12px] leading-5 text-stone-500">
              一个项目可以放多个文件,单独保存、随时增删。支持 PDF / DOCX / TXT / MD,可多选。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,.csv"
              className="hidden"
              onChange={(e) => {
                const list = e.target.files;
                if (list && list.length) void onFiles(list);
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="btn-ghost px-3 py-2 text-[12.5px]"
            >
              {uploading ? "解析中…" : "添加文件"}
            </button>
          </div>
        </div>

        {files.length > 0 ? (
          <div className="mt-4 space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-stone-50/70 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-stone-800">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-stone-400">
                    {file.chars.toLocaleString()} 字
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFiles((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="shrink-0 text-[11px] text-stone-400 transition hover:text-rose-600"
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-stone-200 bg-stone-50/40 px-3 py-5 text-center text-[11.5px] text-stone-500">
            还没有文件。点「添加文件」,或直接在下面写。
          </p>
        )}

        <div className="mt-4">
          <label className="label" htmlFor="content">
            补充说明(可选)
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="额外的背景、你的判断、不能承诺的事;也可以直接粘贴文字。"
            className="field resize-y leading-7"
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-stone-500">
          <span>{totalChars.toLocaleString()} 字 · 单团最多 40 万字</span>
          <span>所有文件会切块索引 · 提问时按相关性检索约 8000 字</span>
        </div>

        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-emerald-50/70 px-3 py-2 text-[11.5px] leading-5 text-emerald-800">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
          原始材料只保存在你的控制台。对方打开链接后只能提问、看到回答,看不到这些文件。
        </p>

        {fileNote && (
          <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
            {fileNote}
          </p>
        )}
      </div>

      <div className="card p-6 sm:p-7">
        <h3 className="text-[14px] font-semibold text-stone-900">它怎么介绍自己</h3>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {transparencyOptions.map((opt) => (
            <label
              key={opt.value}
              className={`cursor-pointer rounded-xl border p-3.5 transition ${
                transparency === opt.value
                  ? "border-amber-500 bg-amber-50/70 ring-1 ring-amber-500/20"
                  : "border-stone-200 bg-white/60 hover:border-stone-300"
              }`}
            >
              <input
                type="radio"
                name="transparency"
                value={opt.value}
                checked={transparency === opt.value}
                onChange={() => setTransparency(opt.value)}
                className="sr-only"
              />
              <span className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-stone-900">{opt.title}</span>
                {transparency === opt.value && (
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                )}
              </span>
              <span className="mt-1.5 block text-[11.5px] leading-5 text-stone-500">
                {opt.desc}
              </span>
            </label>
          ))}
        </div>

        <h3 className="mt-6 text-[14px] font-semibold text-stone-900">
          拿不准的时候怎么办
        </h3>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {strictnessOptions.map((opt) => (
            <label
              key={opt.value}
              className={`cursor-pointer rounded-xl border p-3.5 transition ${
                strictness === opt.value
                  ? "border-amber-500 bg-amber-50/70 ring-1 ring-amber-500/20"
                  : "border-stone-200 bg-white/60 hover:border-stone-300"
              }`}
            >
              <input
                type="radio"
                name="strictness"
                value={opt.value}
                checked={strictness === opt.value}
                onChange={() => setStrictness(opt.value)}
                className="sr-only"
              />
              <span className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-stone-900">{opt.title}</span>
                {strictness === opt.value && (
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                )}
              </span>
              <span className="mt-1.5 block text-[11.5px] leading-5 text-stone-500">
                {opt.desc}
              </span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11.5px] leading-5 text-stone-500">
          {demo
            ? "演示模式:用本地规则模拟浓缩与回答,流程可完整跑通。"
            : "创建后仍可随时修改材料和设置。"}
        </p>
        <button type="submit" className="btn-primary shrink-0 px-6 py-3">
          生成嘴替
          <span aria-hidden>→</span>
        </button>
      </div>
    </form>
  );
}
