# Esteban Serna | IA & Automatizaciones Empresariales

Plataforma web interactiva, embudo de ventas de alta conversión y Progressive Web App (PWA) para la reserva de diagnósticos estratégicos e implementación de Agentes de IA y Automatizaciones Empresariales.

---

## 🌟 Características Principales

- 🚀 **Embudo de Ventas Interactivo**: Sección Hero, explicación de capacidades de IA, tabla comparativa Antes vs Después y paquetes de servicios.
- 🧮 **Calculadora de Ahorro ROI**: Módulo interactivo que calcula el tiempo ahorrado en horas al mes y el retorno de inversión anual en USD ($) y COP ($).
- 💬 **Simulador de Agente IA**: Demostración interactiva en tiempo real con respuestas simuladas de un asistente virtual 24/7.
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

---

## 📄 Licencia

Este proyecto está desarrollado para **Esteban Serna | Implementación de IA & Automatizaciones Empresariales**. Todos los derechos reservados.
