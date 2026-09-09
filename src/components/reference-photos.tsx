"use client";
import { useEffect, useState } from "react";
import { api, message } from "@/lib/client";
export function ReferencePhotos({
  clientId,
  editable = false,
}: {
  clientId?: string;
  editable?: boolean;
}) {
  const [photos, setPhotos] = useState<{ id: string }[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    fetch(
      `/api/reference-photos${clientId ? `?client=${encodeURIComponent(clientId)}` : ""}`,
      { signal: c.signal },
    )
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos ?? []))
      .catch(() => {});
    return () => c.abort();
  }, [clientId]);
  return (
    <div className="policy-card">
      <h3>Style references</h3>
      <p>Private photos shared with Katie for your grooming visits.</p>
      {photos.map((p, i) => (
        <div key={p.id}>
          <a
            className="text-link"
            href={`/api/reference-photos?id=${p.id}`}
            target="_blank"
            rel="noreferrer"
          >
            View reference {i + 1}
          </a>
          {editable && (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/api/reference-photos", { id: p.id }, "DELETE");
                  setPhotos(photos.filter((x) => x.id !== p.id));
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {!photos.length && <p>No reference photos saved.</p>}
      {editable && (
        <label>
          Add a reference (JPEG, PNG or WebP, up to 2 MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                setError("Choose a photo under 2 MB.");
                return;
              }
              setBusy(true);
              setError("");
              try {
                const data = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () =>
                    resolve(String(reader.result).split(",")[1]);
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });
                const r = await api<{ id: string }>("/api/reference-photos", {
                  data,
                });
                setPhotos([...photos, r]);
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      )}
      <p role="status">{busy ? "Saving photo…" : error}</p>
    </div>
  );
}
