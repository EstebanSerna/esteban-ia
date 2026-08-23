/**
 * ESTEBAN SERNA - GOOGLE CALENDAR SYNC ENGINE + PROXY DE CHAT CON CLAUDE
 *
 * Instrucciones de instalación:
 * 1. Ve a https://script.google.com/ e inicia sesión con tu cuenta de Google.
 * 2. Haz clic en "Nuevo proyecto".
 * 3. Reemplaza todo el código del editor con este archivo.
 * 4. Cambia la variable `ESTEBAN_EMAIL` de abajo con tu correo de Google.
 * 5. Guarda tu API key de Claude SIN escribirla en este archivo:
 *    Configuración del proyecto (ícono de engranaje) > Propiedades del script >
 *    "Añadir propiedad del script" > Nombre: ANTHROPIC_API_KEY, Valor: tu key
 *    (la consigues en https://console.anthropic.com/settings/keys).
 *    Esto la guarda cifrada del lado del servidor; nunca llega al navegador
 *    ni queda visible en este código.
 * 6. Haz clic en "Implementar" (Deploy) > "Nueva implementación" (New deployment).
 * 7. Tipo: "Aplicación web" (Web app).
 * 8. Configuración:
 *    - Descripción: Sincronización Web Esteban IA
 *    - Ejecutar como: "Tú" (Me) -> Tu cuenta.
 *    - Quién tiene acceso: "Cualquiera" (Anyone) -> IMPORTANTE para que la web pueda enviarle datos.
 * 9. Haz clic en "Implementar" y autoriza los permisos requeridos para acceder a tu calendario.
 * 10. Copia la "URL de la aplicación web" (termina en /exec) y guárdala para pegarla en la configuración de la web.
 *
 * IMPORTANTE sobre costos: este endpoint queda accesible públicamente (como
 * cualquier webhook). Se incluye un límite básico de peticiones por minuto
 * (ver CHAT_RATE_LIMIT_PER_MINUTE abajo) para evitar abuso, pero de todas
 * formas revisa periódicamente tu consumo y configura un límite de gasto en
 * https://console.anthropic.com/settings/limits como red de seguridad.
 */

const ESTEBAN_EMAIL = "esteban.serna.garcia@gmail.com"; // Reemplaza por tu correo real si es diferente
const CHAT_RATE_LIMIT_PER_MINUTE = 20; // Maximo de mensajes de chat aceptados por minuto (para todos los visitantes juntos)

function doPost(e) {
  // Permitir peticiones de cualquier origen (CORS)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: "No se enviaron datos" }, headers);
    }

    const data = JSON.parse(e.postData.contents);

    // Ruta del proxy de chat con Claude (usada por el simulador de IA de la web)
    if (data.action === "chat") {
      return handleChatDemo(data, headers);
    }

    // Validar campos requeridos
    if (!data.name || !data.date || !data.time || !data.service) {
      return createJsonResponse({ success: false, error: "Faltan campos requeridos (nombre, fecha, hora o servicio)" }, headers);
    }

    // Parsear fecha y hora
    const parsed = parseDateTime(data.date, data.time, data.service);
    const startDate = parsed.startDate;
    const endDate = new Date(startDate.getTime() + parsed.durationMinutes * 60 * 1000);

    // Conectar con el calendario por defecto
    const calendar = CalendarApp.getDefaultCalendar();
    
    // Crear la descripción detallada
    const description = 
      "Detalles de la Reserva:\n" +
      "-----------------------------------\n" +
      "📌 Servicio: " + data.service + "\n" +
      "👤 Cliente: " + data.name + "\n" +
      "✉ Correo: " + data.email + "\n" +
      "💬 WhatsApp: " + data.whatsapp + "\n" +
      "🔗 Redes Sociales: " + data.social + "\n" +
      "🎯 Objetivo/Área de Apoyo: " + data.goal + "\n\n" +
      "Creado automáticamente desde la PWA Esteban IA.";

    // Crear evento en el calendario de Google con fallback de seguridad
    let event;
    try {
      event = calendar.createEvent(
        "Sesión: " + data.name + " (" + data.service + ")",
        startDate,
        endDate,
        {
          description: description,
          guests: data.email,
          sendInvites: true
        }
      );
    } catch (guestErr) {
      // Fallback sin invitar al cliente si falla el envío de correo de Google
      event = calendar.createEvent(
        "Sesión: " + data.name + " (" + data.service + ")",
        startDate,
        endDate,
        {
          description: description
        }
      );
    }

    return createJsonResponse({ 
      success: true, 
      eventId: event.getId(),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString()
    }, headers);

  } catch (err) {
    return createJsonResponse({ success: false, error: err.message }, headers);
  }
}

