import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const studioState = sqliteTable(
  "studio_state",
  {
    source: text("source").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    field: text("field").notNull(),
    valueJson: text("value_json").notNull(),
    revision: integer("revision").notNull().default(1),
    updatedAt: integer("updated_at").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.source, table.entityType, table.entityId, table.field] }),
    index("idx_studio_state_source_updated").on(table.source, table.updatedAt),
  ],
);

export const studioOperations = sqliteTable("studio_operations", {
  operationId: text("operation_id").primaryKey(),
  actorId: text("actor_id").notNull(),
  committedAt: integer("committed_at").notNull(),
});
