export default async function handler(req, res) {
  try {
    // Replace with your Google Apps Script URL
    const apiUrl =
      "https://script.google.com/macros/s/AKfycbwrZc5hiNyXJOvuQBaTVU6Ss_qalX5p4YKGgbOVf9egIheGO9py4ha4A-WRTlxSoM8E/exec";

    const response = await fetch(apiUrl);
    const data = await response.json();

    // Add CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Proxy failed", details: error.message });
  }
}
