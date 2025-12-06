const express = require("express");
const fetch = require("node-fetch");
const app = express();

// 🧠 Memoria en RAM por usuario (clave = número de WhatsApp)
const conversations = {};

// 🔐 Configuración de credenciales
// PON AQUÍ tus datos reales de WhatsApp Cloud API:
const WHATSAPP_TOKEN = "EAAZCGCJENBHQBQCk4tdOTGR5KudLzCx3cATf2kfpn9QXdV4ToCgmZCZCceDmPt5lXj4VHwDFqsBsr66OTLQG1gU0aMNCEQO5yFKM2ONKuWPcxZA7lHwwsnA77GNQhjBMRPyNL1ZBwTEZBtEOlZB1Hl4hDXetqU1vFUMyZCMbwFsPN7ouT4StZCc1ZA8MIDsEEmtwSie3ZBo95rVtVKssyZCsWCxhNVA2EMMqRuWdFOrOh50HZBV7rpYYkvOtNUMcp1tdhMMidyWzrwrtnGKTknrcHlkJ7Glp9ojsAF5HwMtUZD";
const PHONE_NUMBER_ID = "956980390828651";

// OpenAI API (desde variable de entorno en Render)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Puerto donde va a escuchar el servidor
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Ruta básica para probar que el servidor funciona
app.get("/", (req, res) => {
  res.send("Servidor funcionando ✅ con IA y memoria");
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

// 🧠 Función para generar respuesta con IA (OpenAI) usando historial
async function generateAIReply(history) {
  if (!OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY no está configurada");
    return "Por ahora no tengo acceso a mi cerebro de IA 😅, intenta más tarde.";
  }

  try {
    // Tomamos solo los últimos 10 mensajes para no hacerla infinita
    const recentHistory = history.slice(-10);

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
            content: `
Eres un asesor de ventas por WhatsApp de Alcagüete, una marca de alimentos saludables (snacks horneados, premezclas sin gluten, productos sin azúcar añadida y opciones gluten free).

TU ESTILO:
- Hablas en primera persona, cercano y claro, como un vendedor humano amable.
- Tono cálido y profesional, típico colombiano/neutro.
- Mensajes cortos (2 a 4 líneas) con algunos emojis suaves (🙂😉✨), sin abusar.

MEMORIA Y CONTEXTO:
- El historial que ves incluye mensajes anteriores de la conversación.
- Si ya existe al menos un mensaje con role "assistant", significa que YA saludaste.
- SOLO puedes saludar con "Hola", "¡Hola!" o similar en tu PRIMER mensaje. En los siguientes NO debes empezar con saludos, sino continuar la conversación (por ejemplo: "Perfecto...", "Súper...", "Entiendo...", "Listo, entonces...").
- No repitas preguntas que ya hiciste si ya tienes esa información (por ejemplo, si ya sabes que es para un negocio en Medellín, no vuelvas a preguntar eso).

OBJETIVO:
1. Entender qué necesita la persona (para quién es, ocasión de consumo, si es para casa o negocio, aproximado de presupuesto).
2. Guiarla por un flujo de ventas:
   - Paso 1: Saludar y preguntar qué está buscando o qué antojo/ necesidad tiene (solo al inicio).
   - Paso 2: Hacer 1–2 preguntas de calificación (tipo de cliente, cantidad, frecuencia, tipo de producto).
   - Paso 3: Recomendar 1–3 opciones concretas de productos de Alcagüete (por tipo, no necesitas precios exactos) y explicar beneficios en lenguaje sencillo.
   - Paso 4: Proponer un siguiente paso claro (ej: enviar catálogo, link de compra, tomar datos para pedido, agendar llamada o pasar a un asesor humano).

REGLAS:
- Usa el contexto de los mensajes anteriores para avanzar, no para quedarte en el saludo.
- Siempre termina tu mensaje con UNA sola pregunta para seguir avanzando.
- Si la persona pide hablar con alguien (“asesor”, “humano”, “llamada”, etc.), deja de vender tú y responde que con gusto lo pasas a un asesor humano y pregunta el dato de contacto (por ejemplo, email o mejor horario).
- No inventes datos específicos de precios o condiciones que no tengas; si te los piden, sugiere que un asesor humano confirme esos detalles.
- Si el mensaje del usuario es muy confuso, pídele que te aclare con una pregunta simple.
            `.trim(),
          },
          // 👇 Aquí inyectamos el historial de la conversación
          ...recentHistory,
        ],
      }),
    });

    const data = await response.json();
    console.log("Respuesta de OpenAI:");
    console.log(JSON.stringify(data, null, 2));

    const raw = data.choices?.[0]?.message?.content || "";
    const aiMessage = raw.trim();

    return aiMessage || "No entendí muy bien, ¿me cuentas de nuevo qué necesitas? 🙂";
  } catch (error) {
    console.error("Error llamando a OpenAI:", error);
    return "Tuve un problema técnico procesando tu mensaje 😅. Intenta de nuevo en un momento.";
  }
}

// 📨 Función para enviar un mensaje de WhatsApp usando la API de Meta
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

// ✅ Ruta POST /webhook para recibir mensajes y responder con IA + memoria
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

    // 🧠 Inicializar historial si no existe
    if (!conversations[from]) {
      conversations[from] = [];
    }

    console.log(
      `📚 Historial actual de ${from}: ${conversations[from].length} mensajes`
    );

    // Agregar mensaje del usuario al historial
    conversations[from].push({
      role: "user",
      content: text,
    });

    // 👉 Generamos respuesta con IA usando TODO el historial de este usuario
    let aiReply = await generateAIReply(conversations[from]);

    // 🧠 Ver si ya hemos respondido antes a este número
    const hasAssistantBefore = conversations[from].some(
      (m) => m.role === "assistant"
    );

    // Si ya hemos hablado antes y la IA arrancó con "Hola...", se lo recortamos
    if (hasAssistantBefore) {
      const original = aiReply;
      aiReply = aiReply.replace(/^(\s*¡?Hola[!¡]?[,\s]*)/i, "").trim();

      if (original !== aiReply) {
        console.log(
          "✂️ Se recortó un saludo repetido al inicio de la respuesta de IA"
        );
      }
    }

    // Por si acaso queda vacío después de recortar
    if (!aiReply) {
      aiReply =
        "Perfecto, cuéntame un poco más para ayudarte mejor 🙂 ¿Qué te gustaría ofrecer exactamente?";
    }

    // Agregar respuesta del bot al historial
    conversations[from].push({
      role: "assistant",
      content: aiReply,
    });

    console.log(
      `📚 Historial NUEVO de ${from}: ${conversations[from].length} mensajes`
    );

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

