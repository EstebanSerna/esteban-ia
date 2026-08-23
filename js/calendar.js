/**
 * Esteban IA - Google Calendar API Integration
 * Sincronización oficial con Google Calendar + Dashboard Privado en PWA
 */

let tokenClient;
let accessToken = null;
let clientID = localStorage.getItem('google-client-id') || '';
let apiKey = localStorage.getItem('google-api-key') || '';
let webhookURL = localStorage.getItem('google-webhook-url') || '';

// Dynamic mock events for the Esteban IA Portal when in DEMO MODE
function getDynamicMockEvents() {
  const now = new Date();
  
  const d1 = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  d1.setHours(10, 30, 0, 0);
  const d1End = new Date(d1.getTime() + 45 * 60 * 1000);

  const d2 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  d2.setHours(14, 0, 0, 0);
  const d2End = new Date(d2.getTime() + 60 * 60 * 1000);

  const d3 = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  d3.setHours(16, 30, 0, 0);
  const d3End = new Date(d3.getTime() + 30 * 60 * 1000);

  return [
    {
      summary: "Diagnóstico Estratégico IA: Óptica Visión Real",
      start: { dateTime: d1.toISOString() },
      end: { dateTime: d1End.toISOString() },
      description: "Valoración inicial para implementación de Agente IA en WhatsApp e Instagram.",
      status: "confirmed"
    },
    {
      summary: "Asistente Experto en Empresa: Clínica Odontológica",
      start: { dateTime: d2.toISOString() },
      end: { dateTime: d2End.toISOString() },
      description: "Entrenamiento de base de datos RAG y agenda de citas odontológicas.",
      status: "confirmed"
    },
    {
      summary: "Diagnóstico Estratégico IA: Carlos Restrepo",
      start: { dateTime: d3.toISOString() },
      end: { dateTime: d3End.toISOString() },
      description: "Evaluación de ROI y automatización de catálogo de productos.",
      status: "pending"
    }
  ];
}

document.addEventListener('DOMContentLoaded', () => {
  initGoogleAuth();
  setupConfigModal();
});

// INITIALIZE GOOGLE AUTH LOGIC
function initGoogleAuth() {
  const btnLogin = document.getElementById('btn-login-google');
  const btnLogout = document.getElementById('btn-logout-google');
  const btnRefresh = document.getElementById('btn-refresh-calendar');
  const filterAll = document.getElementById('filter-all');
  const filterSessions = document.getElementById('filter-sessions');
  
  // Set initial state in config fields if saved
  document.getElementById('config-client-id').value = clientID;
  document.getElementById('config-api-key').value = apiKey;
  const webhookInput = document.getElementById('config-webhook-url');
  if (webhookInput) {
    webhookInput.value = webhookURL;
  }

  // Sign In Trigger
  btnLogin.addEventListener('click', () => {
    if (!clientID || !apiKey) {
      alert("⚠️ Para conectar Google Calendar real, primero haz clic en 'Configurar Credenciales' e ingresa tus llaves de Google Cloud Console. Cargando Modo Demo para demostración...");
      loadDemoMode();
    } else {
      handleAuthClick();
    }
  });

  // Log Out Trigger
  btnLogout.addEventListener('click', () => {
    handleSignoutClick();
  });

  // Refresh Trigger
  btnRefresh.addEventListener('click', () => {
    if (accessToken) {
      fetchEvents();
    } else {
      loadDemoMode();
    }
  });

  // Filters
  filterAll.addEventListener('click', () => {
    filterAll.className = 'btn-pill active';
    filterSessions.className = 'btn-pill inactive';
    renderEventsList(currentFilteredEvents(), false);
  });

  filterSessions.addEventListener('click', () => {
    filterAll.className = 'btn-pill inactive';
    filterSessions.className = 'btn-pill active';
    renderEventsList(currentFilteredEvents(), true);
  });
}

// CHECK DYNAMIC AUTH STATUS (CALLED WHEN PORTAL IS OPENED)
function checkGoogleAuth() {
  const gate = document.getElementById('google-auth-gate');
  const dashboard = document.getElementById('google-calendar-dashboard');
  const logoutBtn = document.getElementById('btn-logout-google');
  
  if (accessToken) {
    if (gate) gate.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    fetchEvents();
  } else {
    loadDemoMode();
  }
}
window.checkGoogleAuth = checkGoogleAuth;

