import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY;
  const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY;
  const TRIPAY_MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE || process.env.TRIPAY_MERCHANT;
  const TRIPAY_SANDBOX = process.env.TRIPAY_SANDBOX === 'true' || process.env.TRIPAY_SANDBOX === 'Merchant Sandbox';

  const TRIPAY_BASE_URL = TRIPAY_SANDBOX 
    ? 'https://tripay.co.id/api-sandbox/' 
    : 'https://tripay.co.id/api/';

  // API Routes for TriPay
  app.get("/api/tripay/payment-channels", async (req, res) => {
    try {
      const response = await fetch(`${TRIPAY_BASE_URL}merchant/payment-channel`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TRIPAY_API_KEY}`
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("TriPay Payment Channels Error:", error);
      res.status(500).json({ error: "Failed to fetch payment channels" });
    }
  });

  app.post("/api/tripay/create-transaction", async (req, res) => {
    try {
      const { method, merchant_ref, amount, customer_name, customer_email, customer_phone, order_items } = req.body;

      // Generate Signature
      const signature = crypto
        .createHmac('sha256', TRIPAY_PRIVATE_KEY || '')
        .update(TRIPAY_MERCHANT_CODE + merchant_ref + amount)
        .digest('hex');

      const payload = {
        method,
        merchant_ref,
        amount,
        customer_name,
        customer_email,
        customer_phone,
        order_items,
        callback_url: `${process.env.APP_URL}/api/tripay/callback`,
        return_url: `${process.env.APP_URL}/order-success/${merchant_ref}`,
        expiry: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        signature
      };

      const response = await fetch(`${TRIPAY_BASE_URL}transaction/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TRIPAY_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
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
        return res.status(403).json({ error: "Invalid signature" });
      }

      const event = req.headers['x-callback-event'];
      if (event === 'payment_status') {
        const { merchant_ref, status } = req.body;
        // Handle payment status update in your database here
        console.log(`Payment status for ${merchant_ref}: ${status}`);
        
        // Example: Update Firestore
        // This would require firebase-admin or similar if done server-side, 
        // but since we are using client-side firebase, we might just log it 
        // and let the client-side listener handle the UI update.
        // For a real app, you'd use a service account to update Firestore.
      }

      res.json({ success: true });
    } catch (error) {
      console.error("TriPay Callback Error:", error);
      res.status(500).json({ error: "Callback processing failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`TriPay Sandbox Mode: ${TRIPAY_SANDBOX}`);
  });
}

startServer();
