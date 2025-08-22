// /pages/api/proxy.js (Next.js / Vercel)
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const googleRes = await fetch(process.env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await googleRes.text();

    try {
      const json = JSON.parse(text);
      res.status(200).json(json);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: "Invalid JSON from Apps Script",
        raw: text, // keep raw HTML so you can debug
      });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
