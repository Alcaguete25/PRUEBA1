const express = require("express");
const fetch = require("node-fetch"); // usamos node-fetch v2
const app = express();

// 🔐 Pega aquí tus datos reales de WhatsApp Cloud API
// Ve a: developers.facebook.com → tu app → WhatsApp → Getting Started
const WHATSAPP_TOKEN = "EAAZCGCJENBHQBQJHl7kadkVO3LXALQnFnADriYakbQ3B98ZAK1xBCqYPo27eKxCVjxEDvZAMpwmyCTaZCteKXZCemjNSmSYaSviyegc6S7EZAZAykxuQZCyVkftSHhZBxQHY6Bw8sLkOQ5yE5hlNIJrWA1yS6QmjQbQLPKZBjRSdE4HKyZCAiJniyjPZBbCC45qXps36DiaZCT3CtZBW5oNSaaZBLmTJd1fDWYwufdN1jTGmId4AzKFNP4gKbBVZCj0AsOohtIwOQXau3pG5zx2FL0F2J9UZAbbOCbW9abetlxXw8";
const PHONE_NUMBER_ID = "956980390828651";

// Puerto donde va a escuchar el servidor
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Ruta básica para probar que el servidor funciona
app.get("/", (req, res) => {
  res.send("Servidor funcionando ✅");
});

// 👉 Token que definimos para la verificación del webhook
const VERIFY_TOKEN = "mi_token_seguro_123";

// ✅ Ruta GET /webhook para verificación de Meta
app.get("/webhook", (req, res) => {
  console.log("🔵 GET /webhook recibido");
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Verificación de webhook fallida");
    res.sendStatus(403);
  }
});

// 🧠 Función para enviar un mensaje de WhatsApp usando la API de Meta
async function sendWhatsAppMessage(to, message) {
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: {
      body: message,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log("Respuesta de la API de WhatsApp:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error llamando a la API de WhatsApp:", error);
  }
}

// ✅ Ruta POST /webhook para recibir mensajes y responder
app.post("/webhook", async (req, res) => {
  console.log("🟢 POST /webhook recibido");
  console.log("Body recibido:");
  console.log(JSON.stringify(req.body, null, 2));

  // Confirmamos rápido a Meta que recibimos la notificación
  res.sendStatus(200);

  try {
    const entry = req.body.entry && req.body.entry[0];
    const changes = entry && entry.changes && entry.changes[0];
    const value = changes && changes.value;
    const messages = value && value.messages;

    if (!messages || messages.length === 0) {
      console.log("No hay mensajes nuevos en el webhook.");
      return;
    }

    const message = messages[0];
    const from = message.from; // número del usuario
    const text = message.text && message.text.body ? message.text.body : "";

    console.log(`👤 Mensaje de ${from}: ${text}`);

    // 👉 Respuesta automática simple
    const reply = `Hola 👋, soy tu bot de prueba. Recibí tu mensaje: "${text}"`;

    // Enviamos respuesta por WhatsApp
    await sendWhatsAppMessage(from, reply);
  } catch (error) {
    console.error("Error procesando el webhook:", error);
  }
});

// Arrancar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
