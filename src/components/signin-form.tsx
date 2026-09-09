"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { api, message } from "@/lib/client";
export function SigninForm({
  next = "/account",
  demo = false,
  inline = false,
}: {
  next?: string;
  demo?: boolean;
  inline?: boolean;
}) {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(input: unknown) {
    setBusy(true);
    setError("");
    try {
      await api("/api/auth", input);
      if (!inline) router.push(next);
      router.refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-form">
      <div className="segmented">
        <button aria-pressed={!signup} onClick={() => setSignup(false)}>
          Sign in
        </button>
        <button aria-pressed={signup} onClick={() => setSignup(true)}>
          Create account
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void submit({
            action: signup ? "signup" : "signin",
            email: f.get("email"),
            password: f.get("password"),
            ...(signup ? { name: f.get("name") } : {}),
          });
        }}
      >
        {signup && (
          <label>
            Your name
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
            />
          </label>
        )}
        <label>
          Email address
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={signup ? 12 : 1}
            maxLength={128}
          />
        </label>
        {signup && (
          <small>
            Use at least 12 characters. Use sample information in this preview.
          </small>
        )}
        <button className="button navy full" disabled={busy}>
          {busy
            ? "Please wait…"
            : signup
              ? "Create your space"
              : "Welcome back"}{" "}
          <ArrowUpRight size={18} />
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {demo && (
        <div className="demo-entry">
          <span className="eyebrow">EXPLORE WITH SAMPLE DATA</span>
          <button
            className="button outline full"
            disabled={busy}
            onClick={() =>
              void submit({
                action: "demo",
                role: next.startsWith("/studio") ? "staff" : "client",
              })
            }
          >
            Enter {next.startsWith("/studio") ? "studio" : "client"} preview
          </button>
          <small>Development access only. No password needed.</small>
        </div>
      )}
    </div>
  );
}
