"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Clock } from "lucide-react";
import { shouldUnoptimizeImage } from "@/lib/utils";
import { CountdownText } from "./Countdown";

// A campaign that is switched on but has not started: a teaser with a live
// countdown, linking to its page (where the deals can be previewed).
export default function UpcomingSaleCard({ sale }) {
  const router = useRouter();
  const thumbs = sale.items.map((i) => i.product.images?.[0]).filter(Boolean).slice(0, 3);

  return (
    <Link href={`/flash-sale/${sale.slug}`} className="group flex min-w-0 flex-col">
      <div className="media-lift relative aspect-[4/3] overflow-hidden rounded-3xl bg-haze">
        {sale.bannerImage ? (
          <Image
            src={sale.bannerImage}
            alt=""
            fill
            unoptimized={shouldUnoptimizeImage(sale.bannerImage)}
            className="media-zoom object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className={`absolute inset-0 grid gap-px ${["", "grid-cols-1", "grid-cols-2", "grid-cols-3"][thumbs.length] || "grid-cols-3"}`}>
            {thumbs.map((src) => (
              <div key={src} className="relative">
                <Image src={src} alt="" fill unoptimized={shouldUnoptimizeImage(src)} className="media-zoom object-cover" sizes="15vw" />
              </div>
            ))}
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-beam px-3 py-1.5 text-[12px] font-semibold text-ink tabular-nums">
          <Clock size={13} strokeWidth={2.4} />
          Starts in <CountdownText target={sale.startsAt} onDone={() => router.refresh()} />
        </span>
        <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-paper-pure/90 text-ink backdrop-blur transition-colors duration-base ease-swift group-hover:bg-beam">
          <ArrowUpRight size={18} strokeWidth={2.2} />
        </span>
      </div>

      <div className="min-w-0 px-0.5 pt-4">
        <p className="break-words text-[17px] font-semibold leading-snug tracking-[-0.02em] text-ink">{sale.title}</p>
        {sale.subtitle && <p className="mt-1 line-clamp-2 break-words text-[14px] text-smoke">{sale.subtitle}</p>}
        <p className="mt-2 text-[13px] text-smoke">
          {sale.stats.count} deal{sale.stats.count === 1 ? "" : "s"}
          {sale.stats.maxDiscount > 0 && <> · up to {sale.stats.maxDiscount}% off</>} · Preview the deals
        </p>
      </div>
    </Link>
  );
}