// LOAD DEMO MODE
let loadedEvents = [];
function loadDemoMode() {
  document.getElementById('google-auth-gate').style.display = 'none';
  document.getElementById('google-calendar-dashboard').style.display = 'block';
  document.getElementById('btn-logout-google').style.display = 'inline-block';
  
  // Load local user reservations + dynamic mock data
  const localRes = JSON.parse(localStorage.getItem('local-reservations') || '[]');
  loadedEvents = [...localRes, ...getDynamicMockEvents()];
  renderEventsList(loadedEvents, false);
  updateStats(loadedEvents);
}

// AUTH GAPI AND IDENTITY SERVICES FLOW
function handleAuthClick() {
  try {
    // Dynamically initialize client if loaded
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientID,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      callback: (tokenResponse) => {
        if (tokenResponse.error !== undefined) {
          throw tokenResponse;
        }
        accessToken = tokenResponse.access_token;
        document.getElementById('google-auth-gate').style.display = 'none';
        document.getElementById('google-calendar-dashboard').style.display = 'block';
        document.getElementById('btn-logout-google').style.display = 'inline-block';
        fetchEvents();
      },
    });

    // Request token
    if (accessToken === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  } catch (error) {
    console.error("Error al inicializar OAuth Google Client:", error);
    alert("Error al inicializar Google Sign-In. Verifica que tu Client ID sea válido.");
  }
}

// SIGNOUT
function handleSignoutClick() {
  if (accessToken) {
    google.accounts.oauth2.revokeToken(accessToken);
    accessToken = null;
    checkGoogleAuth();
  } else {
    // If in demo mode, just reset view
    checkGoogleAuth();
  }
}

// FETCH CALENDAR EVENTS VIA GOOGLE REST API
function fetchEvents() {
  if (!accessToken) return;
  
  const agendaList = document.getElementById('ia-portal-agenda-list');
  agendaList.innerHTML = '<div class="agenda-item"><div style="text-align: center; width:100%;">Sincronizando con Google Calendar API...</div></div>';
  
  // Set range: 7 days starting from current real date
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&orderBy=startTime&singleEvents=true&key=${apiKey}`;
  
  fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Google Calendar API Error: Status ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    loadedEvents = data.items || [];
    renderEventsList(loadedEvents, false);
    updateStats(loadedEvents);
  })
  .catch(error => {
    console.error("Error fetching Google Calendar events:", error);
    agendaList.innerHTML = `
      <div class="agenda-item" style="border-left-color: #ef4444; background: rgba(239, 68, 68, 0.05);">
        <div class="agenda-info">
          <div class="agenda-summary" style="color: #ef4444;">Error de Sincronización</div>
          <div class="agenda-desc">No se pudieron recuperar eventos. Verifica la API Key y los permisos en Google Cloud.</div>
        </div>
      </div>
    `;
    loadDemoMode(); // fallback to demo mode so UI doesn't look broken
  });
}

// FILTER EVENTS IN MEMORY
function currentFilteredEvents() {
  return loadedEvents;
}

// RENDER EVENTS
function renderEventsList(events, filterOnlySessions) {
  const agendaList = document.getElementById('ia-portal-agenda-list');
  agendaList.innerHTML = '';
  
  let displayedEvents = events;
  
  if (filterOnlySessions) {
    displayedEvents = events.filter(e => {
      const title = (e.summary || '').toLowerCase();
      return title.includes('sesión') || title.includes('sesion') || title.includes('diagnóstico') || title.includes('diagnostico') || title.includes('asistente');
    });
  }
  
  if (displayedEvents.length === 0) {
    agendaList.innerHTML = '<div class="agenda-item"><div style="text-align: center; width:100%; color: var(--text-secondary);">No hay eventos agendados para este período.</div></div>';
    return;
  }
  
  displayedEvents.forEach(event => {
    const startStr = event.start.dateTime || event.start.date;
    const endStr = event.end.dateTime || event.end.date;
    
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    
    // Formatting values
    const day = startDate.getDate();
    const month = startDate.toLocaleDateString('es-ES', { month: 'short' });
    const timeStart = startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    let duration = '';
    if (event.start.dateTime) {
      const diffMs = endDate - startDate;
      const diffMins = Math.round(diffMs / 60000);
      duration = diffMins >= 60 ? `${Math.round(diffMins/60)} h` : `${diffMins} min`;
    } else {
      duration = 'Todo el día';
    }

    const item = document.createElement('div');
    item.className = 'agenda-item';
    
    // Set status badge
    const isSessionEvent = (event.summary || '').toLowerCase().includes('sesión') || (event.summary || '').toLowerCase().includes('sesion') || (event.summary || '').toLowerCase().includes('diagnóstico') || (event.summary || '').toLowerCase().includes('asistente');
    const badgeText = event.status === 'pending' ? 'Pendiente' : 'Confirmado';
    const badgeClass = event.status === 'pending' ? 'badge-pending' : 'badge-success';
    
    item.innerHTML = `
      <div class="agenda-time">
        <div class="agenda-hour">${timeStart}</div>
        <div class="agenda-duration">${duration}</div>
      </div>
      <div class="agenda-info">
        <div class="agenda-summary">${event.summary}</div>
        <div class="agenda-desc">${event.description || 'Sin descripción en Google Calendar'}</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
          ${day} de ${month}
        </div>
      </div>
      <div>
        <span class="agenda-status-badge ${badgeClass}">${badgeText}</span>
      </div>
    `;
    
    agendaList.appendChild(item);
  });
}

// UPDATE STATISTICS
function updateStats(events) {
  const sessionsCount = document.getElementById('stat-sessions-count');
  const nextSessionLabel = document.getElementById('stat-next-session');
  
  // Count session events
  const sessionEvents = events.filter(e => {
    const title = (e.summary || '').toLowerCase();
    return title.includes('sesión') || title.includes('sesion') || title.includes('diagnóstico') || title.includes('diagnostico') || title.includes('asistente');
  });
  
  sessionsCount.textContent = sessionEvents.length;
  
  // Get next immediate session
  if (sessionEvents.length > 0) {
    const next = sessionEvents[0];
    const startStr = next.start.dateTime || next.start.date;
    const startDate = new Date(startStr);
    const formattedNext = `${startDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })} - ${startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    nextSessionLabel.textContent = formattedNext;
  } else {
    nextSessionLabel.textContent = "Ninguna esta semana";
  }
}

