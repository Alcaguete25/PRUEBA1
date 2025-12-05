const express = require("express");
const app = express();

// Puerto donde va a escuchar el servidor
const PORT = process.env.PORT || 3000;

// Para que el servidor pueda leer JSON en las peticiones
app.use(express.json());

// Ruta básica para probar que el servidor funciona
app.get("/", (req, res) => {
  res.send("Servidor funcionando ✅");
});

// 👉 Token que TÚ defines y que debes poner igual en Meta
const VERIFY_TOKEN = "mi_token_seguro_123";

// ✅ Ruta GET /webhook para que Meta verifique el webhook
app.get("/webhook", (req, res) => {
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

// ✅ Ruta POST /webhook para recibir mensajes de WhatsApp
app.post("/webhook", (req, res) => {
  console.log("📩 Llegó una petición a /webhook");
  console.log(JSON.stringify(req.body, null, 2)); // Ver el contenido en los logs
  res.sendStatus(200); // Responder OK a Meta
});

// Arrancar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
