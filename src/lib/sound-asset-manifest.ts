import type { SoundKey } from "@/types/quiz";

export interface BundledSoundAssetNotice {
  file: string;
  purpose: string;
  author: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  commercialUse: "OK" | "NG" | "unknown";
  redistribution: "OK" | "NG" | "unknown";
  modification: "OK" | "NG" | "unknown";
  attributionRequired: boolean;
}

export const providedSoundAssetUrls: Partial<Record<SoundKey, string>> = {
  start: "/sounds/provided/start.mp3",
  countdown: "/sounds/provided/countdown.mp3",
  reveal: "/sounds/provided/reveal.mp3",
  correct: "/sounds/provided/correct.mp3",
  wrong: "/sounds/provided/wrong.mp3",
  winner: "/sounds/provided/winner.mp3",
};

export const bundledSoundAssets: BundledSoundAssetNotice[] = [
  {
    file: "public/sounds/provided/start.mp3",
    purpose: "問題開始SE",
    author: "User provided",
    sourceUrl: "F:/動画/music/問題開始.mp3",
    license: "User provided for this project",
    licenseUrl: "",
    commercialUse: "unknown",
    redistribution: "unknown",
    modification: "unknown",
    attributionRequired: false,
  },
  {
    file: "public/sounds/provided/countdown.mp3",
    purpose: "カウントダウンSE",
    author: "User provided",
    sourceUrl: "F:/動画/music/カウントダウン.mp3",
    license: "User provided for this project",
    licenseUrl: "",
    commercialUse: "unknown",
    redistribution: "unknown",
    modification: "unknown",
    attributionRequired: false,
  },
  {
    file: "public/sounds/provided/reveal.mp3",
    purpose: "正解発表前SE",
    author: "User provided",
    sourceUrl: "F:/動画/music/正解発表前.mp3",
    license: "User provided for this project",
    licenseUrl: "",
    commercialUse: "unknown",
    redistribution: "unknown",
    modification: "unknown",
    attributionRequired: false,
  },
  {
    file: "public/sounds/provided/correct.mp3",
    purpose: "正解SE",
    author: "User provided",
    sourceUrl: "F:/動画/music/正解.mp3",
    license: "User provided for this project",
    licenseUrl: "",
    commercialUse: "unknown",
    redistribution: "unknown",
    modification: "unknown",
    attributionRequired: false,
  },
  {
    file: "public/sounds/provided/wrong.mp3",
    purpose: "不正解SE",
    author: "User provided",
    sourceUrl: "F:/動画/music/不正解.mp3",
    license: "User provided for this project",
    licenseUrl: "",
    commercialUse: "unknown",
    redistribution: "unknown",
    modification: "unknown",
    attributionRequired: false,
  },
  {
    file: "public/sounds/provided/winner.mp3",
    purpose: "1位発表SE",
    author: "User provided",
    sourceUrl: "F:/動画/music/1位発表.mp3",
    license: "User provided for this project",
    licenseUrl: "",
    commercialUse: "unknown",
    redistribution: "unknown",
    modification: "unknown",
    attributionRequired: false,
  },
];
