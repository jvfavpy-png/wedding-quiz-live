import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Monitor, PartyPopper, Settings, Smartphone } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fff8e7_0%,#ffffff_42%,#ffe1ea_72%,#dfe9ff_100%)] px-4 py-10 text-[#13294b]">
      <div className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-5xl content-center gap-8">
        <header className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-black shadow">
            <PartyPopper className="size-5 text-[#d89a22]" aria-hidden="true" />
            Wedding Quiz Live
          </div>
          <h1 className="text-5xl font-black leading-tight tracking-normal sm:text-6xl">
            会場でそのまま使えるリアルタイム早押しクイズ
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-700">
            主催者PC、ゲストのスマホ、プロジェクター表示を Supabase Realtime で同期します。
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Feature icon={<Settings className="size-7" />} title="主催者進行" text="問題開始、締切、正解発表、ランキング表示を phase で制御。" />
          <Feature icon={<Smartphone className="size-7" />} title="スマホ回答" text="localStorage 復元とDB制約で1問1回答を守ります。" />
          <Feature icon={<Monitor className="size-7" />} title="スクリーン表示" text="QR、カウントダウン、分布、TOP10を大きく表示。" />
        </div>

        <Link
          href="/admin"
          className="inline-flex min-h-14 w-fit items-center justify-center gap-2 rounded-xl bg-[#13294b] px-6 text-lg font-black text-white shadow-xl shadow-[#13294b]/20"
        >
          イベントを作成する
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <section className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-lg shadow-[#13294b]/10">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-[#ffe7a3] text-[#6d4b00]">
        {icon}
      </div>
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{text}</p>
    </section>
  );
}
