const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

app.use(cors());
app.use(express.json());

// Basic validation example
function validateFormData(data) {
  if (!data.firstName || typeof data.firstName !== "string") {
    return "Missing or invalid 'firstName'";
  }
  if (!data.email || typeof data.email !== "string") {
    return "Missing or invalid 'email'";
  }
  // Add more validation rules as needed
  return null;
}

app.post("/submit", async (req, res) => {
  console.log("Received request to /submit:", req.body);

  const formData = req.body;

  // Validate incoming data
  const validationError = validateFormData(formData);
  if (validationError) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      details: validationError,
    });
  }

  try {
    const scriptUrl = "https://script.google.com/macros/s/AKfycbylZXw_4Zn8qa4pjLBERscOTkBXRRNHm8LhU8bL5Z9YpoVgsGhaKXntsQtQKTDSPK6Z7w/exec";

    const scriptResponse = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const contentType = scriptResponse.headers.get("content-type") || "";

    if (!scriptResponse.ok) {
      // Not 2xx response from Apps Script
      const text = await scriptResponse.text();
      console.error(`Apps Script responded with status ${scriptResponse.status}:`, text);
      return res.status(502).json({
        status: "error",
        message: `Apps Script error: ${scriptResponse.status}`,
        details: text,
      });
    }

    if (contentType.includes("application/json")) {
      const result = await scriptResponse.json();
      console.log("Apps Script response JSON:", result);

      res.json({
        status: "success",
        message: "Data saved to Google Sheet",
        appsScriptResult: result,
      });
    } else {
      // Response is not JSON, possibly an error page or HTML
      const text = await scriptResponse.text();
      console.error("Apps Script returned non-JSON response:", text);

      res.status(502).json({
        status: "error",
        message: "Apps Script returned invalid response format",
        details: text,
      });
    }
  } catch (error) {
    console.error("Error sending to Apps Script:", error);
    res.status(500).json({
      status: "error",
      message: "Error processing your request",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Backend server running on port " + PORT);
});
