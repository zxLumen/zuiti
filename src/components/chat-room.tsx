"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type ChatRoomProps = {
  token: string;
  title: string;
  subtitle: string | null;
  ownerName: string | null;
  transparency: string;
  demo: boolean;
  suggestions: string[];
  fixedVisitorId?: string;
  visitorLabel?: string;
};

function getVisitorId(token: string): string {
  const key = `yituan:visitor:${token}`;
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, next);
    return next;
  } catch {
    return `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function mergeMessages(prev: Message[], incoming: Message[]): Message[] {
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function makeTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function timeLabel(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export function ChatRoom(props: ChatRoomProps) {
  const { token, demo, suggestions } = props;

  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(0);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justEscalated, setJustEscalated] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const polling = useRef(false);

  useEffect(() => {
    // localStorage 只能在客户端读取:首次挂载后再确定访客身份
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitorId(props.fixedVisitorId ?? getVisitorId(token));
  }, [token, props.fixedVisitorId]);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const load = useCallback(
    async (vid: string, initial = false) => {
      if (polling.current) return;
      polling.current = true;
      try {
        const res = await fetch(
          `/api/chat?token=${encodeURIComponent(token)}&visitorId=${encodeURIComponent(vid)}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok || !data.ok) {
          if (initial) setError(data.error || "加载失败");
          return;
        }
        setMessages((prev) => mergeMessages(initial ? [] : prev, data.messages));
        setPending(data.pending ?? 0);
      } catch {
        if (initial) setError("网络不太稳定,请刷新重试");
      } finally {
        polling.current = false;
        if (initial) setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!visitorId) return;
    // 首次进入时拉取历史消息
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(visitorId, true);
  }, [visitorId, load]);

  // 轮询:接收本人回复
  useEffect(() => {
    if (!visitorId) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void load(visitorId);
    }, 6000);
    return () => clearInterval(timer);
  }, [visitorId, load]);

  useEffect(() => {
    scrollToBottom(messages.length > 0);
  }, [messages, sending, scrollToBottom]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending || !visitorId) return;

    setError(null);
    setSending(true);
    setJustEscalated(false);

    const tempId = makeTempId();
    const optimistic: Message = {
      id: tempId,
      role: "visitor",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          visitorId,
          content,
          ...(props.visitorLabel ? { visitorLabel: props.visitorLabel } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "发送失败,请重试");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInput(content);
        return;
      }

      setMessages((prev) =>
        mergeMessages(
          prev.filter((m) => m.id !== tempId),
          data.messages,
        ),
      );
      if (data.escalated) {
        setJustEscalated(true);
        setPending((p) => p + 1);
      }
    } catch {
      setError("网络出了点问题,请重试");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="card max-w-sm px-8 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-[18px]">
            ?
          </div>
          <h1 className="mt-4 text-[1.1rem] font-semibold text-stone-900">
            这个嘴替不存在或已失效
          </h1>
          <p className="mt-2 text-[12.5px] leading-6 text-stone-500">
            链接可能被删除了。请向发给你链接的人确认一下。
          </p>
        </div>
      </div>
    );
  }

  const persona = props.transparency === "persona";
  const owner = props.ownerName?.trim() || "对方";
  const identityLabel = persona
    ? null
    : props.transparency === "assistant"
      ? "沟通助理"
      : "AI 代表";
  const headerTitle = persona
    ? owner
    : props.transparency === "assistant"
      ? `${owner} 的助理`
      : props.title;
  const headerSubtitle = persona
    ? props.title
    : props.subtitle || `由 ${owner} 提供的材料生成`;

  return (
    <div className="flex h-[100dvh] flex-col bg-[#f7f4ee]">
      <header className="shrink-0 border-b border-stone-200/80 bg-[#faf7f1]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-rose-500 opacity-90 blur-[1px]" />
            <span className="absolute inset-[3px] rounded-full bg-gradient-to-br from-amber-100/90 to-rose-200/60" />
            <span className="relative text-[16px] font-black text-orange-950">
              {persona ? owner.slice(0, 1) : "一"}
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[15px] font-semibold text-stone-900">
                {headerTitle}
              </h1>
              {identityLabel && (
                <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[9.5px] font-medium text-stone-500 ring-1 ring-stone-200">
                  {identityLabel}
                </span>
              )}
              {demo && !persona && (
                <span className="hidden shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9.5px] font-medium text-amber-800 sm:inline">
                  演示
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-stone-500">{headerSubtitle}</p>
          </div>

          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-600/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            在线
          </span>
        </div>
      </header>

      <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-14 w-2/3 animate-pulse rounded-2xl bg-white/70" />
              <div className="ml-auto h-10 w-1/2 animate-pulse rounded-2xl bg-stone-200/70" />
              <div className="h-20 w-3/4 animate-pulse rounded-2xl bg-white/70" />
            </div>
          ) : messages.length === 0 ? (
            <div className="animate-fade-up pt-6 text-center sm:pt-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center">
                <span className="absolute h-16 w-16 animate-breathe rounded-full bg-gradient-to-br from-amber-200/80 via-orange-300/60 to-rose-200/70 blur-md" />
                <span className="relative text-[22px] font-black text-orange-950/80">替</span>
              </div>
              <h2 className="mt-5 text-[1.15rem] font-bold tracking-tight text-stone-900">
                {persona
                  ? "有什么想了解的,直接问我就行"
                  : `你可以直接问关于「${props.title}」的任何问题`}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-6 text-stone-500">
                {persona
                  ? `关于「${props.title}」的事,我知道的都会直接回你;需要确认的,我确认后再回。`
                  : `这里是 ${owner} 浓缩出来的一个代表。范围内的它直接答;超出范围的,会转给 ${owner} 本人,回复后自动出现在这里。`}
              </p>

              {suggestions.length > 0 && (
                <div className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-2">
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void send(q)}
                      className="rounded-full border border-stone-200 bg-white/80 px-3 py-1.5 text-[12px] text-stone-600 transition hover:border-amber-300 hover:text-amber-800"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-8 text-[10.5px] text-stone-400">
                {persona ? "对话仅双方可见" : `由「嘴替」生成 · 基于 ${owner} 提供的材料`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => {
                const isVisitor = m.role === "visitor";
                const isOwner = m.role === "owner";

                if (isVisitor) {
                  return (
                    <div key={m.id} className="flex animate-fade-up justify-end">
                      <div className="max-w-[82%]">
                        <p className="mb-1 text-right text-[10px] text-stone-400">
                          {timeLabel(m.createdAt)}
                        </p>
                        <p className="prose-chat rounded-2xl rounded-br-md bg-stone-900 px-4 py-2.5 text-[13.5px] text-stone-50">
                          {m.content}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id} className="flex animate-fade-up justify-start">
                    <div className="max-w-[86%]">
                      <p className="mb-1 flex items-center gap-1.5 text-[10px] text-stone-400">
                        {!persona &&
                          (isOwner ? (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">
                              {owner} 本人回复
                            </span>
                          ) : (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
                              嘴替
                            </span>
                          ))}
                        {timeLabel(m.createdAt)}
                      </p>
                      <p
                        className={`prose-chat rounded-2xl rounded-bl-md px-4 py-2.5 text-[13.5px] ${
                          !persona && isOwner
                            ? "border border-emerald-200/80 bg-emerald-50/80 text-stone-800"
                            : "border border-stone-200/80 bg-white text-stone-800"
                        }`}
                      >
                        {m.content}
                      </p>
                    </div>
                  </div>
                );
              })}

              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-stone-200/80 bg-white px-4 py-3">
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-stone-400" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-stone-400 [animation-delay:0.2s]" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-stone-400 [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-stone-200/80 bg-[#faf7f1]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {(pending > 0 || justEscalated) && (
            <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[11.5px] text-amber-900">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              {persona
                ? "我还在确认上面那条,稍后回复你。你可以先问别的。"
                : `有 ${pending || 1} 个问题已转给${owner}本人,TA 回复后会自动出现在这里。你可以继续问。`}
            </div>
          )}

          {error && (
            <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">
              {error}
            </p>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-stone-200/90 bg-white px-2.5 py-2 shadow-sm focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/10">
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder={persona ? "发消息…" : `问关于「${props.title}」的任何问题…`}
              className="max-h-[132px] flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13.5px] leading-6 text-stone-900 outline-none placeholder:text-stone-400"
            />
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={sending || !input.trim()}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white transition hover:bg-stone-800 disabled:opacity-30"
              aria-label="发送"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4.5 12h13m0 0-5-5m5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] leading-4 text-stone-400">
            {persona
              ? "仅双方可见"
              : `由「嘴替」生成 · 基于 ${owner} 提供的材料 · 超纲问题会转给本人`}
          </p>
        </div>
      </div>
    </div>
  );
}
