const express = require("express");
const fetch = require("node-fetch");
const app = express();

// 🔐 Configuración de credenciales
// WhatsApp Cloud API (ya las tienes configuradas)
const WHATSAPP_TOKEN = "EAAZCGCJENBHQBQOrknlqOdJXY3k9TdsC6rOz4wHhAWlUnIKQDMogq8mtXrwfVmaC4ELAITIp4useI3dTZAMiJUsHY3tEOagCbxgU3rz6YlCcAmBZAAliIRlEgt15jjrcDD9mWiCBBb3LWUnrZBgwI3ezbDGbuOclt3S4G0uVDGCFo159J8i3tkvuQvxsZBWgRyMZCRBdfHpMtFLqasGzphE9ItskNyzsWxe5YJhT0BWVVG3thYHjKWAAkpHrC3OENS4kfQFy7uGrtvAccKsfLfZCujx1mVcEfkitORC";
const PHONE_NUMBER_ID = "956980390828651";

// OpenAI API (la leemos desde variable de entorno en Render)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Puerto donde va a escuchar el servidor
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Ruta básica para probar que el servidor funciona
app.get("/", (req, res) => {
  res.send("Servidor funcionando ✅ con IA");
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

// 🤖 Función para generar respuesta con IA (OpenAI)
async function generateAIReply(userText) {
  if (!OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY no está configurada");
    return "Por ahora no tengo acceso a mi cerebro de IA 😅, intenta más tarde.";
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "Eres un asesor de ventas amable y claro que atiende por WhatsApp. Haces preguntas para entender qué necesita la persona, explicas opciones breves y siempre terminas con una pregunta para avanzar en el proceso.",
          },
          {
            role: "user",
            content: userText,
          },
        ],
      }),
    });

    const data = await response.json();
    console.log("Respuesta de OpenAI:");
    console.log(JSON.stringify(data, null, 2));

    const aiMessage = data.choices?.[0]?.message?.content;
    return aiMessage || "No entendí muy bien, ¿me cuentas de nuevo qué necesitas? 🙂";
  } catch (error) {
    console.error("Error llamando a OpenAI:", error);
    return "Tuve un problema técnico procesando tu mensaje 😅. Intenta de nuevo en un momento.";
  }
}

// ✅ Ruta POST /webhook para recibir mensajes y responder con IA
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

    // Si es un status (entregado, leído, etc.), no respondemos
    if (value.statuses) {
      console.log("Es un status, no un mensaje. No respondemos.");
      return;
    }

    const messages = value && value.messages;

    if (!messages || messages.length === 0) {
      console.log("No hay mensajes nuevos en el webhook.");
      return;
    }

    const message = messages[0];
    const from = message.from; // número del usuario
    const text = message.text && message.text.body ? message.text.body : "";

    console.log(`👤 Mensaje de ${from}: ${text}`);

    // 👉 Generamos respuesta con IA
    const aiReply = await generateAIReply(text);

    // Enviamos respuesta por WhatsApp
    await sendWhatsAppMessage(from, aiReply);
  } catch (error) {
    console.error("Error procesando el webhook:", error);
  }
});

// Arrancar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
