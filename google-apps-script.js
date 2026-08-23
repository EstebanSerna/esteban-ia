/**
 * ESTEBAN SERNA - GOOGLE CALENDAR SYNC ENGINE
 * 
 * Instrucciones de instalación:
 * 1. Ve a https://script.google.com/ e inicia sesión con tu cuenta de Google.
 * 2. Haz clic en "Nuevo proyecto".
 * 3. Reemplaza todo el código del editor con este archivo.
 * 4. Cambia la variable `ESTEBAN_EMAIL` de abajo con tu correo de Google.
 * 5. Haz clic en "Implementar" (Deploy) > "Nueva implementación" (New deployment).
 * 6. Tipo: "Aplicación web" (Web app).
 * 7. Configuración:
 *    - Descripción: Sincronización Web Esteban IA
 *    - Ejecutar como: "Tú" (Me) -> Tu cuenta.
 *    - Quién tiene acceso: "Cualquiera" (Anyone) -> IMPORTANTE para que la web pueda enviarle datos.
 * 8. Haz clic en "Implementar" y autoriza los permisos requeridos para acceder a tu calendario.
 * 9. Copia la "URL de la aplicación web" (termina en /exec) y guárdala para pegarla en la configuración de la web.
 */

const ESTEBAN_EMAIL = "esteban.serna.garcia@gmail.com"; // Reemplaza por tu correo real si es diferente

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
