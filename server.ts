import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import axios from "axios";
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { GoogleGenAI } from "@google/genai";
import { initializeApp as initializeAdminApp, getApps as getAdminApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";
import { computeRecalculatedStudentState, computeStudentFinancialInfo } from "./utils/paymentPlans";
import { PaymentCategory, PaymentStatus } from "./types";
import type { Student, Payment as AppPayment } from "./types";

const ADMIN_EMAIL = "cessplantelchihuahua@gmail.com";

// La verificación de ID tokens de Firebase solo necesita el projectId (dato público,
// el mismo que usa el cliente): no requiere una cuenta de servicio ni ninguna
// credencial secreta, porque valida la firma del token contra las llaves públicas
// de Google.
const adminApp = getAdminApps().length
  ? getAdminApps()[0]
  : initializeAdminApp({ projectId: firebaseConfig.projectId });

// App "privilegiada": requiere una cuenta de servicio real (FIREBASE_SERVICE_ACCOUNT_JSON
// o GOOGLE_APPLICATION_CREDENTIALS). Se usa SOLO para las operaciones que deben saltarse
// las reglas de seguridad de Firestore porque el propio servidor ya validó la operación
// de forma autoritativa (ej. registrar un pago ya confirmado con la API de Mercado Pago,
// o dar de alta una cuenta de docente con su rol). Si no está configurada, esas rutas
// devuelven 503 en vez de fallar en silencio.
function buildPrivilegedCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
    } catch (e) {
      console.error("FIREBASE_SERVICE_ACCOUNT_JSON inválido:", e);
      return null;
    }
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }
  return null;
}

const privilegedCredential = buildPrivilegedCredential();
const privilegedApp = privilegedCredential
  ? initializeAdminApp({ credential: privilegedCredential, projectId: firebaseConfig.projectId }, "privileged")
  : null;

function getPrivilegedFirestore() {
  if (!privilegedApp) {
    throw new Error("Cuenta de servicio no configurada (FIREBASE_SERVICE_ACCOUNT_JSON o GOOGLE_APPLICATION_CREDENTIALS)");
  }
  return getAdminFirestore(privilegedApp);
}

function getPrivilegedAuth() {
  if (!privilegedApp) {
    throw new Error("Cuenta de servicio no configurada (FIREBASE_SERVICE_ACCOUNT_JSON o GOOGLE_APPLICATION_CREDENTIALS)");
  }
  return getAdminAuth(privilegedApp);
}

interface AuthedRequest extends Request {
  firebaseUser?: { uid: string; email: string | null };
}

async function verifyRequestToken(req: AuthedRequest): Promise<{ uid: string; email: string | null } | null> {
  const header = req.headers.authorization || '';
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return null;
  try {
    const decoded = await getAdminAuth(adminApp).verifyIdToken(match[1]);
    return { uid: decoded.uid, email: decoded.email || null };
  } catch (error) {
    console.error("Token de Firebase inválido:", error);
    return null;
  }
}

// Exige una sesión de Firebase válida (cualquier usuario autenticado).
async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = await verifyRequestToken(req);
  if (!user) {
    return res.status(401).json({ error: "Se requiere iniciar sesión para usar este servicio." });
  }
  req.firebaseUser = user;
  next();
}

// Exige que la sesión de Firebase corresponda a la cuenta de Dirección.
async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = await verifyRequestToken(req);
  if (!user || user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "No tienes permiso para usar este servicio." });
  }
  req.firebaseUser = user;
  next();
}

