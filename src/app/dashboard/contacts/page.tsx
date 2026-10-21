import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { CopyLink } from "@/components/copy-link";
import { ContactForm } from "@/components/contact-form";
import { DeleteContactButton } from "@/components/delete-contact-button";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/url";

export const metadata = { title: "好友绑定 · 嘴替" };
export const dynamic = "force-dynamic";

function fmt(date: Date | null) {
  if (!date) return "还没打开过";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ capsule?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/contacts");

  const { capsule: defaultCapsuleId } = await searchParams;

  const [contacts, capsules, pending] = await Promise.all([
    prisma.contact.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        capsule: { select: { id: true, title: true, transparency: true } },
        threads: { select: { id: true } },
      },
    }),
    prisma.capsule.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.escalation.findMany({
      where: { status: "pending", thread: { contact: { ownerId: user.id } } },
      select: { threadId: true },
    }),
  ]);

  const pendingThreads = new Set(pending.map((item) => item.threadId));
  const base = await getBaseUrl();

  return (
    <div className="relative min-h-screen">
      <div className="blob left-[-14%] top-[-14%] h-[340px] w-[340px] bg-amber-200/40" />
      <div className="paper-grid absolute inset-0 opacity-30" />

      <header className="relative z-10 border-b border-stone-200/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-5">
            <Logo href="/dashboard" />
            <nav className="flex items-center gap-1 text-[12.5px]">
              <Link
                href="/dashboard"
                className="rounded-lg px-2.5 py-1.5 text-stone-500 transition hover:bg-white/70 hover:text-stone-900"
              >
                我的嘴替
              </Link>
              <span className="rounded-lg bg-white px-2.5 py-1.5 font-medium text-stone-900 ring-1 ring-stone-200">
                好友绑定
              </span>
              <Link
                href="/dashboard/settings"
                className="rounded-lg px-2.5 py-1.5 text-stone-500 transition hover:bg-white/70 hover:text-stone-900"
              >
                设置
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-[12.5px]">
            <span className="hidden max-w-[180px] truncate text-[12px] text-stone-500 sm:block">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-24 pt-9 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              Contacts
            </p>
            <h1 className="mt-1.5 text-[1.85rem] font-bold tracking-tight text-stone-900">
              好友绑定
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-stone-500">
              给每个好友分配一个嘴替。你不需要每次转发 —— 对方保存专属链接后,
              随时打开都能继续问;你只在超纲时被叫到。
            </p>
          </div>
          <Link href="/dashboard/new" className="btn-ghost px-3.5 py-2 text-[12.5px]">
            + 新建嘴替
          </Link>
        </div>

        <section className="card mt-6 p-5 sm:p-6">
          <h2 className="text-[14px] font-semibold text-stone-900">绑定一个新好友</h2>
          <p className="mt-1 text-[11.5px] leading-5 text-stone-500">
            选好这个嘴替要代表你去面对谁。生成链接后,发给对应的微信好友即可。
          </p>
          <div className="mt-4">
            <ContactForm capsules={capsules} defaultCapsuleId={defaultCapsuleId} />
          </div>
        </section>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-stone-900">
            已绑定 · {contacts.length}
          </h2>
          <p className="text-[11.5px] text-stone-400">
            链接就是身份:同一条链接打开,对话是连续的
          </p>
        </div>

        {contacts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white/40 px-6 py-14 text-center">
            <p className="text-[14px] font-medium text-stone-700">还没有绑定好友</p>
            <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-6 text-stone-500">
              先在上面选一个嘴替、填个备注名,生成一条专属链接。
              把链接发给对方,对方一开口,这个嘴替就会以你的名义回答。
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {contacts.map((contact) => {
              const link = `${base}/f/${contact.token}`;
              const pendingCount = contact.threads.filter((t) =>
                pendingThreads.has(t.id),
              ).length;
              const identity =
                contact.capsule.transparency === "persona"
                  ? "以你的名义"
                  : contact.capsule.transparency === "assistant"
                    ? "助理身份"
                    : "透明 AI";

              return (
                <div key={contact.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-rose-200 text-[13px] font-bold text-orange-950">
                        {contact.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[14.5px] font-semibold text-stone-900">
                            {contact.name}
                          </h3>
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                            {identity}
                          </span>
                          {pendingCount > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-600/15">
                              {pendingCount} 待答
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-stone-500">
                          {contact.note || "—"}
                        </p>
                        <p className="mt-1.5 text-[11.5px] text-stone-500">
                          绑定:
                          <Link
                            href={`/dashboard/capsules/${contact.capsule.id}`}
                            className="ml-1 font-medium text-amber-700 hover:text-amber-900"
                          >
                            {contact.capsule.title} →
                          </Link>
                          <span className="mx-1.5 text-stone-300">·</span>
                          <span className="text-stone-400">{fmt(contact.lastActiveAt)}</span>
                        </p>
                      </div>
                    </div>

                    <DeleteContactButton id={contact.id} name={contact.name} />
                  </div>

                  <div className="mt-4 flex flex-col gap-2 rounded-xl bg-stone-50/70 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="truncate font-mono text-[11.5px] text-stone-600">{link}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      <CopyLink
                        value={link}
                        label="复制链接"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-2.5 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-stone-800"
                      />
                      <CopyLink
                        value={`我把「${contact.capsule.title}」整理成了一个可以直接问的页面,你有问题直接在这里问我就行:${link}`}
                        label="复制话术"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11.5px] font-medium text-stone-600 transition hover:border-amber-300 hover:text-amber-800"
                      />
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg px-2 py-1.5 text-[11.5px] font-medium text-stone-500 transition hover:text-stone-900"
                      >
                        打开 ↗
                      </a>
                    </div>
                  </div>

                  <p className="mt-2 text-[10.5px] leading-4 text-stone-400">
                    这条链接等同于对方身份,不要发到公开群;对方转发给别人,别人也会共用这段对话。
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
