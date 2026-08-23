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
const SUBSCRIPTION_FREE_TRIAL_DAYS = 30; // El pago unico de hoy cubre la implementacion; la mensualidad empieza a cobrarse este numero de dias despues
// URL publica de esta misma implementacion (termina en /exec). Se le pasa a
// Mercado Pago como "notification_url" para que nos avise por Webhook cuando
// cambie el estado de un pago o suscripcion (requisito de "Calidad de
// integracion" y necesario para resolver pagos que quedan "en revision").
// Debe coincidir con DEFAULT_WEBHOOK_URL en js/app.js.
const WEBHOOK_NOTIFICATION_URL = "https://script.google.com/macros/s/AKfycbyMWlRXHMRUvLN45NqEecusRBk7NOeuJWrUFLTCbTLv8Wqh_dO4VRIHcYwEph_sLHcY/exec";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: "No se enviaron datos" });
    }

    const data = JSON.parse(e.postData.contents);

    // Notificacion Webhook de Mercado Pago (pago o suscripcion creado/
    // actualizado). Se distingue de nuestras propias llamadas porque trae
    // "type":"payment" y "data.id", no nuestro campo "action" de chat/checkout.
    if (data.type === "payment" && data.data && data.data.id) {
      return handleMercadoPagoWebhook_(data.data.id);
    }

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
    const firstName = (data.cardholderName || "").trim().split(/\s+/)[0] || "";
    const lastName = (data.cardholderName || "").trim().split(/\s+/).slice(1).join(" ") || "";
    const paymentBody = {
      transaction_amount: Number(data.oneTimeAmount),
      token: data.oneTimeToken,
      description: (data.planTitle || "Implementación Esteban IA") + " - Pago Único",
      statement_descriptor: "ESTEBAN IA",
      installments: 1,
      payment_method_id: data.paymentMethodId,
      external_reference: "pay_" + (data.serviceKey || "plan").replace(/\s+/g, "_") + "_" + Date.now(),
      notification_url: WEBHOOK_NOTIFICATION_URL,
      payer: {
        email: data.payerEmail,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: data.docType || "CC",
          number: data.docNumber || ""
        }
      },
      additional_info: {
        items: [
          {
            id: (data.serviceKey || "plan").replace(/\s+/g, "_").toLowerCase(),
            title: data.planTitle || "Plan Esteban IA",
            description: "Implementación de " + (data.planTitle || "agente de IA") + " para negocio - pago único inicial",
            category_id: "services",
            quantity: 1,
            unit_price: Number(data.oneTimeAmount)
          }
        ],
        payer: {
          first_name: firstName,
          last_name: lastName,
          phone: { number: data.payerWhatsapp || "" }
        }
      }
    };
    if (data.issuerId) paymentBody.issuer_id = data.issuerId;

    // Device ID anti-fraude: NO va en additional_info.device (Mercado Pago lo
    // rechaza como campo invalido); va como header X-meli-session-id.
    const paymentHeaders = {
      "Authorization": "Bearer " + accessToken,
      "X-Idempotency-Key": Utilities.getUuid()
    };
    if (data.deviceId) {
      paymentHeaders["X-meli-session-id"] = data.deviceId;
    }

    const paymentResponse = UrlFetchApp.fetch("https://api.mercadopago.com/v1/payments", {
      method: "post",
      contentType: "application/json",
      headers: paymentHeaders,
      payload: JSON.stringify(paymentBody),
      muteHttpExceptions: true
    });

    const paymentResult = JSON.parse(paymentResponse.getContentText());
    console.log("Respuesta de Mercado Pago /v1/payments: status=" + paymentResult.status + " status_detail=" + paymentResult.status_detail + " id=" + paymentResult.id);

    // Un pago puede quedar "in_process"/"pending" en revision de fraude (esto
    // pasa con pagos reales tambien, no solo en sandbox). No se activa la
    // suscripcion todavia -- se espera a que el pago se apruebe de verdad.
    if (paymentResult.status === "in_process" || paymentResult.status === "pending") {
      // Se guarda el token de suscripcion (sin usar todavia) para poder
      // activarla mas tarde si el Webhook nos avisa que el pago se aprobo.
      savePendingCheckout_(paymentResult.id, data);
      notifyPendingPayment_(data, paymentResult);
      return createJsonResponse({
        success: false,
        paymentApproved: false,
        paymentPending: true,
        error: "Tu pago quedó en revisión. Te confirmaremos por correo en cuanto se apruebe (puede tardar unos minutos)."
      });
    }

    if (paymentResult.status !== "approved") {
      const reason = translatePaymentStatusDetail_(paymentResult.status_detail) || paymentResult.message || "Tu pago no fue aprobado";
      return createJsonResponse({ success: false, paymentApproved: false, error: reason });
    }

    // 2) Pago aprobado -> activar la suscripción mensual con el SEGUNDO token.
    const activation = activateSubscriptionAndNotify_(data, paymentResult);

    if (!activation.subscriptionActive) {
      return createJsonResponse({
        success: false,
        paymentApproved: true,
        subscriptionActive: false,
        error: "El pago se procesó pero la suscripción no pudo activarse"
      });
    }

    return createJsonResponse({
      success: true,
      paymentApproved: true,
      subscriptionActive: true,
      paymentId: paymentResult.id,
      subscriptionId: activation.subResult.id
    });

  } catch (err) {
    console.error("Error inesperado en handleMercadoPagoCheckout: " + err.message);
    return createJsonResponse({ success: false, error: err.message });
  }
}

