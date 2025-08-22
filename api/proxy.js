export default async function handler(req, res) {
  try {
    // Replace with your actual Google Apps Script web app URL (the /exec one)
    const apiUrl =
      "https://script.google.com/macros/s/AKfycbw4IsFU8TfzoziATBz2mSwBU7ZW9Huk1KYxY3TwsvGxAK8oep_Glpz0B4_goTbrYSk97Q/exec";

    // Fetch from Apps Script
    const resp = await fetch(apiUrl);

    // Apps Script might return JSON or plain text
    const text = await resp.text();

    let data;
    try {
      data = JSON.parse(text); // Try JSON
    } catch {
      data = { raw: text }; // Fallback if not valid JSON
    }

    // Add CORS headers
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
