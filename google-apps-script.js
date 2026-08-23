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
 * 5b. Igual, agrega otra Propiedad del script llamada MP_ACCESS_TOKEN con tu
 *    Access Token de Mercado Pago (Developers > Tus integraciones > tu app >
 *    Credenciales de prueba/producción). Mientras se prueba el checkout usa
 *    el Access Token de PRUEBA; cuando esté todo validado, cámbialo por el
 *    de producción (y la Public Key en app.js) para cobrar de verdad.
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
const CHECKOUT_RATE_LIMIT_PER_MINUTE = 10; // Maximo de intentos de pago aceptados por minuto (para todos los visitantes juntos)

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: "No se enviaron datos" });
    }

    const data = JSON.parse(e.postData.contents);

    // Ruta del proxy de chat con Claude (usada por el simulador de IA de la web)
    if (data.action === "chat") {
      return handleChatDemo(data);
    }

    // Ruta del checkout de Mercado Pago (pago unico + suscripcion en un solo paso)
    if (data.action === "mp_checkout") {
      return handleMercadoPagoCheckout(data);
    }

    // Validar campos requeridos
    if (!data.name || !data.date || !data.time || !data.service) {
      return createJsonResponse({ success: false, error: "Faltan campos requeridos (nombre, fecha, hora o servicio)" });
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
    });

  } catch (err) {
    return createJsonResponse({ success: false, error: err.message });
  }
}

// Proxy de chat: recibe el mensaje del simulador de la web y responde con
// Claude real, sin exponer nunca la API key al navegador del visitante.
function handleChatDemo(data) {
  try {
    if (!data.userText || !data.systemPrompt) {
      return createJsonResponse({ success: false, error: "Faltan datos del mensaje" });
    }

    if (!isWithinChatRateLimit_()) {
      return createJsonResponse({ success: false, error: "Límite de mensajes por minuto alcanzado, intenta de nuevo en un momento" });
    }

    const apiKey = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return createJsonResponse({ success: false, error: "ANTHROPIC_API_KEY no configurada en Propiedades del script" });
    }

    // Historial de la conversacion (para que Claude sepa que ya saludo, etc.)
    // Se valida y se limita por seguridad, aunque el front ya lo recorta.
    const rawHistory = Array.isArray(data.history) ? data.history.slice(-16) : [];
    const history = rawHistory
      .filter(function (m) { return m && (m.role === "user" || m.role === "assistant") && m.content; })
      .map(function (m) { return { role: m.role, content: String(m.content).slice(0, 1000) }; });

    const messages = history.concat([{ role: "user", content: String(data.userText).slice(0, 1000) }]);

    const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
      method: "post",
      contentType: "application/json",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      payload: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: String(data.systemPrompt).slice(0, 4000),
        messages: messages
      }),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());

    if (result.content && result.content[0] && result.content[0].text) {
      return createJsonResponse({ success: true, text: result.content[0].text });
    }

    const errMsg = (result.error && result.error.message) ? result.error.message : "Respuesta inesperada de Claude";
    return createJsonResponse({ success: false, error: errMsg });

  } catch (err) {
    return createJsonResponse({ success: false, error: err.message });
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

// Checkout de Mercado Pago: cobra el pago unico y, si se aprueba, activa la
// suscripcion mensual con un SEGUNDO token de la misma tarjeta (un CardToken
// de Mercado Pago solo sirve una vez, por eso el front manda dos). El
// Access Token de Mercado Pago vive solo en Propiedades del script, nunca
// llega al navegador del cliente.
function handleMercadoPagoCheckout(data) {
  try {
    if (!data.oneTimeToken || !data.subscriptionToken || !data.paymentMethodId || !data.payerEmail || !data.oneTimeAmount || !data.monthlyAmount) {
      return createJsonResponse({ success: false, error: "Faltan datos para procesar el pago" });
    }

    if (!isWithinCheckoutRateLimit_()) {
      return createJsonResponse({ success: false, error: "Demasiados intentos de pago en poco tiempo. Espera un momento e intenta de nuevo." });
    }

    const accessToken = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
    if (!accessToken) {
      return createJsonResponse({ success: false, error: "MP_ACCESS_TOKEN no configurado en Propiedades del script" });
    }

    // 1) Cobrar el pago único con el primer token
    const paymentBody = {
      transaction_amount: Number(data.oneTimeAmount),
      token: data.oneTimeToken,
      description: (data.planTitle || "Implementación Esteban IA") + " - Pago Único",
      installments: 1,
      payment_method_id: data.paymentMethodId,
      payer: {
        email: data.payerEmail,
        identification: {
          type: data.docType || "CC",
          number: data.docNumber || ""
        }
      }
    };
    if (data.issuerId) paymentBody.issuer_id = data.issuerId;

    const paymentResponse = UrlFetchApp.fetch("https://api.mercadopago.com/v1/payments", {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": "Bearer " + accessToken,
        "X-Idempotency-Key": Utilities.getUuid()
      },
      payload: JSON.stringify(paymentBody),
      muteHttpExceptions: true
    });

    const paymentResult = JSON.parse(paymentResponse.getContentText());

    if (paymentResult.status !== "approved") {
      const reason = translatePaymentStatusDetail_(paymentResult.status_detail) || paymentResult.message || "Tu pago no fue aprobado";
      return createJsonResponse({ success: false, paymentApproved: false, error: reason });
    }

    // 2) Pago aprobado -> activar la suscripción mensual con el SEGUNDO token
    const subscriptionBody = {
      payer_email: data.payerEmail,
      card_token_id: data.subscriptionToken,
      reason: (data.planTitle || "Esteban IA") + " - Sostenimiento Mensual",
      external_reference: "sub_" + (data.serviceKey || "plan").replace(/\s+/g, "_") + "_" + Date.now(),
      back_url: "https://esteban-serna.com/",
      status: "authorized",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number(data.monthlyAmount),
        currency_id: "COP"
      }
    };

    const subResponse = UrlFetchApp.fetch("https://api.mercadopago.com/preapproval", {
      method: "post",
      contentType: "application/json",
      headers: { "Authorization": "Bearer " + accessToken },
      payload: JSON.stringify(subscriptionBody),
      muteHttpExceptions: true
    });

    const subResult = JSON.parse(subResponse.getContentText());
    const subscriptionActive = subResult.status === "authorized" || subResult.status === "pending";

    if (!subscriptionActive) {
      // El dinero del pago único ya se cobró pero la suscripción no quedó
      // activa: se avisa por correo para que Esteban le dé seguimiento manual.
      notifyPartialCheckoutFailure_(data, paymentResult, subResult);
      return createJsonResponse({
        success: false,
        paymentApproved: true,
        subscriptionActive: false,
        error: "El pago se procesó pero la suscripción no pudo activarse"
      });
    }

    // Registrar la venta en el calendario, igual que una reserva normal
    try {
      const calendar = CalendarApp.getDefaultCalendar();
      calendar.createEvent(
        "Venta: " + (data.cardholderName || data.payerEmail) + " (" + (data.planTitle || "Plan") + ")",
        new Date(),
        new Date(Date.now() + 30 * 60 * 1000),
        {
          description:
            "Pago único: $" + data.oneTimeAmount + " COP\n" +
            "Suscripción: $" + data.monthlyAmount + " COP/mes\n" +
            "Correo: " + data.payerEmail + "\n" +
            "ID Pago: " + paymentResult.id + "\n" +
            "ID Suscripción: " + subResult.id
        }
      );
    } catch (calErr) {
      // No bloquea la respuesta al cliente si falla el registro en calendario
    }

    return createJsonResponse({
      success: true,
      paymentApproved: true,
      subscriptionActive: true,
      paymentId: paymentResult.id,
      subscriptionId: subResult.id
    });

  } catch (err) {
    return createJsonResponse({ success: false, error: err.message });
  }
}

