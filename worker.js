const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

async function hash(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function init(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS hub_items (id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('servers','links')), name TEXT NOT NULL, url TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT '↗', position INTEGER NOT NULL DEFAULT 0)"),
    db.prepare("CREATE TABLE IF NOT EXISTS hub_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_hub_items_type_position ON hub_items(type, position)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_hub_sessions_expiry ON hub_sessions(expires_at)")
  ]);
}

async function readData(db) {
  const result = await db.prepare("SELECT id, type, name, url, description, icon FROM hub_items ORDER BY type, position").all();
  const data = { servers: [], links: [] };
  for (const item of result.results || []) {
    data[item.type].push({ id: item.id, name: item.name, url: item.url, desc: item.description || "", icon: item.icon || "↗" });
  }
  return data;
}

async function isAuthorized(request, db) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const tokenHash = await hash(token);
  const row = await db.prepare("SELECT expires_at FROM hub_sessions WHERE token_hash = ?").bind(tokenHash).first();
  if (!row || row.expires_at < Math.floor(Date.now() / 1000)) {
    if (row) await db.prepare("DELETE FROM hub_sessions WHERE token_hash = ?").bind(tokenHash).run();
    return false;
  }
  return true;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);

    try {
      await init(env.DB);
      if (url.pathname === "/api/health" && request.method === "GET") return json({ ok: true });
      if (url.pathname === "/api/data" && request.method === "GET") return json(await readData(env.DB));

      if (url.pathname === "/api/login" && request.method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body || typeof body.password !== "string" || !env.ADMIN_PASSWORD_SHA256 ||
            await hash(body.password) !== env.ADMIN_PASSWORD_SHA256.trim().toLowerCase()) {
          return json({ error: "Неверный пароль" }, 401);
        }
        const token = crypto.randomUUID() + "." + crypto.randomUUID();
        const expiresAt = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
        await env.DB.prepare("DELETE FROM hub_sessions WHERE expires_at < ?").bind(Math.floor(Date.now() / 1000)).run();
        await env.DB.prepare("INSERT INTO hub_sessions (token_hash, expires_at) VALUES (?, ?)").bind(await hash(token), expiresAt).run();
        return json({ token, expiresAt });
      }

      if (url.pathname === "/api/logout" && request.method === "POST") {
        const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
        if (token) await env.DB.prepare("DELETE FROM hub_sessions WHERE token_hash = ?").bind(await hash(token)).run();
        return json({ ok: true });
      }

      if (url.pathname === "/api/data" && request.method === "POST") {
        if (!(await isAuthorized(request, env.DB))) return json({ error: "Сессия истекла — войди снова" }, 401);
        const data = await request.json().catch(() => null);
        if (!data || !Array.isArray(data.servers) || !Array.isArray(data.links) ||
            data.servers.length + data.links.length > 500) return json({ error: "Некорректные данные" }, 400);

        const statements = [env.DB.prepare("DELETE FROM hub_items")];
        for (const type of ["servers", "links"]) {
          for (const [position, item] of data[type].entries()) {
            if (!item || typeof item.id !== "string" || typeof item.name !== "string" ||
                typeof item.url !== "string" || item.name.length > 80 || item.url.length > 500) {
              return json({ error: "Некорректный элемент" }, 400);
            }
            statements.push(env.DB.prepare(
              "INSERT INTO hub_items (id, type, name, url, description, icon, position) VALUES (?, ?, ?, ?, ?, ?, ?)"
            ).bind(item.id.slice(0, 120), type, item.name, item.url,
              String(item.desc || "").slice(0, 220), String(item.icon || "↗").slice(0, 8), position));
          }
        }
        await env.DB.batch(statements);
        return json({ ok: true, data: await readData(env.DB) });
      }
      return json({ error: "Not found" }, 404);
    } catch (error) {
      return json({ error: "Ошибка базы данных" }, 500);
    }
  }
};