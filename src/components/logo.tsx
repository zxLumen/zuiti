import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      <span className="relative flex h-9 w-9 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-rose-500 opacity-90 blur-[1.5px] transition group-hover:opacity-100" />
        <span className="absolute inset-[3px] rounded-full bg-gradient-to-br from-amber-100/90 via-orange-200/70 to-rose-300/60" />
        <span className="relative text-[15px] font-black leading-none text-orange-950">
          替
        </span>
      </span>
      <span className="text-[17px] font-bold tracking-tight text-stone-900">
        嘴替
      </span>
    </Link>
  );
}
