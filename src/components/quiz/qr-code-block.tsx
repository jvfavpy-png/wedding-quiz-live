"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

interface QRCodeBlockProps {
  value: string;
  label?: string;
  size?: number;
}

export function QRCodeBlock({ value, label, size = 220 }: QRCodeBlockProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#13294b",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (active) {
          setDataUrl(url);
        }
      })
      .catch(() => {
        if (active) {
          setDataUrl(null);
        }
      });

    return () => {
      active = false;
    };
  }, [size, value]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="grid place-items-center rounded-2xl bg-white p-3 shadow-xl shadow-[#13294b]/15"
        style={{ width: size + 24, minHeight: size + 24 }}
      >
        {dataUrl ? (
          <Image
            src={dataUrl}
            alt={label ?? "参加用QRコード"}
            width={size}
            height={size}
            unoptimized
          />
        ) : (
          <div className="grid place-items-center text-sm font-bold text-slate-500">QR生成中</div>
        )}
      </div>
      {label ? <p className="break-all text-center text-sm font-black text-[#13294b]">{label}</p> : null}
    </div>
  );
}
