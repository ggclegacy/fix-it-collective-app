import { db, closeDatabase } from "../src/lib/db";
const [email, assignment] = process.argv.slice(2);
if (!email || !["owner", "pro-a", "pro-b"].includes(assignment)) {
  console.error(
    "Usage: node --import tsx scripts/assign-staff.ts existing-account-email owner|pro-a|pro-b",
  );
  process.exit(1);
}
const user = db()
  .prepare("SELECT id FROM users WHERE email=?")
  .get(email.toLowerCase()) as { id: string } | undefined;
if (!user) throw new Error("Create the account through sign-up first.");
db()
  .prepare("UPDATE users SET role=? WHERE id=?")
  .run(assignment === "owner" ? "owner" : "staff", user.id);
if (assignment !== "owner")
  db()
    .prepare(
      "INSERT INTO staff_assignments VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET professional_id=excluded.professional_id",
    )
    .run(user.id, assignment);
closeDatabase();
console.log("Account access updated.");
