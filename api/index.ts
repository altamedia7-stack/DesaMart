import express from "express";
import crypto from "crypto";
import dotenv from "dotenv";
import cors from "cors";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import firebaseConfig from "../firebase-applet-config.json" assert { type: "json" };

dotenv.config();

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);

const app = express();

app.use(cors());
app.use(express.json());

const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY;
const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY;
const TRIPAY_MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE || process.env.TRIPAY_MERCHANT;
const TRIPAY_SANDBOX = process.env.TRIPAY_SANDBOX === 'true' || 
                       process.env.TRIPAY_SANDBOX === 'Merchant Sandbox' || 
                       process.env.TRIPAY_SANDBOX === '1' ||
                       process.env.TRIPAY_SANDBOX === 'sandbox' ||
                       process.env.TRIPAY_SANDBOX === 'Sandbox';

const TRIPAY_BASE_URL = TRIPAY_SANDBOX 
  ? 'https://tripay.co.id/api-sandbox/' 
  : 'https://tripay.co.id/api/';

// API Routes for TriPay
app.get("/api/tripay/payment-channels", async (req, res) => {
  console.log("Fetching payment channels from TriPay...");
  console.log("Using Base URL:", TRIPAY_BASE_URL);
  
  if (!TRIPAY_API_KEY) {
    console.error("TRIPAY_API_KEY is missing in environment variables");
    return res.status(500).json({ success: false, message: "Konfigurasi TriPay belum lengkap (API Key kosong)" });
  }

  console.log("API Key present (starts with):", TRIPAY_API_KEY.substring(0, 7) + "...");
  console.log("Sandbox Mode:", TRIPAY_SANDBOX);

  try {
    const response = await fetch(`${TRIPAY_BASE_URL}merchant/payment-channel`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TRIPAY_API_KEY}`
      }
    });
    
    const text = await response.text();
    console.log("TriPay Raw Response:", text);
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse TriPay response as JSON:", text);
      return res.status(502).json({ success: false, message: "Respon dari TriPay bukan JSON yang valid" });
    }
    
    console.log("TriPay Channels Response Success:", data.success);
    
    if (!data.success) {
      console.error("TriPay API Error:", data.message);
    }
    
    res.json(data);
  } catch (error) {
    console.error("TriPay Payment Channels Fetch Error:", error);
    res.status(500).json({ success: false, message: `Gagal menghubungi server TriPay: ${error instanceof Error ? error.message : String(error)}` });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.post("/api/tripay/create-transaction", async (req, res) => {
  console.log("Creating TriPay transaction...");
  try {
    const { method, merchant_ref, amount, customer_name, customer_email, customer_phone, order_items } = req.body;

    // Ensure amount is integer
    const intAmount = Math.round(Number(amount));

    const signature = crypto
      .createHmac('sha256', TRIPAY_PRIVATE_KEY || '')
      .update(TRIPAY_MERCHANT_CODE + merchant_ref + intAmount)
      .digest('hex');

    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = process.env.APP_URL || `${protocol}://${host}`;

    const payload = {
      method,
      merchant_ref,
      amount: intAmount,
      customer_name,
      customer_email,
      customer_phone: customer_phone || '081234567890', // Fallback phone
      order_items,
      callback_url: `${baseUrl}/api/tripay/callback`,
      return_url: `${baseUrl}/order-success/${merchant_ref}`,
      expiry: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      signature
    };

    console.log("TriPay Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(`${TRIPAY_BASE_URL}transaction/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TRIPAY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("TriPay Create Response:", JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error("TriPay Create Transaction Error:", error);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

app.post("/api/tripay/callback", async (req, res) => {
  try {
    const callbackSignature = req.headers['x-callback-signature'] as string;
    const json = JSON.stringify(req.body);
    
    const signature = crypto
      .createHmac('sha256', TRIPAY_PRIVATE_KEY || '')
      .update(json)
      .digest('hex');

    if (signature !== callbackSignature) {
      console.error("TriPay Callback: Invalid Signature");
      return res.status(403).json({ error: "Invalid signature" });
    }

    const event = req.headers['x-callback-event'];
    console.log(`TriPay Callback [${event}]:`, JSON.stringify(req.body, null, 2));

    if (event === 'payment_status') {
      const { merchant_ref, status } = req.body;
      
      if (status === 'PAID') {
        const ordersRef = db.collection('orders');
        const snapshot = await ordersRef.where('merchant_ref', '==', merchant_ref).get();
        
        if (!snapshot.empty) {
          const orderDoc = snapshot.docs[0];
          await orderDoc.ref.update({
            status: 'paid',
            updatedAt: FieldValue.serverTimestamp()
          });
          console.log(`Order ${merchant_ref} updated to PAID`);
        } else {
          console.warn(`Order ${merchant_ref} not found in Firestore`);
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("TriPay Callback Error:", error);
    res.status(500).json({ error: "Callback processing failed" });
  }
});

export default app;
