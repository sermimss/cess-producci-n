import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for creating Mercado Pago Preference
  app.post("/api/create-preference", async (req, res) => {
    try {
      const { title, quantity, price, studentId } = req.body;
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!accessToken) {
        return res.status(503).json({ error: "Mercado Pago is not configured. Missing MERCADOPAGO_ACCESS_TOKEN" });
      }

      const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
      const preference = new Preference(client);

      // Determine the host to redirect back to
      const host = req.get('host');
      const protocol = req.protocol === 'https' ? 'https' : (host?.includes('localhost') ? 'http' : 'https');
      const baseUrl = `${protocol}://${host}`;

      const response = await preference.create({
        body: {
          items: [
            {
              id: "adeudo",
              title: title,
              quantity: quantity,
              unit_price: price,
              currency_id: 'MXN'
            }
          ],
          external_reference: studentId,
          back_urls: {
            success: `${baseUrl}/?status=approved&studentId=${studentId}`,
            failure: `${baseUrl}/?status=failure&studentId=${studentId}`,
            pending: `${baseUrl}/?status=pending&studentId=${studentId}`
          },
          auto_return: "approved",
        }
      });

      res.json({ 
        id: response.id, 
        init_point: response.sandbox_init_point || response.init_point 
      });
    } catch (error: any) {
      console.error("Error creating Mercado Pago preference:", error);
      res.status(500).json({ error: "Failed to create preference", details: error.message });
    }
  });

  // API Route for sending WhatsApp messages (Background)
  app.post("/api/send-whatsapp", async (req, res) => {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: "Phone number and message are required" });
    }

    // OpenWA Configuration (Requires environment variables)
    const OPENWA_URL = process.env.OPENWA_URL || "http://localhost:2785/api";
    const OPENWA_API_KEY = process.env.OPENWA_API_KEY;
    const OPENWA_SESSION_ID = process.env.OPENWA_SESSION_ID || "default";

    if (!OPENWA_API_KEY) {
      console.warn("OpenWA credentials missing. Message would have been sent to:", phoneNumber);
      return res.status(503).json({ 
        error: "OpenWA API not configured. Please set OPENWA_API_KEY, OPENWA_SESSION_ID (optional) and OPENWA_URL (optional).",
        message: "Simulated success (API not configured)"
      });
    }

    try {
      // Ensure phoneNumber ends with @c.us as required by OpenWA
      const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;

      const response = await axios.post(
        `${OPENWA_URL}/sessions/${OPENWA_SESSION_ID}/messages/send-text`,
        {
          chatId: chatId,
          text: message,
        },
        {
          headers: {
            "X-API-Key": OPENWA_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      res.json({ success: true, data: response.data });
    } catch (error: any) {
      console.error("OpenWA API Error:", error.response?.data || error.message);
      res.status(500).json({ 
        error: "Failed to send WhatsApp message via OpenWA", 
        details: error.response?.data || error.message 
      });
    }
  });

  // API Route for Webhook from OpenWA (Incoming messages to Gemini Chatbot)
  app.post("/api/webhook/whatsapp", async (req, res) => {
    try {
      const fs = require('fs');
      fs.appendFileSync('webhook.log', new Date().toISOString() + ': ' + JSON.stringify(req.body) + '\n');
      console.log("Incoming Webhook Body:", JSON.stringify(req.body, null, 2));
      const { event, data, payload, sessionId } = req.body;
      
      const msg = payload || data || req.body; // Try different structures just in case

      // Handle only incoming messages
      if (event === 'message.received' || event === 'message' || event === 'onMessage') {
        const isFromMe = msg.fromMe || msg.id?.fromMe;
        if (!isFromMe) {
        const from = msg.from || msg.chatId; // e.g., '521XXXXXXXXXX@c.us'
        const messageText = msg.body || msg.text || msg.content;

        const geminiApiKey = process.env.GEMINI_API_KEY;
        const openWaUrl = process.env.OPENWA_URL || "http://localhost:2785/api";
        const openWaKey = process.env.OPENWA_API_KEY;
        const openWaSession = process.env.OPENWA_SESSION_ID || "default";

        console.log(`Received message from ${from}: ${messageText}`);

        // Acknowledge webhook quickly to avoid timeouts
        res.status(200).send("Event received");

        // If Gemini and OpenWA are configured, send a reply asynchronously
        if (geminiApiKey && openWaKey) {
          try {
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });
            const aiResponse = await ai.models.generateContent({
              model: 'gemini-1.5-flash',
              contents: `Actúa como un asistente escolar amigable de CESS Plantel Chihuahua. 
Responde de manera concisa a este alumno: "${messageText}"`,
            });
            
            if (aiResponse.text) {
              await axios.post(
                `${openWaUrl}/sessions/${openWaSession}/messages/send-text`,
                { chatId: from, text: aiResponse.text },
                { headers: { "X-API-Key": openWaKey, "Content-Type": "application/json" } }
              );
              console.log("Gemini reply sent successfully to", from);
            }
          } catch (aiError) {
             console.error("AI or Send Error:", aiError);
          }
        }
        return; 
      }
      }

      // Default acknowledgment for other events
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).send("Internal Server Error");
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
