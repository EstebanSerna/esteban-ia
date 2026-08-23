# Esteban Serna | IA & Automatizaciones Empresariales

Plataforma web interactiva, embudo de ventas de alta conversión y Progressive Web App (PWA) para la reserva de diagnósticos estratégicos e implementación de Agentes de IA y Automatizaciones Empresariales.

---

## 🌟 Características Principales

- 🚀 **Embudo de Ventas Interactivo**: Sección Hero, explicación de capacidades de IA, tabla comparativa Antes vs Después y paquetes de servicios.
- 🧮 **Calculadora de Ahorro ROI**: Módulo interactivo que calcula el tiempo ahorrado en horas al mes y el retorno de inversión anual en USD ($) y COP ($).
- 💬 **Simulador de Agente IA**: Demostración interactiva en tiempo real potenciada por Claude (Anthropic) real, vía un proxy seguro en Google Apps Script (la API key nunca viaja al navegador). Con respaldo automático a un motor gratuito si el proxy no está configurado.
- 📅 **Motor de Reservas Integrado**: Agendamiento en 4 pasos (Fecha, Hora, Servicio, Datos del Cliente) con persistencia local y sincronización remota.
- ⚙️ **Integración con Google Calendar (Google Apps Script)**: Backend sin servidor (`google-apps-script.js`) que crea eventos automáticamente en Google Calendar y envía invitaciones por correo electrónico.
- 📱 **Progressive Web App (PWA)**: Compatible con instalación en dispositivos móviles y de escritorio (`manifest.json` y `sw.js`).
- 📊 **Panel Privado Esteban IA / Administrador**: Vista de gestión interna para visualizar estadísticas, reservas recibidas y configurar credenciales de Google API.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5 Semántico, Vanilla CSS3 (Variables CSS, Glassmorphism, Responsive Grid), JavaScript ES6+.
- **Efectos Visuales**: Canvas 2D HTML5 para sistema de partículas cuánticas.
- **Backend / Webhook**: Google Apps Script (GAS) desplegado como Aplicación Web.
- **Autenticación (Opcional)**: Google Identity Services (GIS API) y OAuth 2.0.
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
8. Pega esta URL en el portal de configuración de la web o en `localStorage` bajo la clave `apps-script-url`.

### 🤖 Activar el Simulador de IA con Claude Real

El mismo backend de Apps Script funciona como proxy seguro para que el simulador de chat responda con Claude de verdad, sin exponer tu API key en el navegador:

1. Consigue una API key en [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
2. En tu proyecto de Apps Script: **Configuración del proyecto** (ícono de engranaje) → **Propiedades del script** → **Añadir propiedad del script**.
3. Nombre: `ANTHROPIC_API_KEY`, Valor: tu API key. Guardar.
4. Listo — no hace falta volver a implementar el despliegue, el cambio aplica de inmediato.
5. Configura un límite de gasto en [console.anthropic.com/settings/limits](https://console.anthropic.com/settings/limits) como red de seguridad, ya que el demo es público (el proxy ya limita a 20 mensajes/minuto en total, ajustable en `CHAT_RATE_LIMIT_PER_MINUTE`).

Si no configuras la API key, el simulador sigue funcionando con un motor de IA gratuito de respaldo.

---

## 📄 Licencia

Este proyecto está desarrollado para **Esteban Serna | Implementación de IA & Automatizaciones Empresariales**. Todos los derechos reservados.
