import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

// Flat mirror of all FalkorDB nodes — fast lookup and joining with DNA/source tables.
// FalkorDB is authoritative for relationships and traversal; this is the fast query layer.
export const graphNodes = pgTable(
  "graph_nodes",
  {
    id: varchar("id", { length: 100 }).primaryKey(),          // FalkorDB node uuid
    label: varchar("label", { length: 100 }).notNull(),        // e.g. Country, Organisation, Idea
    name: varchar("name", { length: 500 }).notNull(),
    description: text("description"),
    source: varchar("source", { length: 100 }),                // e.g. SEED_ISO3166, AL_TRANSCRIPT
    fileRef: varchar("file_ref", { length: 500 }),
    properties: jsonb("properties"),                           // label-specific fields
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("graph_nodes_label_idx").on(table.label),
    index("graph_nodes_name_idx").on(table.name),
  ]
)

// Flat mirror of all FalkorDB edges.
export const graphEdges = pgTable(
  "graph_edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromNodeId: varchar("from_node_id", { length: 100 }).notNull().references(() => graphNodes.id, { onDelete: "cascade" }),
    toNodeId: varchar("to_node_id", { length: 100 }).notNull().references(() => graphNodes.id, { onDelete: "cascade" }),
    relationshipType: varchar("relationship_type", { length: 100 }).notNull(), // e.g. IN_MONTH, DERIVED_FROM
    description: text("description"),
    source: varchar("source", { length: 100 }),
    properties: jsonb("properties"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("graph_edges_from_idx").on(table.fromNodeId),
    index("graph_edges_to_idx").on(table.toNodeId),
    index("graph_edges_type_idx").on(table.relationshipType),
  ]
)

// Canonical register — entity resolution before any graph write.
// Every entity written to the graph must be resolved here first.
// Prevents duplicate nodes for the same real-world entity.
export const canonicalRegister = pgTable("canonical_register", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 100 }).notNull(), // e.g. Country, Organisation, Person
  canonicalName: varchar("canonical_name", { length: 500 }).notNull(),
  variations: text("variations").array().notNull().default([]),   // alternative names / spellings
  dedupKey: varchar("dedup_key", { length: 500 }).notNull().unique(), // e.g. iso2:GB, org:atomic-lounge
  graphNodeId: varchar("graph_node_id", { length: 100 }),          // FalkorDB node id once written
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
