const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const scriptBaseUrl = "https://script.google.com/macros/s/AKfycbwBouqpQx0ycQnxGD1ckDiB_t_CRcnD3oCszLj2C5kyMphStkQv4ZWPZELNFtydx1sKeQ/exec";

// Optional: Validate form data (used only in create-account)
const validateFormData = (type, data) => {
  if (type === "create-account") {
    if (!data.firstName || typeof data.firstName !== "string") return "Missing or invalid 'firstName'";
    if (!data.email || typeof data.email !== "string") return "Missing or invalid 'email'";
  }
  return null;
};

// Forward request to Apps Script
const forwardToAppsScript = async (type, data) => {
  const response = await fetch(scriptBaseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, type }),
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw {
      status: 502,
      message: `Apps Script responded with status ${response.status}`,
      details: body,
    };
  }

  if (!isJson || typeof body !== "object") {
    throw {
      status: 500,
      message: "Apps Script returned invalid JSON",
      details: body,
    };
  }

  return body;
};

// Generic handler for POST endpoints
const handlePost = (type, requiredFields = []) => async (req, res) => {
  const data = req.body;

  for (const field of requiredFields) {
    if (!data[field]) {
      return res.status(400).json({ status: "error", message: `Missing '${field}'` });
    }
  }

  const validationError = validateFormData(type, data);
  if (validationError) {
    return res.status(400).json({ status: "error", message: validationError });
  }

  try {
    const result = await forwardToAppsScript(type, data);

    if (result.status === "success") {
      return res.status(200).json(result);
    } else {
      return res.status(400).json({ status: "error", message: result.message });
    }

  } catch (error) {
    console.error(error.details || error.message);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Unexpected error",
      details: error.details || null,
    });
  }
};

// Routes
app.post("/create-account", handlePost("create-account"));
app.post("/resend", handlePost("resend", ["customerID"]));
app.post("/verify", handlePost("verify", ["customerID"]));
app.post("/login", handlePost("login", ["loginID", "password"]));
app.post("/send-otp-forgot-password", handlePost("forgotPassword", ["loginID"]));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("✅ Backend server running on port " + PORT);
});