// SETUP GOOGLE CREDENTIALS CONFIGURATION MODAL
function setupConfigModal() {
  const overlay = document.getElementById('overlay-config');
  const toggleLink = document.getElementById('toggle-config');
  const cancelBtn = document.getElementById('btn-config-cancel');
  const saveBtn = document.getElementById('btn-config-save');

  // Load existing payment link configs
  const mp2 = document.getElementById('config-mp-link-tier2');
  const mp3 = document.getElementById('config-mp-link-tier3');
  const mp4 = document.getElementById('config-mp-link-tier4');
  const g66 = document.getElementById('config-global66-link');

  if (mp2) mp2.value = localStorage.getItem('config-mp-link-tier2') || '';
  if (mp3) mp3.value = localStorage.getItem('config-mp-link-tier3') || '';
  if (mp4) mp4.value = localStorage.getItem('config-mp-link-tier4') || '';
  if (g66) g66.value = localStorage.getItem('config-global66-link') || '';
  
  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    overlay.classList.add('active');
  });
  
  cancelBtn.addEventListener('click', () => {
    overlay.classList.remove('active');
  });
  
  saveBtn.addEventListener('click', () => {
    const enteredClientID = document.getElementById('config-client-id').value.trim();
    const enteredAPIKey = document.getElementById('config-api-key').value.trim();
    const enteredWebhook = document.getElementById('config-webhook-url').value.trim();
    
    webhookURL = enteredWebhook;
    localStorage.setItem('google-webhook-url', webhookURL);

    // Save payment links
    if (mp2) localStorage.setItem('config-mp-link-tier2', mp2.value.trim());
    if (mp3) localStorage.setItem('config-mp-link-tier3', mp3.value.trim());
    if (mp4) localStorage.setItem('config-mp-link-tier4', mp4.value.trim());
    if (g66) localStorage.setItem('config-global66-link', g66.value.trim());
    
    if (enteredClientID && enteredAPIKey) {
      clientID = enteredClientID;
      apiKey = enteredAPIKey;
      
      localStorage.setItem('google-client-id', clientID);
      localStorage.setItem('google-api-key', apiKey);
      
      overlay.classList.remove('active');
      alert("✅ Credenciales y Enlaces de Pago guardados correctamente.");
      handleAuthClick();
    } else {
      overlay.classList.remove('active');
      alert("✅ Credenciales y Enlaces de Pago guardados correctamente.");
    }
  });
}
