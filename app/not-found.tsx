import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-28 text-center">
      <p className="font-mono text-6xl font-black text-stone-200 dark:text-stone-700">
        404
      </p>
      <h1 className="mt-4 text-xl font-bold text-stone-900 dark:text-stone-100">
        这一页不存在
      </h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
        可能被移走了，或者地址写错了。
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-green-800 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-900 dark:bg-green-400 dark:text-stone-950 dark:hover:bg-green-300"
      >
        回到首页
      </Link>
    </div>
  );
}