// Activa la suscripción mensual (segundo token) una vez el pago único ya
// quedó aprobado -- la usan tanto el flujo síncrono (pago aprobado al
// instante) como el Webhook (pago que quedó "en revisión" y se aprobó
// después). La suscripción queda autorizada desde ya, pero el primer cobro
// mensual no ocurre hasta dentro de SUBSCRIPTION_FREE_TRIAL_DAYS (el pago
// único de hoy ya cubre la implementación).
function activateSubscriptionAndNotify_(data, paymentResult) {
  const accessToken = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
  const startDate = new Date(Date.now() + SUBSCRIPTION_FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const subscriptionBody = {
    payer_email: data.payerEmail,
    card_token_id: data.subscriptionToken,
    reason: (data.planTitle || "Esteban IA") + " - Sostenimiento Mensual",
    external_reference: "sub_" + (data.serviceKey || "plan").replace(/\s+/g, "_") + "_" + Date.now(),
    back_url: "https://esteban-serna.com/",
    notification_url: WEBHOOK_NOTIFICATION_URL,
    status: "authorized",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      start_date: startDate.toISOString(),
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
  // Se deja registrado siempre en "Ejecuciones" (independiente de si el
  // correo de aviso llega o no) para poder diagnosticar sin depender del
  // envio de MailApp.
  console.log("Respuesta de Mercado Pago /preapproval: " + JSON.stringify(subResult));
  const subscriptionActive = subResult.status === "authorized" || subResult.status === "pending";

  if (!subscriptionActive) {
    // El dinero del pago único ya se cobró pero la suscripción no quedó
    // activa: se avisa por correo para que Esteban le dé seguimiento manual.
    notifyPartialCheckoutFailure_(data, paymentResult, subResult);
    return { subscriptionActive: false, subResult: subResult };
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
          "Suscripción: $" + data.monthlyAmount + " COP/mes (empieza en " + SUBSCRIPTION_FREE_TRIAL_DAYS + " días)\n" +
          "Correo: " + data.payerEmail + "\n" +
          "WhatsApp: " + (data.payerWhatsapp || "no proporcionado") + "\n" +
          "ID Pago: " + paymentResult.id + "\n" +
          "ID Suscripción: " + subResult.id
      }
    );
  } catch (calErr) {
    // No bloquea la respuesta al cliente si falla el registro en calendario
  }

  // Avisar por correo para arrancar la implementacion cuanto antes
  notifySuccessfulSale_(data, paymentResult, subResult, startDate);

  return { subscriptionActive: true, subResult: subResult };
}

