"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type WarmupStatus = "idle" | "warming" | "ready" | "error";

interface UseBackendWarmupOptions {
  /**
   * Optional override for the backend URL. Defaults to NEXT_PUBLIC_API_URL.
   */
  apiBaseUrl?: string;
  /**
   * Endpoint path that can safely be invoked without auth.
   */
  pingPath?: string;
  /**
   * Milliseconds to wait between retry attempts during the initial warmup.
   */
  retryDelayMs?: number;
  /**
   * Maximum number of attempts during the warmup cycle.
   */
  maxAttempts?: number;
  /**
   * Optional interval to keep the backend awake after the first success.
   */
  keepAliveMs?: number;
  /**
   * Abort the fetch if the backend does not respond within this window.
   */
  timeoutMs?: number;
}

interface BackendWarmupState {
  status: WarmupStatus;
  attempts: number;
  lastError: string | null;
  maxAttempts: number;
}

const DEFAULT_PING_PATH = "/genres";
const DEFAULT_RETRY_DELAY = 3000;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_KEEP_ALIVE = 5 * 60 * 1000; // 5 minutes
const DEFAULT_TIMEOUT = 15000;

export function useBackendWarmup(
  options: UseBackendWarmupOptions = {}
): BackendWarmupState {
  const {
    apiBaseUrl = process.env.NEXT_PUBLIC_API_URL,
    pingPath = DEFAULT_PING_PATH,
    retryDelayMs = DEFAULT_RETRY_DELAY,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    keepAliveMs = DEFAULT_KEEP_ALIVE,
    timeoutMs = DEFAULT_TIMEOUT,
  } = options;

  const [state, setState] = useState<BackendWarmupState>({
    status: apiBaseUrl ? "idle" : "ready",
    attempts: 0,
    lastError: null,
    maxAttempts,
  });

  const keepAliveId = useRef<ReturnType<typeof setInterval> | null>(null);

  const warmupUrl = useMemo(() => {
    if (!apiBaseUrl) return null;
    const trimmedBase = apiBaseUrl.endsWith("/")
      ? apiBaseUrl.slice(0, -1)
      : apiBaseUrl;
    const normalizedPath = pingPath.startsWith("/") ? pingPath : `/${pingPath}`;
    return `${trimmedBase}${normalizedPath}`;
  }, [apiBaseUrl, pingPath]);

  useEffect(() => {
    if (!warmupUrl) {
      return;
    }

    let cancelled = false;

    const cleanupKeepAlive = () => {
      if (keepAliveId.current) {
        clearInterval(keepAliveId.current);
        keepAliveId.current = null;
      }
    };

    const pingEndpoint = async () => {
      const controller = new AbortController();
      const timeoutRef = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${warmupUrl}?t=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(`Backend responded with ${response.status}`);
        }
        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to connect to backend.";
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            lastError: message,
            maxAttempts,
          }));
        }
        return false;
      } finally {
        clearTimeout(timeoutRef);
      }
    };

    const warmup = async () => {
      setState({
        status: "warming",
        attempts: 0,
        lastError: null,
        maxAttempts,
      });

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (cancelled) return;

        setState((prev) => ({
          ...prev,
          status: "warming",
          attempts: attempt,
          maxAttempts,
        }));

        const success = await pingEndpoint();
        if (cancelled) return;

        if (success) {
          setState({
            status: "ready",
            attempts: attempt,
            lastError: null,
            maxAttempts,
          });

          if (keepAliveMs > 0 && !keepAliveId.current) {
            keepAliveId.current = setInterval(() => {
              pingEndpoint().catch(() => {
                /* errors handled inside pingEndpoint */
              });
            }, keepAliveMs);
          }
          return;
        }

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }

      if (!cancelled) {
        setState((prev) => ({
          ...prev,
          status: "error",
          maxAttempts,
        }));
      }
    };

    warmup();

    return () => {
      cancelled = true;
      cleanupKeepAlive();
    };
  }, [warmupUrl, retryDelayMs, maxAttempts, keepAliveMs, timeoutMs]);

  return state;
}
