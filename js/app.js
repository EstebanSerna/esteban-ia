/**
 * Esteban IA - Main Application Logic
 * Interactive Canvas Particle Engine, Strict Calendar Restrictions, Scarcity Logic & Checkout Gateway
 */

// URL publica del backend (esteban-ia-backend en Railway: reservas/Calendar,
// proxy de chat con Claude, checkout de Mercado Pago). No es un dato secreto
// -- esta pensada para que cualquier navegador la llame directo. El
// respaldo en Google Apps Script (mismo fix del limite de 60 caracteres del
// campo "reason") sigue desplegado por si Railway llegara a fallar:
// 'https://script.google.com/macros/s/AKfycbyMWlRXHMRUvLN45NqEecusRBk7NOeuJWrUFLTCbTLv8Wqh_dO4VRIHcYwEph_sLHcY/exec'
const DEFAULT_WEBHOOK_URL = 'https://esteban-ia-backend-production.up.railway.app/';

// Envia un evento a Google Analytics 4, sin romper nada si gtag no cargo
// (bloqueador de anuncios, script fallido, etc.).
function trackEvent(eventName, params) {
  try {
    if (typeof gtag === 'function') gtag('event', eventName, params || {});
  } catch (err) {
    // No debe interrumpir la experiencia del usuario si falla la analitica.
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initQuantumBackground();
  initPWA();
  initMobileMenu();
  initiOSBanner();
  initCalendar();
  initFormHandler();
  initCheckoutHandler();
  initROICalculator();
  initAISimulator();
  initSalesCloser();
});

// 1B. MOBILE / TABLET HAMBURGER MENU
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-trigger');
  const navLinks = document.getElementById('nav-links');
  if (!menuBtn || !navLinks) return;

  const closeMenu = () => {
    navLinks.classList.remove('mobile-open');
    menuBtn.classList.remove('active');
    menuBtn.setAttribute('aria-expanded', 'false');
  };

  const toggleMenu = () => {
    const isOpen = navLinks.classList.toggle('mobile-open');
    menuBtn.classList.toggle('active', isOpen);
    menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  };

  menuBtn.addEventListener('click', toggleMenu);

  // Close after picking a section or clicking "Acceso"
  navLinks.querySelectorAll('.nav-item, .nav-btn').forEach((el) => {
    el.addEventListener('click', closeMenu);
  });

  // Close if the viewport grows back into desktop nav territory
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1250) closeMenu();
  });
}