// Guarda temporalmente los datos de un checkout cuyo pago quedó "en
// revisión", para poder retomarlo desde el Webhook si Mercado Pago lo
// aprueba mas tarde (el token de suscripción, al no haberse usado todavía,
// sigue sirviendo). Se usa PropertiesService en vez de CacheService porque
// este último tiene un tope de 6 horas, insuficiente para algunos casos.
function savePendingCheckout_(paymentId, data) {
  try {
    PropertiesService.getScriptProperties().setProperty(
      "pending_" + paymentId,
      JSON.stringify({
        subscriptionToken: data.subscriptionToken,
        payerEmail: data.payerEmail,
        payerWhatsapp: data.payerWhatsapp,
        planTitle: data.planTitle,
        serviceKey: data.serviceKey,
        oneTimeAmount: data.oneTimeAmount,
        monthlyAmount: data.monthlyAmount,
        docType: data.docType,
        docNumber: data.docNumber,
        cardholderName: data.cardholderName
      })
    );
  } catch (propErr) {
    // Si falla el guardado, en el peor caso ese pago pendiente no se retoma
    // solo -- Esteban ya recibio el correo de "pago en revision" para
    // hacerle seguimiento manual.
  }
}

// Webhook de Mercado Pago: nos avisa cuando cambia el estado de un pago.
// Solo actua sobre pagos que quedaron guardados como "pendientes" desde
// handleMercadoPagoCheckout -- si no hay registro guardado, no hace nada
// (evita duplicar la activacion/notificacion de pagos ya resueltos al
// instante). Siempre responde 200 para que Mercado Pago no reintente.
function handleMercadoPagoWebhook_(paymentId) {
  try {
    const accessToken = PropertiesService.getScriptProperties().getProperty("MP_ACCESS_TOKEN");
    if (!accessToken) {
      return createJsonResponse({ success: true });
    }

    const props = PropertiesService.getScriptProperties();
    const storedJson = props.getProperty("pending_" + paymentId);
    if (!storedJson) {
      return createJsonResponse({ success: true });
    }

    const paymentResponse = UrlFetchApp.fetch("https://api.mercadopago.com/v1/payments/" + paymentId, {
      method: "get",
      headers: { "Authorization": "Bearer " + accessToken },
      muteHttpExceptions: true
    });
    const paymentResult = JSON.parse(paymentResponse.getContentText());
    const data = JSON.parse(storedJson);

    if (paymentResult.status === "approved") {
      activateSubscriptionAndNotify_(data, paymentResult);
      props.deleteProperty("pending_" + paymentId);
    } else if (paymentResult.status === "rejected" || paymentResult.status === "cancelled") {
      props.deleteProperty("pending_" + paymentId);
      notifyPendingResolvedAsRejected_(data, paymentResult);
    }
    // Si sigue "in_process"/"pending", se deja el registro para el proximo aviso.

    return createJsonResponse({ success: true });
  } catch (err) {
    return createJsonResponse({ success: true });
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

// Notifica por correo cuando una venta se completa de verdad (pago +
// suscripcion activados) -- esta es la señal para arrancar la implementacion.
function notifySuccessfulSale_(data, paymentResult, subResult, subscriptionStartDate) {
  try {
    MailApp.sendEmail({
      to: ESTEBAN_EMAIL,
      subject: "🎉 Nueva venta: " + (data.planTitle || "Plan") + " — " + (data.cardholderName || data.payerEmail),
      body:
        "¡Nueva venta confirmada! Ya se puede arrancar la implementación.\n\n" +
        "Cliente: " + (data.cardholderName || "-") + "\n" +
        "Correo: " + data.payerEmail + "\n" +
        "WhatsApp: " + (data.payerWhatsapp || "no proporcionado") + "\n" +
        "Documento: " + (data.docType || "") + " " + (data.docNumber || "") + "\n\n" +
        "Plan: " + (data.planTitle || "-") + "\n" +
        "Pago único cobrado: $" + data.oneTimeAmount + " COP (ID: " + paymentResult.id + ")\n" +
        "Suscripción mensual: $" + data.monthlyAmount + " COP/mes, primer cobro el " +
        subscriptionStartDate.toLocaleDateString("es-CO") + " (ID: " + subResult.id + ")\n\n" +
        "Contáctalo por WhatsApp para coordinar el inicio de la implementación."
    });
  } catch (mailErr) {
    // Si falla el envio del correo no se bloquea el flujo principal, pero
    // queda registrado en "Ejecuciones" para poder diagnosticarlo.
    console.error("Fallo el envio de correo de notificacion: " + mailErr.message);
  }
}

// Notifica por correo cuando el pago único se cobró pero la suscripción no
// pudo activarse, para que se pueda completar manualmente con el cliente.
function notifyPartialCheckoutFailure_(data, paymentResult, subResult) {
  try {
    MailApp.sendEmail({
      to: ESTEBAN_EMAIL,
      subject: "⚠️ Pago cobrado pero suscripción NO activada — " + (data.planTitle || ""),
      body:
        "Se cobró el pago único a " + data.payerEmail + " (WhatsApp: " + (data.payerWhatsapp || "no proporcionado") +
        ", ID de pago: " + paymentResult.id + ") pero la suscripción mensual no se pudo activar.\n\n" +
        "Detalle de Mercado Pago:\n" + JSON.stringify(subResult, null, 2) + "\n\n" +
        "Contacta al cliente para completar la suscripción manualmente, o reintenta desde el panel de Mercado Pago."
    });
  } catch (mailErr) {
    // Si falla el envio del correo no se bloquea el flujo principal, pero
    // queda registrado en "Ejecuciones" para poder diagnosticarlo.
    console.error("Fallo el envio de correo de notificacion: " + mailErr.message);
  }
}

// Notifica cuando un pago queda "en revision" (in_process/pending) del lado
// de Mercado Pago. El Webhook (ver handleMercadoPagoWebhook_) retomará este
// pago automáticamente cuando Mercado Pago avise que cambió de estado: si se
// aprueba, activa la suscripción solo; si se rechaza, avisa con
// notifyPendingResolvedAsRejected_. Este correo es solo el primer aviso.
function notifyPendingPayment_(data, paymentResult) {
  try {
    MailApp.sendEmail({
      to: ESTEBAN_EMAIL,
      subject: "⏳ Pago en revisión: " + (data.planTitle || "Plan") + " — " + (data.cardholderName || data.payerEmail),
      body:
        "Un cliente intentó pagar y el pago quedó \"" + paymentResult.status + "\" (" + (paymentResult.status_detail || "") + ") en revisión de Mercado Pago.\n\n" +
        "Cliente: " + (data.cardholderName || "-") + "\n" +
        "Correo: " + data.payerEmail + "\n" +
        "WhatsApp: " + (data.payerWhatsapp || "no proporcionado") + "\n" +
        "Plan: " + (data.planTitle || "-") + "\n" +
        "ID de pago: " + paymentResult.id + "\n\n" +
        "No hace falta que hagas nada: en cuanto Mercado Pago resuelva el pago te llegará un correo nuevo confirmando si se activó la suscripción o si finalmente se rechazó."
    });
  } catch (mailErr) {
    // Si falla el envio del correo no se bloquea el flujo principal, pero
    // queda registrado en "Ejecuciones" para poder diagnosticarlo.
    console.error("Fallo el envio de correo de notificacion: " + mailErr.message);
  }
}

// Notifica cuando un pago que había quedado "en revisión" se resuelve como
// rechazado o cancelado (avisado por el Webhook) -- puramente informativo,
// no requiere ninguna accion.
function notifyPendingResolvedAsRejected_(data, paymentResult) {
  try {
    MailApp.sendEmail({
      to: ESTEBAN_EMAIL,
      subject: "❌ Pago finalmente rechazado: " + (data.planTitle || "Plan") + " — " + (data.cardholderName || data.payerEmail),
      body:
        "El pago que había quedado \"en revisión\" se resolvió como " + paymentResult.status + " (" + (paymentResult.status_detail || "") + ").\n\n" +
        "Cliente: " + (data.cardholderName || "-") + "\n" +
        "Correo: " + data.payerEmail + "\n" +
        "WhatsApp: " + (data.payerWhatsapp || "no proporcionado") + "\n\n" +
        "No se activó la suscripción. Es solo informativo, no hace falta que hagas nada."
    });
  } catch (mailErr) {
    // Si falla el envio del correo no se bloquea el flujo principal, pero
    // queda registrado en "Ejecuciones" para poder diagnosticarlo.
    console.error("Fallo el envio de correo de notificacion: " + mailErr.message);
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
