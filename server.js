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
    const scriptUrl = "https://script.google.com/macros/s/AKfycbyXbC5IlsXRmlkdB5I0vYfRNtQwkJm4i1aVpNuXpIPW2aS5S1qUoHTvWHQzrv3152hYDA/exec";

    const scriptResponse = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const contentType = scriptResponse.headers.get("content-type") || "";

    if (!scriptResponse.ok) {
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

      if (result.status === "error") {
        // Forward error with appropriate HTTP status
        return res.status(409).json({
          status: "error",
          message: result.message || "Error from Apps Script",
          details: result.details || null,
        });
      }

      // Success response from Apps Script
      return res.status(200).json({
        status: "success",
        message: result.message || "Data saved to Google Sheet",
        data: result,
      });
    } else {
      // Non-JSON response
      const text = await scriptResponse.text();
      console.error("Apps Script returned non-JSON response:", text);

      return res.status(502).json({
        status: "error",
        message: "Apps Script returned invalid response format",
        details: text,
      });
    }
  } catch (error) {
    console.error("Error sending to Apps Script:", error);
    return res.status(500).json({
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
