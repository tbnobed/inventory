import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const siteSubnetsTable = pgTable("site_subnets", {
  id: serial("id").primaryKey(),
  cidr: text("cidr").notNull(),
  site: text("site").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SiteSubnet = typeof siteSubnetsTable.$inferSelect;
export type InsertSiteSubnet = typeof siteSubnetsTable.$inferInsert;
