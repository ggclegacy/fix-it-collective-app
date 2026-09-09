import type { DatabaseSync } from "node:sqlite";
import { professionals, services, studio } from "../catalog";
/** Additive migration: existing client IDs, booking rows and public URLs remain authoritative. */
function migrateFoundation(d: DatabaseSync) {
  d.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY,applied_at TEXT NOT NULL);`,
  );
  if (
    d
      .prepare("SELECT 1 FROM schema_migrations WHERE version='business-os-1'")
      .get()
  )
    return;
  d.exec("BEGIN IMMEDIATE");
  try {
    if (
      d
        .prepare(
          "SELECT 1 FROM schema_migrations WHERE version='business-os-1'",
        )
        .get()
    ) {
      d.exec("COMMIT");
      return;
    }
    d.exec(`
CREATE TABLE organizations(id TEXT PRIMARY KEY,name TEXT NOT NULL);
CREATE TABLE locations(id TEXT PRIMARY KEY,organization_id TEXT NOT NULL REFERENCES organizations(id),name TEXT NOT NULL,timezone TEXT NOT NULL);
CREATE TABLE providers(id TEXT PRIMARY KEY,location_id TEXT NOT NULL REFERENCES locations(id),name TEXT NOT NULL,discipline TEXT NOT NULL);
CREATE TABLE service_catalog(id TEXT PRIMARY KEY,name TEXT NOT NULL);
CREATE TABLE team_roles(user_id TEXT PRIMARY KEY REFERENCES users(id),role TEXT NOT NULL CHECK(role IN ('admin','provider','front_desk')),clinical INTEGER NOT NULL DEFAULT 0 CHECK(clinical IN (0,1)));
CREATE TABLE resources(id TEXT PRIMARY KEY,location_id TEXT NOT NULL REFERENCES locations(id),name TEXT NOT NULL);
CREATE TABLE provider_resources(professional_id TEXT NOT NULL REFERENCES providers(id),resource_id TEXT NOT NULL REFERENCES resources(id),PRIMARY KEY(professional_id,resource_id));
CREATE TABLE client_relationships(client_id TEXT NOT NULL REFERENCES users(id),professional_id TEXT NOT NULL REFERENCES providers(id),occupation TEXT NOT NULL DEFAULT '',preferences TEXT NOT NULL DEFAULT '',tags TEXT NOT NULL DEFAULT '',return_days INTEGER CHECK(return_days BETWEEN 1 AND 365),referral_source TEXT NOT NULL DEFAULT '',communication TEXT NOT NULL DEFAULT 'Use client consent',updated_at TEXT NOT NULL,PRIMARY KEY(client_id,professional_id));
CREATE TABLE appointment_sources(appointment_id TEXT PRIMARY KEY REFERENCES appointments(id),source TEXT NOT NULL DEFAULT 'direct');
CREATE TABLE service_notes(id TEXT PRIMARY KEY,appointment_id TEXT NOT NULL REFERENCES appointments(id),author_id TEXT NOT NULL REFERENCES users(id),body TEXT NOT NULL,products TEXT NOT NULL,return_days INTEGER CHECK(return_days BETWEEN 1 AND 365),created_at TEXT NOT NULL);
CREATE TABLE soap_revisions(id TEXT PRIMARY KEY,appointment_id TEXT NOT NULL REFERENCES appointments(id),revision INTEGER NOT NULL,author_id TEXT NOT NULL REFERENCES users(id),payload TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(appointment_id,revision));
CREATE TABLE products(id TEXT PRIMARY KEY,sku TEXT UNIQUE NOT NULL,name TEXT NOT NULL,brand TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>=0),tax_bps INTEGER NOT NULL DEFAULT 0 CHECK(tax_bps BETWEEN 0 AND 2500),low_stock INTEGER NOT NULL DEFAULT 3 CHECK(low_stock>=0),replenish_days INTEGER CHECK(replenish_days BETWEEN 1 AND 365),active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE orders(id TEXT PRIMARY KEY,request_key TEXT UNIQUE NOT NULL,request_hash TEXT NOT NULL,client_id TEXT NOT NULL REFERENCES users(id),professional_id TEXT NOT NULL REFERENCES providers(id),appointment_id TEXT UNIQUE REFERENCES appointments(id),subtotal INTEGER NOT NULL CHECK(subtotal>=0),discount INTEGER NOT NULL CHECK(discount>=0),tax INTEGER NOT NULL CHECK(tax>=0),tip INTEGER NOT NULL CHECK(tip>=0),total INTEGER NOT NULL CHECK(total>=0),status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','paid','refunded','void')),created_at TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES users(id));
CREATE TABLE order_items(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),product_id TEXT REFERENCES products(id),service_id TEXT REFERENCES service_catalog(id),label TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),unit_price INTEGER NOT NULL CHECK(unit_price>=0),discount INTEGER NOT NULL CHECK(discount>=0),tax INTEGER NOT NULL CHECK(tax>=0));
CREATE TABLE order_payments(id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),event_key TEXT UNIQUE NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('cash','provider','refund')),amount INTEGER NOT NULL,fee INTEGER CHECK(fee>=0),created_at TEXT NOT NULL,actor_id TEXT NOT NULL);
CREATE TABLE inventory_movements(id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),quantity INTEGER NOT NULL CHECK(quantity<>0),kind TEXT NOT NULL CHECK(kind IN ('sale','received','damage','adjustment','return')),order_id TEXT REFERENCES orders(id),reason TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,request_key TEXT UNIQUE NOT NULL);
CREATE TABLE purchase_orders(id TEXT PRIMARY KEY,supplier TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',created_at TEXT NOT NULL);
CREATE TABLE purchase_order_items(purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id),product_id TEXT NOT NULL REFERENCES products(id),quantity INTEGER NOT NULL CHECK(quantity>0),PRIMARY KEY(purchase_order_id,product_id));
CREATE TABLE gift_cards(id TEXT PRIMARY KEY,code_hash TEXT UNIQUE NOT NULL,client_id TEXT REFERENCES users(id),issued_value INTEGER NOT NULL CHECK(issued_value>=0),created_at TEXT NOT NULL);
CREATE TABLE gift_card_movements(id TEXT PRIMARY KEY,gift_card_id TEXT NOT NULL REFERENCES gift_cards(id),order_id TEXT REFERENCES orders(id),amount INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE campaigns(id TEXT PRIMARY KEY,name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',created_at TEXT NOT NULL);
CREATE TABLE messages(id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES users(id),professional_id TEXT NOT NULL REFERENCES providers(id),campaign_id TEXT REFERENCES campaigns(id),channel TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',body TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE review_requests(id TEXT PRIMARY KEY,appointment_id TEXT UNIQUE NOT NULL REFERENCES appointments(id),status TEXT NOT NULL DEFAULT 'draft',created_at TEXT NOT NULL);
CREATE TABLE leads(id TEXT PRIMARY KEY,name TEXT NOT NULL,source TEXT NOT NULL,client_id TEXT REFERENCES users(id),created_at TEXT NOT NULL);
CREATE TABLE referrals(id TEXT PRIMARY KEY,client_id TEXT NOT NULL REFERENCES users(id),referrer_id TEXT REFERENCES users(id),source TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE growth_opportunities(id TEXT PRIMARY KEY,professional_id TEXT NOT NULL REFERENCES providers(id),client_id TEXT REFERENCES users(id),kind TEXT NOT NULL,title TEXT NOT NULL,explanation TEXT NOT NULL,href TEXT NOT NULL,priority INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','dismissed','resolved')),observed_at TEXT NOT NULL);
CREATE TABLE business_tasks(id TEXT PRIMARY KEY,professional_id TEXT NOT NULL REFERENCES providers(id),title TEXT NOT NULL,due_date TEXT,status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','done')),actor_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL);
CREATE TABLE business_goals(professional_id TEXT PRIMARY KEY REFERENCES providers(id),monthly_revenue INTEGER NOT NULL CHECK(monthly_revenue>0));
CREATE TABLE business_audit(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,event TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX order_provider_date ON orders(professional_id,created_at);
CREATE INDEX inventory_product ON inventory_movements(product_id,created_at);
CREATE INDEX soap_appointment ON soap_revisions(appointment_id,revision);
CREATE INDEX growth_provider ON growth_opportunities(professional_id,status);
CREATE TRIGGER inventory_no_negative BEFORE INSERT ON inventory_movements BEGIN SELECT RAISE(ABORT,'Insufficient stock.') WHERE COALESCE((SELECT SUM(quantity) FROM inventory_movements WHERE product_id=NEW.product_id),0)+NEW.quantity<0; END;
CREATE TRIGGER inventory_no_update BEFORE UPDATE ON inventory_movements BEGIN SELECT RAISE(ABORT,'Inventory history is immutable; record a correcting movement.'); END;
CREATE TRIGGER inventory_no_delete BEFORE DELETE ON inventory_movements BEGIN SELECT RAISE(ABORT,'Inventory history is immutable.'); END;
CREATE TRIGGER soap_no_update BEFORE UPDATE ON soap_revisions BEGIN SELECT RAISE(ABORT,'Save a new SOAP revision.'); END;
CREATE TRIGGER soap_no_delete BEFORE DELETE ON soap_revisions BEGIN SELECT RAISE(ABORT,'SOAP history is immutable.'); END;
CREATE TRIGGER payment_no_update BEFORE UPDATE ON order_payments BEGIN SELECT RAISE(ABORT,'Payment history is immutable.'); END;
CREATE TRIGGER payment_no_delete BEFORE DELETE ON order_payments BEGIN SELECT RAISE(ABORT,'Payment history is immutable.'); END;
CREATE TABLE booking_details_next (appointment_id TEXT PRIMARY KEY REFERENCES appointments(id), stage TEXT NOT NULL DEFAULT 'confirmed' CHECK(stage IN ('requested','booked','confirmed','checked_in','in_service','completed','checked_out','cancelled','late_cancel','no_show')), deposit INTEGER NOT NULL DEFAULT 0, paid INTEGER NOT NULL DEFAULT 0, payment_status TEXT NOT NULL DEFAULT 'not_required', cancellation_hours INTEGER NOT NULL, intake_id TEXT, request_key TEXT UNIQUE, policy_snapshot TEXT NOT NULL);
INSERT INTO booking_details_next SELECT * FROM booking_details;
DROP TABLE booking_details;
ALTER TABLE booking_details_next RENAME TO booking_details;
`);
    d.prepare("INSERT INTO organizations VALUES(?,?)").run(
      "collective",
      "Fix It Collective",
    );
    d.prepare("INSERT INTO locations VALUES(?,?,?,?)").run(
      "main",
      "collective",
      "Fix It Collective",
      studio.timezone,
    );
    for (const p of professionals)
      d.prepare("INSERT INTO providers VALUES(?,?,?,?)").run(
        p.id,
        "main",
        p.id === "pro-b" ? "Kamilla" : p.name,
        p.id === "pro-b" ? "massage" : "grooming",
      );
    for (const s of services)
      d.prepare("INSERT INTO service_catalog VALUES(?,?)").run(s.id, s.name);
    for (const event of ["INSERT", "UPDATE"])
      d.exec(`CREATE TRIGGER resource_overlap_${event.toLowerCase()} BEFORE ${event} ON appointments WHEN NEW.status='confirmed' BEGIN
SELECT RAISE(ABORT,'The room or resource is already reserved.') WHERE EXISTS(SELECT 1 FROM appointments a JOIN provider_resources r ON r.professional_id=a.professional_id JOIN provider_resources n ON n.resource_id=r.resource_id WHERE n.professional_id=NEW.professional_id AND a.id<>NEW.id AND a.status='confirmed' AND a.start_at<NEW.busy_until AND a.busy_until>NEW.start_at); END;`);
    d.prepare("INSERT INTO schema_migrations VALUES(?,?)").run(
      "business-os-1",
      new Date().toISOString(),
    );
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

/** Accommodate databases opened during the staged Business OS rollout. */
export function migrateBusiness(d: DatabaseSync) {
  migrateFoundation(d);
  if (
    d
      .prepare("SELECT 1 FROM schema_migrations WHERE version='business-os-2'")
      .get()
  )
    return;
  d.exec("BEGIN IMMEDIATE");
  try {
    const columns = d.prepare("PRAGMA table_info(orders)").all() as {
      name: string;
    }[];
    if (!columns.some((c) => c.name === "request_hash"))
      d.exec(
        "ALTER TABLE orders ADD COLUMN request_hash TEXT NOT NULL DEFAULT ''",
      );
    d.prepare("INSERT OR IGNORE INTO schema_migrations VALUES(?,?)").run(
      "business-os-2",
      new Date().toISOString(),
    );
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
