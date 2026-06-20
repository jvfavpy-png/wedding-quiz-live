import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardPlus,
  Laptop,
  Monitor,
  PartyPopper,
  PlayCircle,
  Smartphone,
  Trophy,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fbf6ec] text-[#13294b]">
      <header className="border-b border-[#eadcc4] bg-[#fffaf2]/90 px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <PartyPopper className="size-7 text-[#b89443]" aria-hidden="true" />
            <span className="text-2xl font-black tracking-normal">Wedding Quiz Live</span>
          </div>
          <Link href="/admin" className="text-sm font-black text-[#13294b]">
            イベント作成
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[1fr_380px] lg:items-center">
        <div>
          <div className="mb-5 flex items-center gap-3 text-sm font-black text-[#b89443]">
            <span className="h-px w-12 bg-[#b89443]" />
            会場でそのまま使える
            <span className="h-px w-12 bg-[#b89443]" />
          </div>
          <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-normal sm:text-6xl">
            結婚式・二次会のクイズを、事前に作って当日そのまま進行
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-bold leading-9 text-slate-700">
            イベント名、問題、選択肢、正解、得点を事前に保存できます。
            参加URLとスクリーンURLは、当日もそのまま使えます。
          </p>
          <p className="mt-3 text-base font-black text-[#b89443]">
            ゲストはアプリ不要。URLまたはQRコードから参加できます。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#b89443] px-6 text-lg font-black text-white shadow-xl shadow-[#b89443]/25"
            >
              <PlayCircle className="size-5" aria-hidden="true" />
              イベントを作成する
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            <a
              href="#how-to-use"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#c9a75c] bg-white px-6 text-lg font-black text-[#8a6a22]"
            >
              <BookOpen className="size-5" aria-hidden="true" />
              使い方を見る
              <ArrowRight className="size-5" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white bg-white/80 p-5 shadow-2xl shadow-[#13294b]/10">
          <div className="grid aspect-[4/5] place-items-center rounded-[1.5rem] bg-[linear-gradient(160deg,#fffaf2_0%,#f4ead9_50%,#fff_100%)] p-6 text-center">
            <div>
              <PartyPopper className="mx-auto size-16 text-[#b89443]" aria-hidden="true" />
              <p className="mt-6 text-sm font-black text-[#b89443]">Best Day Ever</p>
              <p className="mt-3 text-4xl font-black leading-tight tracking-normal">
                みんなで楽しむ
                <br />
                リアルタイムクイズ
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-14 md:grid-cols-3">
        <Feature icon={<Laptop className="size-10" />} role="主催者" title="主催者進行">
          問題の開始、締切、正解発表、ランキング表示まで、管理画面から進行できます。
        </Feature>
        <Feature icon={<Smartphone className="size-10" />} role="ゲスト" title="スマホ参加">
          ゲストは自分のスマホで参加できます。追加アプリのインストールは不要です。
        </Feature>
        <Feature icon={<Monitor className="size-10" />} role="会場スクリーン" title="スクリーン表示">
          QRコード、問題、回答数、ランキングを会場スクリーンに大きく表示できます。
        </Feature>
      </section>

      <section id="how-to-use" className="mx-auto max-w-6xl px-5 pb-16">
        <div className="mb-8 flex items-center justify-center gap-4">
          <span className="h-px flex-1 bg-[#eadcc4]" />
          <p className="text-sm font-black text-[#b89443]">使い方</p>
          <span className="h-px flex-1 bg-[#eadcc4]" />
        </div>
        <h2 className="text-center text-3xl font-black tracking-normal sm:text-4xl">
          3ステップでかんたん運用
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Step index={1} icon={<ClipboardPlus className="size-9" />} title="クイズを作成">
            イベント名、問題、選択肢、正解、得点を登録します。
          </Step>
          <Step index={2} icon={<Smartphone className="size-9" />} title="ゲストが参加">
            参加URLやQRコードから、スマホでそのまま参加できます。
          </Step>
          <Step index={3} icon={<Trophy className="size-9" />} title="クイズ開始">
            回答をリアルタイムに集計し、ランキングまで表示できます。
          </Step>
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  role,
  title,
  children,
}: {
  icon: ReactNode;
  role: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-3xl border border-white bg-white/88 p-6 text-center shadow-xl shadow-[#13294b]/10">
      <div className="mx-auto grid size-20 place-items-center rounded-2xl bg-[#fff6d8] text-[#9b7627]">
        {icon}
      </div>
      <p className="text-sm font-black text-[#9b7627]">{role}</p>
      <h2 className="text-2xl font-black tracking-normal">{title}</h2>
      <p className="text-sm font-bold leading-7 text-slate-700">{children}</p>
    </section>
  );
}

function Step({
  index,
  icon,
  title,
  children,
}: {
  index: number;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="relative grid gap-3 rounded-3xl bg-white/78 p-6 text-center shadow-lg shadow-[#13294b]/10">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#b89443] text-lg font-black text-white">
        {index}
      </div>
      <div className="mx-auto text-[#9b7627]">{icon}</div>
      <h3 className="text-xl font-black tracking-normal">{title}</h3>
      <p className="text-sm font-bold leading-7 text-slate-700">{children}</p>
    </section>
  );
}
