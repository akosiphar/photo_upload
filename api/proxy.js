// api/proxy.js
export default async function handler(req, res) {
  const GOOGLE_APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbykZnNelfDGVtLRBH8YZR5tM4S9UD4FYQcWqNKiTx0cTn7ibjSX4JHPtoNhVnEPed_JMg/exec";

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });

    // Try parsing JSON response
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "Invalid JSON from Apps Script", raw: text };
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(response.ok ? 200 : response.status).json(data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Proxy failed", details: err.message || err.toString() });
  }
}
