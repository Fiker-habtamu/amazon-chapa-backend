const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const app = express();

// Enable CORS
app.use(
  cors({
    origin: "http://localhost:5173", // Front-end origin
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware for parsing JSON
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Server is running successfully!",
  });
});

const CHAPA_URL =
  process.env.CHAPA_URL ;
const CHAPA_AUTH = process.env.CHAPA_AUTH;

// Request headers with Chapa secret key
const config = {
  headers: {
    Authorization: `Bearer ${CHAPA_AUTH}`,
  },
};

// Payment initialization endpoint
app.post("/api/pay", async (req, res) => {
  const { amount, currency, email, first_name, last_name } = req.body;
  

  // Validate input fields
  if (!amount || !currency || !email || !first_name || !last_name) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const CALLBACK_URL = "http://localhost:3000/api/verify-payment/";
  const TEXT_REF = `tx-${email.split("@")[0]}-${Date.now()}`;

  const data = {
    amount,
    currency,
    email,
    first_name,
    last_name,
    tx_ref: TEXT_REF,
    callback_url: CALLBACK_URL + TEXT_REF,
  };

  try {
    const response = await axios.post(CHAPA_URL, data, config);
    const checkoutUrl = response.data.data.checkout_url;

    // Send the checkout URL back to the front end
    res.status(200).json({ checkout_url: checkoutUrl });
  } catch (error) {
    console.error("Error creating payment:", error.message);
    res.status(500).json({
      error: "Failed to initialize payment. Please try again.",
    });
  }
});

// Payment verification endpoint
app.get("/api/verify-payment/:id", async (req, res) => {
  try {
    const transactionId = req.params.id;
    const response = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${transactionId}`,
      config
    );

    res.status(200).json({
      message: "Payment verification successful",
      data: response.data,
    });
  } catch (error) {
    console.error("Error verifying payment:", error.message);
    res.status(500).json({
      error: "Failed to verify payment. Please try again.",
    });
  }
});

// Start the server
app.listen(3000, (err) => {
  if (err) throw err;
  console.log("Payment backend is running at: http://localhost:3000");
});
