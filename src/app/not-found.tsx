import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="blob left-[10%] top-[10%] h-72 w-72 bg-amber-200/50" />
      <div className="paper-grid absolute inset-0 opacity-30" />

      <div className="card relative z-10 w-full max-w-sm px-8 py-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300">
          <span className="text-[18px] font-black text-white">替</span>
        </div>
        <h1 className="mt-5 text-[1.2rem] font-bold tracking-tight text-stone-900">
          这里没有嘴替
        </h1>
        <p className="mt-2 text-[12.5px] leading-6 text-stone-500">
          链接可能已经失效,或者这个嘴替被删除了。
        </p>
        <Link href="/" className="btn-primary mt-6 px-5 py-2.5 text-[13px]">
          回到首页
        </Link>
      </div>
    </div>
  );
}
