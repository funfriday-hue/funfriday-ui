"use client";

import { useEffect, useRef, useState } from "react";
import { ADSENSE_CLIENT } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = {
  slot?: string;
  className?: string;
  minHeightClassName?: string;
  fixedSize?: { width: number; height: number };
};

/**
 * A manual, responsive AdSense slot. It remains a labelled placeholder until
 * both the publisher ID and the page-specific slot ID are configured.
 */
export default function AdSlot({
  slot,
  className = "",
  minHeightClassName = "min-h-20",
  fixedSize,
}: AdSlotProps) {
  const loaded = useRef(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const isConfigured = Boolean(slot);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1440px)");
    const updateViewport = () => setIsDesktop(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!isDesktop || !isConfigured || loaded.current) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      loaded.current = true;
    } catch (error) {
      // Ad blockers and local development can prevent the AdSense script from loading.
      console.debug("AdSense slot was not available.", error);
    }
  }, [isConfigured, isDesktop, slot]);

  // Do not create hidden ad requests on mobile or tablet layouts.
  if (!isDesktop) return null;

  return (
    <div className={`flex ${minHeightClassName} items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 text-center ${className}`}>
      {isConfigured ? (
          <ins
            className="adsbygoogle block w-full"
            style={fixedSize
              ? { display: "inline-block", width: fixedSize.width, height: fixedSize.height }
              : { display: "block" }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={slot}
            {...(!fixedSize && {
              "data-ad-format": "auto",
              "data-full-width-responsive": "true",
            })}
        />
      ) : (
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[.28em] text-zinc-500">Advertisement</p>
          <p className="mt-1 text-xs text-zinc-600">Ad space</p>
        </div>
      )}
    </div>
  );
}
