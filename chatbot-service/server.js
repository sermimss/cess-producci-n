require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post('/api/webhook/whatsapp', async (req, res) => {
  try {
    console.log("Incoming Webhook Body:", JSON.stringify(req.body, null, 2));
    const { event, data, payload, sessionId } = req.body;
    
    const msg = payload || data || req.body;

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
        if (geminiApiKey && openWaKey && messageText) {
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
                { headers: { "x-api-key": openWaKey, "Content-Type": "application/json" } }
              );
              console.log("Gemini reply sent successfully to", from);
            }
          } catch (aiError) {
             console.error("AI or Send Error:", aiError.response?.data || aiError.message);
          }
        } else {
             console.log("Skipping reply. Missing API keys or message is empty.");
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

app.get('/health', (req, res) => {
  res.send('Chatbot service is healthy');
});

app.listen(PORT, () => {
  console.log(`Chatbot Service running on port ${PORT}`);
});
