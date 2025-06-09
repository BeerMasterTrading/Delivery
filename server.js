const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const scriptBaseUrl = "https://script.google.com/macros/s/AKfycbwBouqpQx0ycQnxGD1ckDiB_t_CRcnD3oCszLj2C5kyMphStkQv4ZWPZELNFtydx1sKeQ/exec";

// Basic validation per type
const validateFormData = (type, data) => {
  switch (type) {
    case "create-account":
      if (!data.firstName || typeof data.firstName !== "string") return "Missing or invalid 'firstName'";
      if (!data.email || typeof data.email !== "string") return "Missing or invalid 'email'";
      if (!data.password || typeof data.password !== "string") return "Missing or invalid 'password'";
      break;

    case "resend":
    case "verify":
      if (!data.customerID || typeof data.customerID !== "string") return "Missing or invalid 'customerID'";
      break;

    case "login":
      if (!data.loginID || typeof data.loginID !== "string") return "Missing or invalid 'loginID'";
      if (!data.password || typeof data.password !== "string") return "Missing or invalid 'password'";
      break;

    case "forgotPassword":
      if (!data.loginID || typeof data.loginID !== "string") return "Missing or invalid 'loginID'";
      break;

    case "resetPassword":
      if (!data.loginID || typeof data.loginID !== "string") return "Missing or invalid 'loginID'";
      if (!data.newPassword || typeof data.newPassword !== "string") return "Missing or invalid 'newPassword'";
      break;

    case "place-order":
      if (!data.customerID || typeof data.customerID !== "string") return "Missing or invalid 'customerID'";
      if (!Array.isArray(data.items) || data.items.length === 0) return "Missing or invalid 'items'";
      if (!data.deliveryDate || typeof data.deliveryDate !== "string") return "Missing or invalid 'deliveryDate'";
      // Optional: validate each item
      for (const item of data.items) {
        if (!item.productCode || typeof item.productCode !== "string") return "Each item must have a valid 'productCode'";
        if (typeof item.quantity !== "number" || item.quantity <= 0) return "Each item must have a valid 'quantity'";
        if (typeof item.total !== "number" || item.total < 0) return "Each item must have a valid 'price'";
      }
      break;

      
    default:
      return null;
  }
  return null;
};

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

// Generic POST handler creator
const handlePost = (type, requiredFields = []) => async (req, res) => {
  const data = req.body;

  // Check required fields presence before type-specific validation
  for (const field of requiredFields) {
    if (!data[field]) {
      return res.status(400).json({ status: "error", message: `Missing '${field}'` });
    }
  }

  // Run additional validation by type
  const validationError = validateFormData(type, data);
  if (validationError) {
    return res.status(400).json({ status: "error", message: validationError });
  }

  try {
    const result = await forwardToAppsScript(type, data);

    if (result.status === "success") {
      return res.status(200).json(result);
    } else {
      return res.status(400).json({ status: "error", message: result.message || "Error from Apps Script" });
    }

  } catch (error) {
    console.error("Error forwarding request:", error.details || error.message);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Unexpected error",
      details: error.details || null,
    });
  }
};

// Define routes with required fields for minimal validation
app.post("/create-account", handlePost("create-account", ["firstName", "email", "password"]));
app.post("/resend", handlePost("resend", ["customerID"]));
app.post("/verify", handlePost("verify", ["customerID"]));
app.post("/login", handlePost("login", ["loginID", "password"]));
app.post("/forgot-password", handlePost("forgotPassword", ["loginID"]));
app.post("/reset-password", handlePost("resetPassword", ["loginID", "newPassword"]));
app.post("/place-order", handlePost("placeorder", ["customerID", "items", "deliveryDate"]));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
});
