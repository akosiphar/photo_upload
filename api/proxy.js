export default async function handler(req, res) {
  try {
    // Replace with your Google Apps Script URL
    const apiUrl =
      "https://script.google.com/macros/s/AKfycbw4IsFU8TfzoziATBz2mSwBU7ZW9Huk1KYxY3TwsvGxAK8oep_Glpz0B4_goTbrYSk97Q/exec";

    // Google Apps Script sometimes returns plain text instead of JSON
    const text = await response.text();

    // Try to parse JSON, but fall back to text
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Proxy failed",
      details: error.message,
    });
  }
}
