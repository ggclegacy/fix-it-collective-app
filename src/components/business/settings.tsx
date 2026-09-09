"use client";
import { BusinessForm, text, amount } from "./forms";
export function TaskForm({
  providers,
}: {
  providers: { id: string; name: string }[];
}) {
  return (
    <BusinessForm
      action="task"
      label="Add task"
      build={(d) => ({
        professionalId: text(d, "provider"),
        title: text(d, "title"),
        dueDate: text(d, "date") || null,
      })}
    >
      <label>
        Task
        <input name="title" required maxLength={240} />
      </label>
      <div className="os-fields">
        <label>
          Workspace
          <select name="provider">
            {providers.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Due date
          <input type="date" name="date" />
        </label>
      </div>
    </BusinessForm>
  );
}
export function GoalForm({
  providers,
}: {
  providers: { id: string; name: string }[];
}) {
  return (
    <BusinessForm
      action="goal"
      label="Save monthly goal"
      build={(d) => ({
        professionalId: text(d, "provider"),
        amount: amount(d, "goal"),
      })}
    >
      <div className="os-fields">
        <label>
          Workspace
          <select name="provider">
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Monthly collected receipts goal ($)
          <input name="goal" type="number" min="1" step="0.01" required />
        </label>
      </div>
    </BusinessForm>
  );
}
export function TeamForm({
  members,
}: {
  members: { id: string; name: string; email: string }[];
}) {
  return (
    <BusinessForm
      action="team"
      label="Save permissions"
      build={(d) => ({
        userId: text(d, "user"),
        role: text(d, "role"),
        professionalId: text(d, "provider"),
        clinical: d.get("clinical") === "on",
      })}
    >
      <label>
        Existing staff account
        <select name="user" required>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.email}
            </option>
          ))}
        </select>
      </label>
      <div className="os-fields">
        <label>
          Business role
          <select name="role">
            <option value="provider">Provider · Assigned calendar</option>
            <option value="front_desk">
              Front desk · Assigned calendar, no clinical data
            </option>
            <option value="admin">Admin · Both business workspaces</option>
          </select>
        </label>
        <label>
          Provider assignment
          <select name="provider">
            <option value="pro-a">Katie</option>
            <option value="pro-b">Kamilla</option>
          </select>
        </label>
      </div>
      <label className="os-checks">
        <span>
          <input name="clinical" type="checkbox" /> Explicit clinical access
          (never front desk)
        </span>
      </label>
      <p className="os-muted">
        Clinical access is separate from ownership and business administration.
        Staff accounts are provisioned using the existing staff assignment
        process.
      </p>
    </BusinessForm>
  );
}
export function ResourceForm() {
  return (
    <BusinessForm
      action="resource"
      label="Add room / resource"
      build={(d) => ({
        name: text(d, "name"),
        providerIds: d.getAll("provider"),
      })}
    >
      <label>
        Room or resource name
        <input name="name" required maxLength={120} />
      </label>
      <fieldset>
        <legend>
          Every booking for these providers reserves this resource
        </legend>
        <div className="os-checks">
          <label>
            <input name="provider" type="checkbox" value="pro-a" />
            Katie
          </label>
          <label>
            <input name="provider" type="checkbox" value="pro-b" />
            Kamilla
          </label>
        </div>
      </fieldset>
    </BusinessForm>
  );
}
