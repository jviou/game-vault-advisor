import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const SGDB_KEY = process.env.SGDB_KEY;

if (!SGDB_KEY) {
  console.warn("[sgdb-proxy] ⚠️ SGDB_KEY est vide (à mettre dans .env)");
}

// /sgdb/search?query=zelda
app.get("/search", async (req, res) => {
  try {
    const q = (req.query.query || "").toString().trim();
    if (!q) return res.status(400).json({ error: "Missing query" });

    const r = await fetch(
      `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${SGDB_KEY}`, Accept: "application/json" } }
    );

    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type("application/json").send(text);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Proxy error (search)" });
  }
});

// /sgdb/grids?gameId=123
app.get("/grids", async (req, res) => {
  try {
    const id = Number(req.query.gameId);
    if (!id) return res.status(400).json({ error: "Missing gameId" });

    const url = new URL(`https://www.steamgriddb.com/api/v2/grids/game/${id}`);
    url.searchParams.set("dimensions", "600x900,342x482");
    url.searchParams.set("types", "static");
    url.searchParams.set("styles", "alternate");

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${SGDB_KEY}`, Accept: "application/json" }
    });

    const text = await r.text();
    if (!r.ok) return res.status(r.status).send(text);
    res.type("application/json").send(text);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Proxy error (grids)" });
  }
});

app.listen(PORT, () => console.log(`[sgdb-proxy] listening on :${PORT}`));
