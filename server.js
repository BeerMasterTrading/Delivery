const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

// Google Apps Script Web App URL
const scriptBaseUrl = "https://script.google.com/macros/s/AKfycbwBouqpQx0ycQnxGD1ckDiB_t_CRcnD3oCszLj2C5kyMphStkQv4ZWPZELNFtydx1sKeQ/exec";

// Basic validation for form data (used in /create-account only)
function validateFormData(data) {
  if (!data.firstName || typeof data.firstName !== "string") {
    return "Missing or invalid 'firstName'";
  }
  if (!data.email || typeof data.email !== "string") {
    return "Missing or invalid 'email'";
  }
  return null;
}

// Forward any data to Google Apps Script
async function forwardToAppsScript(endpoint, data) {
  const bodyData = { ...data, type: endpoint };

  const response = await fetch(scriptBaseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyData),
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const responseBody = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw {
      status: 502,
      message: `Apps Script error: ${response.status}`,
      details: responseBody,
    };
  }

  if (!isJson || typeof responseBody !== "object") {
    throw {
      status: 500,
      message: "Invalid JSON returned from Apps Script",
      details: responseBody,
    };
  }

  return responseBody;
}

// POST /create-account
app.post("/create-account", async (req, res) => {
  try {
    const validationError = validateFormData(req.body);
    if (validationError) {
      return res.status(400).json({ status: "error", message: validationError });
    }

    const result = await forwardToAppsScript("create-account", req.body);

    if (result.status === "success") {
      return res.status(200).json({
        status: "success",
        message: result.message,
        customerID: result.customerID,
        timestamp: result.timestamp,
        verificationCode: result.verificationCode,
      });
    } else {
      return res.status(400).json({
        status: "error",
        message: result.message,
      });
    }

  } catch (error) {
    console.error(error.details || error.message);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to create account",
      details: error.details || null,
    });
  }
});

// POST /resend
app.post("/resend", async (req, res) => {
  const { customerID } = req.body;

  if (!customerID) {
    return res.status(400).json({ status: "error", message: "Missing 'customerID'" });
  }

  try {
    const result = await forwardToAppsScript("resend", { customerID });

    if (result.status === "success") {
      return res.status(200).json({
        status: "success",
        message: result.message || "Verification code resent",
        code: result.code,
      });
    } else {
      return res.status(400).json({ status: "error", message: result.message });
    }

  } catch (error) {
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Resend failed",
      details: error.details || null,
    });
  }
});

// POST /verify
app.post("/verify", async (req, res) => {
  const { customerID } = req.body;

  if (!customerID) {
    return res.status(400).json({ status: "error", message: "Missing 'customerID'" });
  }

  try {
    const result = await forwardToAppsScript("verify", { customerID });

    if (result.status === "success") {
      return res.status(200).json({ status: "success", message: result.message });
    } else {
      return res.status(400).json({ status: "error", message: result.message });
    }

  } catch (error) {
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Verification failed",
      details: error.details || null,
    });
  }
});

// POST /login
app.post("/login", async (req, res) => {
  const { type, ...payload } = req.body;

  if (!payload.loginID || !payload.password) {
    return res.status(400).json({ status: "error", message: "Missing login ID or password" });
  }

  try {
    const result = await forwardToAppsScript(type, payload);

    if (result.status === "success") {
      return res.status(200).json({
        status: "success",
        customerID: result.customerID,
      });
    } else {
      return res.status(401).json({
        status: "error",
        message: result.message || "Login failed",
        code: result.code || null,
        customerID: result.customerID || null,
      });
    }
  } catch (error) {
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Login failed",
      details: error.details || null,
    });
  }
});

// Forgot Password - Send OTP
app.post("/send-otp-forgot-password", async (req, res) => {
  const { loginID } = req.body;

  if (!loginID) {
    return res.status(400).json({ status: "error", message: "Missing loginID" });
  }

  try {
    const result = await forwardToAppsScript("forgotPassword", { loginID });

    if (result.status === "success") {
      return res.status(200).json({
        status: "success",
        code: result.code,
        email: result.email,
        message: result.message,
      });
    } else {
      return res.status(400).json({ status: "error", message: result.message });
    }

  } catch (error) {
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to send OTP",
      details: error.details || null,
    });
  }
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("✅ Backend server running on port " + PORT);
});
