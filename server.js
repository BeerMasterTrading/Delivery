const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();

app.use(cors());
app.use(express.json());

app.post("/submit", async (req, res) => {
  const formData = req.body;

  try {
    const scriptResponse = await fetch("https://script.google.com/macros/s/AKfycbylZXw_4Zn8qa4pjLBERscOTkBXRRNHm8LhU8bL5Z9YpoVgsGhaKXntsQtQKTDSPK6Z7w/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    const result = await scriptResponse.json();
    res.json({ message: "Data saved!", details: result });
  } catch (error) {
    console.error("Error sending to Apps Script:", error);
    res.status(500).json({ message: "Error processing your request" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Backend server running on port " + PORT);
});
