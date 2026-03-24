import express from "express";
import crypto from "crypto";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Backend starting...");
console.log("Environment Check:", {
  hasApiKey: !!process.env.TRIPAY_API_KEY,
  hasPrivateKey: !!(process.env.TRIPAY_PRIVATE_KEY || process.env.TRIPAY_PRIVATE_KE),
  merchantCode: process.env.TRIPAY_MERCHANT_CODE || process.env.TRIPAY_MERCHANT,
  sandbox: process.env.TRIPAY_SANDBOX
});

// Load Firebase Config safely
let firebaseConfig: any = {};
try {
  const configPath = path.join(__dirname, "../firebase-applet-config.json");
  firebaseConfig = JSON.parse(readFileSync(configPath, "utf8"));
} catch (error) {
  console.error("Failed to load firebase-applet-config.json:", error);
}

// Initialize Firebase Admin
if (getApps().length === 0 && firebaseConfig.projectId) {
  try {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

// Lazy Firestore initialization
let _db: any = null;
const getDb = () => {
  if (!_db) {
    try {
      _db = getFirestore(firebaseConfig.firestoreDatabaseId || undefined);
    } catch (error) {
      console.error("Firestore initialization error:", error);
      throw error;
    }
  }
  return _db;
};

const app = express();

app.use(cors());
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Logging middleware to debug incoming requests
app.use((req, res, next) => {
  if (req.url.startsWith('/api/tripay')) {
    console.log(`Incoming ${req.method} request to ${req.url}`);
  }
  next();
});

const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY;
const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY || process.env.TRIPAY_PRIVATE_KE;
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
  console.log("Fetching payment channels from TriPay via Axios...");
  
  if (!TRIPAY_API_KEY) {
    return res.status(500).json({ success: false, message: "Konfigurasi TriPay belum lengkap (API Key kosong)" });
  }

  try {
    const response = await axios.get(`${TRIPAY_BASE_URL}merchant/payment-channel`, {
      headers: {
        'Authorization': `Bearer ${TRIPAY_API_KEY}`
      }
    });
    
    console.log("TriPay Channels Response Success:", response.data.success);
    res.json(response.data);
  } catch (error: any) {
    console.error("TriPay Payment Channels Fetch Error:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: `Gagal menghubungi server TriPay: ${error.response?.data?.message || error.message}` 
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.post("/api/tripay/create-transaction", async (req, res) => {
  console.log("Creating TriPay transaction via Axios...");
  try {
    const { method, merchant_ref, amount, customer_name, customer_email, customer_phone, order_items } = req.body;

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
      customer_phone: customer_phone || '081234567890',
      order_items,
      callback_url: `${baseUrl}/api/tripay/callback`,
      return_url: `${baseUrl}/order-success/${merchant_ref}`,
      expiry: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      signature
    };

    console.log("TriPay Create Payload:", JSON.stringify(payload, null, 2));

    const response = await axios.post(`${TRIPAY_BASE_URL}transaction/create`, payload, {
      headers: {
        'Authorization': `Bearer ${TRIPAY_API_KEY}`
      }
    });

    console.log("TriPay Create Response Status:", response.status);
    console.log("TriPay Create Response Data:", JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error("TriPay Create Transaction Error:", JSON.stringify(errorData, null, 2));
    res.status(500).json({ 
      success: false, 
      message: error.response?.data?.message || "Failed to create transaction",
      error: errorData
    });
  }
});

app.post(["/api/tripay/callback", "/api/tripay/callback/"], async (req: any, res) => {
  console.log("TriPay Callback received!");
  try {
    const callbackSignature = req.headers['x-callback-signature'] as string;
    
    // Use rawBody for signature verification if available
    const json = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
    
    const signature = crypto
      .createHmac('sha256', TRIPAY_PRIVATE_KEY || '')
      .update(json)
      .digest('hex');

    if (signature !== callbackSignature) {
      console.error("TriPay Callback: Invalid Signature");
      console.error("Expected:", signature);
      console.error("Received:", callbackSignature);
      return res.status(403).json({ error: "Invalid signature" });
    }

    const event = req.headers['x-callback-event'];
    console.log(`TriPay Callback [${event}]:`, JSON.stringify(req.body, null, 2));

    if (event === 'payment_status') {
      const { merchant_ref, status } = req.body;
      
      if (status === 'PAID') {
        const db = getDb();
        const ordersRef = db.collection('orders');
        const snapshot = await ordersRef.where('merchant_ref', '==', merchant_ref).get();
        
        if (!snapshot.empty) {
          const orderDoc = snapshot.docs[0];
          await orderDoc.ref.update({
            status: 'paid',
            updatedAt: FieldValue.serverTimestamp()
          });
          console.log(`Order ${merchant_ref} updated to PAID in Firestore`);
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