// Proxy de chat: recibe el mensaje del simulador de la web y responde con
// Claude real, sin exponer nunca la API key al navegador del visitante.
function handleChatDemo(data, headers) {
  try {
    if (!data.userText || !data.systemPrompt) {
      return createJsonResponse({ success: false, error: "Faltan datos del mensaje" }, headers);
    }

    if (!isWithinChatRateLimit_()) {
      return createJsonResponse({ success: false, error: "Límite de mensajes por minuto alcanzado, intenta de nuevo en un momento" }, headers);
    }

    const apiKey = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return createJsonResponse({ success: false, error: "ANTHROPIC_API_KEY no configurada en Propiedades del script" }, headers);
    }

    const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
      method: "post",
      contentType: "application/json",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      payload: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: String(data.systemPrompt).slice(0, 4000),
        messages: [{ role: "user", content: String(data.userText).slice(0, 1000) }]
      }),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());

    if (result.content && result.content[0] && result.content[0].text) {
      return createJsonResponse({ success: true, text: result.content[0].text }, headers);
    }

    const errMsg = (result.error && result.error.message) ? result.error.message : "Respuesta inesperada de Claude";
    return createJsonResponse({ success: false, error: errMsg }, headers);

  } catch (err) {
    return createJsonResponse({ success: false, error: err.message }, headers);
  }
}

// Limite simple de peticiones de chat por minuto, compartido entre todos los
// visitantes, para evitar consumos inesperados en la API de Claude.
function isWithinChatRateLimit_() {
  const cache = CacheService.getScriptCache();
  const key = "chat_calls_" + Math.floor(Date.now() / 60000); // ventana de 1 minuto
  const current = Number(cache.get(key) || 0);
  if (current >= CHAT_RATE_LIMIT_PER_MINUTE) {
    return false;
  }
  cache.put(key, String(current + 1), 90); // expira a los 90s, sobra margen para la ventana
  return true;
}

// Soporte para peticiones preflight CORS (OPTIONS)
function doOptions(e) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
  return ContentService.createTextOutput("")
                       .setMimeType(ContentService.MimeType.TEXT)
                       .setHeaders(headers);
}

// Función auxiliar para responder JSON limpio con cabeceras CORS
function createJsonResponse(obj, headers) {
  const output = ContentService.createTextOutput(JSON.stringify(obj))
                               .setMimeType(ContentService.MimeType.JSON);
  if (headers) {
    output.setHeaders(headers);
  }
  return output;
}

// Analizador de fechas y horas en español
function parseDateTime(dateStr, timeStr, serviceName) {
  // dateStr es como: "18 de Julio de 2026"
  // timeStr es como: "10:30 AM" o "02:30 PM"
  
  const cleanStr = dateStr.toLowerCase().replace(/\bde\b/gi, " ");
  const parts = cleanStr.split(/\s+/).filter(Boolean);
  // parts debe ser: [día, mes, año] ej: ["18", "julio", "2026"]
  
  if (parts.length < 3) {
    throw new Error("Formato de fecha inválido. Se esperaba 'DD de Mes de AAAA'. Recibido: " + dateStr);
  }
  
  const day = parseInt(parts[0], 10);
  const monthName = parts[1];
  const year = parseInt(parts[2], 10);
  
  const months = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  };
  
  const month = months[monthName];
  if (month === undefined) {
    throw new Error("Mes no reconocido: " + monthName);
  }
  
  // Parsear la hora (ej: "10:30 AM")
  const timeParts = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!timeParts) {
    throw new Error("Formato de hora inválido: " + timeStr);
  }
  
  let hours = parseInt(timeParts[1], 10);
  const minutes = parseInt(timeParts[2], 10);
  const ampm = timeParts[3].toUpperCase();
  
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  
  const startDate = new Date(year, month, day, hours, minutes, 0, 0);
  
  // Determinar la duración del evento según el tipo de servicio
  let durationMinutes = 30; // Valor por defecto
  const sName = serviceName.toLowerCase();
  if (sName.includes("diagnostico") || sName.includes("gratuito")) {
    durationMinutes = 30;
  } else if (sName.includes("basico") || sName.includes("whatsapp") || sName.includes("redes")) {
    durationMinutes = 45;
  } else if (sName.includes("experto") || sName.includes("empresa") || sName.includes("plataforma") || sName.includes("completo")) {
    durationMinutes = 60;
  }
  
  return {
    startDate: startDate,
    durationMinutes: durationMinutes
  };
}