// 1. INTERACTIVE CANVAS PARTICLE ENGINE
function initQuantumBackground() {
  const canvas = document.getElementById('quantum-canvas');
  if (!canvas) return;

  // Respeta "reducir movimiento" del sistema operativo (accesibilidad) --
  // se deja el canvas quieto, sin el bucle de animacion.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationFrameId = null;
  let mouse = { x: null, y: null, radius: 120 };
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
  }
  
  window.addEventListener('resize', resizeCanvas);
  
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  
  window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  class Particle {
    constructor(x, y, directionX, directionY, size, color) {
      this.x = x;
      this.y = y;
      this.directionX = directionX;
      this.directionY = directionY;
      this.size = size;
      this.color = color;
    }
    
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
    
    update() {
      if (this.x > canvas.width || this.x < 0) {
        this.directionX = -this.directionX;
      }
      if (this.y > canvas.height || this.y < 0) {
        this.directionY = -this.directionY;
      }
      
      if (mouse.x !== null && mouse.y !== null) {
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius + this.size) {
          if (mouse.x < this.x && this.x < canvas.width - this.size * 10) {
            this.x += 2;
          }
          if (mouse.x > this.x && this.x > this.size * 10) {
            this.x -= 2;
          }
          if (mouse.y < this.y && this.y < canvas.height - this.size * 10) {
            this.y += 2;
          }
          if (mouse.y > this.y && this.y > this.size * 10) {
            this.y -= 2;
          }
        }
      }
      
      this.x += this.directionX;
      this.y += this.directionY;
      this.draw();
    }
  }

  function initParticles() {
    particles = [];
    const isMobile = window.innerWidth < 768;
    const numberOfParticles = isMobile ? 35 : 85;
    
    for (let i = 0; i < numberOfParticles; i++) {
      let size = (Math.random() * 1.5) + 0.5;
      let x = (Math.random() * ((canvas.width - size * 2) - (size * 2)) + size * 2);
      let y = (Math.random() * ((canvas.height - size * 2) - (size * 2)) + size * 2);
      
      let directionX = (Math.random() * 0.4) - 0.2;
      let directionY = (Math.random() * 0.4) - 0.2;
      
      const opacity = (Math.random() * 0.25) + 0.05;
      const color = `rgba(212, 175, 55, ${opacity})`;
      
      particles.push(new Particle(x, y, directionX, directionY, size, color));
    }
  }

  function connect() {
    let opacityValue = 1;
    for (let a = 0; a < particles.length; a++) {
      for (let b = a; b < particles.length; b++) {
        let dx = particles[a].x - particles[b].x;
        let dy = particles[a].y - particles[b].y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        const maxDist = window.innerWidth < 768 ? 85 : 130;
        if (distance < maxDist) {
          opacityValue = 1 - (distance / maxDist);
          ctx.strokeStyle = `rgba(212, 175, 55, ${opacityValue * 0.08})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    animationFrameId = requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => p.update());
    connect();
  }

  // Pausa el bucle de animacion cuando la pestaña no esta visible (ahorra
  // CPU/batería en segundo plano) y lo retoma al volver.
  document.addEventListener('visibilitychange', () => {
    if (prefersReducedMotion) return;
    if (document.hidden) {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    } else if (animationFrameId === null) {
      animate();
    }
  });

  resizeCanvas();
  if (prefersReducedMotion) {
    // Un solo cuadro estatico (particulas + conexiones), sin bucle continuo.
    particles.forEach(p => p.draw());
    connect();
  } else {
    animate();
  }
}

// 2. PWA REGISTRATION
function initPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let reg of registrations) {
          reg.update();
        }
      });
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          reg.update();
          console.log('PWA Service Worker registrado y actualizado:', reg.scope);
        })
        .catch(err => console.error('Fallo al registrar SW PWA:', err));
    });
  }
}

// 4. iOS PWA INSTALL BANNER
function initiOSBanner() {
  const banner = document.getElementById('ios-pwa-banner');
  const closeBtn = document.getElementById('btn-close-ios-banner');
  
  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };
  
  const isStandalone = () => {
    return ('standalone' in window.navigator) && (window.navigator.standalone);
  };

  if (isIos() && !isStandalone()) {
    setTimeout(() => {
      if (!sessionStorage.getItem('ios-pwa-dismissed')) {
        banner.classList.add('active');
      }
    }, 4000);
  }

  closeBtn.addEventListener('click', () => {
    banner.classList.remove('active');
    sessionStorage.setItem('ios-pwa-dismissed', 'true');
  });
}

// 5. PHOTO LIGHTBOX VIEW
function openPhotoViewer(src) {
  const viewer = document.getElementById('overlay-photo-viewer');
  const img = document.getElementById('photo-viewer-img');
  img.src = src;
  viewer.classList.add('active');
}

function closePhotoViewer() {
  const viewer = document.getElementById('overlay-photo-viewer');
  viewer.classList.remove('active');
}

window.openPhotoViewer = openPhotoViewer;
window.closePhotoViewer = closePhotoViewer;

// 6. INTERACTIVE BOOKING CALENDAR WITH STRICT SCARCITY (2 SLOTS/DAY)
const currentDateObj = new Date();
let selectedYear = currentDateObj.getFullYear();
let selectedMonth = currentDateObj.getMonth();
let selectedDay = null;
let selectedTime = null;

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function initCalendar() {
  renderCalendar();
  
  document.getElementById('prev-month').addEventListener('click', () => {
    selectedMonth--;
    if (selectedMonth < 0) {
      selectedMonth = 11;
      selectedYear--;
    }
    renderCalendar();
  });

  document.getElementById('next-month').addEventListener('click', () => {
    selectedMonth++;
    if (selectedMonth > 11) {
      selectedMonth = 0;
      selectedYear++;
    }
    renderCalendar();
  });
}

function renderCalendar() {
  const monthYearLabel = document.getElementById('month-year-label');
  const daysGrid = document.getElementById('calendar-days');
  
  monthYearLabel.textContent = `${monthNames[selectedMonth]} ${selectedYear}`;
  daysGrid.innerHTML = '';
  
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  weekdays.forEach(day => {
    const el = document.createElement('div');
    el.className = 'calendar-weekday';
    el.textContent = day;
    daysGrid.appendChild(el);
  });

  const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay();
  const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < firstDayIndex; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    daysGrid.appendChild(emptyDay);
  }
  
  for (let day = 1; day <= totalDays; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.textContent = day;
    
    const checkDate = new Date(selectedYear, selectedMonth, day);
    checkDate.setHours(0, 0, 0, 0);
    
    const isPast = checkDate.getTime() < today.getTime();
    const isToday = checkDate.getTime() === today.getTime();
    const isWeekend = checkDate.getDay() === 0 || checkDate.getDay() === 6; // Sábado o Domingo
    
    if (isToday) {
      dayEl.classList.add('today');
      dayEl.title = 'Hoy';
    }

    if (isPast) {
      dayEl.classList.add('past');
    } else if (isWeekend) {
      dayEl.classList.add('past');
      dayEl.title = 'No laborable (Fin de semana)';
    } else {
      dayEl.classList.add('available');
      
      if (selectedDay === day) {
        dayEl.classList.add('selected');
      }
      
      dayEl.addEventListener('click', () => {
        document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
        dayEl.classList.add('selected');
        selectedDay = day;
        selectedTime = null;
        
        const dateKey = `${selectedYear}-${selectedMonth + 1}-${selectedDay}`;
        showScarcityTimeSlots(dateKey);
      });
    }
    
    daysGrid.appendChild(dayEl);
  }
}

// Scarcity constraint: Deterministic pseudo-random slots (1, 2, or 3 per day)
// Makes the calendar look organic and naturally booked
function showScarcityTimeSlots(dateKey) {
  const container = document.getElementById('slots-container');
  const grid = document.getElementById('slots-grid');
  
  grid.innerHTML = '';
  container.style.display = 'block';
  
  // Base pools of hours
  const morningPool = ['07:30 AM', '09:00 AM', '10:30 AM'];
  const afternoonPool = ['02:00 PM', '03:30 PM', '05:00 PM'];
  
  // Deterministic seed based on dateKey string
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = dateKey.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Decide number of slots (1, 2, or 3)
  const numSlots = 1 + (Math.abs(hash) % 3);
  
  let availableSlots = [];
  
  if (numSlots === 1) {
    // Pick 1 from morning or afternoon pool
    const pool = (Math.abs(hash) % 2 === 0) ? morningPool : afternoonPool;
    const slotIndex = Math.abs(hash * 7) % pool.length;
    availableSlots.push(pool[slotIndex]);
  } else if (numSlots === 2) {
    // Pick exactly 1 morning and 1 afternoon
    const mIndex = Math.abs(hash * 7) % morningPool.length;
    const aIndex = Math.abs(hash * 13) % afternoonPool.length;
    availableSlots.push(morningPool[mIndex]);
    availableSlots.push(afternoonPool[aIndex]);
  } else {
    // Pick 3 (either 1 morning and 2 afternoon, or vice versa)
    if (Math.abs(hash) % 2 === 0) {
      const mIndex = Math.abs(hash * 7) % morningPool.length;
      availableSlots.push(morningPool[mIndex]);
      
      const aIndices = [0, 1, 2];
      const firstA = Math.abs(hash * 13) % 3;
      availableSlots.push(afternoonPool[firstA]);
      aIndices.splice(firstA, 1);
      const secondA = aIndices[Math.abs(hash * 17) % 2];
      availableSlots.push(afternoonPool[secondA]);
    } else {
      const aIndex = Math.abs(hash * 13) % afternoonPool.length;
      availableSlots.push(afternoonPool[aIndex]);
      
      const mIndices = [0, 1, 2];
      const firstM = Math.abs(hash * 7) % 3;
      availableSlots.push(morningPool[firstM]);
      mIndices.splice(firstM, 1);
      const secondM = mIndices[Math.abs(hash * 17) % 2];
      availableSlots.push(morningPool[secondM]);
    }
  }
  
  // Sort slots chronologically
  const parseTime = (t) => {
    const [time, modifier] = t.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours, 10);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + parseInt(minutes, 10);
  };
  availableSlots.sort((a, b) => parseTime(a) - parseTime(b));
  
  availableSlots.forEach(slot => {
    const slotEl = document.createElement('div');
    slotEl.className = 'time-slot';
    slotEl.textContent = slot;
    
    slotEl.addEventListener('click', () => {
      document.querySelectorAll('.time-slot.selected').forEach(el => el.classList.remove('selected'));
      slotEl.classList.add('selected');
      selectedTime = slot;
      updateBookingSummary();
    });
    
    grid.appendChild(slotEl);
  });
  
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateBookingSummary() {
  const summaryBox = document.getElementById('booking-summary');
  const summaryText = document.getElementById('summary-datetime');
  
  if (selectedDay && selectedTime) {
    const formattedDate = `${selectedDay} de ${monthNames[selectedMonth]}, ${selectedYear}`;
    summaryText.textContent = `${formattedDate} a las ${selectedTime}`;
    summaryBox.style.display = 'block';
  } else {
    summaryBox.style.display = 'none';
  }
}

function selectService(serviceName) {
  const selectEl = document.getElementById('booking-service');
  
  for (let i = 0; i < selectEl.options.length; i++) {
    if (selectEl.options[i].value.includes(serviceName) || serviceName.includes(selectEl.options[i].value)) {
      selectEl.selectedIndex = i;
      break;
    }
  }
  
  document.getElementById('reservar').scrollIntoView({ behavior: 'smooth' });
}
window.selectService = selectService;

// 7. FORM HANDLER: SAVES THE BOOKING AND ROUTES TO PAYMENT WHEN THE PLAN ISN'T FREE
let clientData = {};
function initFormHandler() {
  const form = document.getElementById('booking-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!selectedDay || !selectedTime) {
      alert('Por favor, selecciona primero una fecha y hora en el calendario.');
      return;
    }
    
    const service = document.getElementById('booking-service').value;
    const name = document.getElementById('booking-name').value;
    const whatsapp = document.getElementById('booking-whatsapp').value;
    const social = document.getElementById('booking-social').value || 'Sin especificar';
    const email = document.getElementById('booking-email').value;
    const goal = document.getElementById('booking-goal').value;
    
    // Save details
    clientData = {
      service: service,
      name: name,
      whatsapp: whatsapp,
      social: social,
      email: email,
      goal: goal,
      date: `${selectedDay} de ${monthNames[selectedMonth]} de ${selectedYear}`,
      time: selectedTime,
      amount: getAmountForService(service)
    };
    
    // If $0 COP (Diagnóstico Gratis), confirm and sync directly with a receipt
    if (clientData.amount === 0) {
      executeDirectBooking();
      return;
    }

    // Paid plan: secure the time slot (save locally + sync to Google Calendar) without
    // showing the free-plan receipt, then open the real payment modal (Mercado Pago / Global 66)
    executeDirectBooking(false);
    openPaymentModal(clientData.service);
  });
}

function executeDirectBooking(showReceipt = true) {
  const receiptOverlay = document.getElementById('overlay-receipt');
  const webhook = localStorage.getItem('google-webhook-url') || DEFAULT_WEBHOOK_URL;

  let syncPromise = Promise.resolve({ success: false, reason: 'no-webhook' });
  
  if (webhook) {
    syncPromise = fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(clientData)
    })
    .then(res => res.json())
    .catch(err => {
      console.error("Error al sincronizar con Google Calendar:", err);
      return { success: false, error: err.message };
    });
  }

  syncPromise.then(syncResult => {
    trackEvent('booking_submitted', {
      service_name: clientData.service,
      value: clientData.amount || 0,
      currency: 'COP',
      synced_to_calendar: !!(syncResult && syncResult.success)
    });

    const transactionId = 'RES-' + Math.floor(Math.random() * 9000000 + 1000000);
    const receiptGrid = document.getElementById('receipt-details');
    
    let syncStatusHtml = '';
    if (webhook) {
      if (syncResult && syncResult.success) {
        syncStatusHtml = `
          <div class="receipt-row" style="color: #2ecc71; border-top: 1px solid rgba(46, 204, 113, 0.2); padding-top: 10px;">
            <span>Calendario:</span><strong>✓ Agendado en Google Calendar</strong>
          </div>
        `;
      } else {
        syncStatusHtml = `
          <div class="receipt-row" style="color: #e74c3c; border-top: 1px solid rgba(231, 76, 60, 0.2); padding-top: 10px;">
            <span>Calendario:</span><strong>⚠️ Error al agendar automáticamente</strong>
          </div>
        `;
      }
    } else {
      syncStatusHtml = `
        <div class="receipt-row" style="color: var(--text-muted); border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 10px;">
          <span>Calendario:</span><strong>✓ Reserva Registrada</strong>
        </div>
      `;
    }
    
    receiptGrid.innerHTML = `
      <div class="receipt-row"><span>Reserva #:</span><strong>${transactionId}</strong></div>
      <div class="receipt-row"><span>Cliente:</span><strong>${clientData.name}</strong></div>
      <div class="receipt-row"><span>WhatsApp:</span><strong>${clientData.whatsapp}</strong></div>
      <div class="receipt-row"><span>Empresa/Redes:</span><strong>${clientData.social}</strong></div>
      <div class="receipt-row"><span>Correo:</span><strong>${clientData.email}</strong></div>
      <div class="receipt-row"><span>Servicio:</span><strong>${clientData.service}</strong></div>
      <div class="receipt-row"><span>Fecha:</span><strong>${clientData.date}</strong></div>
      <div class="receipt-row"><span>Hora:</span><strong>${clientData.time}</strong></div>
      <div class="receipt-row receipt-total"><span>Inversión:</span><strong>${clientData.amount === 0 ? '$0 COP (Gratis)' : '$' + clientData.amount.toLocaleString('es-CO') + ' COP'}</strong></div>
      ${syncStatusHtml}
    `;

    if (showReceipt) receiptOverlay.classList.add('active');

    // Reset main form
    document.getElementById('booking-form').reset();
    selectedDay = null;
    selectedTime = null;
    document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
    document.getElementById('slots-container').style.display = 'none';
    document.getElementById('booking-summary').style.display = 'none';
  });
}

function getAmountForService(service) {
  if (service.includes("Diagnostico") || service.includes("Charla") || service.includes("Auditoría") || service.includes("Gratis")) return 0;
  if (service.includes("Basico") || service.includes("Starter")) return 1950000;
  if (service.includes("Experto") || service.includes("RAG")) return 3450000;
  if (service.includes("Completo") || service.includes("Enterprise") || service.includes("Plataforma")) return 5900000;
  return 0; // Default price
}

// 8. RECEIPT CLOSE HANDLER
function initCheckoutHandler() {
  const receiptOverlay = document.getElementById('overlay-receipt');
  const closeBtn = document.getElementById('btn-receipt-close');
  if (closeBtn && receiptOverlay) {
    closeBtn.addEventListener('click', () => {
      receiptOverlay.classList.remove('active');
    });
  }
}

// 8. ROI CALCULATOR ENGINE WITH DETAILED BREAKDOWN (HUMAN VS 24/7 AI AGENT)
function initROICalculator() {
  const collabSlider = document.getElementById('input-collab');
  const hoursSlider = document.getElementById('input-hours');
  const costSlider = document.getElementById('input-cost');

  if (!collabSlider || !hoursSlider || !costSlider) return;

  const valCollab = document.getElementById('val-collab');
  const valHours = document.getElementById('val-hours');
  const valCost = document.getElementById('val-cost');

  const resCostManual = document.getElementById('res-cost-manual');
  const subCostManual = document.getElementById('sub-cost-manual');
  const resCost247Human = document.getElementById('res-cost-247-human');
  const subCost247Human = document.getElementById('sub-cost-247-human');
  const resCostIA = document.getElementById('res-cost-ia');
  const resMoney = document.getElementById('res-money');

  const formulaManual = document.getElementById('formula-manual');
  const formulaHuman247 = document.getElementById('formula-human-247');
  const formulaRoi = document.getElementById('formula-roi');

  function formatCOP(amount) {
    return '$' + Math.round(amount).toLocaleString('es-CO') + ' COP';
  }

  function calculateROI() {
    const collab = parseInt(collabSlider.value, 10) || 1;
    const hours = parseInt(hoursSlider.value, 10) || 8;
    const cost = parseInt(costSlider.value, 10) || 10000;

    valCollab.textContent = `${collab} ${collab === 1 ? 'persona' : 'personas'}`;
    valHours.textContent = `${hours} ${hours === 1 ? 'hora/día' : 'horas/día'}`;
    valCost.textContent = `${formatCOP(cost)}/h`;

    // 1. Current Human Cost (Limited Schedule)
    const totalHoursActualMonth = Math.round(collab * hours * 30);
    const totalCostActualMonth = Math.round(totalHoursActualMonth * cost);

    // 2. 24/7 Human Cost (3 Rotational Shifts = 24 hours per day = 720 hours/month per person)
    const hours247Month = Math.round(24 * 30 * collab);
    const totalCost247Human = Math.round(hours247Month * cost);

    // 3. AI Assistant Cost
    const costIA = 520000; // $520.000 COP/mes (Sostenimiento & Servidores)
    const netSavings247 = Math.max(0, totalCost247Human - costIA);

    if (resCostManual) resCostManual.textContent = `${formatCOP(totalCostActualMonth)}/mes`;
    if (subCostManual) subCostManual.textContent = `${collab} ${collab === 1 ? 'persona' : 'personas'} · ${hours}h/día (${totalHoursActualMonth.toLocaleString('es-CO')} hrs/mes)`;

    if (resCost247Human) resCost247Human.textContent = `${formatCOP(totalCost247Human)}/mes`;
    if (subCost247Human) subCost247Human.textContent = `${collab * 3} empleados rotativos · 24/7 (${hours247Month.toLocaleString('es-CO')} hrs/mes)`;

    if (resCostIA) resCostIA.textContent = `${formatCOP(costIA)}/mes`;
    if (resMoney) resMoney.textContent = `${formatCOP(netSavings247)}/mes`;

    if (formulaManual) {
      formulaManual.textContent = `${collab} pers. × ${hours}h/día × 30 días × ${formatCOP(cost)} = ${formatCOP(totalCostActualMonth)}/mes`;
    }
    if (formulaHuman247) {
      formulaHuman247.textContent = `${collab * 3} turnos × 8h × 30 días × ${formatCOP(cost)} = ${formatCOP(totalCost247Human)}/mes`;
    }
    if (formulaRoi) {
      formulaRoi.textContent = `1 Asistente IA = ${formatCOP(costIA)}/mes vs ${formatCOP(totalCost247Human)}/mes en personal`;
    }
  }

  // Se avisa a Analytics solo la PRIMERA vez que el usuario mueve algun
  // control (no en el calculo inicial al cargar la pagina, que no es uso
  // real) -- evita mandar un evento por cada pixel que arrastra el slider.
  let roiCalculatorTracked = false;
  function trackROIUsageOnce() {
    if (roiCalculatorTracked) return;
    roiCalculatorTracked = true;
    trackEvent('roi_calculator_used', {});
  }

  collabSlider.addEventListener('input', () => { trackROIUsageOnce(); calculateROI(); });
  hoursSlider.addEventListener('input', () => { trackROIUsageOnce(); calculateROI(); });
  costSlider.addEventListener('input', () => { trackROIUsageOnce(); calculateROI(); });

  calculateROI();
}

// 9. LIVE INTERACTIVE CUSTOM AI DEMO BUILDER & INTELLIGENT CHAT ENGINE (FULL COP & DYNAMIC CATEGORY PERSONALIZATION)
let currentPresetKey = 'optica';

const demoPresets = {
  barberia: {
    category: 'citas_general',
    categoryBadge: '💈 Citas & Turnos Barbería',
    catalogLabel: '💈 Servicios y Cortes de Barbería (Precios COP):',
    infoLabel: '📋 Políticas de Agenda, Cancelaciones & Medios de Pago',
    botName: 'Sofi',
    companyName: 'Barbería & Studio Elite',
    hours: 'Lunes a Sábado de 8:00 AM a 8:00 PM, Domingos de 9:00 AM a 2:00 PM',
    location: 'Calle 10 # 43-20, El Poblado, Medellín',
    p1Name: '1. Corte Tradicional de Cabello', p1Price: '$25.000 COP',
    p2Name: '2. Perfilado y Diseño de Barba', p2Price: '$18.000 COP',
    p3Name: '3. Combo Elite (Corte + Barba + Toalla Hot)', p3Price: '$38.000 COP',
    p4Name: '4. Exfoliación Facial & Mascarilla', p4Price: '$22.000 COP',
    p5Name: '5. Pigmentación & Corte Completo', p5Price: '$45.000 COP',
    info: 'Agendamos citas con 30 minutos de anticipación. Aceptamos Efectivo, Nequi, Daviplata y Tarjetas de Crédito.',
    quickPills: [
      { label: '💈 Ver Cortes y Tarifas', action: 'servicios' },
      { label: '📅 Agendar Cita o Turno', action: 'agendar_cita' },
      { label: '📍 Horarios y Dirección', action: 'horario' },
      { label: '💳 Formas de Pago', action: 'info' }
    ]
  },
  odontologia: {
    category: 'odontologia',
    categoryBadge: '🦷 Clínica Dental & Citas Odontológicas',
    catalogLabel: '🦷 Tratamientos y Servicios Odontológicos (Precios COP):',
    infoLabel: '📋 Financiación Directa, Garantías & Formas de Pago',
    botName: 'Dra. Camila (IA)',
    companyName: 'Clínica Dental Sonrisas',
    hours: 'Lunes a Viernes de 7:00 AM a 7:00 PM, Sábados de 8:00 AM a 1:00 PM',
    location: 'Av. El Poblado Cra 43A # 1-50, Consultorio 604, Medellín',
    p1Name: '1. Valoración Odontológica Inicial', p1Price: 'GRATIS',
    p2Name: '2. Limpieza Ultra-Sónica y Profilaxis', p2Price: '$80.000 COP',
    p3Name: '3. Blanqueamiento LED Avanzado', p3Price: '$220.000 COP',
    p4Name: '4. Mensualidad Ortodoncia Invisible', p4Price: '$150.000 COP',
    p5Name: '5. Calza Resina Estética por Diente', p5Price: '$90.000 COP',
    info: 'Ofrecemos financiación directa sin intereses. Puedes cancelar o reprogramar tu cita con 2 horas de anticipación.',
    quickPills: [
      { label: '🦷 Valoración Gratis', action: 'valoracion_gratis' },
      { label: '📋 Ver Tratamientos y Precios', action: 'servicios' },
      { label: '📅 Agendar Cita Odontológica', action: 'agendar_cita' },
      { label: '📍 Consultorio y Horarios', action: 'horario' }
    ]
  },
  optica: {
    category: 'optica',
    categoryBadge: '👓 Óptica, Examen de la Vista & Lentes',
    catalogLabel: '👓 Examen de Optometría y Lentes Formulados (Precios COP):',
    infoLabel: '📋 Tiempos de Entrega, Garantía de Monturas & Medios de Pago',
    botName: 'Valentina',
    companyName: 'Óptica Visión Clara',
    hours: 'Lunes a Sábado de 9:00 AM a 7:00 PM (Jornada Continua)',
    location: 'Centro Comercial Santa Fe, Local 215, Medellín',
    p1Name: '1. Examen Computarizado de Optometría', p1Price: 'GRATIS (por compra de lentes)',
    p2Name: '2. Lentes Monofocales Antirreflejo Blue Protect', p2Price: '$140.000 COP',
    p3Name: '3. Lentes Progresivos Digitales HD (Bifocales)', p3Price: '$290.000 COP',
    p4Name: '4. Lentes Fotocromáticos Transition (Sol/Sombra)', p4Price: '$220.000 COP',
    p5Name: '5. Monturas de Marca & Gafas de Sol UV400', p5Price: '$180.000 COP',
    info: 'Entregamos tus lentes formulados en 24 a 48 horas con garantía de 1 año en la montura. Recibimos Tarjetas, Nequi y Addi.',
    quickPills: [
      { label: '👓 Examen de la Vista Gratis', action: 'examen_optica' },
      { label: '📋 Catálogo de Lentes y Precios', action: 'servicios' },
      { label: '📅 Agendar Cita de Optometría', action: 'agendar_cita' },
      { label: '📍 Ubicación y Horarios', action: 'horario' }
    ]
  },
  inmobiliaria: {
    category: 'inmobiliaria',
    categoryBadge: '🏢 Inmobiliaria, Arriendos & Ventas',
    catalogLabel: '🏢 Catálogo de Inmuebles Disponibles (Venta/Alquiler):',
    infoLabel: '🔑 Coordinación de Visitas Presenciales & Avalúos',
    botName: 'Mateo',
    companyName: 'Inmobiliaria Casas & Aparts',
    hours: 'Lunes a Viernes de 8:00 AM a 6:00 PM, Sábados de 9:00 AM a 1:00 PM',
    location: 'Transversal Inferior # 10B-85, Oficina 402, Medellín',
    p1Name: '1. Apartamento 3 Habs en El Poblado', p1Price: '$450.000.000 COP (Venta)',
    p2Name: '2. Apartamento 2 Habs Envigado Zúñiga', p2Price: '$2.400.000 COP/mes (Alquiler)',
    p3Name: '3. Casa Campestre en Llanogrande', p3Price: '$980.000.000 COP (Venta)',
    p4Name: '4. Oficina Comercial Milla de Oro', p4Price: '$3.500.000 COP/mes (Alquiler)',
    p5Name: '5. Avalúo Comercial Certificado', p5Price: '$350.000 COP',
    info: 'Coordinamos visitas presenciales o recorridos virtuales en 3D los 7 días de la semana.',
    quickPills: [
      { label: '🏠 Ver Inmuebles en Catálogo', action: 'inmuebles' },
      { label: '🔑 Agendar Visita Presencial', action: 'agendar_visita' },
      { label: '📋 Requisitos de Arrendamiento', action: 'requisitos' },
      { label: '📍 Ubicación de Oficina', action: 'horario' }
    ]
  },
  ecommerce: {
    category: 'ecommerce',
    categoryBadge: '🛒 Tienda Online, Productos & Envíos',
    catalogLabel: '🛒 Catálogo de Productos y Precios (COP):',
    infoLabel: '📦 Tiempos de Envío, Envíos Gratis & Pago Contra Entrega',
    botName: 'Chloe',
    companyName: 'Tienda de Moda Neo',
    hours: 'Atención 24/7 online. Despachos de Lunes a Sábado de 8 AM a 5 PM',
    location: 'Tienda Online - Bodega Central en Envigado, Antioquia',
    p1Name: '1. Jeans Levanta Cola Premium', p1Price: '$95.000 COP',
    p2Name: '2. Blusa Satinada Elegante', p2Price: '$48.000 COP',
    p3Name: '3. Chaqueta Cuero Sintético Neo', p3Price: '$135.000 COP',
    p4Name: '4. Tenis Urbanos Confort', p4Price: '$110.000 COP',
    p5Name: '5. Vestido de Noche Fiesta', p5Price: '$125.000 COP',
    info: 'Envíos a todo Colombia por Servientrega o Interrapidísimo. Envío GRATIS por compras superiores a $150.000 COP. Pago contra entrega disponible.',
    quickPills: [
      { label: '🛒 Ver Catálogo de Productos', action: 'catalogo' },
      { label: '📦 Envíos y Tiempos de Entrega', action: 'envios' },
      { label: '💳 Medios de Pago & Contraentrega', action: 'pagos' },
      { label: '💬 Comprar un Producto', action: 'comprar' }
    ]
  },
  restaurante: {
    category: 'restaurante',
    categoryBadge: '🍕 Restaurante, Domicilios & Reserva de Mesas',
    catalogLabel: '🍕 Menú de Platos Principales y Especialidades (Precios COP):',
    infoLabel: '🛵 Envíos a Domicilio, Reserva de Mesas & Medios de Pago',
    botName: 'Nico',
    companyName: 'Restaurante & Grill Sabores',
    hours: 'Lunes a Domingo de 12:00 PM a 10:30 PM',
    location: 'Carrera 35 # 8A-14, Provenza, Medellín',
    p1Name: '1. Baby Beef 350g a la Parrilla', p1Price: '$42.000 COP',
    p2Name: '2. Salmón en Salsa de Maracuyá', p2Price: '$46.000 COP',
    p3Name: '3. Hamburguesa Artesanal Angus Double', p3Price: '$32.000 COP',
    p4Name: '4. Menú Ejecutivo Gourmet (Almuerzo)', p4Price: '$19.500 COP',
    p5Name: '5. Cóctel de la Casa & Bebidas', p5Price: '$18.000 COP',
    info: 'Reservas de mesa sin costo adicional. Servicio a domicilio en Zona Sur y Poblado.',
    quickPills: [
      { label: '🍕 Ver Menú y Especialidades', action: 'menu' },
      { label: '🛵 Pedir a Domicilio', action: 'domicilio' },
      { label: '🍽️ Reservar una Mesa', action: 'reservar_mesa' },
      { label: '📍 Horarios y Cobertura', action: 'horario' }
    ]
  },
  taller: {
    category: 'citas_general',
    categoryBadge: '🚗 Mantenimiento Vehicular & Citas Taller',
    catalogLabel: '🚗 Servicios y Reparaciones Automotrices (Precios COP):',
    infoLabel: '📋 Garantía de Reparación, Sala VIP & Medios de Pago',
    botName: 'Don Mario (IA)',
    companyName: 'Taller Automotriz AutoPro',
    hours: 'Lunes a Viernes de 7:30 AM a 6:00 PM, Sábados de 8:00 AM a 2:00 PM',
    location: 'Calle 30 # 65-18, Belén, Medellín',
    p1Name: '1. Cambio de Aceite Sintético + Filtro', p1Price: '$98.000 COP',
    p2Name: '2. Mantenimiento y Revisión de Frenos', p2Price: '$75.000 COP',
    p3Name: '3. Alineación y Balanceo Computarizado', p3Price: '$60.000 COP',
    p4Name: '4. Lavado General Detallado + Cera', p4Price: '$28.000 COP',
    p5Name: '5. Escáner Computarizado de Motor', p5Price: '$45.000 COP',
    info: 'Garantía de 6 meses en repuestos y mano de obra. Sala de espera VIP con Wi-Fi y café gratis.',
    quickPills: [
      { label: '🚗 Ver Servicios del Taller', action: 'servicios' },
      { label: '📅 Agendar Cita de Mantenimiento', action: 'agendar_cita' },
      { label: '📍 Dirección del Taller', action: 'horario' },
      { label: '💳 Garantía de Reparación', action: 'info' }
    ]
  },
  abogados: {
    category: 'citas_general',
    categoryBadge: '💼 Consultoría Legal & Citas Abogados',
    catalogLabel: '💼 Servicios Jurídicos y Asesorías (Precios COP):',
    infoLabel: '📋 Modalidad de Atención (Presencial / Zoom) & Pagos',
    botName: 'Dr. Andrés (IA)',
    companyName: 'Consultoría & Abogados Legales',
    hours: 'Lunes a Viernes de 8:00 AM a 5:00 PM',
    location: 'Edificio San Fernando Plaza, Torre 2 Oficina 708, Medellín',
    p1Name: '1. Consulta Jurídica Inicial (30 min)', p1Price: '$80.000 COP',
    p2Name: '2. Elaboración y Revisión de Contrato', p2Price: '$250.000 COP',
    p3Name: '3. Asesoría en Despidos y Labores', p3Price: '$180.000 COP',
    p4Name: '4. Trámite de Liquidación o Pensión', p4Price: '$350.000 COP',
    p5Name: '5. Representación en Audiencia Judicial', p5Price: 'Cotización personalizada',
    info: 'Atención presencial o reunión por Zoom de alta confidencialidad.',
    quickPills: [
      { label: '💼 Ver Servicios Legales', action: 'servicios' },
      { label: '📅 Agendar Consulta Jurídica', action: 'agendar_cita' },
      { label: '📍 Ubicación de Oficina', action: 'horario' },
      { label: '⚖️ Modalidad de Asesoría', action: 'info' }
    ]
  },
  veterinaria: {
    category: 'citas_salud',
    categoryBadge: '🐾 Atención Veterinaria & Urgencias 24h',
    catalogLabel: '🐾 Servicios Médicos para Mascotas (Precios COP):',
    infoLabel: '📋 Ambulancia Veterinaria, Guardería & Métodos de Pago',
    botName: 'Luna (IA)',
    companyName: 'Clínica Veterinaria Mascotas',
    hours: 'Abierto 24 Horas para Urgencias. Consultas de 8:00 AM a 7:00 PM',
    location: 'Calle 33 # 76-45, Laureles, Medellín',
    p1Name: '1. Consulta Médica Veterinaria', p1Price: '$42.000 COP',
    p2Name: '2. Baño, Peluquería y Limpieza Oídos', p2Price: '$38.000 COP',
    p3Name: '3. Vacunación Pentavalente / Antirrábica', p3Price: '$35.000 COP',
    p4Name: '4. Profilaxis y Limpieza Dental Mascotas', p4Price: '$140.000 COP',
    p5Name: '5. Desparasitación Interna y Externa', p5Price: '$20.000 COP',
    info: 'Servicio de ambulancia veterinaria y guardería canina nocturna.',
    quickPills: [
      { label: '🐾 Ver Servicios Veterinarios', action: 'servicios' },
      { label: '📅 Agendar Cita o Baño', action: 'agendar_cita' },
      { label: '🚨 Urgencias y Horarios', action: 'horario' },
      { label: '🚑 Ambulancia & Guardería', action: 'info' }
    ]
  },
  gimnasio: {
    category: 'citas_general',
    categoryBadge: '🏋️ Gimnasio, Clases & Pases Libres',
    catalogLabel: '🏋️ Planes de Membresía y Pases (Precios COP):',
    infoLabel: '📋 Acceso a Zonas, Clases de Spin/Yoga & Casillero',
    botName: 'Coach Leo (IA)',
    companyName: 'Gimnasio & Fitness Club',
    hours: 'Lunes a Viernes de 5:00 AM a 10:00 PM, Sábados y Dom 7 AM - 4 PM',
    location: 'Calle 50 # 42-10, Centro, Medellín',
    p1Name: '1. Plan Mensual Libre Total', p1Price: '$79.000 COP/mes',
    p2Name: '2. Plan Trimestral Promo Fit', p2Price: '$195.000 COP',
    p3Name: '3. Pase Diario Individual', p3Price: '$15.000 COP',
    p4Name: '4. Personal Trainer (10 Sesiones)', p4Price: '$250.000 COP',
    p5Name: '5. Valoración InBody & Nutricionista', p5Price: '$40.000 COP',
    info: 'Incluye acceso a zona de pesas, cardio, clases de Spin, Yoga y casillero personal gratis.',
    quickPills: [
      { label: '🏋️ Ver Planes y Precios', action: 'servicios' },
      { label: '📅 Agendar Clase de Prueba Gratis', action: 'agendar_cita' },
      { label: '📍 Horarios y Sedes', action: 'horario' },
      { label: '💪 Beneficios del Plan', action: 'info' }
    ]
  }
};

// Memoria de la conversación actual del simulador: se manda a Claude en cada
// turno para que sepa qué se ha dicho ya (así no vuelve a saludar ni se
// repite). Se reinicia cada vez que se genera un demo nuevo.
let simConversationHistory = [];

let currentDemoConfig = {
  botName: 'Valentina',
  companyName: 'Óptica Visión Clara',
  category: 'optica',
  categoryBadge: '👓 Óptica, Examen de la Vista & Lentes',
  catalogLabel: '👓 Examen de Optometría y Lentes Formulados (Precios COP):',
  infoLabel: '📋 Tiempos de Entrega, Garantía de Monturas & Medios de Pago',
  hours: 'Lunes a Sábado de 9:00 AM a 7:00 PM (Jornada Continua)',
  location: 'Centro Comercial Santa Fe, Local 215, Medellín',
  p1Name: '1. Examen Computarizado de Optometría', p1Price: 'GRATIS (por compra de lentes)',
  p2Name: '2. Lentes Monofocales Antirreflejo Blue Protect', p2Price: '$140.000 COP',
  p3Name: '3. Lentes Progresivos Digitales HD (Bifocales)', p3Price: '$290.000 COP',
  p4Name: '4. Lentes Fotocromáticos Transition (Sol/Sombra)', p4Price: '$220.000 COP',
  p5Name: '5. Monturas de Marca & Gafas de Sol UV400', p5Price: '$180.000 COP',
  info: 'Entregamos tus lentes formulados en 24 a 48 horas con garantía de 1 año en la montura. Recibimos Tarjetas, Nequi y Addi.',
  quickPills: [
    { label: '👓 Examen de la Vista Gratis', action: 'examen_optica' },
    { label: '📋 Catálogo de Lentes y Precios', action: 'servicios' },
    { label: '📅 Agendar Cita de Optometría', action: 'agendar_cita' },
    { label: '📍 Ubicación y Horarios', action: 'horario' }
  ]
};

function detectBusinessCategory(companyName = '', prod1Name = '', presetKey = null) {
  if (presetKey && demoPresets[presetKey]) {
    return demoPresets[presetKey];
  }

  const combined = (companyName + ' ' + prod1Name).toLowerCase();

  if (/restaurante|pizzer|pizzeria|grill|hamburgues|comida|domicilio|sushi|plato|menu|menú|gastronom|bar|cafeter|panader|bakery/.test(combined)) {
    return {
      category: 'restaurante',
      categoryBadge: '🍕 Modo: Restaurante, Domicilios & Mesas',
      catalogLabel: '🍕 Menú de Platos y Bebidas (Precios COP):',
      infoLabel: '🛵 Envíos a Domicilio, Reserva de Mesas & Métodos de Pago',
      quickPills: [
        { label: '🍕 Ver Menú y Especialidades', action: 'menu' },
        { label: '🛵 Pedir a Domicilio', action: 'domicilio' },
        { label: '🍽️ Reservar una Mesa', action: 'reservar_mesa' },
        { label: '📍 Horarios y Cobertura', action: 'horario' }
      ]
    };
  }

  if (/optica|óptica|lente|vista|ojos|optometr|gafas|vision|visión/.test(combined)) {
    return {
      category: 'optica',
      categoryBadge: '👓 Modo: Óptica & Citas de Salud Visual',
      catalogLabel: '👓 Examen Computarizado y Lentes Formulados (Precios COP):',
      infoLabel: '📋 Entrega de Lentes, Garantía de Monturas & Medios de Pago',
      quickPills: [
        { label: '👓 Examen de la Vista Gratis', action: 'examen_optica' },
        { label: '📋 Catálogo de Lentes y Precios', action: 'servicios' },
        { label: '📅 Agendar Cita de Optometría', action: 'agendar_cita' },
        { label: '📍 Ubicación y Horarios', action: 'horario' }
      ]
    };
  }

  if (/odontolog|dental|diente|dentista|sonrisa|ortodonci|profilaxis/.test(combined)) {
    return {
      category: 'odontologia',
      categoryBadge: '🦷 Modo: Clínica Dental & Citas Odontológicas',
      catalogLabel: '🦷 Tratamientos y Limpieza Dental (Precios COP):',
      infoLabel: '📋 Financiación Directa & Citas Odontológicas',
      quickPills: [
        { label: '🦷 Valoración Odontológica Gratis', action: 'valoracion_gratis' },
        { label: '📋 Ver Tratamientos y Precios', action: 'servicios' },
        { label: '📅 Agendar Cita Odontológica', action: 'agendar_cita' },
        { label: '📍 Consultorio y Horarios', action: 'horario' }
      ]
    };
  }

  if (/tienda|moda|ecommerce|e-commerce|ropa|zapatos|boutique|store/.test(combined)) {
    return {
      category: 'ecommerce',
      categoryBadge: '🛒 Modo: Tienda Online & Productos',
      catalogLabel: '🛒 Catálogo de Productos y Precios (COP):',
      infoLabel: '📦 Envíos Nacionales, Pago Contraentrega & Garantías',
      quickPills: [
        { label: '🛒 Ver Catálogo de Productos', action: 'catalogo' },
        { label: '📦 Envíos y Tiempos de Entrega', action: 'envios' },
        { label: '💳 Medios de Pago & Contraentrega', action: 'pagos' },
        { label: '💬 Comprar un Producto', action: 'comprar' }
      ]
    };
  }

  if (/inmobiliari|propiedad|casa|apartament|arriendo|alquiler|bienes/.test(combined)) {
    return {
      category: 'inmobiliaria',
      categoryBadge: '🏢 Modo: Inmobiliaria & Visitas Acompañadas',
      catalogLabel: '🏢 Catálogo de Inmuebles en Venta/Alquiler:',
      infoLabel: '🔑 Coordinación de Visitas Presenciales & Requisitos',
      quickPills: [
        { label: '🏠 Ver Inmuebles Disponibles', action: 'inmuebles' },
        { label: '🔑 Agendar Visita Presencial', action: 'agendar_visita' },
        { label: '📋 Requisitos de Arrendamiento', action: 'requisitos' },
        { label: '📍 Ubicación de Oficina', action: 'horario' }
      ]
    };
  }

  return {
    category: 'citas_general',
    categoryBadge: '📅 Modo: Servicios & Agendamiento de Citas',
    catalogLabel: '📋 Catálogo de Servicios y Tarifas (COP):',
    infoLabel: '📋 Políticas de Servicio, Garantías & Formas de Pago',
    quickPills: [
      { label: '📋 Ver Servicios y Precios', action: 'servicios' },
      { label: '📅 Agendar Cita / Turno', action: 'agendar_cita' },
      { label: '📍 Horarios y Dirección', action: 'horario' },
      { label: '💳 Medios de Pago', action: 'info' }
    ]
  };
}

function applyDemoPreset(key) {
  const preset = demoPresets[key];
  if (!preset) return;
  currentPresetKey = key;

  const botNameEl = document.getElementById('demo-bot-name');
  const compNameEl = document.getElementById('demo-company-name');
  const hoursEl = document.getElementById('demo-hours');
  const locEl = document.getElementById('demo-location');
  const infoEl = document.getElementById('demo-company-info');

  if (botNameEl) botNameEl.value = preset.botName;
  if (compNameEl) compNameEl.value = preset.companyName;
  if (hoursEl) hoursEl.value = preset.hours;
  if (locEl) locEl.value = preset.location;
  if (infoEl) infoEl.value = preset.info;

  const p1N = document.getElementById('demo-prod1-name'), p1P = document.getElementById('demo-prod1-price');
  const p2N = document.getElementById('demo-prod2-name'), p2P = document.getElementById('demo-prod2-price');
  const p3N = document.getElementById('demo-prod3-name'), p3P = document.getElementById('demo-prod3-price');
  const p4N = document.getElementById('demo-prod4-name'), p4P = document.getElementById('demo-prod4-price');
  const p5N = document.getElementById('demo-prod5-name'), p5P = document.getElementById('demo-prod5-price');

  if (p1N && p1P) { p1N.value = preset.p1Name; p1P.value = preset.p1Price; }
  if (p2N && p2P) { p2N.value = preset.p2Name; p2P.value = preset.p2Price; }
  if (p3N && p3P) { p3N.value = preset.p3Name; p3P.value = preset.p3Price; }
  if (p4N && p4P) { p4N.value = preset.p4Name; p4P.value = preset.p4Price; }
  if (p5N && p5P) { p5N.value = preset.p5Name; p5P.value = preset.p5Price; }

  generateCustomAIDemo();
}

function generateCustomAIDemo() {
  const botName = (document.getElementById('demo-bot-name')?.value || 'Sofi').trim();
  const companyName = (document.getElementById('demo-company-name')?.value || 'Mi Empresa').trim();
  const hours = (document.getElementById('demo-hours')?.value || 'Lunes a Sábado de 8:00 AM a 7:00 PM').trim();
  const location = (document.getElementById('demo-location')?.value || 'Atención presencial y virtual').trim();
  const info = (document.getElementById('demo-company-info')?.value || 'Atendemos con reserva previa').trim();

  const p1N = (document.getElementById('demo-prod1-name')?.value || 'Servicio 1').trim();
  const p1P = (document.getElementById('demo-prod1-price')?.value || '$25.000 COP').trim();
  const p2N = (document.getElementById('demo-prod2-name')?.value || 'Servicio 2').trim();
  const p2P = (document.getElementById('demo-prod2-price')?.value || '$45.000 COP').trim();
  const p3N = (document.getElementById('demo-prod3-name')?.value || 'Servicio 3').trim();
  const p3P = (document.getElementById('demo-prod3-price')?.value || '$65.000 COP').trim();
  const p4N = (document.getElementById('demo-prod4-name')?.value || 'Servicio 4').trim();
  const p4P = (document.getElementById('demo-prod4-price')?.value || '$85.000 COP').trim();
  const p5N = (document.getElementById('demo-prod5-name')?.value || 'Servicio 5').trim();
  const p5P = (document.getElementById('demo-prod5-price')?.value || '$100.000 COP').trim();

  const categoryMeta = detectBusinessCategory(companyName, p1N, currentPresetKey);

  // Update Paso 1 dynamic headers & badges
  const catBadge = document.getElementById('demo-category-badge');
  if (catBadge && categoryMeta.categoryBadge) catBadge.textContent = categoryMeta.categoryBadge;

  const catLabel = document.getElementById('demo-catalog-label');
  if (catLabel && categoryMeta.catalogLabel) catLabel.textContent = categoryMeta.catalogLabel;

  const infoLabel = document.getElementById('demo-info-label');
  if (infoLabel && categoryMeta.infoLabel) infoLabel.textContent = categoryMeta.infoLabel;

  currentDemoConfig = {
    botName, companyName, hours, location, info,
    category: categoryMeta.category,
    categoryBadge: categoryMeta.categoryBadge,
    quickPills: categoryMeta.quickPills,
    p1Name: p1N, p1Price: p1P,
    p2Name: p2N, p2Price: p2P,
    p3Name: p3N, p3Price: p3P,
    p4Name: p4N, p4Price: p4P,
    p5Name: p5N, p5Price: p5P
  };

  const botTitle = document.getElementById('sim-bot-title');
  if (botTitle) botTitle.textContent = `${currentDemoConfig.botName} · Asistente IA de ${currentDemoConfig.companyName}`;

  const avatarText = document.getElementById('sim-avatar-text');
  if (avatarText) {
    avatarText.textContent = currentDemoConfig.botName.substring(0, 2).toUpperCase();
  }

  const statusText = document.getElementById('sim-bot-status');
  if (statusText) {
    statusText.textContent = `● En línea · Asesora IA de ${currentDemoConfig.companyName}`;
  }

  // Render Dynamic Quick Action Pills
  const pillsBar = document.getElementById('sim-preset-pills');
  if (pillsBar && currentDemoConfig.quickPills) {
    pillsBar.innerHTML = currentDemoConfig.quickPills.map(pill => `
      <button class="sim-pill-btn" onclick="sendQuickPrompt('${pill.action}')">${pill.label}</button>
    `).join('');
  }

  // Dynamic Initial Chat Hint
  let hintText = '';
  if (currentDemoConfig.category === 'restaurante') {
    hintText = 'Escribe un saludo (<em>"Hola"</em>), pide a domicilio (<em>"Quiero pedir a domicilio"</em>), reserva una mesa (<em>"Quiero reservar una mesa para 4 personas hoy"</em>) o pide el menú.';
  } else if (currentDemoConfig.category === 'optica') {
    hintText = 'Escribe un saludo (<em>"Hola"</em>), consulta el examen de la vista gratis (<em>"¿El examen de la vista es gratis?"</em>) o agenda tu cita de optometría.';
  } else if (currentDemoConfig.category === 'odontologia') {
    hintText = 'Escribe un saludo (<em>"Hola"</em>), consulta la valoración gratis (<em>"Quiero valoración odontológica gratis"</em>) o agenda tu cita dental.';
  } else if (currentDemoConfig.category === 'ecommerce') {
    hintText = 'Escribe un saludo (<em>"Hola"</em>), consulta el catálogo de productos, pregunta por los envíos a domicilio o los medios de pago.';
  } else if (currentDemoConfig.category === 'inmobiliaria') {
    hintText = 'Escribe un saludo (<em>"Hola"</em>), consulta los inmuebles disponibles o solicita agendar una visita presencial.';
  } else {
    hintText = 'Escribe un saludo (<em>"Hola"</em>), pregunta por los servicios/precios o solicita agendar una cita o turno.';
  }

  const chatWindow = document.getElementById('sim-chat-window');
  if (chatWindow) {
    chatWindow.innerHTML = `
      <div class="chat-start-hint" id="chat-start-hint" style="text-align: center; padding: 25px 15px; color: rgba(255,255,255,0.55); font-size: 13px; border: 1px dashed rgba(212,175,55,0.25); border-radius: 12px; margin: 15px 0;">
        <span style="font-size: 26px; display: block; margin-bottom: 8px;">💬</span>
        <strong style="color: var(--gold-light);">Inicia la conversación como cliente</strong><br>
        ${hintText}
      </div>
    `;
  }

  // Nueva empresa/rubro = conversación nueva
  simConversationHistory = [];
}

function sendQuickPrompt(action) {
  let userText = '';
  const comp = currentDemoConfig.companyName;

  if (action === 'menu') userText = `¿Qué tienen disponible hoy en el menú de ${comp}?`;
  else if (action === 'domicilio') userText = `Hola, me gustaría pedir a domicilio. ¿Cuáles son las opciones de envío?`;
  else if (action === 'reservar_mesa') userText = `Hola, me gustaría reservar una mesa para comer en ${comp}.`;
  else if (action === 'examen_optica') userText = `Hola, ¿cómo funciona la cita para el examen computarizado de optometría?`;
  else if (action === 'valoracion_gratis') userText = `Hola, quisiera agendar mi valoración odontológica gratuita.`;
  else if (action === 'agendar_cita') userText = `Hola, me gustaría agendar una cita o reservar mi turno.`;
  else if (action === 'servicios') userText = `¿Qué servicios o productos ofrecen en ${comp} y qué precios tienen?`;
  else if (action === 'catalogo') userText = `¿Me podrías mostrar su catálogo con precios actualizados?`;
  else if (action === 'envios') userText = `¿Cómo funcionan sus envíos a domicilio y cuánto tardan en llegar?`;
  else if (action === 'pagos') userText = `¿Qué medios de pago aceptan y tienen pago contra entrega?`;
  else if (action === 'comprar') userText = `Hola, estoy interesado en comprar un producto de su catálogo.`;
  else if (action === 'inmuebles') userText = `Hola, ¿qué propiedades o inmuebles tienen disponibles en alquiler o venta?`;
  else if (action === 'agendar_visita') userText = `Hola, quisiera agendar una visita presencial para conocer un inmueble.`;
  else if (action === 'requisitos') userText = `¿Cuáles son los requisitos y documentos para alquilar un inmueble?`;
  else if (action === 'horario') userText = `¿Cuáles son sus horarios de atención y dónde están ubicados?`;
  else if (action === 'info') userText = `¿Qué garantías, políticas de servicio y formas de pago manejan?`;
  else userText = `Hola, quisiera recibir más información sobre ${comp}.`;

  addUserAndReply(userText);
}

async function fetchRealAIResponse(userText) {
  const esPrimerMensaje = simConversationHistory.length === 0;

  const systemPrompt = `Eres ${currentDemoConfig.botName}, quien atiende por chat en "${currentDemoConfig.companyName}".
Categoría del negocio: ${currentDemoConfig.categoryBadge}.
Ubicación: ${currentDemoConfig.location}.
Horarios de atención: ${currentDemoConfig.hours}.
Información y Políticas: ${currentDemoConfig.info}.

Catálogo disponible con precios COP:
1. ${currentDemoConfig.p1Name}: ${currentDemoConfig.p1Price}
2. ${currentDemoConfig.p2Name}: ${currentDemoConfig.p2Price}
3. ${currentDemoConfig.p3Name}: ${currentDemoConfig.p3Price}
4. ${currentDemoConfig.p4Name}: ${currentDemoConfig.p4Price}
5. ${currentDemoConfig.p5Name}: ${currentDemoConfig.p5Price}

Cómo hablar (muy importante):
- Saluda ("Hola", "¡Qué tal!", etc.) ÚNICAMENTE en tu primer mensaje de la conversación. En cualquier mensaje posterior, entra directo al tema, como alguien que ya lleva un rato chateando contigo -- nunca vuelvas a presentarte ni a saludar de nuevo.
- Habla como una persona real que trabaja ahí, no como un asistente de IA: nada de "Con respecto a tu pregunta sobre...", ni repetir la pregunta del cliente entre comillas, ni frases de manual. Responde directo, con naturalidad, como en un chat de WhatsApp real.
- Varía tu forma de empezar cada respuesta -- no repitas siempre la misma estructura ni las mismas palabras de apertura.
- Sé cercano, resolutivo y con buen criterio propio en español, incluso si la pregunta se sale del tema del negocio.
- Da explicaciones útiles y bien estructuradas, pero breves (evita párrafos larguísimos).
- Cuando tenga sentido, invita naturalmente a la acción principal de ${currentDemoConfig.companyName} (agendar una cita/valoración, pedir a domicilio o reservar), sin forzarlo en cada mensaje.
- Responde usando formato HTML simple (<strong>, <em>, <br>). No uses markdown con ***.
${esPrimerMensaje ? '\nEste es el primer mensaje del cliente en la conversación: puedes saludar de forma breve.' : '\nYa llevas conversación con este cliente (ver mensajes anteriores): NO saludes de nuevo, continúa natural.'}`;

  // 0. Claude real, vía el proxy de Google Apps Script (la API key vive en el
  //    servidor, nunca en el navegador). Es la fuente principal del demo.
  const webhookURL = localStorage.getItem('google-webhook-url') || localStorage.getItem('apps-script-url') || DEFAULT_WEBHOOK_URL;
  if (webhookURL) {
    try {
      const res = await fetch(webhookURL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'chat', systemPrompt, userText, history: simConversationHistory })
      });
      const data = await res.json();
      if (data.success && data.text) {
        const formatted = data.text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        simConversationHistory.push({ role: 'user', content: userText });
        simConversationHistory.push({ role: 'assistant', content: data.text });
        // Se limitan los ultimos turnos para no mandar un historial gigante en cada mensaje
        if (simConversationHistory.length > 16) simConversationHistory = simConversationHistory.slice(-16);
        return formatted;
      }
      console.log('Proxy de Claude sin respuesta util, usando respaldo:', data.error);
    } catch (err) {
      console.log('Proxy de Claude no disponible, usando respaldo:', err);
    }
  }

  // 1. Respaldo silencioso: motor de IA gratuito (Pollinations.ai), solo si
  //    el proxy de Claude no esta configurado o fallo momentaneamente.
  const historyAsText = simConversationHistory
    .map(m => `${m.role === 'user' ? 'Cliente' : currentDemoConfig.botName}: ${m.content}`)
    .join('\n');
  const fullPrompt = `${systemPrompt}\n\n${historyAsText ? historyAsText + '\n' : ''}Pregunta del cliente: ${userText}`;
  const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?model=openai&json=false`);
  if (res.ok) {
    const text = await res.text();
    if (text && text.trim().length > 15) {
      simConversationHistory.push({ role: 'user', content: userText });
      simConversationHistory.push({ role: 'assistant', content: text });
      if (simConversationHistory.length > 16) simConversationHistory = simConversationHistory.slice(-16);
      return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }
  }

  throw new Error('Fallback to local rules engine');
}

function handleUserChatMessage() {
  const input = document.getElementById('sim-user-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  addUserAndReply(text);
}

async function addUserAndReply(userText) {
  const chatWindow = document.getElementById('sim-chat-window');
  if (!chatWindow) return;

  // Remove initial hint on first message
  const hint = document.getElementById('chat-start-hint');
  if (hint) {
    hint.remove();
    trackEvent('chat_demo_started', { preset: currentPresetKey });
  }
  trackEvent('chat_demo_message_sent', { preset: currentPresetKey });

  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user';
  userBubble.textContent = userText;
  chatWindow.appendChild(userBubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  const typingBubble = document.createElement('div');
  typingBubble.className = 'chat-bubble ai temp-typing';
  typingBubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  chatWindow.appendChild(typingBubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Try Real Generative AI API first
  try {
    const realResponse = await fetchRealAIResponse(userText);
    document.querySelectorAll('.temp-typing').forEach(el => el.remove());

    const aiBubble = document.createElement('div');
    aiBubble.className = 'chat-bubble ai';
    aiBubble.innerHTML = realResponse;
    chatWindow.appendChild(aiBubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return;
  } catch (err) {
    console.log('Using local fallback rules engine', err);
  }

  // Fallback to local intent rules
  setTimeout(() => {
    document.querySelectorAll('.temp-typing').forEach(el => el.remove());

    const lower = userText.toLowerCase();
    let replyText = '';

    const productsListHtml = `
      1. <strong>${currentDemoConfig.p1Name}</strong>: <em>${currentDemoConfig.p1Price}</em><br>
      2. <strong>${currentDemoConfig.p2Name}</strong>: <em>${currentDemoConfig.p2Price}</em><br>
      3. <strong>${currentDemoConfig.p3Name}</strong>: <em>${currentDemoConfig.p3Price}</em><br>
      4. <strong>${currentDemoConfig.p4Name}</strong>: <em>${currentDemoConfig.p4Price}</em><br>
      5. <strong>${currentDemoConfig.p5Name}</strong>: <em>${currentDemoConfig.p5Price}</em>
    `;

    // Specific product item matching
    const userWords = lower.split(/[\s,?.!]+/).filter(w => w.length > 3);
    const p1L = currentDemoConfig.p1Name.toLowerCase();
    const p2L = currentDemoConfig.p2Name.toLowerCase();
    const p3L = currentDemoConfig.p3Name.toLowerCase();
    const p4L = currentDemoConfig.p4Name.toLowerCase();
    const p5L = currentDemoConfig.p5Name.toLowerCase();

    let matchedProd = null;
    if (userWords.some(w => p1L.includes(w))) matchedProd = { name: currentDemoConfig.p1Name, price: currentDemoConfig.p1Price };
    else if (userWords.some(w => p2L.includes(w))) matchedProd = { name: currentDemoConfig.p2Name, price: currentDemoConfig.p2Price };
    else if (userWords.some(w => p3L.includes(w))) matchedProd = { name: currentDemoConfig.p3Name, price: currentDemoConfig.p3Price };
    else if (userWords.some(w => p4L.includes(w))) matchedProd = { name: currentDemoConfig.p4Name, price: currentDemoConfig.p4Price };
    else if (userWords.some(w => p5L.includes(w))) matchedProd = { name: currentDemoConfig.p5Name, price: currentDemoConfig.p5Price };

    const category = currentDemoConfig.category;

    // --- RESTAURANTE & GASTRONOMÍA INTENTS ---
    if (category === 'restaurante') {
      if (lower.includes('domicilio') || lower.includes('domicilios') || lower.includes('pedir') || lower.includes('llegar') || lower.includes('comida') || lower.includes('entrega') || lower.includes('despacho') || lower.includes('hamburguesa') || lower.includes('pizza')) {
        replyText = `¡Con el mayor gusto te tomamos tu pedido a domicilio para <strong>${currentDemoConfig.companyName}</strong>! 🛵🍔<br><br>Para preparártelo fresco y caliente, por favor me indicas:<br>1. ¿Qué platos o bebidas de nuestro menú deseas pedir?<br>2. Tu dirección exacta de entrega y barrio.<br>3. ¿Cómo prefieres pagar? (Efectivo, Nequi o Tarjeta).<br><br>📋 <em>Información de Envíos</em>: ${currentDemoConfig.info}<br><br>¡Te lo organizamos de inmediato!`;
      }
      else if (lower.includes('reserva') || lower.includes('reservar') || lower.includes('mesa') || lower.includes('mesas') || lower.includes('personas') || lower.includes('cumpleaños') || lower.includes('cenar') || lower.includes('almorzar')) {
        replyText = `¡Excelente elección! Con muchísimo gusto te reservamos tu mesa en <strong>${currentDemoConfig.companyName}</strong>. 🍽️🍷<br><br>Para dejar tu mesa apartada en nuestro salón, por favor nos indicas:<br>1. ¿Para cuántas personas sería la mesa?<br>2. ¿En qué fecha y a qué hora los esperamos?<br>3. Tu nombre completo y un número de celular.<br><br>📍 Estamos ubicados en: <em>${currentDemoConfig.location}</em>.<br><br>¡Quedo atenta para confirmar tu reserva!`;
      }
      else if (lower.includes('menu') || lower.includes('menú') || lower.includes('carta') || lower.includes('platos') || lower.includes('precio') || lower.includes('costo') || lower.includes('especialidades')) {
        replyText = `¡Con el mayor de los gustos! Aquí tienes nuestro menú de delicias preparadas al instante en <strong>${currentDemoConfig.companyName}</strong>:<br><br>${productsListHtml}<br><br>🛵 <strong>Servicio a Domicilio & Reservas</strong>: ${currentDemoConfig.info}<br><br>¿Te gustaría pedir alguno a domicilio o prefieres reservar una mesa?`;
      }
      else if (lower.includes('hola') || lower.includes('buenas') || lower.includes('buenos dias') || lower.includes('saludos')) {
        replyText = `¡Hola! 👋 Te doy una muy cálida bienvenida a <strong>${currentDemoConfig.companyName}</strong>. 🍕🍷<br><br>Mi nombre es <strong>${currentDemoConfig.botName}</strong> y estoy lista para atenderte.<br><br>¿Te provoca pedir un delicioso plato a domicilio, deseas reservar una mesa o ver nuestro menú de hoy?`;
      }
    }

    // --- ÓPTICA INTENTS ---
    else if (category === 'optica') {
      if (lower.includes('examen') || lower.includes('vista') || lower.includes('optometria') || lower.includes('evaluacion') || lower.includes('ojo') || lower.includes('ojos')) {
        replyText = `¡Claro que sí! En <strong>${currentDemoConfig.companyName}</strong> tu <strong>Examen Computarizado de Optometría es GRATIS</strong> por la compra de tus lentes formulados. 👓✨<br><br>Para agendar tu cita de la vista con nuestro especialista, por favor me indicas:<br>1. ¿Qué día y horario te queda mejor?<br>2. Tu nombre completo y número de WhatsApp.<br><br>📍 Te atenderemos en: <em>${currentDemoConfig.location}</em>.`;
      }
      else if (lower.includes('lente') || lower.includes('lentes') || lower.includes('gafas') || lower.includes('montura') || lower.includes('bifocal') || lower.includes('antirreflejo')) {
        replyText = `¡Con el mayor gusto! En <strong>${currentDemoConfig.companyName}</strong> contamos con el siguiente catálogo de salud visual y lentes:<br><br>${productsListHtml}<br><br>📌 <em>Garantía y entrega</em>: ${currentDemoConfig.info}<br><br>¿Te gustaría agendar tu cita de optometría para tomar tu fórmula de lentes?`;
      }
      else if (lower.includes('hola') || lower.includes('buenas') || lower.includes('saludos')) {
        replyText = `¡Hola! 👋 Te doy una cálida bienvenida a <strong>${currentDemoConfig.companyName}</strong>. 👓✨<br><br>Mi nombre es <strong>${currentDemoConfig.botName}</strong> y soy tu asesora de salud visual.<br><br>¿Te gustaría agendar tu examen de la vista gratis, consultar precios de lentes o ver nuestras monturas?`;
      }
    }

    // --- ODONTOLOGÍA INTENTS ---
    else if (category === 'odontologia') {
      if (lower.includes('valoracion') || lower.includes('valoración') || lower.includes('gratis') || lower.includes('limpieza') || lower.includes('ortodoncia') || lower.includes('diente') || lower.includes('blanqueamiento')) {
        replyText = `¡Excelente! En <strong>${currentDemoConfig.companyName}</strong> tu <strong>Valoración Odontológica Inicial es 100% GRATIS</strong>. 🦷✨<br><br>Para apartar tu turno en el consultorio, por favor nos indicas:<br>1. ¿Qué día y horario te queda conveniente?<br>2. Nombre del paciente y número de celular.<br><br>📍 Te esperamos en: <em>${currentDemoConfig.location}</em>.`;
      }
      else if (lower.includes('hola') || lower.includes('buenas') || lower.includes('saludos')) {
        replyText = `¡Hola! 👋 Te doy una muy cálida bienvenida a <strong>${currentDemoConfig.companyName}</strong>. 🦷✨<br><br>Mi nombre es <strong>${currentDemoConfig.botName}</strong> y estoy lista para atender tu salud oral.<br><br>¿Te gustaría agendar tu valoración odontológica sin costo o consultar sobre algún tratamiento?`;
      }
    }

    // --- E-COMMERCE INTENTS ---
    else if (category === 'ecommerce') {
      if (lower.includes('comprar') || lower.includes('envio') || lower.includes('envío') || lower.includes('domicilio') || lower.includes('contraentrega') || lower.includes('talla') || lower.includes('despacho')) {
        replyText = `¡Genial! Realizamos envíos a todo Colombia con facilidades de pago 📦.<br><br>📋 <em>Políticas de Envío</em>: ${currentDemoConfig.info}<br><br>¿Qué producto te gustaría pedir hoy o a qué ciudad deseas que te lo enviemos?`;
      }
    }

    // --- INMOBILIARIA INTENTS ---
    else if (category === 'inmobiliaria') {
      if (lower.includes('visita') || lower.includes('inmueble') || lower.includes('apartamento') || lower.includes('casa') || lower.includes('alquiler') || lower.includes('arriendo') || lower.includes('venta')) {
        replyText = `¡Con todo gusto! En <strong>${currentDemoConfig.companyName}</strong> te acompañamos a conocer la propiedad que buscas. 🏠🔑<br><br>Por favor nos indicas:<br>1. ¿Qué inmueble o zona te interesa?<br>2. ¿Qué día y hora prefieres agendar la visita presencial?<br>3. Tu nombre y celular de contacto.<br><br>📋 <em>Información</em>: ${currentDemoConfig.info}`;
      }
    }

    // --- COMMON GENERIC FALLBACKS & MATCHES ---
    if (!replyText) {
      if (matchedProd && !lower.includes('agendar') && !lower.includes('cita') && !lower.includes('horario') && !lower.includes('donde')) {
        replyText = `¡Claro que sí! Con mucho gusto te doy los detalles de <strong>${matchedProd.name}</strong>:<br><br>💰 <strong>Precio en ${currentDemoConfig.companyName}</strong>: <strong>${matchedProd.price}</strong>.<br>📋 <em>Información</em>: ${currentDemoConfig.info}<br><br>¿Te gustaría que agendemos tu turno o confirmemos disponibilidad?`;
      }
      else if (lower.includes('hola') || lower.includes('buenas') || lower.includes('buenos dias') || lower.includes('buenas tardes') || lower.includes('saludos')) {
        replyText = `¡Hola! 👋 Qué alegría saludarte. Te doy una muy cálida bienvenida a <strong>${currentDemoConfig.companyName}</strong>.<br><br>Mi nombre es <strong>${currentDemoConfig.botName}</strong> y estoy aquí para ayudarte en lo que necesites.<br><br>¿En qué te puedo asesorar hoy? Te puedo dar información sobre nuestros servicios, precios o ayudarte a agendar.`;
      }
      else if (lower.includes('horario') || lower.includes('hora') || lower.includes('abren') || lower.includes('cierran') || lower.includes('domingo') || lower.includes('atencion') || lower.includes('atención')) {
        replyText = `¡Con gusto! Te cuento que en <strong>${currentDemoConfig.companyName}</strong> atendemos en los siguientes horarios:<br>🕒 <strong>${currentDemoConfig.hours}</strong>.<br><br>📍 Nos encontramos ubicados en: <strong>${currentDemoConfig.location}</strong>.<br><br>¿Te gustaría apartar tu turno en un horario que te quede cómodo?`;
      }
      else if (lower.includes('donde') || lower.includes('dónde') || lower.includes('ubicacion') || lower.includes('ubicación') || lower.includes('direccion') || lower.includes('dirección') || lower.includes('llegar')) {
        replyText = `¡Con todo gusto! Estamos ubicados en: 📍 <strong>${currentDemoConfig.location}</strong>.<br><br>🕒 Atendemos en jornada: <em>${currentDemoConfig.hours}</em>.<br><br>¿Te gustaría apartar tu cita previa para atenderte sin esperas?`;
      }
      else if (lower.includes('precio') || lower.includes('costo') || lower.includes('cuanto') || lower.includes('cuánto') || lower.includes('valor') || lower.includes('catalogo') || lower.includes('catálogo') || lower.includes('tarifa') || lower.includes('productos') || lower.includes('servicios')) {
        replyText = `¡Con el mayor de los gustos! En <strong>${currentDemoConfig.companyName}</strong> contamos con el siguiente catálogo de opciones disponibles:<br><br>${productsListHtml}<br><br>📌 <em>Información y garantías</em>: ${currentDemoConfig.info}<br><br>¿Cuál de estas opciones te llama más la atención?`;
      }
      else if (lower.includes('agendar') || lower.includes('cita') || lower.includes('turno') || lower.includes('reserva') || lower.includes('disponibilidad')) {
        replyText = `¡Excelente decisión! Con muchísimo gusto te organizamos la cita en <strong>${currentDemoConfig.companyName}</strong>. 😊<br><br>Para dejar tu turno apartado en el sistema, por favor me indicas:<br>1. ¿Qué día y a qué hora te vendría bien?<br>2. Tu nombre completo y un número de celular o WhatsApp.<br><br>Quedo súper atenta para reservarte de inmediato.`;
      }
      else if (lower.includes('pago') || lower.includes('nequi') || lower.includes('efectivo') || lower.includes('tarjeta') || lower.includes('politica') || lower.includes('política') || lower.includes('envio') || lower.includes('envío')) {
        replyText = `Te comparto con gusto nuestras políticas y facilidades de pago en <strong>${currentDemoConfig.companyName}</strong>:<br>📋 <em>${currentDemoConfig.info}</em>.<br><br>¿Tienes alguna duda adicional sobre algún servicio?`;
      }
      else {
        replyText = `¡Entendido! Con respecto a lo que me preguntas sobre <em>"${userText}"</em>:<br>En <strong>${currentDemoConfig.companyName}</strong> nos encanta darte una atención 100% personalizada. Te cuento que nos encontramos ubicados en 📍 <strong>${currentDemoConfig.location}</strong> y atendemos en el horario 🕒 <strong>${currentDemoConfig.hours}</strong>.<br><br>¿Te gustaría que te cotice algún servicio específico o prefieres agendar una cita?`;
      }
    }

    const aiBubble = document.createElement('div');
    aiBubble.className = 'chat-bubble ai';
    aiBubble.innerHTML = replyText;
    chatWindow.appendChild(aiBubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }, 650);
}

function initAISimulator() {
  const btnGenerate = document.getElementById('btn-generate-ai-demo');
  if (btnGenerate) {
    btnGenerate.addEventListener('click', generateCustomAIDemo);
  }

  // Real-time input listeners for auto-detecting user typed business info
  const compInput = document.getElementById('demo-company-name');
  const prod1Input = document.getElementById('demo-prod1-name');
  if (compInput) {
    compInput.addEventListener('input', () => {
      currentPresetKey = null;
      generateCustomAIDemo();
    });
  }
  if (prod1Input) {
    prod1Input.addEventListener('input', () => {
      currentPresetKey = null;
      generateCustomAIDemo();
    });
  }

  generateCustomAIDemo();
}

// 10. ELEGANT PAYMENT & BOOKING MODAL HANDLER
// El checkout embebido de Mercado Pago (mas abajo) es la UNICA forma de
// pagar con tarjeta -- a proposito no hay un link de "pago unico" suelto,
// para que nunca se pueda pagar la implementacion sin quedar tambien
// suscrito a la mensualidad.
const planDetailsMap = {
  'Asistente Basico WhatsApp': {
    title: 'Asistente para Redes Sociales & WhatsApp',
    priceText: 'Inversión: <strong>$1.950.000 COP</strong> + $330.000 COP/mes',
    oneTimeAmount: 1950000,
    monthlyAmount: 330000
  },
  'Asistente Experto Empresa': {
    title: 'Asistente Experto en tu Empresa',
    priceText: 'Inversión: <strong>$3.450.000 COP</strong> + $520.000 COP/mes',
    oneTimeAmount: 3450000,
    monthlyAmount: 520000
  },
  'Sistema Completo Automatico': {
    title: 'Plataforma Empresarial & Página Web IA',
    priceText: 'Inversión: <strong>$5.900.000 COP</strong> + $890.000 COP/mes',
    oneTimeAmount: 5900000,
    monthlyAmount: 890000
  }
};

let currentCheckoutServiceKey = 'Asistente Experto Empresa';

function openPaymentModal(serviceKey) {
  const modal = document.getElementById('overlay-payment-options');
  const titleEl = document.getElementById('payment-modal-plan-title');
  const priceEl = document.getElementById('payment-modal-plan-price');

  const planInfo = planDetailsMap[serviceKey] || planDetailsMap['Asistente Experto Empresa'];
  currentCheckoutServiceKey = planDetailsMap[serviceKey] ? serviceKey : 'Asistente Experto Empresa';

  if (titleEl) titleEl.textContent = planInfo.title;
  if (priceEl) priceEl.innerHTML = planInfo.priceText;

  // Limpiar el formulario de checkout embebido y su mensaje de estado
  const checkoutForm = document.getElementById('mp-checkout-form');
  if (checkoutForm) checkoutForm.reset();
  const checkoutStatus = document.getElementById('mp-checkout-status');
  if (checkoutStatus) checkoutStatus.style.display = 'none';

  if (modal) modal.classList.add('active');

  trackEvent('view_pricing_modal', { plan_name: currentCheckoutServiceKey });
}

window.openPaymentModal = openPaymentModal;

// ── CHECKOUT EMBEBIDO DE MERCADO PAGO (1 sola tarjeta -> pago unico + suscripcion) ──
// Public Key de PRODUCCION: NO es secreta, esta pensada para vivir en el
// navegador del cliente. A partir de aqui los cobros son con dinero real.
const MP_PUBLIC_KEY = 'APP_USR-571a6f8c-dc56-47c6-92e3-858492e3b614';

let mpInstance = null;
let mpDetectedPaymentMethodId = null;
let mpDetectedIssuerId = null;

function initMercadoPagoCheckout() {
  if (typeof MercadoPago === 'undefined') {
    console.warn('SDK de Mercado Pago no cargó; el checkout embebido queda deshabilitado (quedan los links de pago por separado).');
    return;
  }

  mpInstance = new MercadoPago(MP_PUBLIC_KEY, { locale: 'es-CO' });

  const cardNumberField = mpInstance.fields.create('cardNumber', { placeholder: '•••• •••• •••• ••••' }).mount('mp-card-number');
  mpInstance.fields.create('expirationDate', { placeholder: 'MM/AA' }).mount('mp-card-expiration');
  mpInstance.fields.create('securityCode', { placeholder: 'CVV' }).mount('mp-card-cvv');

  // Detecta el medio de pago (Visa/Mastercard/etc.) a partir del BIN, sin
  // exponer nunca el numero completo de la tarjeta a nuestro codigo.
  cardNumberField.on('binChange', async (data) => {
    try {
      const bin = data && data.bin;
      if (!bin) { mpDetectedPaymentMethodId = null; mpDetectedIssuerId = null; return; }
      const { results } = await mpInstance.getPaymentMethods({ bin });
      if (results && results[0]) {
        mpDetectedPaymentMethodId = results[0].id;
        mpDetectedIssuerId = (results[0].issuer && results[0].issuer.id) || null;
      }
    } catch (err) {
      console.warn('No se pudo detectar el medio de pago:', err);
      mpDetectedPaymentMethodId = null;
    }
  });

  const form = document.getElementById('mp-checkout-form');
  if (form) form.addEventListener('submit', handleMercadoPagoCheckoutSubmit);

  // Boton de diagnostico TEMPORAL (ver comentario en index.html): solo se
  // muestra con ?debug=1 en la URL, para poder probar la creacion de la
  // suscripcion sin cobrar el pago unico. Quitar una vez resuelto.
  const testSubBtn = document.getElementById('btn-mp-test-subscription-only');
  if (testSubBtn) {
    if (new URLSearchParams(window.location.search).get('debug') === '1') {
      testSubBtn.style.display = 'block';
    }
    testSubBtn.addEventListener('click', testSubscriptionOnly);
  }
}

// TEMPORAL: prueba UNICAMENTE la creacion de la suscripcion en Mercado Pago
// (no llama a /v1/payments, asi que no cobra el pago unico -- tokenizar la
// tarjeta no tiene costo). Sirve para ver la respuesta cruda de Mercado
// Pago cuando la suscripcion falla, sin arriesgar dinero real. El backend
// ademas cancela de inmediato la suscripcion de prueba si llega a crearse.
async function testSubscriptionOnly() {
  const testBtn = document.getElementById('btn-mp-test-subscription-only');
  const cardholderName = document.getElementById('mp-cardholder-name').value.trim();
  const docType = document.getElementById('mp-doc-type').value;
  const docNumber = document.getElementById('mp-doc-number').value.trim();
  const payerEmail = document.getElementById('mp-payer-email').value.trim();

  if (!cardholderName || !docNumber || !payerEmail) {
    showMpCheckoutStatus('error', '[DEBUG] Completa nombre, documento y correo antes de probar.');
    return;
  }
  if (!mpInstance) {
    showMpCheckoutStatus('error', '[DEBUG] El checkout no cargó correctamente. Recarga la página.');
    return;
  }
  if (!mpDetectedPaymentMethodId) {
    showMpCheckoutStatus('error', '[DEBUG] Falta llenar el número de tarjeta (también vencimiento y CVV) para poder generar el token.');
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = 'Probando (no se cobra nada)...';
  showMpCheckoutStatus('info', '[DEBUG] Generando token de la tarjeta (gratis, no cobra)...');

  try {
    // Se replica EXACTAMENTE el patron del checkout real: 2 tokens de la
    // misma tarjeta generados en simultaneo (Promise.all), y se usa el
    // SEGUNDO -- el mismo que en el flujo real se manda para la
    // suscripcion despues de que el primero ya cobro el pago unico. Un
    // solo token (probado antes) SI funciono, asi que esto aisla si el
    // problema esta en generar/usar dos tokens a la vez.
    const tokenData = { cardholderName, identificationType: docType, identificationNumber: docNumber };
    const [, subscriptionTokenRes] = await Promise.all([
      mpInstance.fields.createCardToken(tokenData),
      mpInstance.fields.createCardToken(tokenData)
    ]);
    const tokenRes = subscriptionTokenRes;

    // Simula el tiempo que tarda el cobro real del pago unico antes de
    // usar el segundo token (en el flujo real no es instantaneo) -- para
    // descartar que el token se este venciendo o invalidando con el tiempo.
    showMpCheckoutStatus('info', '[DEBUG] Esperando 4s (simulando el tiempo que tarda el cobro del pago único)...');
    await new Promise((resolve) => setTimeout(resolve, 4000));

    showMpCheckoutStatus('info', '[DEBUG] Probando la creación de la suscripción en Mercado Pago (2do de 2 tokens, con retraso simulado)...');

    const webhookURL = localStorage.getItem('google-webhook-url') || localStorage.getItem('apps-script-url') || DEFAULT_WEBHOOK_URL;
    const res = await fetch(webhookURL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'mp_test_subscription',
        subscriptionToken: tokenRes.id,
        payerEmail,
        docType,
        docNumber,
        cardholderName,
        // 1000 choco con el minimo de Mercado Pago ($1.600 COP). Con 10000
        // SI funciono -- ahora se prueba exactamente 5000 (el monto real
        // que fallo en la prueba real) para ver si el problema esta ahi.
        monthlyAmount: 5000
      })
    });
    const data = await res.json();
    console.log('[DEBUG] Resultado prueba de suscripción:', data);
    showMpCheckoutStatus(
      data.subscriptionActive ? 'success' : 'error',
      '[DEBUG] ' + (data.subscriptionActive ? 'La suscripción SÍ se creó (se canceló de inmediato, no cobra nada).' : 'La suscripción NO se pudo crear.') +
      '\n\nRespuesta cruda de Mercado Pago:\n' + JSON.stringify(data.raw || data, null, 2)
    );
  } catch (err) {
    // El SDK de Mercado Pago a veces rechaza con un array de errores de
    // validacion (sin .message), no con un Error normal -- se muestra
    // cualquier forma que venga para no perder el detalle.
    let detail = 'Error desconocido';
    if (err) {
      if (err.message) detail = err.message;
      else if (Array.isArray(err)) detail = err.map(function (e) { return e.message || e.code || JSON.stringify(e); }).join(' | ');
      else { try { detail = JSON.stringify(err); } catch (jsonErr) { detail = String(err); } }
    }
    console.error('[DEBUG] Error crudo probando suscripción:', err);
    showMpCheckoutStatus('error', '[DEBUG] Error probando: ' + detail);
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = '🧪 Solo probar suscripción (no cobra nada)';
  }
}

function showMpCheckoutStatus(type, message) {
  const statusEl = document.getElementById('mp-checkout-status');
  if (!statusEl) return;
  const palette = {
    success: { bg: 'rgba(46,204,113,0.1)', border: 'rgba(46,204,113,0.35)', text: '#2ecc71' },
    warning: { bg: 'rgba(241,196,15,0.1)', border: 'rgba(241,196,15,0.35)', text: '#f1c40f' },
    error: { bg: 'rgba(231,76,60,0.1)', border: 'rgba(231,76,60,0.35)', text: '#e74c3c' },
    info: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.15)', text: '#fff' }
  };
  const c = palette[type] || palette.info;
  statusEl.style.display = 'block';
  statusEl.style.background = c.bg;
  statusEl.style.border = `1px solid ${c.border}`;
  statusEl.style.color = c.text;
  statusEl.textContent = message;
}

async function handleMercadoPagoCheckoutSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('btn-mp-checkout-submit');
  const form = document.getElementById('mp-checkout-form');

  const cardholderName = document.getElementById('mp-cardholder-name').value.trim();
  const docType = document.getElementById('mp-doc-type').value;
  const docNumber = document.getElementById('mp-doc-number').value.trim();
  const payerEmail = document.getElementById('mp-payer-email').value.trim();
  const payerWhatsapp = document.getElementById('mp-payer-whatsapp').value.trim();

  if (!cardholderName || !docNumber || !payerEmail || !payerWhatsapp) {
    showMpCheckoutStatus('error', 'Completa tu nombre, documento, correo y WhatsApp antes de pagar.');
    return;
  }
  if (!mpInstance) {
    showMpCheckoutStatus('error', 'El checkout no cargó correctamente. Recarga la página e intenta de nuevo.');
    return;
  }
  if (!mpDetectedPaymentMethodId) {
    showMpCheckoutStatus('error', 'Termina de escribir el número de tarjeta para poder identificarla.');
    return;
  }

  const planInfo = planDetailsMap[currentCheckoutServiceKey];
  if (!planInfo) {
    showMpCheckoutStatus('error', 'No se pudo identificar el plan seleccionado. Cierra y vuelve a intentar.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Procesando...';
  showMpCheckoutStatus('info', 'Generando los tokens seguros de tu tarjeta...');

  try {
    const tokenData = { cardholderName, identificationType: docType, identificationNumber: docNumber };
    // Un token por cada cobro (pago unico + suscripcion): un CardToken de
    // Mercado Pago solo sirve una vez, por eso se generan 2 a partir de los
    // MISMOS campos ya llenos -- el cliente no vuelve a escribir nada.
    const [oneTimeTokenRes, subscriptionTokenRes] = await Promise.all([
      mpInstance.fields.createCardToken(tokenData),
      mpInstance.fields.createCardToken(tokenData)
    ]);

    showMpCheckoutStatus('info', 'Procesando tu pago...');

    trackEvent('begin_checkout', {
      currency: 'COP',
      value: planInfo.oneTimeAmount,
      items: [{ item_name: planInfo.title, price: planInfo.oneTimeAmount }]
    });

    const webhookURL = localStorage.getItem('google-webhook-url') || localStorage.getItem('apps-script-url') || DEFAULT_WEBHOOK_URL;
    const res = await fetch(webhookURL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'mp_checkout',
        serviceKey: currentCheckoutServiceKey,
        planTitle: planInfo.title,
        oneTimeAmount: planInfo.oneTimeAmount,
        monthlyAmount: planInfo.monthlyAmount,
        oneTimeToken: oneTimeTokenRes.id,
        subscriptionToken: subscriptionTokenRes.id,
        paymentMethodId: mpDetectedPaymentMethodId,
        issuerId: mpDetectedIssuerId,
        payerEmail,
        payerWhatsapp,
        docType,
        docNumber,
        cardholderName,
        deviceId: window.MP_DEVICE_SESSION_ID || null
      })
    });
    const data = await res.json();

    if (data.success) {
      showMpCheckoutStatus('success', `✅ ¡Listo! Tu pago fue aprobado. Tu mensualidad de sostenimiento queda programada para empezar a cobrarse en 30 días — el primer mes corre por nuestra cuenta mientras hacemos la implementación. Te contactaremos por WhatsApp en breve para arrancar, y te enviamos la confirmación a ${payerEmail}.`);
      if (form) form.reset();
      trackEvent('purchase', {
        transaction_id: String(data.paymentId || Date.now()),
        currency: 'COP',
        value: planInfo.oneTimeAmount,
        items: [{ item_name: planInfo.title, price: planInfo.oneTimeAmount }]
      });
    } else if (data.paymentApproved && !data.subscriptionActive) {
      // TEMPORAL: mientras se sigue diagnosticando, el detalle crudo de
      // Mercado Pago solo se muestra con ?debug=1 -- un cliente real nunca
      // deberia ver un volcado de JSON en el mensaje de error.
      const isDebugMode = new URLSearchParams(window.location.search).get('debug') === '1';
      const debugSuffix = (isDebugMode && data.debugSubResult) ? '\n\n[DEBUG] ' + JSON.stringify(data.debugSubResult, null, 2) : '';
      showMpCheckoutStatus('warning', '⚠️ Tu pago único se procesó correctamente, pero hubo un problema activando la mensualidad automática. Te contactaremos por WhatsApp para completarla — no te preocupes.' + debugSuffix);
      trackEvent('checkout_subscription_failed', { plan_name: currentCheckoutServiceKey });
    } else if (data.paymentPending) {
      showMpCheckoutStatus('warning', `⏳ ${data.error || 'Tu pago quedó en revisión, te confirmaremos pronto.'}`);
      trackEvent('checkout_payment_pending', { plan_name: currentCheckoutServiceKey });
    } else {
      showMpCheckoutStatus('error', `❌ ${data.error || 'No se pudo procesar el pago. Verifica los datos de tu tarjeta o prueba con otra.'}`);
      trackEvent('checkout_payment_rejected', { plan_name: currentCheckoutServiceKey, reason: data.error || 'desconocido' });
    }
  } catch (err) {
    console.error('Error en checkout de Mercado Pago:', err);
    // Se muestra el detalle real (antes quedaba oculto con un mensaje
    // generico, lo que hacia imposible diagnosticar sin abrir la consola).
    // Aviso importante: en este punto el pago pudo haberse alcanzado a
    // procesar del lado del servidor antes de que fallara la respuesta --
    // no lo decimos como error de tarjeta para no invitar a pagar de nuevo
    // sin revisar antes.
    const detail = (err && err.message) ? err.message : 'Error de conexión desconocido.';
    showMpCheckoutStatus('error', `❌ No pudimos confirmar el resultado de tu pago (${detail}). Antes de intentar de nuevo, revisa tu correo o contáctanos por WhatsApp para verificar si ya se procesó.`);
    trackEvent('checkout_client_error', { plan_name: currentCheckoutServiceKey, detail });
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Pagar e Iniciar Suscripción';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initMercadoPagoCheckout();

  const closePaymentModalBtn = document.getElementById('btn-close-payment-modal');
  if (closePaymentModalBtn) {
    closePaymentModalBtn.addEventListener('click', () => {
      const modal = document.getElementById('overlay-payment-options');
      if (modal) modal.classList.remove('active');
    });
  }
});

// ============================================================
// 12. FLOATING SALES CLOSER CHAT WIDGET
// Asistente de IA persistente (no confundir con el simulador de
// #simulador, que demuestra cómo se vería un agente en OTROS
// negocios). Este habla en nombre de Esteban IA para ayudar a
// cerrar la venta de los propios servicios. Reutiliza el mismo
// proxy de Claude (`action: 'chat'`) que ya paga la API.
// ============================================================

const CLOSER_MAX_MESSAGES = 30; // tope por sesión, cuida el costo de la API
let closerConversationHistory = [];
let closerMessageCount = 0;
let closerHasOpened = false;

function buildCloserSystemPrompt(esPrimerMensaje) {
  return `Eres el asistente de ventas de Esteban IA, una agencia colombiana de agentes de inteligencia artificial y automatización de procesos empresariales, dirigida por Esteban Serna. Estás en el chat flotante de esteban-serna.com, hablando con un visitante que podría convertirse en cliente.

TU TRABAJO: identificar, con un par de preguntas de contexto (rubro del negocio, dónde atiende hoy a sus clientes -- WhatsApp, redes o web --, y su problema principal), cuál de los 3 planes de pago le conviene más. Antes de recomendar el plan, muéstrale primero cuánto se estaría ahorrando frente a lo que gasta hoy en personal (ver el paso de la marca [[SAVINGS:...]] más abajo) -- el beneficio económico es lo que justifica la decisión, nunca lleves a alguien directo al botón de pago sin haberle mostrado antes ese ahorro. Solo después de eso, recomienda el plan concreto y guíalo a pagar. El pago activa la implementación real -- Esteban ya NO agenda llamadas de diagnóstico gratis antes de vender, así que NO ofrezcas la reunión de Zoom gratuita como primer paso ni como opción por defecto. Solo menciónala como alternativa si la persona, después de ver el ahorro, el plan recomendado y el precio, sigue genuinamente indecisa y prefiere hablar antes de pagar -- ahí sí como último recurso, no antes.

CATÁLOGO REAL (nunca inventes precios ni planes distintos a estos; usa EXACTAMENTE estas claves internas cuando recomiendes uno):
1. Clave interna "Asistente Basico WhatsApp" -- Asistente para Redes Sociales y WhatsApp -- $1.950.000 COP de implementación (pago único) + $330.000 COP/mes de sostenimiento. Ideal para quien solo necesita atención automática por WhatsApp.
2. Clave interna "Asistente Experto Empresa" -- Asistente Experto en tu Empresa -- $3.450.000 COP + $520.000 COP/mes. Cubre WhatsApp, redes sociales y el sitio web con el mismo agente, agenda citas y califica prospectos. El más pedido.
3. Clave interna "Sistema Completo Automatico" -- Plataforma Empresarial y Página Web IA -- $5.900.000 COP + $890.000 COP/mes. El plan más completo: automatización de procesos, agendamiento, calificación de clientes y desarrollo del aplicativo web con IA integrada.

CÓMO GUIAR LA CONVERSACIÓN (en este orden, nunca te saltes pasos ni los mezcles en un solo mensaje):
1. Primero pregunta lo necesario para entender el negocio: rubro, por dónde atiende hoy (WhatsApp, redes o web), y su problema principal. No recomiendes nada todavía.
2. Cuando ya tengas eso, pregunta (si no te lo han dicho) cuántas personas responden hoy mensajes o atienden clientes, y cuántas horas al día lo hacen. Si la persona no lo sabe con precisión, usa un valor típico razonable (1 persona, 8 horas/día, $10.000 COP/hora de costo laboral aproximado) sin insistir en pedir precisión.
3. Con esos datos, en SU PROPIO mensaje (nunca junto con la recomendación del plan), muéstrale el beneficio económico real antes que nada: agrega al final de ese mensaje, en su propia línea, esta marca interna (es una señal para el sitio, nunca la menciones ni la expliques al visitante, ni muestres tú mismo los números -- el sitio calcula y muestra la cifra real):
   [[SAVINGS:people=N;hours=N;rate=N;plan=clave_interna_del_plan_que_ya_tienes_en_mente]]
   - "plan" debe ser la clave exacta (ver catálogo abajo) del plan que le vas a recomendar, aunque todavía no lo anuncies por su nombre en el texto visible de este mensaje.
   - Termina este mensaje invitando a seguir (ej. "¿quieres que te muestre exactamente qué plan te conviene con ese ahorro?"), SIN recomendar el plan todavía ni mencionar su precio de implementación.
4. SOLO en un mensaje POSTERIOR (después de que el ahorro ya se mostró en la conversación), recomienda el plan concreto con su razón ("para tu caso, el plan que más te conviene es..."). El marcador [[PLAN:clave_interna_exacta]] debe ser literalmente lo ÚLTIMO que escribas en ese mensaje -- no agregues nada después (ni siquiera la opción de hablar antes de pagar; si quieres ofrecerla, hazlo en un mensaje aparte solo si la persona duda después de ver el plan).
5. Nunca muestres [[SAVINGS:...]] y [[PLAN:...]] en el mismo mensaje. Nunca muestres [[PLAN:...]] si el ahorro no se mostró antes en la conversación (revisa el historial).

DATOS QUE PUEDES USAR:
- El primer mes de la mensualidad de sostenimiento no se cobra (corre por cuenta de Esteban IA mientras se hace la implementación); después se cobra normal cada mes.
- La implementación es pago único; la mensualidad cubre servidores, mantenimiento y mejoras continuas.
- Un agente de IA (a diferencia de un chatbot con guiones fijos) entiende el contexto real, responde con info específica del negocio del cliente, agenda citas y puede tomar acciones -- sin que nadie lo esté monitoreando.
- Se puede automatizar: atención y venta 24/7 por WhatsApp/redes, agendamiento de citas, calificación de leads, registro de datos sin errores humanos, confirmaciones/recibos automáticos, y flujos a la medida del negocio.
- El cliente no necesita conocimientos técnicos -- Esteban IA hace todo el diseño, implementación y mantenimiento de principio a fin.
- Una vez pagada la implementación, Esteban sí agenda una reunión con el cliente para arrancar el proyecto -- esa reunión existe, solo que va DESPUÉS del pago, no antes.
- Si preguntan por un descuento o precio fuera del catálogo: no inventes uno, di que eso se habla directo con Esteban una vez decidido el plan.

CÓMO HABLAR:
- Cercano, consultivo y honesto -- NUNCA insistente. Pregunta primero, recomienda después con criterio real.
- Saluda ÚNICAMENTE en tu primer mensaje de la conversación. Después entra directo al tema, sin volver a presentarte.
- Habla como una persona real del equipo, no como un bot: nada de "con respecto a tu pregunta...", ni repetir la pregunta entre comillas.
- Respuestas breves y claras (2-4 frases normalmente). Formato HTML simple (<strong>, <em>, <br>), nunca markdown con asteriscos.
- Nunca menciones herramientas de automatización específicas (como Make o n8n) -- habla en términos de "agentes", "automatización de procesos" y "aplicativos a la medida".
- Si preguntan algo totalmente fuera de tema, respóndelo brevemente con simpatía y trae la conversación de vuelta a identificar qué plan le conviene.
${esPrimerMensaje ? '\nEste es el primer mensaje del visitante: puedes saludar de forma breve.' : '\nYa llevas conversación con este visitante (ver historial): NO saludes de nuevo, continúa natural.'}`;
}

function initSalesCloser() {
  const launcher = document.getElementById('closer-launcher');
  const panel = document.getElementById('closer-panel');
  const closeBtn = document.getElementById('closer-close');
  const form = document.getElementById('closer-form');
  const input = document.getElementById('closer-input');
  const messagesEl = document.getElementById('closer-messages');
  const quickRepliesEl = document.getElementById('closer-quick-replies');
  const ctaBookBtn = document.getElementById('closer-cta-book');
  const ctaPlansBtn = document.getElementById('closer-cta-plans');
  const teaser = document.getElementById('closer-teaser');
  if (!launcher || !panel || !form || !input || !messagesEl) return;

  function renderCloserMessage(role, text, isHtml) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    if (isHtml) bubble.innerHTML = text;
    else bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function formatCOPCloser(amount) {
    return '$' + Math.round(amount).toLocaleString('es-CO') + ' COP';
  }

  // Misma formula exacta que la calculadora visible de #calculadora (ver
  // calculateROI() mas arriba en este archivo) -- se duplica aqui a
  // proposito para no acoplar el chat a los sliders del DOM del
  // calculador, pero los numeros deben coincidir siempre.
  function computeCloserSavings({ people, hours, rate, planKey }) {
    const p = Math.max(1, parseInt(people, 10) || 1);
    const h = Math.max(1, Math.min(24, parseInt(hours, 10) || 8));
    const r = Math.max(1, parseInt(rate, 10) || 10000);

    const hours247Month = Math.round(24 * 30 * p);
    const totalCost247Human = Math.round(hours247Month * r);

    const plan = planDetailsMap[planKey];
    const costIA = plan ? plan.monthlyAmount : 520000;
    const netSavings247 = Math.max(0, totalCost247Human - costIA);

    return { totalCost247Human, costIA, netSavings247, planTitle: plan ? plan.title : 'Asistente de IA', p, h };
  }

  function renderSavingsCard(paramsStr) {
    const parts = {};
    paramsStr.split(';').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k && v) parts[k.trim()] = v.trim();
    });
    const s = computeCloserSavings({ people: parts.people, hours: parts.hours, rate: parts.rate, planKey: parts.plan });

    const card = document.createElement('div');
    card.className = 'closer-savings-card';
    card.innerHTML = `
      <div class="closer-savings-card-title">💰 Lo que te estarías ahorrando</div>
      <div class="closer-savings-row"><span>Cubrir 24/7 con personal humano</span><strong>${formatCOPCloser(s.totalCost247Human)}/mes</strong></div>
      <div class="closer-savings-row"><span>${s.planTitle}</span><strong>${formatCOPCloser(s.costIA)}/mes</strong></div>
      <div class="closer-savings-highlight">Ahorro neto: <strong>${formatCOPCloser(s.netSavings247)}/mes</strong></div>
    `;
    messagesEl.appendChild(card);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderPlanRecommendation(planKey) {
    const plan = planDetailsMap[planKey];
    if (!plan) return; // clave que no existe en el catálogo real -- se ignora, no se rompe el chat

    const card = document.createElement('div');
    card.className = 'closer-plan-card';
    card.innerHTML = `
      <div class="closer-plan-card-title">${plan.title}</div>
      <div class="closer-plan-card-price">${plan.priceText}</div>
      <button type="button" class="closer-plan-card-btn">💳 Pagar y activar ahora</button>
    `;
    card.querySelector('.closer-plan-card-btn').addEventListener('click', () => {
      trackEvent('closer_cta_clicked', { cta: 'pagar_recomendado', plan: planKey });
      closePanel();
      openPaymentModal(planKey);
    });
    messagesEl.appendChild(card);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderQuickReplies(options) {
    quickRepliesEl.innerHTML = '';
    quickRepliesEl.style.display = options.length ? 'flex' : 'none';
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'closer-chip';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        quickRepliesEl.innerHTML = '';
        quickRepliesEl.style.display = 'none';
        sendCloserMessage(opt.text);
      });
      quickRepliesEl.appendChild(btn);
    });
  }

  async function sendCloserMessage(userText) {
    if (!userText || !userText.trim()) return;
    renderCloserMessage('user', userText, false);

    closerMessageCount++;
    trackEvent('closer_chat_message_sent', { count: closerMessageCount });

    if (closerMessageCount > CLOSER_MAX_MESSAGES) {
      renderCloserMessage('ai', 'Para darte una recomendación precisa a tu caso, lo mejor es que hablemos directo en el diagnóstico gratuito de 30 minutos -- ahí Esteban revisa tu negocio con calma.<br><br>👉 Puedes agendarlo con el botón de abajo.', true);
      return;
    }

    const typing = document.createElement('div');
    typing.className = 'chat-bubble ai temp-typing';
    typing.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const systemPrompt = buildCloserSystemPrompt(closerConversationHistory.length === 0);
    const webhookURL = localStorage.getItem('google-webhook-url') || localStorage.getItem('apps-script-url') || DEFAULT_WEBHOOK_URL;

    try {
      const res = await fetch(webhookURL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'chat', systemPrompt, userText, history: closerConversationHistory })
      });
      const data = await res.json();
      messagesEl.querySelectorAll('.temp-typing').forEach((el) => el.remove());

      if (data.success && data.text) {
        const savingsMatch = data.text.match(/\[\[SAVINGS:([^\]]+)\]\]/);
        const planMatch = data.text.match(/\[\[PLAN:([^\]]+)\]\]/);
        const cleanText = data.text
          .replace(/\s*\[\[SAVINGS:[^\]]+\]\]\s*/g, ' ')
          .replace(/\s*\[\[PLAN:[^\]]+\]\]\s*/g, ' ')
          .replace(/[ \t]{2,}/g, ' ')
          .trim();
        const formatted = cleanText.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        renderCloserMessage('ai', formatted, true);
        // Orden fijo: primero el ahorro, despues el plan -- aunque el
        // modelo las haya emitido en otro orden en el texto crudo.
        if (savingsMatch) renderSavingsCard(savingsMatch[1].trim());
        if (planMatch) renderPlanRecommendation(planMatch[1].trim());

        closerConversationHistory.push({ role: 'user', content: userText });
        closerConversationHistory.push({ role: 'assistant', content: cleanText });
        if (closerConversationHistory.length > 16) closerConversationHistory = closerConversationHistory.slice(-16);
      } else {
        renderCloserMessage('ai', 'Justo ahora tengo un problema técnico para responderte 🙏. Mientras tanto, agenda directo tu <strong>diagnóstico gratuito</strong> y lo resolvemos ahí.', true);
      }
    } catch (err) {
      messagesEl.querySelectorAll('.temp-typing').forEach((el) => el.remove());
      renderCloserMessage('ai', 'No pude conectarme justo ahora 🙏. Prueba de nuevo en un momento, o agenda directo tu diagnóstico gratuito con el botón de abajo.', true);
    }
  }

  function openPanel() {
    panel.classList.add('open');
    launcher.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
    if (teaser) teaser.classList.remove('show');

    if (!closerHasOpened) {
      closerHasOpened = true;
      trackEvent('closer_chat_opened', {});
      renderCloserMessage('ai', '¡Hola! 👋 Soy el asistente de Esteban IA. Cuéntame, ¿qué tipo de negocio tienes o qué te gustaría automatizar con inteligencia artificial?', false);
      renderQuickReplies([
        { label: '🎯 ¿Qué plan me conviene?', text: 'Ayúdame a identificar qué plan me conviene para mi negocio' },
        { label: '💰 Ver precios de los planes', text: '¿Cuánto cuesta implementar un agente de IA?' },
        { label: '🤖 ¿Cómo funciona esto?', text: '¿Cómo funciona exactamente un agente de IA para mi negocio?' }
      ]);
    }
    setTimeout(() => input.focus(), 300);
  }

  function closePanel() {
    panel.classList.remove('open');
    launcher.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
  }

  launcher.addEventListener('click', () => {
    if (panel.classList.contains('open')) closePanel();
    else openPanel();
  });
  closeBtn.addEventListener('click', closePanel);

  if (ctaBookBtn) {
    ctaBookBtn.addEventListener('click', () => {
      trackEvent('closer_cta_clicked', { cta: 'agendar' });
      closePanel();
      const target = document.getElementById('reservar');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }
  if (ctaPlansBtn) {
    ctaPlansBtn.addEventListener('click', () => {
      trackEvent('closer_cta_clicked', { cta: 'planes' });
      closePanel();
      const target = document.getElementById('planes');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    sendCloserMessage(text);
  });

  // Teaser proactivo: aparece una sola vez por dispositivo, no en cada
  // visita -- para acompañar sin ser invasivo.
  if (teaser && !localStorage.getItem('closer-teaser-shown')) {
    setTimeout(() => {
      if (!closerHasOpened) {
        teaser.classList.add('show');
        localStorage.setItem('closer-teaser-shown', '1');
        setTimeout(() => teaser.classList.remove('show'), 8000);
      }
    }, 9000);
  }
}

