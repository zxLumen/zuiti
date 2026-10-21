import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const steps = [
  {
    no: "01",
    title: "浓缩",
    text: "把项目总结、进度、你的立场,一股脑丢进来。它帮你提炼成一份有边界的知识底座。",
  },
  {
    no: "02",
    title: "绑定给谁",
    text: "生成一条专属链接,绑定给某个微信好友。之后对方随时打开都能继续问,不用每次转发。",
  },
  {
    no: "03",
    title: "挡不住的才找你",
    text: "范围内的它答;超纲的它说“我确认一下”,然后把问题递到你面前。",
  },
  {
    no: "04",
    title: "越用越懂你",
    text: "你答过一次的问题会沉淀回这个嘴替,下次同类问题它自己就接住了。",
  },
];

const scenes = [
  {
    tag: "向上汇报",
    title: "领导问细节,不用你随时在线",
    text: "把项目总结绑定给老板。进度、排期、风险它都能接;真正需要你拍板的,才来找你。",
  },
  {
    tag: "对外答疑",
    title: "客户/合作方反复问同一件事",
    text: "把方案、报价口径、常见问题做成一个嘴替,让对方自己问,你只处理例外。",
  },
  {
    tag: "与人沟通",
    title: "一个决定,不想每次从头解释",
    text: "把来龙去脉、你的考虑、你能接受的边界放进去。对方先跟它聊,聊完再找你。",
  },
];

function DemoChat() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-amber-100/70 via-orange-50/40 to-rose-100/50 blur-2xl" />
      <div className="card overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-stone-200/70 bg-white/70 px-5 py-3.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-rose-500">
            <span className="text-[12px] font-black text-white">替</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-stone-900">
              嘴替 · 项目汇报
            </p>
            <p className="text-[11px] text-stone-500">张三的 AI 代表 · 基于本人材料</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-600/15">
            在线
          </span>
        </div>

        <div className="space-y-3.5 bg-[#fcfaf6] px-5 py-5 text-[13px]">
          <div className="flex justify-end">
            <p className="max-w-[80%] rounded-2xl rounded-br-md bg-stone-900 px-3.5 py-2.5 leading-relaxed text-stone-50">
              这个项目现在进度怎么样?
            </p>
          </div>
          <div className="flex justify-start">
            <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-stone-200/80 bg-white px-3.5 py-2.5 leading-relaxed text-stone-800">
              目前整体完成约 70%。核心模块已经联调通过,剩下的是数据迁移和灰度,预计下周三进入内测。
            </p>
          </div>
          <div className="flex justify-end">
            <p className="max-w-[80%] rounded-2xl rounded-br-md bg-stone-900 px-3.5 py-2.5 leading-relaxed text-stone-50">
              预算能再加 10 万吗?
            </p>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              <p className="rounded-2xl rounded-bl-md border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 leading-relaxed text-stone-800">
                这个超出我这边能定的范围了。我已经把问题转给张三本人,TA 回复后会显示在这里。
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10.5px] font-medium text-amber-700 ring-1 ring-amber-600/15">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                已转给本人 · 等待回复
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-200/70 bg-white/70 px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl border border-stone-200/80 bg-white px-3 py-2 text-[12.5px] text-stone-400">
            问点什么…
            <span className="ml-auto rounded-lg bg-stone-900 px-2.5 py-1 text-[11px] font-medium text-white">
              发送
            </span>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-5 hidden rotate-[-3deg] rounded-xl border border-stone-200/80 bg-white/90 px-3 py-2 text-[11px] shadow-sm backdrop-blur sm:block">
        <span className="font-semibold text-stone-800">超纲了?</span>
        <span className="ml-1 text-stone-500">自动呼叫本人</span>
      </div>
    </div>
  );
}

