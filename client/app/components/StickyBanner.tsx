"use client";

import { StickyBanner } from "@/components/ui/sticky-banner";
import { useBackendWarmup } from "@/lib/use-backend-warmup";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  warming: "from-amber-500 to-orange-600 text-white",
  ready: "from-emerald-500 to-emerald-600 text-white",
  error: "from-rose-600 to-red-700 text-white",
} as const;

const STATUS_COPY = {
  warming: {
    title: "Warming up the backend…",
    body: "Render free tier idles after ~15 minutes. We are pinging it now so you get real results soon.",
  },
  ready: {
    title: "Backend is awake",
    body: "You are talking to a live Go API, no additional wait time expected.",
  },
  error: {
    title: "Still waking up",
    body: "The server needs a few more seconds. Refresh if the delay persists.",
  },
} as const;

const Spinner = () => (
  <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-b-transparent" />
  </span>
);

const StickyBannerPage = () => {
  const { status, attempts, lastError, maxAttempts } = useBackendWarmup();

  if (status === "idle") {
    return null;
  }

  const copy = STATUS_COPY[status];
  const gradient = STATUS_STYLES[status];
  const showAttempts = status === "warming" && attempts > 0;
  const showError = status === "error" && lastError;

  return (
    <div className="relative flex w-full flex-col overflow-y-auto">
      <StickyBanner
        className={cn(
          "bg-linear-to-b flex-col shadow-lg shadow-black/20",
          gradient,
        )}
        hideOnScroll={status === "ready"}
      >
        <div className="flex w-full flex-col gap-1 text-center text-sm sm:text-base">
          <p className="flex items-center justify-center font-semibold tracking-tight">
            {status === "warming" && <Spinner />}
            {copy.title}
          </p>
          <p className="opacity-90">{copy.body}</p>
          {showAttempts && (
            <p className="text-xs uppercase tracking-wide opacity-80">
              Attempt {attempts} of {maxAttempts}
            </p>
          )}
          {showError && <p className="text-xs text-white/90">{lastError}</p>}
        </div>
      </StickyBanner>
    </div>
  );
};

export default StickyBannerPage;
