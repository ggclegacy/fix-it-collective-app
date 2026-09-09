"use client";
import { useCallback, useEffect, useRef, useState } from "react";
const channelName = "fic-recovery-status";
/** Notifications carry no client identifiers, answers, or health details. */
export function announceIntakeSaved() {
  try {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage("saved");
    channel.close();
  } catch {
    /* Focus refresh works when BroadcastChannel is unavailable. */
  }
}
export function useRecoveryIntakeStatus(userId?: string, clientId?: string) {
  const scope = `${userId ?? ""}:${clientId ?? userId ?? ""}`;
  const [validatedScope, setValidatedScope] = useState("");
  const [hasIntake, setHasIntake] = useState(false);
  const [revision, setRevision] = useState(0);
  const [statusError, setStatusError] = useState("");
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!userId) return false;
    const ticket = ++generation.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await fetch(
        `/api/intake${clientId ? `?client=${encodeURIComponent(clientId)}` : ""}`,
        { cache: "no-store", signal: abort.signal },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Unable to check your saved intake. Try again.",
        );
      if (ticket !== generation.current) return null;
      setValidatedScope(scope);
      setHasIntake(Boolean(data.hasIntake));
      setRevision(data.revision ?? 0);
      setStatusError("");
      return Boolean(data.hasIntake);
    } catch (error) {
      if (abort.signal.aborted || ticket !== generation.current) return null;
      setValidatedScope(scope);
      setHasIntake(false);
      setStatusError(
        error instanceof Error
          ? error.message
          : "Unable to check your saved intake.",
      );
      return false;
    }
  }, [userId, clientId, scope]);
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const initialCheck = window.setTimeout(check, 0);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel(channelName);
      channel.onmessage = (event) => {
        if (event.data === "saved") check();
      };
    } catch {
      /* Focus refresh remains available. */
    }
    return () => {
      window.clearTimeout(initialCheck);
      // Invalidate every pending request, including refreshes started by user actions.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++generation.current;
      controller.current?.abort();
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      channel?.close();
    };
  }, [refresh]);
  // Never expose status from a previously signed-in user while unauthenticated.
  return {
    hasIntake: Boolean(userId) && validatedScope === scope && hasIntake,
    revision: userId && validatedScope === scope ? revision : 0,
    statusError: validatedScope === scope ? statusError : "",
    refresh,
  };
}
