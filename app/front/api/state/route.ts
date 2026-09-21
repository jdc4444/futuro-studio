import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

const ownerEmail = "josdiazcontreras@gmail.com";
const maxMutations = 50;
const maxReadRecords = 5000;
const tokenPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/i;

type Mutation = { source: string; entityType: string; entityId: string; field: string; value: unknown };

type Actor = { id: string; device: boolean };

function requireActor(request: Request): Actor | null {
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email")?.toLowerCase();
  if (userId && email === ownerEmail) return { id: userId, device: false };

  // Local Studio tools never receive the platform session headers. They use a
  // separate, server-side-only secret so the browser itself never gets a token.
  // Keep this constrained to Tiles until each other local tool has its own key.
  const deviceToken = request.headers.get("x-studio-device-token");
  const configuredToken = (env as unknown as { STUDIO_TILES_DEVICE_TOKEN?: string }).STUDIO_TILES_DEVICE_TOKEN;
  if (configuredToken && deviceToken === configuredToken) return { id: "device:tiles", device: true };
  return null;
}

function validToken(value: unknown) { return typeof value === "string" && tokenPattern.test(value); }

function validMutation(value: unknown): value is Mutation {
  if (!value || typeof value !== "object") return false;
  const mutation = value as Mutation;
  return validToken(mutation.source) && validToken(mutation.entityType)
    && typeof mutation.entityId === "string" && mutation.entityId.length > 0 && mutation.entityId.length <= 500
    && validToken(mutation.field);
}

function database() {
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) throw new Error("Studio state is temporarily unavailable.");
  return database;
}

export async function GET(request: Request) {
  const actor = requireActor(request);
  if (!actor) return Response.json({ error: "Sign in required." }, { status: 401 });
  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  const since = Number(url.searchParams.get("since") ?? "0");
  if (!source || !validToken(source) || !Number.isFinite(since) || since < 0) return Response.json({ error: "source and a valid since value are required." }, { status: 400 });
  if (actor.device && source !== "tiles") return Response.json({ error: "This device may only read Tiles state." }, { status: 403 });

  try {
    const rows = await database().prepare("SELECT source, entity_type AS entityType, entity_id AS entityId, field, value_json AS valueJson, revision, updated_at AS updatedAt FROM studio_state WHERE source = ? AND updated_at > ? ORDER BY updated_at ASC LIMIT ?").bind(source, since, maxReadRecords).all();
    const state = rows.results.map((row) => ({ ...row, value: JSON.parse(String(row.valueJson)) }));
    return Response.json({ state, serverTime: Date.now() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "State read failed." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const actor = requireActor(request);
  if (!actor) return Response.json({ error: "Sign in required." }, { status: 401 });
  let body: { operationId?: unknown; mutations?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "JSON body required." }, { status: 400 }); }
  if (!validToken(body.operationId) || !Array.isArray(body.mutations) || body.mutations.length === 0 || body.mutations.length > maxMutations || !body.mutations.every(validMutation)) return Response.json({ error: "A valid operationId and up to 50 mutations are required." }, { status: 400 });
  if (actor.device && !body.mutations.every((mutation) => mutation.source === "tiles")) return Response.json({ error: "This device may only write Tiles state." }, { status: 403 });

  const now = Date.now();
  try {
    const db = database();
    const statements = [db.prepare("INSERT INTO studio_operations (operation_id, actor_id, committed_at) VALUES (?, ?, ?)").bind(body.operationId, actor.id, now), ...body.mutations.map((mutation) => db.prepare("INSERT INTO studio_state (source, entity_type, entity_id, field, value_json, revision, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, 1, ?, ?) ON CONFLICT(source, entity_type, entity_id, field) DO UPDATE SET value_json = excluded.value_json, revision = studio_state.revision + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by").bind(mutation.source, mutation.entityType, mutation.entityId, mutation.field, JSON.stringify(mutation.value), now, actor.id))];
    await db.batch(statements);
    return Response.json({ operationId: body.operationId, committedAt: now }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /unique|constraint/i.test(error.message)) return Response.json({ operationId: body.operationId, deduplicated: true });
    return Response.json({ error: error instanceof Error ? error.message : "State write failed." }, { status: 503 });
  }
}
