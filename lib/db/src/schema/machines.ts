import { pgTable, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const machinesTable = pgTable(
  "machines",
  {
    machine_id: text("machine_id").primaryKey(),
    hostname: text("hostname").notNull(),
    logged_in_user: text("logged_in_user"),
    site: text("site"),
    last_seen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
    manufacturer: text("manufacturer"),
    model: text("model"),
    cpu: text("cpu"),
    total_ram_gb: integer("total_ram_gb"),
    ram_type: text("ram_type"),
    gpu1_model: text("gpu1_model"),
    os: text("os"),
    primary_ip: text("primary_ip"),
    data: jsonb("data"),
  },
  (t) => [
    index("machines_hostname_idx").on(t.hostname),
    index("machines_site_idx").on(t.site),
  ]
);

export type Machine = typeof machinesTable.$inferSelect;
export type InsertMachine = typeof machinesTable.$inferInsert;
