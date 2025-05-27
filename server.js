const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz7gBJ3_-xucAcUQQ6WRRs03M430eU9Dr_ybGpxyHTaxOS5f9hb8enza8LSLp9kQcNnew/exec";

app.post("/submit-form", async (req, res) => {
  const formData = req.body;

  const requiredFields = [
    "firstName", "surname", "birthday", "storeName", "email", "phone",
    "province", "city", "barangay", "street", "postal"
  ];
  const missing = requiredFields.filter(field => !formData[field]);
  if (missing.length) {
    return res.status(400).json({ success: false, error: `Missing: ${missing.join(", ")}` });
  }

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