export default function Home() {
  const demo = !process.env.LLM_API_KEY;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="blob animate-breathe left-[-12%] top-[-10%] h-[440px] w-[440px] bg-amber-200/70" />
      <div className="blob animate-breathe right-[-10%] top-[2%] h-[380px] w-[380px] bg-rose-200/50 [animation-delay:-4s]" />
      <div className="blob left-[38%] top-[38%] h-[300px] w-[300px] bg-orange-100/80 [animation-delay:-7s]" />

      <div className="paper-grid absolute inset-0 opacity-40" />

      <SiteHeader />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-8">
        <section className="grid gap-14 pb-24 pt-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-10 lg:pt-14">
          <div className="max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-200/90 bg-white/70 px-3 py-1 text-[11.5px] font-medium tracking-wide text-stone-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              沟通,不必实时 · 也不必重复
            </p>

            <h1 className="text-balance text-[2.55rem] font-black leading-[1.12] tracking-tight text-stone-900 sm:text-[3.15rem]">
              把想说的话,
              <br />
              <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                交给嘴替。
              </span>
            </h1>

            <p className="mt-6 text-[15px] leading-7 text-stone-600">
              微信里说不清、解释不完、总要重复同一件事?
              把一件事的材料放进去,绑定给某个好友。
              对方一开口,它就以你的名义回答;超出范围,才来找你本人。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/dashboard/new" className="btn-primary px-5 py-3 text-[14.5px]">
                创建我的第一个嘴替
                <span aria-hidden className="text-[15px]">→</span>
              </Link>
              <Link href="#how" className="btn-ghost px-4 py-3 text-[14px]">
                看看它怎么工作
              </Link>
            </div>

            <p className="mt-5 text-[12px] leading-5 text-stone-500">
              对方打开即可提问,无需注册
              <span className="mx-1.5 text-stone-300">·</span>
              可绑定给特定好友
              <span className="mx-1.5 text-stone-300">·</span>
              原始材料对对方不可见
              {demo && (
                <>
                  <span className="mx-1.5 text-stone-300">·</span>
                  <span className="text-amber-700">当前为演示模式,未配置模型</span>
                </>
              )}
            </p>
          </div>

          <DemoChat />
        </section>

        <section id="how" className="pb-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                How it works
              </p>
              <h2 className="mt-2 text-[1.7rem] font-bold tracking-tight text-stone-900">
                一次说清,剩下的交给它
              </h2>
            </div>
            <p className="max-w-sm text-[13px] leading-6 text-stone-500">
              它不是一个只会说“你好”的机器人,而是一个有材料、有边界、会求助的代表。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.no} className="card card-hover p-5">
                <span className="text-[11px] font-bold tracking-[0.18em] text-amber-600">
                  {step.no}
                </span>
                <h3 className="mt-3 text-[15.5px] font-semibold text-stone-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-[12.8px] leading-6 text-stone-500">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-24">
          <div className="mb-8">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              Use cases
            </p>
            <h2 className="mt-2 text-[1.7rem] font-bold tracking-tight text-stone-900">
              适合这些“说不清”的时刻
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {scenes.map((scene) => (
              <div key={scene.tag} className="card card-hover flex flex-col p-6">
                <span className="w-fit rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600">
                  {scene.tag}
                </span>
                <h3 className="mt-4 text-[16px] font-semibold leading-snug text-stone-900">
                  {scene.title}
                </h3>
                <p className="mt-2 text-[13px] leading-6 text-stone-500">{scene.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-stone-900 px-7 py-10 sm:px-12 sm:py-12">
            <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-amber-500/20 blur-3xl" />
            <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-rose-500/15 blur-3xl" />
            <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-[1.45rem] font-bold tracking-tight text-stone-50">
                  下一件想解释清楚的事,现在就放进去。
                </h2>
                <p className="mt-2 text-[13px] text-stone-400">
                  从一份项目汇报、一个方案,或一个你不想再说第十遍的决定开始。
                </p>
              </div>
              <Link
                href="/dashboard/new"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-[14px] font-semibold text-stone-950 transition hover:bg-amber-300"
              >
                创建嘴替 <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-stone-200/80 py-8 text-[12px] text-stone-500 sm:flex-row">
          <p>嘴替 · 把你浓缩的东西,放在那里跟别人交流</p>
          <p className="text-stone-400">
            {demo ? "演示模式 · 配置 LLM_API_KEY 后启用真实模型" : "已接入真实模型"}
          </p>
        </footer>
      </main>
    </div>
  );
}
