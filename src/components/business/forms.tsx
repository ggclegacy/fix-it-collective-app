"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, message } from "@/lib/client";
export function BusinessForm({
  action,
  children,
  build,
  label = "Save",
  success = "Saved.",
  onSaved,
}: {
  action: string;
  children: React.ReactNode;
  build: (data: FormData) => unknown;
  label?: string;
  success?: string;
  onSaved?: (result: Record<string, unknown>) => void;
}) {
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const router = useRouter();
  return (
    <form
      className="os-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        setStatus("");
        try {
          const result = await api("/api/business", {
            action,
            data: build(new FormData(form)),
          });
          setStatus(success);
          onSaved?.(result);
          router.refresh();
        } catch (e) {
          setStatus(message(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      <button className="button navy" disabled={busy}>
        {busy ? "Saving…" : label}
      </button>
      <p role="status">{status}</p>
    </form>
  );
}
export function ActionButton({
  action,
  data,
  children,
  confirm = false,
}: {
  action: string;
  data: unknown;
  children: React.ReactNode;
  confirm?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState(!confirm);
  const router = useRouter();
  return (
    <div className="os-action">
      {!ready ? (
        <button className="button small" onClick={() => setReady(true)}>
          {children}
        </button>
      ) : (
        <button
          className="button small"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await api("/api/business", { action, data });
              router.refresh();
              setReady(!confirm);
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : confirm ? "Confirm" : children}
        </button>
      )}
      {ready && confirm && (
        <button className="text-link" onClick={() => setReady(false)}>
          Keep as is
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export const text = (d: FormData, key: string) => String(d.get(key) ?? "");
export const amount = (d: FormData, key: string) =>
  Math.round(Number(d.get(key) ?? 0) * 100);
export const optionalNumber = (d: FormData, key: string) =>
  text(d, key) ? Number(d.get(key)) : null;
