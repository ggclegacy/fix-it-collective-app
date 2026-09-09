import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { scopes } from "@/lib/business/access";
import {
  TaskForm,
  TeamForm,
  ResourceForm,
} from "@/components/business/settings";
import { ActionButton } from "@/components/business/forms";
export const metadata = { title: "Business OS · Workspace & system" };
export default async function More() {
  const user = await requireUser(true),
    ids = scopes(user),
    providers = ids.map((id) => ({
      id,
      name: id === "pro-a" ? "Katie" : "Kamilla",
    }));
  const groups = [
    [
      "Command",
      [
        ["Today", "/studio"],
        ["Calendar & waitlist", "/studio/calendar"],
        ["Tasks", "#tasks"],
      ],
    ],
    [
      "Clients",
      [
        ["Client 360 & intake", "/studio/clients"],
        ["Communications drafts", "/studio/clients"],
      ],
    ],
    [
      "Operations",
      [
        ["Checkout", "/studio/operations"],
        ["Products & inventory", "/studio/operations#inventory"],
      ],
    ],
    [
      "Business",
      [
        ["Revenue & performance", "/studio/business"],
        ["Services & reports", "/studio/business"],
        ["Goals", "/studio/business#goal"],
      ],
    ],
    [
      "Growth",
      [
        ["Opportunities", "/studio/growth"],
        ["Referrals & acquisition", "/studio/business#acquisition"],
      ],
    ],
    [
      "System",
      [
        ["Services, availability & policies", "/studio/settings"],
        ["Team & permissions", "#team"],
        ["Rooms & resources", "#resources"],
        ["Integrations", "#integrations"],
      ],
    ],
  ] as const;
  const tasks = (
    db()
      .prepare(
        "SELECT * FROM business_tasks WHERE status='open' ORDER BY due_date,created_at",
      )
      .all() as {
      id: string;
      title: string;
      professional_id: string;
      due_date: string | null;
    }[]
  ).filter((t) => ids.includes(t.professional_id));
  return (
    <>
      <header className="os-hero">
        <div>
          <p className="eyebrow">BUSINESS OS</p>
          <h1>Everything in its place.</h1>
          <p>
            Daily operations, focused workspaces, and the settings behind them.
          </p>
        </div>
      </header>
      <section className="os-panel" id="quick">
        <h2>Quick action.</h2>
        <div className="os-session-steps">
          <Link href="/studio/clients">Book a client ↗</Link>
          <Link href="/studio/operations">Start checkout ↗</Link>
          <a href="#tasks">Add task ↓</a>
          <Link href="/studio/calendar">Find next client ↗</Link>
        </div>
        <p className="os-muted">
          Open a calendar visit to enter Katie’s Chair Mode or Kamilla’s Session
          Mode.
        </p>
      </section>
      <div className="os-menu">
        {groups.map(([title, links]) => (
          <section className="os-panel" key={title}>
            <p className="eyebrow">{title}</p>
            {links.map(([label, href]) => (
              <Link href={href} key={label}>
                {label} ↗
              </Link>
            ))}
          </section>
        ))}
      </div>
      <section className="os-panel" id="tasks">
        <h2>Tasks.</h2>
        {tasks.map((t) => (
          <div className="os-attention" key={t.id}>
            <strong>{t.title}</strong>
            <p>{t.due_date ?? "No due date"}</p>
            <ActionButton action="task_done" data={{ id: t.id }}>
              Mark done
            </ActionButton>
          </div>
        ))}
        {!tasks.length && <p className="os-empty">No open tasks.</p>}
        <details>
          <summary>Add a task</summary>
          <TaskForm providers={providers} />
        </details>
      </section>
      {user.role === "owner" && (
        <>
          <section className="os-panel" id="team">
            <h2>Team & permissions.</h2>
            <TeamForm
              members={(
                db()
                  .prepare("SELECT id,name,email FROM users WHERE role='staff'")
                  .all() as { id: string; name: string; email: string }[]
              ).map((m) => ({ ...m }))}
            />
          </section>
          <section className="os-panel" id="resources">
            <h2>Rooms & resources.</h2>
            {(
              db()
                .prepare(
                  "SELECT r.name,GROUP_CONCAT(p.name) AS providers FROM resources r JOIN provider_resources pr ON pr.resource_id=r.id JOIN providers p ON p.id=pr.professional_id GROUP BY r.id",
                )
                .all() as { name: string; providers: string }[]
            ).map((r) => (
              <p key={r.name}>
                {r.name} · {r.providers}
              </p>
            ))}
            <ResourceForm />
          </section>
        </>
      )}
      <section className="os-panel" id="integrations">
        <h2>Integration readiness.</h2>
        <p>
          Cash checkout is available. Card processing and automatic message
          delivery are not connected.
        </p>
        <p className="os-muted">
          Notification jobs remain queued until a delivery adapter is installed.
          Message drafts are never sent automatically. Sensitive records require
          configured encryption and explicitly authorized practitioners.
        </p>
      </section>
    </>
  );
}
