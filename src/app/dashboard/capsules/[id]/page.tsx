import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { CopyLink } from "@/components/copy-link";
import { EscalationCard } from "@/components/escalation-card";
import { CapsuleSettings } from "@/components/capsule-settings";
import { CapsuleFiles } from "@/components/capsule-files";
import { ThreadLabelEditor } from "@/components/thread-label-editor";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/url";
import { parseKnowledge, parseLearnedQA } from "@/lib/knowledge";
import { visitorBadge, visitorLabel } from "@/lib/visitor";

export const dynamic = "force-dynamic";

const roleMeta: Record<string, { label: string; cls: string; bubble: string }> = {
  visitor: {
    label: "访客",
    cls: "bg-stone-100 text-stone-600",
    bubble: "border border-stone-200/80 bg-white text-stone-800",
  },
  assistant: {
    label: "嘴替",
    cls: "bg-amber-100 text-amber-800",
    bubble: "border border-amber-200/70 bg-amber-50/60 text-stone-800",
  },
  owner: {
    label: "本人 · 你",
    cls: "bg-emerald-100 text-emerald-800",
    bubble: "border border-emerald-200/70 bg-emerald-50/60 text-stone-800",
  },
};

function fmt(date: Date, withTime = false) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export default async function CapsuleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) redirect(`/login?next=/dashboard/capsules/${id}`);

  const capsule = await prisma.capsule.findUnique({
    where: { id },
    include: {
      escalations: { where: { status: "pending" }, orderBy: { createdAt: "asc" } },
      files: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, content: true },
      },
      threads: {
        orderBy: { lastActiveAt: "desc" },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  if (!capsule || capsule.ownerId !== user.id) notFound();

  const [answeredCount, contacts] = await Promise.all([
    prisma.escalation.count({
      where: { capsuleId: capsule.id, status: "answered" },
    }),
    prisma.contact.findMany({
      where: { capsuleId: capsule.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        note: true,
        token: true,
        lastActiveAt: true,
      },
    }),
  ]);

  const base = await getBaseUrl();
  const shareUrl = `${base}/c/${capsule.shareToken}`;
  const knowledge = parseKnowledge(capsule.knowledge);
  const learned = parseLearnedQA(capsule.learnedQA).slice().reverse();
  const messageCount = capsule.threads.reduce((sum, t) => sum + t.messages.length, 0);

  const transparencyLabel =
    capsule.transparency === "persona"
      ? "以本人名义"
      : capsule.transparency === "assistant"
        ? "助理身份"
        : "透明 · AI 代表";

  return (
    <div className="relative min-h-screen">
      <div className="blob left-[-14%] top-[-14%] h-[340px] w-[340px] bg-amber-200/40" />
      <div className="paper-grid absolute inset-0 opacity-30" />

      <header className="relative z-10 border-b border-stone-200/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Logo href="/dashboard" />
            <span className="hidden text-stone-300 sm:block">/</span>
            <Link
              href="/dashboard"
              className="hidden truncate text-[13px] text-stone-500 transition hover:text-stone-900 sm:block"
            >
              {capsule.title}
            </Link>
          </div>
          <div className="flex items-center gap-3 text-[12.5px]">
            <Link href="/dashboard" className="text-stone-500 transition hover:text-stone-900">
              ← 控制台
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-24 pt-8 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[1.7rem] font-bold tracking-tight text-stone-900">
                {capsule.title}
              </h1>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-medium text-stone-600 ring-1 ring-stone-200">
                {transparencyLabel}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-medium text-stone-600 ring-1 ring-stone-200">
                {capsule.strictness === "high" ? "严格模式" : "宽松模式"}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] text-stone-500">
              {capsule.subtitle || "把下面这个链接发给对方,就能开始对话。"}
            </p>
          </div>
        </div>

        {/* 分享条 */}
        <div className="card mt-5 flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-stone-400">
              分享链接
            </p>
            <p className="mt-1 truncate font-mono text-[12.5px] text-stone-700">{shareUrl}</p>
            <p className="mt-1 text-[10.5px] text-emerald-700">
              对方只能提问和看到回答,看不到原始材料
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <CopyLink
              value={shareUrl}
              label="复制链接"
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-stone-800"
            />
            <CopyLink
              value={`我把「${capsule.title}」整理成了一个可以直接提问的页面,你有问题直接问它:${shareUrl}`}
              label="复制转发话术"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-[12px] font-medium text-stone-600 transition hover:border-amber-300 hover:text-amber-800"
            />
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost px-3 py-2 text-[12px]"
            >
              打开看看 ↗
            </a>
          </div>
        </div>

        <div className="mt-5">
          <CapsuleFiles
            capsuleId={capsule.id}
            files={capsule.files.map((file) => ({
              id: file.id,
              name: file.name,
              chars: file.content.length,
            }))}
            notes={capsule.manualContent ?? ""}
          />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.32fr_0.68fr]">
          {/* 左列 */}
          <div className="space-y-5">
            <section className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-stone-900">等你回答</h2>
                  {capsule.escalations.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800">
                      {capsule.escalations.length}
                    </span>
                  )}
                </div>
                <span className="text-[11.5px] text-stone-500">
                  超纲的问题会出现在这里
                </span>
              </div>

              {capsule.escalations.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/40 px-4 py-8 text-center">
                  <p className="text-[13px] font-medium text-stone-600">
                    现在没有待回答的问题
                  </p>
                  <p className="mt-1 text-[12px] text-stone-500">
                    范围内的它自己答了;搞不定的会来找你。
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {capsule.escalations.map((esc) => {
                    const thread = capsule.threads.find((t) => t.id === esc.threadId);
                    return (
                      <EscalationCard
                        key={esc.id}
                        id={esc.id}
                        question={esc.question}
                        reason={esc.reason}
                        createdAt={fmt(esc.createdAt, true)}
                        visitorLabel={
                          thread
                            ? thread.visitorLabel || visitorLabel(thread.visitorId)
                            : "访客"
                        }
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <section className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-stone-900">对话记录</h2>
                <span className="text-[11.5px] text-stone-500">
                  {capsule.threads.length} 个对话 · {messageCount} 条消息
                </span>
              </div>

              {capsule.threads.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/40 px-4 py-8 text-center text-[12.5px] text-stone-500">
                  还没有人来问。把上面的链接发出去试试。
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {capsule.threads.map((thread) => (
                    <details
                      key={thread.id}
                      className="group rounded-xl border border-stone-200/80 bg-white/60"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-[10px] font-semibold text-stone-600">
                            {thread.visitorLabel?.slice(0, 1) ||
                              visitorBadge(thread.visitorId)}
                          </span>
                          <span className="truncate text-[12.5px] font-medium text-stone-700">
                            {thread.visitorLabel || visitorLabel(thread.visitorId)}
                          </span>
                          <span className="text-[11px] text-stone-400">
                            {thread.messages.length} 条
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-stone-400">
                          <span>{fmt(thread.lastActiveAt, true)}</span>
                          <span className="transition group-open:rotate-180">⌄</span>
                        </div>
                      </summary>

                      <div className="space-y-2.5 border-t border-stone-100 px-4 py-4">
                        <ThreadLabelEditor
                          threadId={thread.id}
                          label={
                            thread.visitorLabel ||
                            visitorLabel(thread.visitorId)
                          }
                        />
                        {thread.messages.map((m) => {
                          const meta = roleMeta[m.role] ?? roleMeta.assistant;
                          return (
                            <div key={m.id} className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className={`rounded px-1.5 py-0.5 text-[9.5px] font-semibold ${meta.cls}`}>
                                  {meta.label}
                                </span>
                                <span className="text-[10px] text-stone-400">
                                  {fmt(m.createdAt, true)}
                                </span>
                              </div>
                              <p
                                className={`whitespace-pre-wrap rounded-xl px-3 py-2 text-[12.5px] leading-6 ${meta.bubble}`}
                              >
                                {m.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </section>

            <section className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-stone-900">它已经学会的</h2>
                <span className="text-[11.5px] text-stone-500">
                  你亲自回答过的 {learned.length} 个问题
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-5 text-stone-500">
                这些问答会优先用于回答后续的同类问题,不再打扰你。
              </p>

              {learned.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/40 px-4 py-7 text-center text-[12.5px] text-stone-500">
                  还没有。等你回答第一个超纲问题后,它会从这里开始变聪明。
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {learned.map((qa, i) => (
                    <div key={`${qa.at}-${i}`} className="rounded-xl bg-stone-50/70 px-4 py-3">
                      <p className="text-[12px] font-medium text-stone-800">Q:{qa.q}</p>
                      <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-6 text-stone-600">
                        A:{qa.a}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* 右列 */}
          <aside className="space-y-5">
            <section className="card p-5">
              <h2 className="text-[14px] font-semibold text-stone-900">这个嘴替的状况</h2>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-stone-50 px-2 py-2.5">
                  <p className="text-[1.1rem] font-bold text-stone-900">
                    {capsule.escalations.length}
                  </p>
                  <p className="mt-0.5 text-[10px] text-stone-500">待回答</p>
                </div>
                <div className="rounded-lg bg-stone-50 px-2 py-2.5">
                  <p className="text-[1.1rem] font-bold text-stone-900">{answeredCount}</p>
                  <p className="mt-0.5 text-[10px] text-stone-500">已亲自答</p>
                </div>
                <div className="rounded-lg bg-stone-50 px-2 py-2.5">
                  <p className="text-[1.1rem] font-bold text-stone-900">{learned.length}</p>
                  <p className="mt-0.5 text-[10px] text-stone-500">已学会</p>
                </div>
              </div>
              <p className="mt-3 text-[10.5px] leading-5 text-stone-400">
                创建于 {fmt(capsule.createdAt)} · 最近更新 {fmt(capsule.updatedAt)}
              </p>
            </section>

            <section className="card p-5">
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <h2 className="text-[14px] font-semibold text-stone-900">
                    它现在知道什么
                  </h2>
                  <span className="text-[11px] text-stone-400">展开</span>
                </summary>

                <div className="mt-3 space-y-4">
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                      概要
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[12px] leading-6 text-stone-600">
                      {knowledge.summary || "暂无"}
                    </p>
                  </div>

                  {knowledge.keyPoints.length > 0 && (
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                        关键点
                      </p>
                      <ul className="mt-1 space-y-1 text-[12px] leading-6 text-stone-600">
                        {knowledge.keyPoints.map((point, i) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-emerald-700">
                      可以直接回答
                    </p>
                    <ul className="mt-1 space-y-1 text-[12px] leading-6 text-stone-600">
                      {knowledge.scope.canAnswer.length ? (
                        knowledge.scope.canAnswer.map((item, i) => (
                          <li key={i}>· {item}</li>
                        ))
                      ) : (
                        <li className="text-stone-400">—</li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-amber-700">
                      会转给你
                    </p>
                    <ul className="mt-1 space-y-1 text-[12px] leading-6 text-stone-600">
                      {knowledge.scope.cannotAnswer.length ? (
                        knowledge.scope.cannotAnswer.map((item, i) => (
                          <li key={i}>· {item}</li>
                        ))
                      ) : (
                        <li className="text-stone-400">—</li>
                      )}
                    </ul>
                  </div>

                  {knowledge.faq.length > 0 && (
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-stone-400">
                        预判问题
                      </p>
                      <ul className="mt-1 space-y-1.5 text-[12px] leading-6 text-stone-600">
                        {knowledge.faq.slice(0, 6).map((item, i) => (
                          <li key={i}>
                            <span className="font-medium text-stone-700">Q:{item.q}</span>
                            <span className="block text-stone-500">A:{item.a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            </section>

            <section className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-stone-900">绑定给谁</h2>
                <Link
                  href={`/dashboard/contacts?capsule=${capsule.id}`}
                  className="text-[11.5px] text-amber-700 transition hover:text-amber-900"
                >
                  + 绑定好友
                </Link>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-stone-500">
                绑定后,对方打开专属链接就能直接问,不用每次转发。
              </p>

              {contacts.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-stone-200 bg-stone-50/40 px-3 py-5 text-center text-[11.5px] text-stone-500">
                  还没有绑定好友
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {contacts.map((contact) => (
                    <li
                      key={contact.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-stone-50/70 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-stone-800">
                          {contact.name}
                        </p>
                        <p className="text-[10px] text-stone-400">
                          {contact.lastActiveAt
                            ? `最近 ${fmt(contact.lastActiveAt, true)}`
                            : "还没打开"}
                        </p>
                      </div>
                      <CopyLink
                        value={`${base}/f/${contact.token}`}
                        label="链接"
                        className="shrink-0 rounded-md border border-stone-200 bg-white px-2 py-1 text-[10.5px] font-medium text-stone-600 transition hover:border-amber-300 hover:text-amber-800"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card p-5">
              <h2 className="text-[14px] font-semibold text-stone-900">设置</h2>
              <div className="mt-3">
                <CapsuleSettings
                  id={capsule.id}
                  title={capsule.title}
                  subtitle={capsule.subtitle ?? ""}
                  ownerName={capsule.ownerName ?? ""}
                  transparency={capsule.transparency}
                  strictness={capsule.strictness}
                />
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
