const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

app.use(cors());
app.use(express.json());

const scriptBaseUrl = "https://script.google.com/macros/s/AKfycbwBouqpQx0ycQnxGD1ckDiB_t_CRcnD3oCszLj2C5kyMphStkQv4ZWPZELNFtydx1sKeQ/exec";

// Basic validation for form data
function validateFormData(data) {
  if (!data.firstName || typeof data.firstName !== "string") {
    return "Missing or invalid 'firstName'";
  }
  if (!data.email || typeof data.email !== "string") {
    return "Missing or invalid 'email'";
  }
  return null;
}

// Helper function to forward data to Apps Script
async function forwardToAppsScript(endpoint, data) {
  const bodyData = { ...data, type: endpoint };
  const scriptResponse = await fetch(`${scriptBaseUrl}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyData),
  });

  const contentType = scriptResponse.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const responseBody = isJson
    ? await scriptResponse.json()
    : await scriptResponse.text();

  if (!scriptResponse.ok) {
    throw {
      status: 502,
      message: `Apps Script error: ${scriptResponse.status}`,
      details: responseBody,
    };
  }

  if (isJson && responseBody.status === "error") {
    throw {
      status: 409,
      message: responseBody.message || "Error from Apps Script",
      details: responseBody.details || null,
    };
  }

  return responseBody;
}

// /submit route
app.post("/submit", async (req, res) => {
  const { formData, type } = req.body;

  if (!type) {
    return res.status(400).json({ status: "error", message: "Missing request type" });
  }

  const validationError = validateFormData(formData);
  if (validationError) {
    return res.status(400).json({ status: "error", message: "Validation failed", details: validationError });
  }

  try {
    const response = await fetch(scriptBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, type })
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ status: "error", message: "Apps Script error", details: text });
    }

    if (contentType.includes("application/json")) {
      const result = await response.json();
      return res.status(200).json({ status: "success", data: result });
    } else {
      const text = await response.text();
      return res.status(502).json({ status: "error", message: "Invalid response format", details: text });
    }
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Internal server error", details: error.message });
  }
});

// /resend route
app.post("/resend", async (req, res) => {
  console.log("Received request to /resend:", req.body);
  const { customerID } = req.body;

  if (!customerID) {
    return res.status(400).json({
      status: "error",
      message: "Missing 'customerID'",
    });
  }

  try {
    const result = await forwardToAppsScript("resend", { customerID });
    return res.status(200).json({
      status: "success",
      message: result.message || "Verification code resent",
    });
  } catch (error) {
    console.error("Resend error:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to resend code",
      details: error.details || null,
    });
  }
});

// /verify route
app.post("/verify", async (req, res) => {
  console.log("Received request to /verify:", req.body);
  const { customerID } = req.body;

  if (!customerID) {
    return res.status(400).json({
      status: "error",
      message: "Missing 'customerID'",
    });
  }

  try {
    const result = await forwardToAppsScript("verify", { customerID });
    return res.status(200).json({
      status: "success",
      message: result.message || "Account verified",
    });
  } catch (error) {
    console.error("Verify error:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Verification failed",
      details: error.details || null,
    });
  }
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Backend server running on port " + PORT);
});