async function startServer() {
  const app = express();
  // Render (y la mayoría de los hostings gratuitos) asignan el puerto dinámicamente
  // vía process.env.PORT; si el proceso no escucha en ese puerto, el healthcheck del
  // hosting nunca pasa y el despliegue se queda "unhealthy" indefinidamente.
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1);
  app.use(express.json());

  // API Route for creating Mercado Pago Preference
  app.post("/api/create-preference", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const { title, quantity, price, studentId } = req.body;
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!accessToken) {
        return res.status(503).json({ error: "Mercado Pago is not configured. Missing MERCADOPAGO_ACCESS_TOKEN" });
      }

      // Validación de entrada: el precio y la cantidad vienen del cliente y no deben
      // aceptarse sin sanear, para evitar que se generen ligas de cobro con montos manipulados.
      const numericQuantity = Number(quantity);
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: "Falta el título del pago" });
      }
      if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) {
        return res.status(400).json({ error: "La cantidad no es válida" });
      }
      if (typeof studentId !== 'string' || !studentId.trim()) {
        return res.status(400).json({ error: "Falta el identificador del alumno" });
      }

      // El precio NUNCA se toma del cliente: el servidor recalcula la deuda real del
      // alumno contra Firestore (con la cuenta de servicio) y genera el cobro por ese
      // monto. Antes, `price` venía tal cual del navegador — bastaba con interceptar la
      // petición y mandar `price: 1` para pagar cualquier colegiatura por un peso.
      if (!privilegedApp) {
        return res.status(503).json({ error: "El sistema de cobros no está configurado en el servidor. Contacta a Dirección." });
      }

      let numericPrice: number;
      try {
        const adminDb = getPrivilegedFirestore();
        const studentSnap = await adminDb.collection('students').doc(studentId).get();
        if (!studentSnap.exists) {
          return res.status(404).json({ error: "El alumno indicado no existe" });
        }
        const studentData = { id: studentSnap.id, ...studentSnap.data() } as Student;

        // Un alumno solo puede generar un cobro para sí mismo.
        if (!req.firebaseUser?.email || studentData.email?.toLowerCase() !== req.firebaseUser.email.toLowerCase()) {
          return res.status(403).json({ error: "No puedes generar un cobro para otro alumno." });
        }

        const paymentsSnap = await adminDb.collection('payments').where('studentId', '==', studentId).get();
        const existingPayments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AppPayment));

        const { totalDebt } = computeStudentFinancialInfo(studentData, existingPayments);
        if (totalDebt <= 0) {
          return res.status(400).json({ error: "Este alumno no tiene ningún adeudo pendiente." });
        }
        numericPrice = totalDebt;
      } catch (debtError: any) {
        console.error("Error calculando la deuda real del alumno:", debtError);
        return res.status(503).json({ error: "No se pudo validar el adeudo del alumno con el servidor." });
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
              quantity: numericQuantity,
              unit_price: numericPrice,
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

  // API Route for verifying Mercado Pago Payment (Prevents client-side URL fraud) AND
  // recording it. El registro en Firestore ocurre AQUÍ, con la cuenta de servicio,
  // porque es el único lugar que ya validó de forma autoritativa (contra la API real
  // de Mercado Pago) que el pago existe, está aprobado y corresponde a este alumno.
  // Antes, el cliente intentaba escribir el pago directamente, pero la regla de
  // Firestore de `payments` solo permite `create` a la cuenta de Dirección: el pago
  // quedaba verificado por Mercado Pago pero nunca se guardaba, y el alumno veía un
  // mensaje de "éxito" aunque el pago se hubiera perdido.
  app.post("/api/verify-payment", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const { paymentId, studentId, preferenceId } = req.body;
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!paymentId) {
        return res.status(400).json({ error: "Missing paymentId" });
      }

      if (!accessToken) {
        return res.status(503).json({ error: "Mercado Pago no está configurado (falta MERCADOPAGO_ACCESS_TOKEN)" });
      }

      const client = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
      const paymentClient = new Payment(client);
      const payment = await paymentClient.get({ id: String(paymentId) });

      if (!payment) {
        return res.status(404).json({ error: "Pago no encontrado en Mercado Pago" });
      }

      if (payment.status !== 'approved') {
        return res.status(400).json({
          valid: false,
          error: `El estado del pago es '${payment.status}', no está aprobado por Mercado Pago`,
          status: payment.status
        });
      }

      // Validar coincidencia de studentId si viene en la metadata o external_reference
      if (studentId && payment.external_reference && String(payment.external_reference) !== String(studentId)) {
        return res.status(403).json({
          valid: false,
          error: "El pago verificado no corresponde al alumno indicado"
        });
      }

      const verifiedAmount = Number(payment.transaction_amount) || 0;
      const dateApproved = payment.date_approved || new Date().toISOString();
      const resolvedStudentId = String(payment.external_reference || studentId);

      let recorded = false;
      let alreadyRecorded = false;

      if (!privilegedApp) {
        return res.status(503).json({
          valid: false,
          error: "El pago fue verificado con Mercado Pago pero el registro automático no está configurado en el servidor. Contacta a Dirección con tu comprobante.",
        });
      }

      try {
        const adminDb = getPrivilegedFirestore();
        const studentRef = adminDb.collection('students').doc(resolvedStudentId);
        const studentSnap = await studentRef.get();

        if (!studentSnap.exists) {
          return res.status(404).json({ valid: false, error: "El alumno indicado no existe" });
        }
        const studentData = { id: studentSnap.id, ...studentSnap.data() } as Student;

        const paymentsSnap = await adminDb.collection('payments').where('studentId', '==', resolvedStudentId).get();
        const existingPayments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AppPayment));
        alreadyRecorded = existingPayments.some(p => p.description && p.description.includes(String(paymentId)));

        if (!alreadyRecorded) {
          const newPaymentData = {
            studentId: resolvedStudentId,
            studentEmail: studentData.email || req.firebaseUser?.email || '',
            amount: verifiedAmount,
            date: dateApproved,
            category: PaymentCategory.Balance,
            description: `Pago Mercado Pago ID: ${paymentId}. Ref: ${preferenceId || ''}`,
            status: PaymentStatus.Paid,
            userId: req.firebaseUser?.uid || '',
          };
          const newDocRef = await adminDb.collection('payments').add(newPaymentData);
          const allPayments = [...existingPayments, { id: newDocRef.id, ...newPaymentData } as AppPayment];

          const recalculated = computeRecalculatedStudentState(studentData, allPayments);
          if (recalculated) {
            await studentRef.update({
              paymentPlanStatus: recalculated.paymentPlanStatus,
              status: recalculated.status,
            });
          }
          recorded = true;
        }
      } catch (adminError: any) {
        console.error("Error registrando el pago verificado en Firestore:", adminError);
        return res.status(503).json({
          valid: false,
          error: "El pago fue verificado con Mercado Pago pero no se pudo registrar automáticamente. Contacta a Dirección con tu comprobante.",
        });
      }

      return res.json({
        valid: true,
        recorded,
        alreadyRecorded,
        paymentId: payment.id,
        amount: verifiedAmount,
        studentId: resolvedStudentId,
        status: payment.status,
        dateApproved,
      });
    } catch (error: any) {
      console.error("Error verifying payment with Mercado Pago API:", error);
      res.status(500).json({
        valid: false,
        error: "Fallo al verificar el pago con la API de Mercado Pago",
        details: error.message
      });
    }
  });

  // API Route for verifying the Dashboard NIP (kept server-side so it never ships in the client bundle)
  app.post("/api/verify-nip", requireAdmin, (req, res) => {
    const { nip } = req.body;
    const expectedNip = process.env.DASHBOARD_NIP;

    if (!expectedNip) {
      return res.status(503).json({ valid: false, error: "El NIP de Dirección no está configurado (falta DASHBOARD_NIP)" });
    }

    if (typeof nip !== 'string' || nip !== expectedNip) {
      return res.status(401).json({ valid: false, error: "NIP incorrecto. Acceso denegado." });
    }

    res.json({ valid: true });
  });

  // API Route for creating a Teacher's Firebase Auth account with the `role: teacher`
  // custom claim. Antes esto se hacía desde el cliente con una app secundaria de Firebase
  // (createUserWithEmailAndPassword), lo que NUNCA marca al usuario como docente de forma
  // verificable por las reglas de seguridad: cualquier cuenta autenticada podía listar el
  // directorio completo de alumnos porque no había forma barata de distinguir "docente
  // real" de "cualquiera que se registró". El custom claim, asignado aquí con la cuenta
  // de servicio, es lo que firestore.rules usa para diferenciarlos.
  app.post("/api/create-teacher-account", requireAdmin, async (req, res) => {
    const { email, password } = req.body;

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: "Correo y contraseña (mínimo 6 caracteres) son requeridos" });
    }

    if (!privilegedApp) {
      return res.status(503).json({ error: "La cuenta de servicio no está configurada en el servidor (FIREBASE_SERVICE_ACCOUNT_JSON o GOOGLE_APPLICATION_CREDENTIALS)" });
    }

    try {
      const adminAuth = getPrivilegedAuth();
      const userRecord = await adminAuth.createUser({ email, password });
      await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'teacher' });
      res.json({ uid: userRecord.uid, email: userRecord.email });
    } catch (error: any) {
      console.error("Error creando cuenta de docente:", error);
      if (error.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'El correo electrónico ya está en uso por otra cuenta.', code: error.code });
      }
      if (error.code === 'auth/invalid-password') {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.', code: error.code });
      }
      res.status(500).json({ error: 'Error al crear la cuenta del docente.', details: error.message, code: error.code });
    }
  });

  // API Route for sending WhatsApp messages (Protected from unauthorized relay)
  app.post("/api/send-whatsapp", requireAdmin, async (req, res) => {
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
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
