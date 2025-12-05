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

// Aquí más adelante pondremos la ruta del webhook de WhatsApp
app.post("/webhook", (req, res) => {
  console.log("Llego una petición a /webhook");
  console.log(req.body); // Vemos el contenido en logs
  res.sendStatus(200);   // Respondemos OK
});

// Arrancar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
