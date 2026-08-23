# Esteban Serna | IA & Automatizaciones Empresariales

Plataforma web interactiva, embudo de ventas de alta conversión y Progressive Web App (PWA) para la reserva de diagnósticos estratégicos e implementación de Agentes de IA y Automatizaciones Empresariales.

---

## 🌟 Características Principales

- 🚀 **Embudo de Ventas Interactivo**: Sección Hero, explicación de capacidades de IA, tabla comparativa Antes vs Después y paquetes de servicios.
- 🧮 **Calculadora de Ahorro ROI**: Módulo interactivo que calcula el tiempo ahorrado en horas al mes y el retorno de inversión anual en USD ($) y COP ($).
- 💬 **Simulador de Agente IA**: Demostración interactiva en tiempo real potenciada por Claude (Anthropic) real, vía un proxy seguro en Google Apps Script (la API key nunca viaja al navegador). Con respaldo automático a un motor gratuito si el proxy no está configurado.
- 📅 **Motor de Reservas Integrado**: Agendamiento en 4 pasos (Fecha, Hora, Servicio, Datos del Cliente), sincronizado directo a Google Calendar.
- ⚙️ **Integración con Google Calendar (Google Apps Script)**: Backend sin servidor (`google-apps-script.js`) que crea eventos automáticamente en Google Calendar y envía invitaciones por correo electrónico.
- 📱 **Progressive Web App (PWA)**: Compatible con instalación en dispositivos móviles y de escritorio (`manifest.json` y `sw.js`).

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5 Semántico, Vanilla CSS3 (Variables CSS, Glassmorphism, Responsive Grid), JavaScript ES6+.
- **Efectos Visuales**: Canvas 2D HTML5 para sistema de partículas cuánticas.
- **Backend / Webhook**: Google Apps Script (GAS) desplegado como Aplicación Web (reservas + proxy de chat con Claude).
- **PWA**: Service Worker API y Web App Manifest.

---

## 🚀 Instalación y Ejecución Local

1. Clona o abre esta carpeta en tu entorno local:
   ```bash
   cd esteban-ia
   ```

2. Ejecuta un servidor web local:
   - Con **Python**:
     ```bash
     python -m http.server 8080
     ```
   - Con **Node / NPM**:
     ```bash
     npm start
     ```

3. Abre tu navegador e ingresa a:
   ```
   http://localhost:8080
   ```

---

## ⚙️ Configuración del Backend (Google Apps Script)

 Para habilitar la creación automática de eventos en Google Calendar:

1. Ingresa a [Google Apps Script](https://script.google.com/).
2. Crea un **Nuevo proyecto**.
3. Copia todo el contenido del archivo `google-apps-script.js` en el editor.
4. Ajusta la variable `ESTEBAN_EMAIL` con tu correo de Google.
5. Haz clic en **Implementar > Nueva implementación**.
6. Selecciona tipo **Aplicación web**:
   - **Ejecutar como**: *Tú (tu cuenta de correo)*.
   - **Quién tiene acceso**: *Cualquiera (Anyone)*.
7. Copia la URL de la aplicación web generada (termina en `/exec`).
8. Pégala como `DEFAULT_WEBHOOK_URL` en `js/app.js` (no es un dato secreto, está pensada para que
   cualquier navegador la llame directo). El sitio ya no tiene un panel de login para configurar esto.

### 🤖 Activar el Simulador de IA con Claude Real

El mismo backend de Apps Script funciona como proxy seguro para que el simulador de chat responda con Claude de verdad, sin exponer tu API key en el navegador:

1. Consigue una API key en [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
2. En tu proyecto de Apps Script: **Configuración del proyecto** (ícono de engranaje) → **Propiedades del script** → **Añadir propiedad del script**.
3. Nombre: `ANTHROPIC_API_KEY`, Valor: tu API key. Guardar.
4. Listo — no hace falta volver a implementar el despliegue, el cambio aplica de inmediato.
5. Configura un límite de gasto en [console.anthropic.com/settings/limits](https://console.anthropic.com/settings/limits) como red de seguridad, ya que el demo es público (el proxy ya limita a 20 mensajes/minuto en total, ajustable en `CHAT_RATE_LIMIT_PER_MINUTE`).

Si no configuras la API key, el simulador sigue funcionando con un motor de IA gratuito de respaldo.

### 💳 Activar el Checkout de Mercado Pago

El mismo backend procesa el pago único de implementación y activa la suscripción mensual (con un segundo token de la misma tarjeta), y recibe los Webhooks de Mercado Pago para resolver pagos que quedan "en revisión":

1. En tu app de [Mercado Pago Developers](https://www.mercadopago.com.co/developers/panel), copia el **Access Token** (Credenciales de producción).
2. En Apps Script: **Configuración del proyecto** → **Propiedades del script** → **Añadir propiedad del script**.
3. Nombre: `MP_ACCESS_TOKEN`, Valor: tu Access Token. Guardar.
4. La constante `WEBHOOK_NOTIFICATION_URL` en `google-apps-script.js` debe apuntar a la URL `/exec` de esta misma implementación (ya viene configurada); Mercado Pago la usa para avisar por Webhook cuando cambia el estado de un pago.
5. En el panel de Mercado Pago (**Tu app → Webhooks**), registra esa misma URL `/exec` con el evento **Pagos**.

---

## 📄 Licencia

Este proyecto está desarrollado para **Esteban Serna | Implementación de IA & Automatizaciones Empresariales**. Todos los derechos reservados.
