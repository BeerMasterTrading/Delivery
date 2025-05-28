const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

app.use(cors());
app.use(express.json());

// Google Apps Script Web App URL
const scriptBaseUrl = "https://script.google.com/macros/s/AKfycbwBouqpQx0ycQnxGD1ckDiB_t_CRcnD3oCszLj2C5kyMphStkQv4ZWPZELNFtydx1sKeQ/exec";

// Basic validation for form data (used in /submit only)
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

  if (isJson && responseBody.status === "error") {
    throw {
      status: 409,
      message: responseBody.message || "Error from Apps Script",
      details: responseBody.details || null,
    };
  }

  return responseBody;
}

// POST /submit
app.post("/submit", async (req, res) => {
  const { formData, type } = req.body;

  if (!type) {
    return res.status(400).json({ status: "error", message: "Missing request type" });
  }

  const validationError = validateFormData(formData);
  if (validationError) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      details: validationError,
    });
  }

  try {
    const result = await forwardToAppsScript(type, formData);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Submit failed",
      details: error.details || null,
    });
  }
});

// POST /resend
app.post("/resend", async (req, res) => {
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
      code: result.code
    });
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
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Verification failed",
      details: error.details || null,
    });
  }
});

// POST /login
app.post("/login", async (req, res) => {
  const { loginID, password } = req.body;

  if (!loginID || !password) {
    return res.status(400).json({
      status: "error",
      message: "Missing login ID or password"
    });
  }

  try {
    const { loginID, password, type } = req.body;
    const result = await forwardToAppsScript(type || "login", { loginID, password });


    if (result.status === "success") {
      return res.status(200).json({
        status: "success",
        customerID: result.customerID
      });
    } else {
      return res.status(401).json({
        status: "error",
        message: result.message || "Login failed"
      });
    }
  } catch (error) {
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Login failed",
      details: error.details || null
    });
  }
});


// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Backend server running on port " + PORT);
});