// Limite simple de intentos de pago por minuto, compartido entre todos los
// visitantes, para frenar reintentos automatizados contra la API de pagos.
function isWithinCheckoutRateLimit_() {
  const cache = CacheService.getScriptCache();
  const key = "checkout_calls_" + Math.floor(Date.now() / 60000);
  const current = Number(cache.get(key) || 0);
  if (current >= CHECKOUT_RATE_LIMIT_PER_MINUTE) {
    return false;
  }
  cache.put(key, String(current + 1), 90);
  return true;
}

// Traduce los codigos mas comunes de rechazo de Mercado Pago a un mensaje
// entendible para el cliente. Si no se reconoce el codigo, se deja que el
// llamador use un mensaje generico de respaldo.
function translatePaymentStatusDetail_(statusDetail) {
  const map = {
    cc_rejected_insufficient_amount: "Tu tarjeta no tiene fondos suficientes.",
    cc_rejected_bad_filled_security_code: "El código de seguridad (CVV) es incorrecto.",
    cc_rejected_bad_filled_date: "La fecha de vencimiento es incorrecta.",
    cc_rejected_bad_filled_other: "Revisa los datos de tu tarjeta e intenta de nuevo.",
    cc_rejected_bad_filled_card_number: "El número de tarjeta es incorrecto.",
    cc_rejected_call_for_authorize: "Tu banco requiere que autorices el pago directamente con ellos.",
    cc_rejected_card_disabled: "Tu tarjeta está deshabilitada. Contacta a tu banco o usa otra tarjeta.",
    cc_rejected_duplicated_payment: "Ya se registró un pago igual hace poco. Si no fuiste tú, contáctanos.",
    cc_rejected_high_risk: "El pago fue rechazado por seguridad. Prueba con otra tarjeta.",
    cc_rejected_max_attempts: "Alcanzaste el máximo de intentos permitidos con esta tarjeta.",
    cc_rejected_other_reason: "Tu banco rechazó el pago. Prueba con otra tarjeta o método."
  };
  return map[statusDetail] || null;
}

// Notifica por correo cuando el pago único se cobró pero la suscripción no
// pudo activarse, para que se pueda completar manualmente con el cliente.
function notifyPartialCheckoutFailure_(data, paymentResult, subResult) {
  try {
    MailApp.sendEmail({
      to: ESTEBAN_EMAIL,
      subject: "⚠️ Pago cobrado pero suscripción NO activada — " + (data.planTitle || ""),
      body:
        "Se cobró el pago único a " + data.payerEmail + " (ID de pago: " + paymentResult.id + ") " +
        "pero la suscripción mensual no se pudo activar.\n\n" +
        "Detalle de Mercado Pago:\n" + JSON.stringify(subResult, null, 2) + "\n\n" +
        "Contacta al cliente para completar la suscripción manualmente, o reintenta desde el panel de Mercado Pago."
    });
  } catch (mailErr) {
    // Si falla el envio del correo no se bloquea el flujo principal
  }
}

// Soporte para peticiones preflight CORS (OPTIONS)
// Nota: ContentService.TextOutput de Apps Script no tiene un método
// setHeaders() (nunca lo tuvo) - llamarlo rompe la respuesta con un
// TypeError. Las peticiones reales de este sitio van con
// Content-Type: text/plain, por lo que el navegador las trata como
// "simple request" y no dispara preflight OPTIONS; por eso no hace falta
// (ni es posible) fijar cabeceras CORS a mano aqui.
function doOptions(e) {
  return ContentService.createTextOutput("")
                       .setMimeType(ContentService.MimeType.TEXT);
}

// Función auxiliar para responder JSON limpio
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
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
