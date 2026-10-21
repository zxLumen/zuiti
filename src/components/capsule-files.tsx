"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type FileItem = {
  id: string;
  name: string;
  chars: number;
};

type NewFile = {
  name: string;
  content: string;
  chars: number;
};

export function CapsuleFiles({
  capsuleId,
  files,
  notes,
}: {
  capsuleId: string;
  files: FileItem[];
  notes: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<NewFile[]>([]);
  const [notesValue, setNotesValue] = useState(notes);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    name: string;
    content: string;
    loading: boolean;
  } | null>(null);

  const visibleExisting = files.filter((file) => !deletedIds.includes(file.id));
  const existingChars = visibleExisting.reduce((sum, file) => sum + file.chars, 0);
  const newChars = newFiles.reduce((sum, file) => sum + file.chars, 0);
  const totalChars = existingChars + newChars + notesValue.trim().length;

  async function onFiles(list: FileList) {
    setError(null);
    setMessage(null);
    setUploading(true);

    const added: NewFile[] = [];
    const notices: string[] = [];

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

        if (data.ocr) {
          notices.push(
            `${file.name}:扫描件已 OCR${
              data.pages ? ` ${data.pages} 页` : ""
            }`,
          );
        }
        if (data.warning) notices.push(`${file.name}:${data.warning}`);

        added.push({
          name: file.name,
          content: data.text,
          chars: data.chars,
        });
      }

      if (added.length > 0) {
        setNewFiles((prev) => [...prev, ...added]);
      }
      if (notices.length > 0) {
        setMessage(notices.join(";"));
      }
    } catch {
      setError("文件上传失败,请重试");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (busy || uploading) return;
    setError(null);
    setMessage(null);
    setBusy(true);

    try {
      const res = await fetch(`/api/capsules/${capsuleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deleteFileIds: deletedIds,
          newFiles: newFiles.map((file) => ({
            name: file.name,
            content: file.content,
          })),
          notes: notesValue,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "保存失败");
        return;
      }

      setDeletedIds([]);
      setNewFiles([]);
      setMessage("材料已更新,并重新浓缩。");
      router.refresh();
    } catch {
      setError("网络出了点问题,请重试");
    } finally {
      setBusy(false);
    }
  }

  async function previewExisting(file: FileItem) {
    setPreview({ name: file.name, content: "", loading: true });
    try {
      const res = await fetch(`/api/capsules/${capsuleId}/files/${file.id}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "加载失败");
      }
      setPreview({
        name: data.file.name,
        content: data.file.content,
        loading: false,
      });
    } catch (previewError) {
      setPreview({
        name: file.name,
        content:
          previewError instanceof Error ? previewError.message : "加载失败",
        loading: false,
      });
    }
  }

  function previewNew(file: NewFile) {
    setPreview({ name: file.name, content: file.content, loading: false });
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-stone-900">材料文件</h2>
          <p className="mt-1 max-w-xl text-[11.5px] leading-5 text-stone-500">
            每个项目文件单独保存,可以随时增删。保存后会重新浓缩并重建索引。
            提问时按相关性检索约 8000 字发给模型,不是只读开头。
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11.5px] text-stone-500">
            {totalChars.toLocaleString()} 字 · 上限 40 万字
          </span>
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
            className="btn-ghost px-3 py-2 text-[12px]"
          >
            {uploading ? "解析中…" : "添加文件"}
          </button>
        </div>
      </div>

      {uploading && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11.5px] leading-5 text-amber-800">
          正在解析文件。扫描件 OCR 通常需要几十秒,请保持页面打开,不要重复点击。
        </p>
      )}

      <div className="mt-4 space-y-2">
        {visibleExisting.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-stone-50/70 px-3 py-2"
          >
            <button
              type="button"
              onClick={() => void previewExisting(file)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-[12.5px] font-medium text-stone-800">
                {file.name}
              </p>
              <p className="mt-0.5 text-[10.5px] text-stone-400">
                {file.chars.toLocaleString()} 字 · 点击预览
              </p>
            </button>
            <button
              type="button"
              onClick={() => setDeletedIds((prev) => [...prev, file.id])}
              className="shrink-0 text-[11px] text-stone-400 transition hover:text-rose-600"
            >
              删除
            </button>
          </div>
        ))}

        {newFiles.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-2"
          >
            <button
              type="button"
              onClick={() => previewNew(file)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-[12.5px] font-medium text-stone-800">
                {file.name}
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9.5px] text-amber-800">
                  待保存
                </span>
              </p>
              <p className="mt-0.5 text-[10.5px] text-stone-400">
                {file.chars.toLocaleString()} 字 · 点击预览
              </p>
            </button>
            <button
              type="button"
              onClick={() =>
                setNewFiles((prev) => prev.filter((_, i) => i !== index))
              }
              className="shrink-0 text-[11px] text-amber-700 transition hover:text-rose-600"
            >
              移除
            </button>
          </div>
        ))}

        {visibleExisting.length === 0 && newFiles.length === 0 && (
          <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50/40 px-3 py-5 text-center text-[11.5px] text-stone-500">
            还没有文件。点「添加文件」,或在下面写补充说明。
          </p>
        )}
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="capsule-notes">
          补充说明(可选)
        </label>
        <textarea
          id="capsule-notes"
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          rows={4}
          placeholder="额外的背景、你的判断、不能承诺的事……"
          className="field resize-y leading-7"
        />
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-stone-400">
          删除文件后,点保存才会生效。
        </p>
        <button
          type="button"
          onClick={save}
          disabled={busy || uploading}
          className="btn-primary px-4 py-2.5 text-[13px]"
        >
          {busy ? "保存并浓缩…" : "保存并重新浓缩"}
        </button>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-3.5">
              <p className="truncate text-[13px] font-semibold text-stone-900">
                {preview.name}
              </p>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="shrink-0 rounded-lg px-2 py-1 text-[12px] text-stone-500 transition hover:bg-stone-100"
              >
                关闭
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {preview.loading ? (
                <p className="text-[12.5px] text-stone-500">正在加载…</p>
              ) : (
                <pre className="whitespace-pre-wrap break-words font-sans text-[12.5px] leading-7 text-stone-700">
                  {preview.content || "没有可预览的文字。"}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
