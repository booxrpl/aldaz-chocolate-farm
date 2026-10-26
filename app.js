// ============================================================================
// ALDAZ CHOCOLATE FARM - SISTEMA DE CONTROL EN COMPUTADORA
// #1 EMPLEADOS Y HORARIO (ROJO CLARO) + PREDICCIONES Y PATRONES DE MANO DE OBRA
// #2 REPORTE DE GASTOS (ROJO CLARO) + PREDICCIONES Y PATRONES DE GASTOS
// #3 ESTAD�STICAS DE COSECHA (AMARILLO CLARO) + PREDICCIONES Y PATRONES DE COSECHA
// #4 REPORTE DE VENTAS (VERDE CLARO: VENTAS + D�A/SEMANA/MES/A�O/5 A�OS) + PREDICCIONES Y PATRONES
// ============================================================================

const STORAGE_KEY = 'aldaz_chocolate_farm_data_v1';

let SECTORES = [
  'El Guineo',
  'La Fortuna',
  'El Guabo 1',
  'Guabo 2'
];

const DIAS_SEMANA = [
  { id: 'lunes', nombre: 'Lunes', offset: 0 },
  { id: 'martes', nombre: 'Martes', offset: 1 },
  { id: 'miercoles', nombre: 'Mi�rcoles', offset: 2 },
  { id: 'jueves', nombre: 'Jueves', offset: 3 },
  { id: 'viernes', nombre: 'Viernes', offset: 4 },
  { id: 'sabado', nombre: 'S�bado', offset: 5 }
];

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const NOMBRES_DIAS_DOM_SAB = [
  'Domingo', 'Lunes', 'Martes', 'Mi�rcoles', 'Jueves', 'Viernes', 'S�bado'
];

const HORAS_DIA_COMPLETO = 8;
const HORAS_MEDIO_DIA = 4;

let estadoFinca = {
  trabajadores: [
    { id: 'trab_1', nombre: 'Trabajador 1', tarifaDiaCompleto: 20.00, tarifaMedioDia: 10.00, telefono: '' },
    { id: 'trab_2', nombre: 'Trabajador 2', tarifaDiaCompleto: 20.00, tarifaMedioDia: 10.00, telefono: '' }
  ],
  sectores: [
    { id: 'sec_1', nombre: 'El Guineo' },
    { id: 'sec_2', nombre: 'La Fortuna' },
    { id: 'sec_3', nombre: 'El Guabo 1' },
    { id: 'sec_4', nombre: 'Guabo 2' }
  ],
  horarios: {},
  cosechas: [],
  ventas: [],
  gastos: [],
  anomaliasReconocidas: []
};

let semanaActualLunes = obtenerLunesDeFecha(new Date());
let trabajadorSeleccionadoId = '';
let modoReporteActual = 'DIARIO'; // 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL' | 'CINCO_ANIOS'

// Estado del precio actual del cacao en el mercado internacional (ICE Nueva York CC=F)
let precioMercadoCacaoActual = {
  precioTonelada: 5686.00,
  cierreAnterior: 5735.00,
  precioQuintal: 257.91,
  precioLibra: 2.58,
  cambioTonelada: -49.00,
  cambioPorcentaje: -0.85,
  enVivo: true,
  actualizado: ''
};

// ============================================================================
// INICIALIZACI�N Y GUARDADO AUTOM�TICO EN LA COMPUTADORA
// ============================================================================

window.addEventListener('DOMContentLoaded', async () => {
  await cargarDatosIniciales();

  const hoyISO = obtenerFechaHoyISO();
  if (document.getElementById('cosechaFecha')) document.getElementById('cosechaFecha').value = hoyISO;
  if (document.getElementById('ventaFecha')) document.getElementById('ventaFecha').value = hoyISO;
  if (document.getElementById('gastoFecha')) document.getElementById('gastoFecha').value = hoyISO;
  if (document.getElementById('weekDatePicker')) document.getElementById('weekDatePicker').value = semanaActualLunes;

  if (estadoFinca.trabajadores.length > 0) {
    trabajadorSeleccionadoId = estadoFinca.trabajadores[0].id;
  }

  actualizarSelectoresDeAnios();
  actualizarSelectoresDeSectores();
  cambiarModoReporte('DIARIO');
  renderizarTodo();

  // Iniciar sincronizaci�n continua entre dispositivos (computadora, celulares, tablets)
  consultarInfoRed();
  iniciarSincronizacionEntreDispositivos();

  // Consultar el precio internacional del cacao en vivo al abrir y cada 5 minutos
  actualizarPrecioMercadoCacao(false);
  setInterval(() => actualizarPrecioMercadoCacao(false), 5 * 60 * 1000);
});

async function actualizarPrecioMercadoCacao(mostrarAvisoManual) {
  const estadoBadge = document.getElementById('estadoPrecioMercadoBadge');
  if (mostrarAvisoManual && estadoBadge) {
    estadoBadge.textContent = '? Consultando mercado internacional en vivo...';
  }

  try {
    const resp = await fetch('/api/precio-cacao');
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.ok && data.precioTonelada > 0) {
        precioMercadoCacaoActual = {
          precioTonelada: Number(data.precioTonelada),
          cierreAnterior: Number(data.cierreAnterior || data.precioTonelada),
          precioQuintal: Number(data.precioQuintal),
          precioLibra: Number(data.precioLibra),
          cambioTonelada: Number(data.cambioTonelada || 0),
          cambioPorcentaje: Number(data.cambioPorcentaje || 0),
          enVivo: Boolean(data.enVivo),
          actualizado: data.actualizado || new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
        };
      }
    }
  } catch (e) {
    // Mantiene el �ltimo precio conocido si no hay conexi�n moment�nea
  }

  renderizarPrecioMercadoEnTitulo();
}

function renderizarPrecioMercadoEnTitulo() {
  const tonStr = formatoDinero(precioMercadoCacaoActual.precioTonelada);
  const qqStr = formatoDinero(precioMercadoCacaoActual.precioQuintal);
  const lbStr = formatoDinero(precioMercadoCacaoActual.precioLibra);

  // Actualizar t�tulo de la pesta�a del navegador y el encabezado principal
  document.title = `ALDAZ CHOCOLATE FARM � Precio Mercado Cacao: ${tonStr}/Ton (${qqStr}/qq)`;

  const elTitTon = document.getElementById('tituloPrecioTonelada');
  const elTitQQ = document.getElementById('tituloPrecioQuintal');
  if (elTitTon) elTitTon.textContent = `${tonStr} / Ton`;
  if (elTitQQ) elTitQQ.textContent = `${qqStr} / qq`;

  const elValTon = document.getElementById('valorPrecioToneladaHeader');
  const elValQQ = document.getElementById('valorPrecioQuintalHeader');
  if (elValTon) elValTon.textContent = `${tonStr} USD / Tonelada`;
  if (elValQQ) elValQQ.textContent = `${qqStr} USD / Quintal (100 lb)`;

  const signoCambio = precioMercadoCacaoActual.cambioTonelada >= 0 ? '+' : '';
  const textoCambio = precioMercadoCacaoActual.cambioTonelada !== 0
    ? ` (${signoCambio}${formatoDinero(precioMercadoCacaoActual.cambioTonelada)} / ${signoCambio}${precioMercadoCacaoActual.cambioPorcentaje}%)`
    : '';

  const elEstado = document.getElementById('estadoPrecioMercadoBadge');
  if (elEstado) {
    elEstado.textContent = precioMercadoCacaoActual.enVivo
      ? `?? Precio Internacional Cacao en Vivo (ICE CC=F)`
      : `?? Precio Internacional Cacao de Referencia (ICE CC=F)`;
  }

  const elSub = document.getElementById('subtextoPrecioMercadoHeader');
  if (elSub) {
    const horaTxt = precioMercadoCacaoActual.actualizado ? `Actualizado: ${precioMercadoCacaoActual.actualizado}` : 'Actualizado al d�a';
    elSub.textContent = `Equivalente: ${lbStr} / lb${textoCambio} � ${horaTxt}`;
  }

  const elHelperVenta = document.getElementById('helperPrecioMercadoVenta');
  if (elHelperVenta) {
    elHelperVenta.textContent = `Precio de mercado hoy: ${qqStr} USD / qq (${tonStr} / Tonelada � ${lbStr} / lb)`;
  }
}

let ultimaSincronizacionServidor = 0;
let timestampUltimaModificacionLocal = 0;
let sincronizandoAhora = false;
let infoRedServidor = null;
let cambiosPendientesDeSincronizar = false;

function actualizarEstadoGuardadoBadge(estado, horaPersonalizada = '') {
  const badge = document.getElementById('saveStatusBadge');
  const badgeModal = document.getElementById('badgeEstadoDispositivoActual');
  const hora = horaPersonalizada || new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

  if (estado === 'guardando') {
    if (badge) badge.innerHTML = '<span>? Guardando en este Dispositivo y en la Finca...</span>';
  } else if (estado === 'sincronizado') {
    if (badge) badge.innerHTML = `<span>? Guardado en este Dispositivo y Finca (${hora})</span>`;
    if (badgeModal) {
      badgeModal.style.background = '#dcfce7';
      badgeModal.style.color = '#15803d';
      badgeModal.style.borderColor = '#86efac';
      badgeModal.textContent = `? Sincronizado en este Dispositivo (${hora})`;
    }
  } else if (estado === 'offline') {
    if (badge) badge.innerHTML = `<span>?? Guardado Localmente en este Dispositivo (${hora})</span>`;
    if (badgeModal) {
      badgeModal.style.background = '#fef3c7';
      badgeModal.style.color = '#92400e';
      badgeModal.style.borderColor = '#f59e0b';
      badgeModal.textContent = `?? Guardado Local (Sin conexi�n moment�nea con el servidor central)`;
    }
  }
}

async function cargarDatosIniciales() {
  // 1. CARGA INMEDIATA DESDE EL ALMACENAMIENTO LOCAL DE ESTE DISPOSITIVO (Offline-First)
  const localRaw = localStorage.getItem(STORAGE_KEY);
  if (localRaw) {
    try {
      const parsed = JSON.parse(localRaw);
      if (parsed && parsed.trabajadores) {
        estadoFinca = parsed;
        actualizarEstadoGuardadoBadge('offline');
      }
    } catch (e) {
      console.error('Error leyendo almacenamiento local del dispositivo:', e);
    }
  }

  // 2. SINCRONIZACI�N CON EL SERVIDOR CENTRAL DE LA FINCA
  try {
    const resp = await fetch('/api/datos?t=' + Date.now(), { cache: 'no-store' });
    if (resp.ok) {
      const dataDisco = await resp.json();
      if (dataDisco && !dataDisco.empty && dataDisco.trabajadores) {
        // Guardar la copia completa en el almacenamiento local de este dispositivo
        estadoFinca = dataDisco;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(estadoFinca));
        actualizarEstadoGuardadoBadge('sincronizado');
      } else {
        await guardarDatos();
      }
    }
  } catch (e) {
    // Si no hay conexi�n moment�nea con el servidor central, se mantiene con la copia local de este dispositivo
    actualizarEstadoGuardadoBadge('offline');
  }

  // Validar estructuras m�nimas
  if (!Array.isArray(estadoFinca.cosechas)) estadoFinca.cosechas = [];
  if (!Array.isArray(estadoFinca.ventas)) estadoFinca.ventas = [];
  if (!Array.isArray(estadoFinca.gastos)) estadoFinca.gastos = [];
  if (!Array.isArray(estadoFinca.anomaliasReconocidas)) estadoFinca.anomaliasReconocidas = [];
  if (!Array.isArray(estadoFinca.sectores) || estadoFinca.sectores.length === 0) {
    estadoFinca.sectores = [
      { id: 'sec_1', nombre: 'El Guineo' },
      { id: 'sec_2', nombre: 'La Fortuna' },
      { id: 'sec_3', nombre: 'El Guabo 1' },
      { id: 'sec_4', nombre: 'Guabo 2' }
    ];
  }
  SECTORES = estadoFinca.sectores.map(s => s.nombre);
}

async function guardarDatos() {
  const ahora = new Date().toISOString();
  estadoFinca.ultimaModificacion = ahora;
  estadoFinca.version = (estadoFinca.version || 0) + 1;

  // Guardar SIEMPRE inmediatamente en la memoria de este dispositivo (tel�fono, tablet o PC)
  const jsonStr = JSON.stringify(estadoFinca, null, 2);
  localStorage.setItem(STORAGE_KEY, jsonStr);
  actualizarEstadoGuardadoBadge('guardando');

  // Enviar al servidor central de la finca
  try {
    const resp = await fetch('/api/datos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonStr
    });
    if (resp.ok) {
      cambiosPendientesDeSincronizar = false;
      actualizarEstadoGuardadoBadge('sincronizado');
      return;
    }
  } catch (e) {
    cambiosPendientesDeSincronizar = true;
  }

  // Si fall� el env�o (ej. sin Wi-Fi en el campo), el registro ya est� 100% seguro en este dispositivo
  actualizarEstadoGuardadoBadge('offline');
}

async function sincronizarDatosConServidor(forzar = false) {
  if (sincronizandoAhora) return;
  sincronizandoAhora = true;

  try {
    const resp = await fetch('/api/datos?t=' + Date.now(), { cache: 'no-store' });
    if (resp.ok) {
      const dataServidor = await resp.json();
      if (dataServidor && !dataServidor.empty && dataServidor.trabajadores) {
        const timeServidor = dataServidor.ultimaModificacion ? new Date(dataServidor.ultimaModificacion).getTime() : 0;
        const timeLocal = estadoFinca.ultimaModificacion ? new Date(estadoFinca.ultimaModificacion).getTime() : 0;

        if (forzar || timeServidor > timeLocal || (timeServidor === 0 && JSON.stringify(dataServidor) !== JSON.stringify(estadoFinca))) {
          estadoFinca = dataServidor;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(estadoFinca));
          if (Array.isArray(estadoFinca.sectores)) {
            SECTORES = estadoFinca.sectores.map(s => s.nombre);
          }
          actualizarEstadoGuardadoBadge('sincronizado');
          renderizarTodoSilencioso();
        } else if (cambiosPendientesDeSincronizar && timeLocal > timeServidor) {
          await guardarDatos();
        } else {
          actualizarEstadoGuardadoBadge('sincronizado');
        }
      }
    } else {
      actualizarEstadoGuardadoBadge('offline');
    }
  } catch (e) {
    actualizarEstadoGuardadoBadge('offline');
  } finally {
    sincronizandoAhora = false;
  }
}

function renderizarTodoSilencioso() {
  const elemActivo = document.activeElement;
  const usuarioEscribiendo = elemActivo && (elemActivo.tagName === 'INPUT' || elemActivo.tagName === 'TEXTAREA' || elemActivo.tagName === 'SELECT');

  if (!usuarioEscribiendo) {
    renderizarTodo();
  } else {
    // Si el usuario est� escribiendo un dato en un formulario, actualizamos tablas y res�menes sin quitarle el foco
    renderizarPrecioMercadoEnTitulo();
    renderizarTablaTrabajadores();
    renderizarEstadisticasCosecha();
  }
}

function iniciarSincronizacionEntreDispositivos() {
  // 1. Sincronizar en segundo plano cada 4 segundos
  setInterval(() => {
    sincronizarDatosConServidor(false);
  }, 4000);

  // 2. Sincronizar cuando el usuario vuelve a ver la pesta�a o la pantalla del celular se desbloquea
  window.addEventListener('focus', () => sincronizarDatosConServidor(true));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sincronizarDatosConServidor(true);
  });

  // 3. Sincronizar cuando el dispositivo recupera la conexi�n a internet/Wi-Fi
  window.addEventListener('online', () => {
    mostrarNotificacionFlotante('?? Conexi�n restablecida: Sincronizando registros...');
    sincronizarDatosConServidor(true);
  });
}

async function consultarInfoRed() {
  try {
    const resp = await fetch('/api/info-red?t=' + Date.now());
    if (resp.ok) {
      infoRedServidor = await resp.json();
      actualizarVisualizacionInfoRed();
    }
  } catch (e) {
    // Modo offline
  }
}

function actualizarVisualizacionInfoRed() {
  if (!infoRedServidor || !infoRedServidor.urlRed) return;
  const inputUrl = document.getElementById('inputUrlCelularSincronizacion');
  const imgQr = document.getElementById('imgQrConexionCelular');

  if (inputUrl) {
    inputUrl.value = infoRedServidor.urlRed;
  }
  if (imgQr) {
    imgQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(infoRedServidor.urlRed)}`;
  }
}

function abrirModalSincronizacionDispositivos() {
  consultarInfoRed();
  const modal = document.getElementById('modalSincronizacionDispositivos');
  if (modal) {
    modal.style.display = 'flex';
  }

  // Actualizar conteo de registros guardados en este dispositivo
  const contResumen = document.getElementById('resumenRegistrosDispositivo');
  if (contResumen) {
    const numTrab = (estadoFinca.trabajadores || []).length;
    const numCos = (estadoFinca.cosechas || []).length;
    const numSec = (estadoFinca.sectores || []).length;

    contResumen.innerHTML = `
      <span style="background:#fff; border:1px solid #86efac; padding:6px 10px; border-radius:6px;">?? ${numTrab} Trabajadores</span>
      <span style="background:#fff; border:1px solid #86efac; padding:6px 10px; border-radius:6px;">?? ${numSec} Sectores</span>
      <span style="background:#fff; border:1px solid #86efac; padding:6px 10px; border-radius:6px;">?? ${numCos} Cosechas</span>
    `;
  }
}

function cerrarModalSincronizacionDispositivos() {
  const modal = document.getElementById('modalSincronizacionDispositivos');
  if (modal) modal.style.display = 'none';
}

function copiarUrlCelular() {
  const input = document.getElementById('inputUrlCelularSincronizacion');
  if (!input) return;

  input.select();
  input.setSelectionRange(0, 99999);
  try {
    navigator.clipboard.writeText(input.value);
    mostrarNotificacionFlotante('?? �Enlace copiado! �brelo en Safari o Chrome en tu tel�fono celular.');
  } catch (e) {
    mostrarNotificacionFlotante('Direcci�n seleccionada. C�piala y �brela en tu celular: ' + input.value);
  }
}

function descargarRespaldoJSON() {
  const jsonStr = JSON.stringify(estadoFinca, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fechaHoy = obtenerFechaHoyISO();
  a.href = url;
  a.download = `respaldo_aldaz_finca_${fechaHoy}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  mostrarNotificacionFlotante('?? Copia de respaldo descargada en la memoria de este dispositivo.');
}

function cargarRespaldoDesdeArchivo(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data && data.trabajadores && Array.isArray(data.trabajadores)) {
        if (confirm(`�Deseas restaurar este archivo de respaldo en este dispositivo y en el servidor central? Se actualizar�n ${data.trabajadores.length} trabajadores, ${(data.cosechas||[]).length} cosechas y ${(data.ventas||[]).length} ventas.`)) {
          estadoFinca = data;
          await guardarDatos();
          renderizarTodo();
          mostrarNotificacionFlotante('? Todos los registros fueron restaurados y sincronizados en todos los dispositivos.');
          cerrarModalSincronizacionDispositivos();
        }
      } else {
        alert('El archivo no tiene el formato de ALDAZ CHOCOLATE FARM.');
      }
    } catch (err) {
      alert('Error al leer el archivo JSON: ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file, 'utf-8');
}

async function forzarSincronizacionManual() {
  mostrarNotificacionFlotante('?? Sincronizando con todos los dispositivos...');
  await sincronizarDatosConServidor(true);
  mostrarNotificacionFlotante('? �Sincronizaci�n completa! Todos los registros est�n actualizados.');
}

function mostrarNotificacionFlotante(mensaje) {
  let toast = document.getElementById('toastNotificacionFlotante');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotificacionFlotante';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.backgroundColor = '#15803d';
    toast.style.color = '#ffffff';
    toast.style.padding = '14px 22px';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.25)';
    toast.style.fontSize = '18px';
    toast.style.fontWeight = '800';
    toast.style.zIndex = '999999';
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.border = '2px solid #86efac';
    document.body.appendChild(toast);
  }

  toast.textContent = mensaje;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  clearTimeout(toast.timerToast);
  toast.timerToast = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => { toast.style.display = 'none'; }, 350);
  }, 3500);
}

// ============================================================================
// NAVEGACI�N ENTRE LAS 2 PESTA�AS PRINCIPALES
// ============================================================================

function cambiarPestana(nombrePestana) {
  const pestanas = ['horario', 'cosecha'];
  pestanas.forEach(p => {
    const panel = document.getElementById(`panel-${p}`);
    const btn = document.getElementById(`tabBtn-${p}`);
    if (panel) panel.classList.toggle('active', p === nombrePestana);
    if (btn) btn.classList.toggle('active', p === nombrePestana);
  });

  actualizarSelectoresDeAnios();
  renderizarTodo();
}

function renderizarTodo() {
  renderizarPrecioMercadoEnTitulo();
  renderizarSelectorTrabajadores();
  renderizarHojaHorario();
  renderizarTablaTrabajadores();
  actualizarSelectoresDeSectores();
  renderizarHistorialPlanillas();
  renderizarEstadisticasCosecha();
}

function irASeccionTarifasEmpleados() {
  const seccion = document.getElementById('seccionListaTrabajadores');
  if (seccion) {
    seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const inputNombre = document.getElementById('nuevoTrabNombre');
    if (inputNombre) setTimeout(() => inputNombre.focus(), 400);
  }
}

function irASeccionSectores() {}
function renderizarTablaGestionSectores() {}
function actualizarVistaPreviaRepartoGasto() {}

function obtenerSectores() {
  return SECTORES.map((s, idx) => ({ id: 'sec_' + (idx + 1), nombre: s }));
}

function obtenerSectoresConPorcentajes() {
  return SECTORES.map((s, idx) => ({ id: 'sec_' + (idx + 1), nombre: s, acres: 0, porcentaje: 25, porcentajeTexto: '25%' }));
}

function actualizarSelectoresDeSectores() {
  // 1. Selector de Cosecha (Pesta�a 2)
  const selCos = document.getElementById('cosechaSector');
  if (selCos) {
    const prev = selCos.value;
    selCos.innerHTML = SECTORES.map(s => `<option value="${s}">?? ${s}</option>`).join('');
    if (prev && SECTORES.includes(prev)) selCos.value = prev;
  }

  // 2. Filtro Historial Cosecha (Pesta�a 2)
  const selFiltroCos = document.getElementById('filtroSectorHistorialCosecha');
  if (selFiltroCos) {
    const prev = selFiltroCos.value || 'TODOS';
    selFiltroCos.innerHTML = `
      <option value="TODOS">Todos los Sectores</option>
      ${SECTORES.map(s => `<option value="${s}">?? ${s}</option>`).join('')}
    `;
    if (prev === 'TODOS' || SECTORES.includes(prev)) selFiltroCos.value = prev;
  }
}

// ============================================================================
// UTILIDADES DE FECHAS NUM�RICAS Y FORMATO DE DINERO
// ============================================================================

function obtenerFechaHoyISO() {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sumarDiasAFechaISO(fechaISO, diasASumar) {
  const d = new Date(fechaISO + 'T12:00:00');
  d.setDate(d.getDate() + diasASumar);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

function obtenerLunesDeFecha(fechaInput) {
  const d = typeof fechaInput === 'string' ? new Date(fechaInput + 'T12:00:00') : new Date(fechaInput);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

function formatearFechaCorta(fechaISO) {
  if (!fechaISO) return '';
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatearRangoSemanaNumerico(lunesISO) {
  const sabadoISO = sumarDiasAFechaISO(lunesISO, 5);
  return `${formatearFechaCorta(lunesISO)} - ${formatearFechaCorta(sabadoISO)}`;
}

function formatearFechaConDiaEspanol(fechaISO) {
  if (!fechaISO) return '';
  const d = new Date(fechaISO + 'T12:00:00');
  const nombreDia = NOMBRES_DIAS_DOM_SAB[d.getDay()];
  return `${nombreDia} (${formatearFechaCorta(fechaISO)})`;
}

function formatoDinero(valor) {
  const num = Number(valor) || 0;
  const signo = num < 0 ? '-' : '';
  return signo + '$' + Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatoPeso(totalQuintales) {
  const qq = Number(totalQuintales) || 0;
  const totalLibras = Math.round(qq * 100);
  return `${qq.toFixed(2)} qq (${totalLibras.toLocaleString('en-US')} lb)`;
}

// ============================================================================
// PESTA�A #1: EMPLEADOS, HORARIO SEMANAL, TARIFAS E HISTORIAL
// ============================================================================

let viendoHojaDeHistorial = false;

function alCambiarFechaSemana(valorFecha) {
  if (!valorFecha) return;
  semanaActualLunes = obtenerLunesDeFecha(valorFecha);
  viendoHojaDeHistorial = (semanaActualLunes !== obtenerLunesDeFecha(new Date()));
  document.getElementById('weekDatePicker').value = semanaActualLunes;
  renderizarHojaHorario();
  renderizarHistorialPlanillas();
}

function cambiarSemana(deltaSemanas) {
  const fecha = new Date(semanaActualLunes + 'T12:00:00');
  fecha.setDate(fecha.getDate() + deltaSemanas * 7);
  semanaActualLunes = obtenerLunesDeFecha(fecha);
  viendoHojaDeHistorial = (semanaActualLunes !== obtenerLunesDeFecha(new Date()));
  document.getElementById('weekDatePicker').value = semanaActualLunes;
  renderizarHojaHorario();
  renderizarHistorialPlanillas();
}

function irASemanaActual() {
  restablecerHojaPorDefecto();
}

function restablecerHojaPorDefecto() {
  semanaActualLunes = obtenerLunesDeFecha(new Date());
  viendoHojaDeHistorial = false;
  if (estadoFinca.trabajadores.length > 0) {
    trabajadorSeleccionadoId = estadoFinca.trabajadores[0].id;
  }
  if (document.getElementById('weekDatePicker')) {
    document.getElementById('weekDatePicker').value = semanaActualLunes;
  }
  if (document.getElementById('selectTrabajadorHorario')) {
    document.getElementById('selectTrabajadorHorario').value = trabajadorSeleccionadoId;
  }
  renderizarHojaHorario();
  renderizarHistorialPlanillas();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderizarSelectorTrabajadores() {
  const selectHorario = document.getElementById('selectTrabajadorHorario');
  const selectFiltroHist = document.getElementById('filtroHistTrabajador');

  if (selectHorario) {
    selectHorario.innerHTML = '';
    if (estadoFinca.trabajadores.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '-- Agrega un trabajador abajo primero --';
      selectHorario.appendChild(opt);
      trabajadorSeleccionadoId = '';
    } else {
      if (!trabajadorSeleccionadoId || !estadoFinca.trabajadores.some(t => t.id === trabajadorSeleccionadoId)) {
        trabajadorSeleccionadoId = estadoFinca.trabajadores[0].id;
      }
      estadoFinca.trabajadores.forEach(trab => {
        const opt = document.createElement('option');
        opt.value = trab.id;
        opt.textContent = trab.nombre;
        if (trab.id === trabajadorSeleccionadoId) opt.selected = true;
        selectHorario.appendChild(opt);
      });
    }
  }

  if (selectFiltroHist) {
    const valPrevio = selectFiltroHist.value || 'TODOS';
    selectFiltroHist.innerHTML = '<option value="TODOS">Todos los Trabajadores</option>';
    estadoFinca.trabajadores.forEach(trab => {
      const opt = document.createElement('option');
      opt.value = trab.id;
      opt.textContent = trab.nombre;
      selectFiltroHist.appendChild(opt);
    });
    if (valPrevio === 'TODOS' || estadoFinca.trabajadores.some(t => t.id === valPrevio)) {
      selectFiltroHist.value = valPrevio;
    }
  }
}

function cambiarTrabajadorHorario() {
  const select = document.getElementById('selectTrabajadorHorario');
  trabajadorSeleccionadoId = select.value;
  renderizarHojaHorario();
}

function obtenerOCrearRegistroHorario(semanaLunes, trabajadorId) {
  const clave = `${semanaLunes}__${trabajadorId}`;
  if (!estadoFinca.horarios[clave]) {
    const turnosIniciales = {};
    SECTORES.forEach(sector => {
      turnosIniciales[sector] = {
        lunes: 'NONE',
        martes: 'NONE',
        miercoles: 'NONE',
        jueves: 'NONE',
        viernes: 'NONE',
        sabado: 'NONE'
      };
    });
    estadoFinca.horarios[clave] = {
      semanaLunes,
      trabajadorId,
      turnos: turnosIniciales,
      comentarios: '',
      enviado: false,
      fechaEnvio: ''
    };
  }

  // Asegurar que cada sector existente tenga su fila de turnos inicializada
  const reg = estadoFinca.horarios[clave];
  if (!reg.turnos) reg.turnos = {};
  SECTORES.forEach(sector => {
    if (!reg.turnos[sector]) {
      reg.turnos[sector] = {
        lunes: 'NONE',
        martes: 'NONE',
        miercoles: 'NONE',
        jueves: 'NONE',
        viernes: 'NONE',
        sabado: 'NONE'
      };
    }
  });

  return reg;
}

function renderizarHojaHorario() {
  document.getElementById('textoRangoSemana').textContent = formatearRangoSemanaNumerico(semanaActualLunes);

  const container = document.getElementById('lotsGridContainer');
  if (!trabajadorSeleccionadoId) {
    container.innerHTML = '<p style="font-size:22px; padding:20px;">Por favor agrega un trabajador en la lista de abajo para comenzar.</p>';
    return;
  }

  const trabajador = estadoFinca.trabajadores.find(t => t.id === trabajadorSeleccionadoId);
  if (trabajador) {
    document.getElementById('infoTarifaTrabajador').textContent =
      `Tarifa de ${trabajador.nombre}: D�a Completo ${formatoDinero(trabajador.tarifaDiaCompleto)} | Medio D�a ${formatoDinero(trabajador.tarifaMedioDia)}`;
  }

  const avisoEl = document.getElementById('avisoHojaHistorialAbierta');
  const textoAvisoEl = document.getElementById('textoAvisoHojaHistorial');
  const lunesSemanaHoy = obtenerLunesDeFecha(new Date());
  if (avisoEl) {
    if (viendoHojaDeHistorial || semanaActualLunes !== lunesSemanaHoy) {
      avisoEl.style.display = 'flex';
      if (textoAvisoEl) {
        textoAvisoEl.textContent = `?? Planilla Abierta: ${trabajador ? trabajador.nombre : ''} (${formatearRangoSemanaNumerico(semanaActualLunes)})`;
      }
    } else {
      avisoEl.style.display = 'none';
    }
  }

  const registro = obtenerOCrearRegistroHorario(semanaActualLunes, trabajadorSeleccionadoId);

  let html = '';
  SECTORES.forEach(sector => {
    const turnosSector = registro.turnos[sector] || {};

    html += `
      <table class="lot-table">
        <thead>
          <tr>
            <th class="lot-name-header">?? ${sector}</th>
            <th class="lot-question-header">Medio dia/ dia<br/>completo?</th>
          </tr>
        </thead>
        <tbody>
    `;

    DIAS_SEMANA.forEach(dia => {
      const estadoActual = turnosSector[dia.id] || 'NONE';
      const fechaDiaNumerica = formatearFechaCorta(sumarDiasAFechaISO(semanaActualLunes, dia.offset));
      const textoImpresion =
        estadoActual === 'FULL' ? '? D�a Completo' :
        estadoActual === 'HALF' ? '� Medio D�a' : '';

      html += `
        <tr>
          <td class="day-name-cell">
            ${dia.nombre}
            <span class="day-numeric-date">${fechaDiaNumerica}</span>
          </td>
          <td>
            <div class="shift-selector">
              <button type="button"
                class="shift-btn ${estadoActual === 'NONE' ? 'active-none' : ''}"
                onclick="marcarTurno('${sector}', '${dia.id}', 'NONE')">
                No
              </button>
              <button type="button"
                class="shift-btn ${estadoActual === 'HALF' ? 'active-half' : ''}"
                onclick="marcarTurno('${sector}', '${dia.id}', 'HALF')">
                � Medio d�a
              </button>
              <button type="button"
                class="shift-btn ${estadoActual === 'FULL' ? 'active-full' : ''}"
                onclick="marcarTurno('${sector}', '${dia.id}', 'FULL')">
                ? D�a completo
              </button>
            </div>
            <span class="print-only-value">${textoImpresion}</span>
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;
  });

  container.innerHTML = html;

  document.getElementById('inputComentariosHorario').value = registro.comentarios || '';

  const estadoEnvioEl = document.getElementById('estadoEnvioActualTexto');
  const fueEnviado = registro.enviado || registro.firmado;
  const fechaGuardada = registro.fechaEnvio || registro.fechaFirma || '';
  if (fueEnviado) {
    estadoEnvioEl.innerHTML = `<span style="color:#15803d; font-weight:800;">? Planilla ENVIADA al historial y sumada en el Reporte de Gastos ${fechaGuardada ? '(' + fechaGuardada + ')' : ''}</span>`;
  } else {
    estadoEnvioEl.innerHTML = `Presiona el bot�n verde para guardar esta planilla y transferir el pago al Reporte de Gastos.`;
  }

  const calculo = calcularTotalesRegistroHorario(registro, trabajador);
  document.getElementById('resumenDiasCompletos').textContent = calculo.diasCompletos;
  document.getElementById('resumenMediosDias').textContent = calculo.mediosDias;
  document.getElementById('resumenHorasSemana').textContent = `${calculo.totalHoras} horas`;
  document.getElementById('resumenPagoSemana').textContent = formatoDinero(calculo.totalPagar);
}

function marcarTurno(sector, diaId, nuevoEstado) {
  if (!trabajadorSeleccionadoId) return;
  const registro = obtenerOCrearRegistroHorario(semanaActualLunes, trabajadorSeleccionadoId);
  if (!registro.turnos[sector]) {
    registro.turnos[sector] = {};
  }
  registro.turnos[sector][diaId] = nuevoEstado;

  guardarDatos();
  renderizarTodo();
}

function guardarNotasHorario() {
  if (!trabajadorSeleccionadoId) return;
  const registro = obtenerOCrearRegistroHorario(semanaActualLunes, trabajadorSeleccionadoId);
  registro.comentarios = document.getElementById('inputComentariosHorario').value;

  guardarDatos();
  renderizarHistorialPlanillas();
}

function enviarPlanillaAlHistorial() {
  if (!trabajadorSeleccionadoId) return;
  const registro = obtenerOCrearRegistroHorario(semanaActualLunes, trabajadorSeleccionadoId);
  const fechaHoyCorta = formatearFechaCorta(obtenerFechaHoyISO());

  registro.comentarios = document.getElementById('inputComentariosHorario').value.trim();
  registro.enviado = true;
  registro.fechaEnvio = fechaHoyCorta;

  guardarDatos();
  actualizarSelectoresDeAnios();
  renderizarTodo();

  const seccionHistorial = document.getElementById('seccionHistorialPlanillas');
  if (seccionHistorial) {
    seccionHistorial.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function calcularTotalesRegistroHorario(registro, trabajador) {
  let diasCompletos = 0;
  let mediosDias = 0;
  const porSector = {};

  SECTORES.forEach(sector => {
    porSector[sector] = { full: 0, half: 0, equivalenteDias: 0, costo: 0 };
    const turnosSector = (registro && registro.turnos && registro.turnos[sector]) || {};
    DIAS_SEMANA.forEach(dia => {
      const val = turnosSector[dia.id] || 'NONE';
      if (val === 'FULL') {
        diasCompletos += 1;
        porSector[sector].full += 1;
      } else if (val === 'HALF') {
        mediosDias += 1;
        porSector[sector].half += 1;
      }
    });
    porSector[sector].equivalenteDias = porSector[sector].full + (porSector[sector].half * 0.5);
    if (trabajador) {
      porSector[sector].costo =
        (porSector[sector].full * Number(trabajador.tarifaDiaCompleto || 0)) +
        (porSector[sector].half * Number(trabajador.tarifaMedioDia || 0));
    }
  });

  const totalHoras = (diasCompletos * HORAS_DIA_COMPLETO) + (mediosDias * HORAS_MEDIO_DIA);
  const tarifaFull = trabajador ? Number(trabajador.tarifaDiaCompleto || 0) : 0;
  const tarifaHalf = trabajador ? Number(trabajador.tarifaMedioDia || 0) : 0;
  const totalPagar = (diasCompletos * tarifaFull) + (mediosDias * tarifaHalf);

  return {
    diasCompletos,
    mediosDias,
    totalHoras,
    totalPagar,
    porSector
  };
}

let hojasAnterioresExpandidas = false;

function alternarExpandirHojasAnteriores() {
  hojasAnterioresExpandidas = !hojasAnterioresExpandidas;
  renderizarHistorialPlanillas();
}

function limpiarFiltrosHistorialPlanillas() {
  document.getElementById('filtroHistTrabajador').value = 'TODOS';
  document.getElementById('filtroHistAnio').value = 'TODOS';
  document.getElementById('filtroHistFecha').value = '';
  renderizarHistorialPlanillas();
}

function crearFilaPlanillaHTML(reg, trab, calc) {
  const formatearCeldaSector = (sec) => {
    const info = calc.porSector[sec];
    if (!info || (info.full === 0 && info.half === 0)) return '<span style="color:#999;">�</span>';
    const partes = [];
    if (info.full > 0) partes.push(`${info.full} D�a(s)`);
    if (info.half > 0) partes.push(`${info.half} Medio(s)`);
    return `<b>${partes.join(' + ')}</b>`;
  };

  const fueEnviado = reg.enviado || reg.firmado;
  const fechaGuardada = reg.fechaEnvio || reg.fechaFirma || '';
  const badgeEstado = fueEnviado
    ? `<span style="background:#dcfce7; color:#14532d; padding:4px 10px; border-radius:6px; font-weight:800; display:inline-block; margin-bottom:4px;">? Enviada ${fechaGuardada ? '(' + fechaGuardada + ')' : ''}</span>`
    : '<span style="color:#92400e; font-weight:700;">En edici�n</span>';

  const textoComentarios = reg.comentarios ? `<div style="font-size:17px; color:#444;">${reg.comentarios}</div>` : '';

  const tr = document.createElement('tr');
  if (reg.semanaLunes === semanaActualLunes && reg.trabajadorId === trabajadorSeleccionadoId) {
    tr.style.backgroundColor = '#fef3c7';
  }

  const celdasSectores = SECTORES.map(sec => `<td>${formatearCeldaSector(sec)}</td>`).join('');

  tr.innerHTML = `
    <td><b style="font-size:21px;">${formatearRangoSemanaNumerico(reg.semanaLunes)}</b></td>
    <td><b style="font-size:21px; color:#3b1c0e;">${trab ? trab.nombre : 'Trabajador'}</b></td>
    ${celdasSectores}
    <td><b>${calc.totalHoras} hrs</b></td>
    <td style="color:#14532d; font-weight:900; font-size:22px;">${formatoDinero(calc.totalPagar)}</td>
    <td>${badgeEstado}${textoComentarios}</td>
    <td>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button class="btn btn-secondary" style="padding:8px 12px; font-size:16px;"
          onclick="abrirPlanillaGuardada('${reg.semanaLunes}', '${reg.trabajadorId}')">
          ?? Abrir
        </button>
        <button class="btn btn-danger" style="padding:8px 12px; font-size:16px;"
          onclick="solicitarEliminarPlanilla('${reg.semanaLunes}', '${reg.trabajadorId}')">
          Borrar
        </button>
      </div>
    </td>
  `;
  return tr;
}

function renderizarHistorialPlanillas() {
  const tbodyActual = document.getElementById('tablaPlanillasSemanaActualBody');
  const tbodyAnteriores = document.getElementById('tablaHistorialPlanillasBody');
  if (!tbodyAnteriores) return;

  const theadAct = document.getElementById('encabezadoTablaPlanillasSemanaActual');
  const theadHist = document.getElementById('encabezadoTablaHistorialPlanillas');
  const thSectores = SECTORES.map(sec => `<th>${sec}</th>`).join('');

  if (theadAct) {
    theadAct.innerHTML = `<tr><th>Semana Actual</th><th>Trabajador</th>${thSectores}<th>Total Horas</th><th>Total Pagado ($)</th><th>Estado / Comentarios</th><th>Acciones</th></tr>`;
  }
  if (theadHist) {
    theadHist.innerHTML = `<tr><th>Fechas (Lunes - S�bado)</th><th>Trabajador</th>${thSectores}<th>Total Horas</th><th>Total Pagado ($)</th><th>Estado / Comentarios</th><th>Acciones</th></tr>`;
  }

  const pieAct = document.getElementById('pieCeldaTotalSemanaActual');
  if (pieAct) {
    pieAct.colSpan = 2 + SECTORES.length;
  }
  const pieHist = document.getElementById('textoPieHistorialPlanillas');
  if (pieHist) {
    pieHist.colSpan = 2 + SECTORES.length;
  }

  const lunesSemanaPorDefecto = obtenerLunesDeFecha(new Date());
  const tituloSemActualEl = document.getElementById('tituloSemanaActualTabla');
  if (tituloSemActualEl) {
    tituloSemActualEl.textContent = formatearRangoSemanaNumerico(lunesSemanaPorDefecto);
  }

  // Asegurar que existan los horarios de la semana actual por defecto y de la semana abierta
  estadoFinca.trabajadores.forEach(trab => {
    obtenerOCrearRegistroHorario(lunesSemanaPorDefecto, trab.id);
    obtenerOCrearRegistroHorario(semanaActualLunes, trab.id);
  });

  // 1. RENDERIZAR SIEMPRE LAS PLANILLAS DE LA SEMANA ACTUAL DE TODOS LOS EMPLEADOS
  if (tbodyActual) {
    tbodyActual.innerHTML = '';
    let sumaHorasActual = 0;
    let sumaPagoActual = 0;

    const registrosSemanaActual = Object.values(estadoFinca.horarios)
      .filter(reg => reg.semanaLunes === lunesSemanaPorDefecto)
      .filter(reg => estadoFinca.trabajadores.some(t => t.id === reg.trabajadorId))
      .sort((a, b) => {
        const tA = estadoFinca.trabajadores.find(t => t.id === a.trabajadorId);
        const tB = estadoFinca.trabajadores.find(t => t.id === b.trabajadorId);
        return (tA ? tA.nombre : '').localeCompare(tB ? tB.nombre : '');
      });

    const totalColumnas = 6 + SECTORES.length;

    if (registrosSemanaActual.length === 0) {
      tbodyActual.innerHTML = `
        <tr>
          <td colspan="${totalColumnas}" style="text-align:center; padding:20px; color:#666;">
            Agrega trabajadores arriba para ver sus horarios de la semana actual.
          </td>
        </tr>
      `;
    } else {
      registrosSemanaActual.forEach(reg => {
        const trab = estadoFinca.trabajadores.find(t => t.id === reg.trabajadorId);
        const calc = calcularTotalesRegistroHorario(reg, trab);
        sumaHorasActual += calc.totalHoras;
        sumaPagoActual += calc.totalPagar;
        tbodyActual.appendChild(crearFilaPlanillaHTML(reg, trab, calc));
      });
    }

    const elHorasAct = document.getElementById('totalHorasSemanaActualTabla');
    const elPagoAct = document.getElementById('totalPagoSemanaActualTabla');
    if (elHorasAct) elHorasAct.textContent = `${sumaHorasActual} hrs`;
    if (elPagoAct) elPagoAct.textContent = formatoDinero(sumaPagoActual);
  }

  // 2. RENDERIZAR LAS HOJAS DE OTRAS SEMANAS (OCULTAS POR DEFECTO CON OPCI�N DE EXPANDIR)
  const filtroTrab = document.getElementById('filtroHistTrabajador').value || 'TODOS';
  const filtroAnio = document.getElementById('filtroHistAnio').value || 'TODOS';
  const filtroFecha = document.getElementById('filtroHistFecha').value || '';
  const filtroSemanaLunes = filtroFecha ? obtenerLunesDeFecha(filtroFecha) : '';

  const todasLasOtrasHojas = Object.values(estadoFinca.horarios).filter(reg => {
    if (reg.semanaLunes === lunesSemanaPorDefecto) return false;
    const trab = estadoFinca.trabajadores.find(t => t.id === reg.trabajadorId);
    if (!trab) return false;
    const calc = calcularTotalesRegistroHorario(reg, trab);
    const fueEnviado = reg.enviado || reg.firmado;
    const tieneContenido = fueEnviado || calc.totalHoras > 0 || (reg.comentarios && reg.comentarios.trim());
    const esSemanaSeleccionada = reg.semanaLunes === semanaActualLunes;
    return tieneContenido || esSemanaSeleccionada;
  });

  const listaRegistrosAnteriores = todasLasOtrasHojas.filter(reg => {
    if (filtroTrab !== 'TODOS' && reg.trabajadorId !== filtroTrab) return false;
    if (filtroAnio !== 'TODOS' && !(reg.semanaLunes || '').startsWith(filtroAnio)) return false;
    if (filtroSemanaLunes && reg.semanaLunes !== filtroSemanaLunes) return false;
    return true;
  });

  listaRegistrosAnteriores.sort((a, b) => {
    const cmpFecha = (b.semanaLunes || '').localeCompare(a.semanaLunes || '');
    if (cmpFecha !== 0) return cmpFecha;
    const tA = estadoFinca.trabajadores.find(t => t.id === a.trabajadorId);
    const tB = estadoFinca.trabajadores.find(t => t.id === b.trabajadorId);
    return (tA ? tA.nombre : '').localeCompare(tB ? tB.nombre : '');
  });

  const contenedorExpandible = document.getElementById('contenedorHojasAnterioresExpandible');
  const btnToggle = document.getElementById('btnToggleExpandirHistorial');
  const tituloOcultas = document.getElementById('tituloResumenHojasOcultas');

  if (contenedorExpandible) {
    contenedorExpandible.style.display = hojasAnterioresExpandidas ? 'block' : 'none';
  }
  if (tituloOcultas) {
    tituloOcultas.textContent = hojasAnterioresExpandidas
      ? `?? Hojas Guardadas de Otras Semanas (${todasLasOtrasHojas.length} hoja(s) � Expandidas)`
      : `?? Hojas Guardadas de Otras Semanas (${todasLasOtrasHojas.length} hoja(s) ocultas)`;
  }
  if (btnToggle) {
    btnToggle.textContent = hojasAnterioresExpandidas
      ? '? Ocultar Hojas de Otras Semanas'
      : `? Expandir Hojas de Otras Semanas (${todasLasOtrasHojas.length})`;
  }

  tbodyAnteriores.innerHTML = '';
  let granTotalHoras = 0;
  let granTotalPago = 0;

  if (listaRegistrosAnteriores.length === 0) {
    tbodyAnteriores.innerHTML = `
      <tr>
        <td colspan="${6 + SECTORES.length}" style="text-align:center; padding:24px; color:#666;">
          No hay planillas de otras semanas para esa b�squeda.
        </td>
      </tr>
    `;
  } else {
    listaRegistrosAnteriores.forEach(reg => {
      const trab = estadoFinca.trabajadores.find(t => t.id === reg.trabajadorId);
      const calc = calcularTotalesRegistroHorario(reg, trab);
      granTotalHoras += calc.totalHoras;
      granTotalPago += calc.totalPagar;
      tbodyAnteriores.appendChild(crearFilaPlanillaHTML(reg, trab, calc));
    });
  }

  document.getElementById('totalHorasHistorialPlanillas').textContent = `${granTotalHoras} hrs`;
  document.getElementById('totalPagoHistorialPlanillas').textContent = formatoDinero(granTotalPago);
}

function abrirPlanillaGuardada(semanaLunes, trabId) {
  semanaActualLunes = semanaLunes;
  trabajadorSeleccionadoId = trabId;
  viendoHojaDeHistorial = true;
  document.getElementById('weekDatePicker').value = semanaActualLunes;
  document.getElementById('selectTrabajadorHorario').value = trabajadorSeleccionadoId;
  renderizarHojaHorario();
  renderizarHistorialPlanillas();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// LISTA DE TRABAJADORES Y TARIFAS (BAJO LA PESTA�A #1 DE EMPLEADOS)
// ============================================================================

function crearTrabajadorDesdeFormulario() {
  const nombreInput = document.getElementById('nuevoTrabNombre');
  const fullInput = document.getElementById('nuevoTrabDiaCompleto');
  const halfInput = document.getElementById('nuevoTrabMedioDia');
  const telInput = document.getElementById('nuevoTrabTelefono');

  const nombre = nombreInput.value.trim();
  if (!nombre) {
    alert('Por favor escribe el nombre del trabajador.');
    return;
  }

  const tarifaDiaCompleto = parseFloat(fullInput.value) || 0;
  const tarifaMedioDia = parseFloat(halfInput.value) || 0;

  const nuevo = {
    id: 'trab_' + Date.now(),
    nombre,
    tarifaDiaCompleto,
    tarifaMedioDia,
    telefono: telInput.value.trim()
  };

  estadoFinca.trabajadores.push(nuevo);
  trabajadorSeleccionadoId = nuevo.id;

  nombreInput.value = '';
  telInput.value = '';

  guardarDatos();
  renderizarTodo();
}

function actualizarTarifaTrabajador(trabId, campo, valor) {
  const trab = estadoFinca.trabajadores.find(t => t.id === trabId);
  if (!trab) return;
  if (campo === 'nombre') {
    trab.nombre = valor;
  } else if (campo === 'telefono') {
    trab.telefono = valor;
  } else {
    trab[campo] = parseFloat(valor) || 0;
  }
  guardarDatos();
  renderizarTodo();
}

function eliminarTrabajador(trabId) {
  const trab = estadoFinca.trabajadores.find(t => t.id === trabId);
  if (!trab) return;
  mostrarModalConfirmacionEliminar(
    `�Est�s seguro de que deseas quitar a "${trab.nombre}" de la lista de trabajadores?`,
    () => {
      estadoFinca.trabajadores = estadoFinca.trabajadores.filter(t => t.id !== trabId);
      if (trabajadorSeleccionadoId === trabId) {
        trabajadorSeleccionadoId = estadoFinca.trabajadores[0] ? estadoFinca.trabajadores[0].id : '';
      }
      guardarDatos();
      renderizarTodo();
    }
  );
}

function renderizarTablaTrabajadores() {
  const tbody = document.getElementById('tablaTrabajadoresBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  estadoFinca.trabajadores.forEach(trab => {
    let totalHistoricoTrab = 0;
    Object.values(estadoFinca.horarios).forEach(reg => {
      if (reg.trabajadorId === trab.id) {
        const calc = calcularTotalesRegistroHorario(reg, trab);
        totalHistoricoTrab += calc.totalPagar;
      }
    });

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <input type="text" value="${trab.nombre}" style="width:100%;"
          onchange="actualizarTarifaTrabajador('${trab.id}', 'nombre', this.value)" />
      </td>
      <td>
        <input type="number" step="0.5" min="0" value="${Number(trab.tarifaDiaCompleto).toFixed(2)}" style="width:140px;"
          onchange="actualizarTarifaTrabajador('${trab.id}', 'tarifaDiaCompleto', this.value)" />
      </td>
      <td>
        <input type="number" step="0.5" min="0" value="${Number(trab.tarifaMedioDia).toFixed(2)}" style="width:140px;"
          onchange="actualizarTarifaTrabajador('${trab.id}', 'tarifaMedioDia', this.value)" />
      </td>
      <td>
        <input type="text" value="${trab.telefono || ''}" placeholder="Tel�fono / Nota" style="width:100%;"
          onchange="actualizarTarifaTrabajador('${trab.id}', 'telefono', this.value)" />
      </td>
      <td style="color:#14532d; font-weight:900; font-size:21px;">
        ${formatoDinero(totalHistoricoTrab)}
      </td>
      <td>
        <button class="btn btn-danger" onclick="eliminarTrabajador('${trab.id}')">Quitar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ============================================================================
// PESTA�A #2 (ROJO CLARO): REPORTE COMPLETO DE GASTOS
// ============================================================================

function guardarOtroGasto() {
  const fecha = document.getElementById('gastoFecha').value || obtenerFechaHoyISO();
  const categoria = document.getElementById('gastoCategoria')
    ? document.getElementById('gastoCategoria').value
    : 'Materiales y Herramientas';
  const concepto = document.getElementById('gastoConcepto').value.trim();
  const sector = document.getElementById('gastoSector').value;
  const monto = parseFloat(document.getElementById('gastoMonto').value) || 0;

  if (!concepto) {
    alert('Por favor escribe la descripci�n del gasto (por ejemplo: 10 sacos de abono, Flete cami�n, Machetes).');
    return;
  }
  if (monto <= 0) {
    alert('Por favor escribe el monto gastado en d�lares ($).');
    return;
  }

  estadoFinca.gastos.unshift({
    id: 'gasto_' + Date.now(),
    fecha,
    categoria,
    concepto,
    sector,
    monto
  });

  document.getElementById('gastoConcepto').value = '';
  document.getElementById('gastoMonto').value = '';

  guardarDatos();
  actualizarSelectoresDeAnios();
  renderizarTodo();
}

function eliminarOtroGasto(gastoId) {
  const g = estadoFinca.gastos.find(item => item.id === gastoId);
  const desc = g ? `"${g.concepto}" (${formatoDinero(g.monto)})` : 'este gasto';
  mostrarModalConfirmacionEliminar(
    `�Est�s seguro de que deseas borrar el registro de gasto ${desc}? Esta acci�n no se puede deshacer.`,
    () => {
      estadoFinca.gastos = estadoFinca.gastos.filter(item => item.id !== gastoId);
      guardarDatos();
      renderizarTodo();
    }
  );
}

function renderizarReporteCompletoGastos() {
  const selAnio = document.getElementById('filtroAnioGastosReporte');
  const selMes = document.getElementById('filtroMesGastosReporte');
  if (!selAnio || !selMes) return;

  const anioFiltro = selAnio.value || 'TODOS';
  const mesFiltro = selMes.value || 'TODOS';

  const coincideFechaGasto = (fechaISO) => {
    if (!fechaISO) return false;
    const anio = fechaISO.substring(0, 4);
    const mes = fechaISO.substring(5, 7);
    if (anioFiltro !== 'TODOS' && anio !== anioFiltro) return false;
    if (mesFiltro !== 'TODOS' && mes !== mesFiltro) return false;
    return true;
  };

  let totalGastoTrabajadores = 0;
  let totalHorasTrabajadores = 0;
  const resumenPorTrabajador = {};

  estadoFinca.trabajadores.forEach(t => {
    resumenPorTrabajador[t.id] = {
      nombre: t.nombre,
      diasCompletos: 0,
      mediosDias: 0,
      horas: 0,
      totalPagado: 0
    };
  });

  Object.values(estadoFinca.horarios).forEach(reg => {
    if (coincideFechaGasto(reg.semanaLunes)) {
      const trab = estadoFinca.trabajadores.find(t => t.id === reg.trabajadorId);
      const calc = calcularTotalesRegistroHorario(reg, trab);
      totalGastoTrabajadores += calc.totalPagar;
      totalHorasTrabajadores += calc.totalHoras;

      if (trab && resumenPorTrabajador[trab.id]) {
        resumenPorTrabajador[trab.id].diasCompletos += calc.diasCompletos;
        resumenPorTrabajador[trab.id].mediosDias += calc.mediosDias;
        resumenPorTrabajador[trab.id].horas += calc.totalHoras;
        resumenPorTrabajador[trab.id].totalPagado += calc.totalPagar;
      }
    }
  });

  const sumaPorCategoria = {
    'Materiales y Herramientas': 0,
    'Abono y Fertilizantes': 0,
    'Transporte y Combustible': 0,
    'Mantenimiento y Reparaciones': 0,
    'Otros Gastos': 0
  };

  const gastosFiltrados = [];
  estadoFinca.gastos.forEach(g => {
    if (coincideFechaGasto(g.fecha)) {
      const cat = sumaPorCategoria[g.categoria] !== undefined ? g.categoria : 'Otros Gastos';
      const m = Number(g.monto || 0);
      sumaPorCategoria[cat] += m;
      gastosFiltrados.push(g);
    }
  });

  const totalMaterialesYAbono =
    sumaPorCategoria['Materiales y Herramientas'] +
    sumaPorCategoria['Abono y Fertilizantes'];

  const totalTransporteYOtros =
    sumaPorCategoria['Transporte y Combustible'] +
    sumaPorCategoria['Mantenimiento y Reparaciones'] +
    sumaPorCategoria['Otros Gastos'];

  const granTotalGastos = totalGastoTrabajadores + totalMaterialesYAbono + totalTransporteYOtros;

  document.getElementById('gastoKpiTrabajadores').textContent = formatoDinero(totalGastoTrabajadores);
  document.getElementById('gastoKpiTrabajadoresSub').textContent = `${totalHorasTrabajadores} horas trabajadas en horarios`;
  document.getElementById('gastoKpiMateriales').textContent = formatoDinero(totalMaterialesYAbono);
  document.getElementById('gastoKpiTransporteOtros').textContent = formatoDinero(totalTransporteYOtros);
  document.getElementById('gastoKpiGranTotal').textContent = formatoDinero(granTotalGastos);

  const tbodyCat = document.getElementById('tablaResumenCategoriasGastoBody');
  tbodyCat.innerHTML = '';

  const filasCategorias = [
    {
      nombre: '?? Pago a Trabajadores (Mano de Obra)',
      origen: 'Transferido autom�ticamente desde Horario Semanal (Pesta�a 1)',
      monto: totalGastoTrabajadores,
      destacado: true
    },
    {
      nombre: '?? Materiales y Herramientas',
      origen: 'Machetes, sacos, herramientas, materiales de finca',
      monto: sumaPorCategoria['Materiales y Herramientas']
    },
    {
      nombre: '?? Abono y Fertilizantes',
      origen: 'Abonos, fertilizantes, cuidado de plantas de cacao',
      monto: sumaPorCategoria['Abono y Fertilizantes']
    },
    {
      nombre: '?? Transporte y Combustible',
      origen: 'Fletes de cacao, gasolina, di�sel, movilizaci�n',
      monto: sumaPorCategoria['Transporte y Combustible']
    },
    {
      nombre: '?? Mantenimiento y Reparaciones',
      origen: 'Arreglo de equipos, guada�as, bombas, infraestructura',
      monto: sumaPorCategoria['Mantenimiento y Reparaciones']
    },
    {
      nombre: '?? Otros Gastos Generales',
      origen: 'Gastos varios de la finca',
      monto: sumaPorCategoria['Otros Gastos']
    }
  ];

  filasCategorias.forEach(item => {
    const pct = granTotalGastos > 0 ? ((item.monto / granTotalGastos) * 100).toFixed(1) + '%' : '0.0%';
    const tr = document.createElement('tr');
    if (item.destacado) {
      tr.style.backgroundColor = '#fffbeb';
    }
    tr.innerHTML = `
      <td><b>${item.nombre}</b></td>
      <td>${item.origen}</td>
      <td><b>${pct}</b></td>
      <td style="color:#991b1b; font-weight:900; font-size:22px;">${formatoDinero(item.monto)}</td>
    `;
    tbodyCat.appendChild(tr);
  });

  document.getElementById('pieGranTotalCategoriasGasto').textContent = formatoDinero(granTotalGastos);

  const tbodyTrab = document.getElementById('tablaGastosTrabajadoresResumenBody');
  tbodyTrab.innerHTML = '';
  Object.values(resumenPorTrabajador).forEach(rt => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${rt.nombre}</b></td>
      <td>${rt.diasCompletos}</td>
      <td>${rt.mediosDias}</td>
      <td><b>${rt.horas} hrs</b></td>
      <td style="color:#b45309; font-weight:900; font-size:21px;">${formatoDinero(rt.totalPagado)}</td>
    `;
    tbodyTrab.appendChild(tr);
  });

  const keywordFiltro = document.getElementById('filtroKeywordGastos')
    ? document.getElementById('filtroKeywordGastos').value.trim().toLowerCase()
    : '';
  const categoriaTablaFiltro = document.getElementById('filtroCategoriaTablaGastos')
    ? document.getElementById('filtroCategoriaTablaGastos').value
    : 'TODAS';
  const sectorTablaFiltro = document.getElementById('filtroSectorTablaGastos')
    ? document.getElementById('filtroSectorTablaGastos').value
    : 'TODOS';
  const fechaExactaFiltro = document.getElementById('filtroFechaExactaGastos')
    ? document.getElementById('filtroFechaExactaGastos').value
    : '';

  const gastosTablaFiltrados = gastosFiltrados.filter(g => {
    const cat = g.categoria || 'Materiales y Herramientas';
    const sec = g.sector || 'Toda la Finca';
    const desc = (g.concepto || '').toLowerCase();
    const fechaCorta = formatearFechaCorta(g.fecha).toLowerCase();
    const montoStr = String(g.monto || '');

    if (categoriaTablaFiltro !== 'TODAS' && cat !== categoriaTablaFiltro) return false;
    if (sectorTablaFiltro !== 'TODOS' && sec !== sectorTablaFiltro) return false;
    if (fechaExactaFiltro && g.fecha !== fechaExactaFiltro) return false;

    if (keywordFiltro) {
      const textoCompleto = `${desc} ${cat.toLowerCase()} ${sec.toLowerCase()} ${fechaCorta} ${montoStr}`;
      if (!textoCompleto.includes(keywordFiltro)) return false;
    }
    return true;
  });

  const tbodyGastos = document.getElementById('tablaGastosBody');
  tbodyGastos.innerHTML = '';

  let sumaTablaFiltrada = 0;

  if (gastosTablaFiltrados.length === 0) {
    tbodyGastos.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:20px; color:#666;">
          No se encontraron gastos con esos filtros o palabra clave. Presiona "?? Ver Todos" para limpiar la b�squeda.
        </td>
      </tr>
    `;
  } else {
    gastosTablaFiltrados
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
      .forEach(g => {
        const m = Number(g.monto || 0);
        sumaTablaFiltrada += m;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><b>${formatearFechaCorta(g.fecha)}</b></td>
          <td><b>${g.categoria || 'Materiales y Herramientas'}</b></td>
          <td>${g.concepto}</td>
          <td>${g.sector}</td>
          <td style="color:#991b1b; font-weight:900;">${formatoDinero(m)}</td>
          <td>
            <button class="btn btn-danger" onclick="eliminarOtroGasto('${g.id}')">Borrar</button>
          </td>
        `;
        tbodyGastos.appendChild(tr);
      });
  }

  const pieTexto = document.getElementById('pieTextoTotalTablaGastos');
  const pieMonto = document.getElementById('pieMontoTotalTablaGastos');
  if (pieTexto) {
    pieTexto.textContent = `TOTAL DE GASTOS EN LA LISTA (${gastosTablaFiltrados.length} registro(s)):`;
  }
  if (pieMonto) {
    pieMonto.textContent = formatoDinero(sumaTablaFiltrada);
  }
}

function limpiarFiltrosTablaGastos() {
  if (document.getElementById('filtroKeywordGastos')) document.getElementById('filtroKeywordGastos').value = '';
  if (document.getElementById('filtroCategoriaTablaGastos')) document.getElementById('filtroCategoriaTablaGastos').value = 'TODAS';
  if (document.getElementById('filtroSectorTablaGastos')) document.getElementById('filtroSectorTablaGastos').value = 'TODOS';
  if (document.getElementById('filtroFechaExactaGastos')) document.getElementById('filtroFechaExactaGastos').value = '';
  renderizarReporteCompletoGastos();
}

// ============================================================================
// PESTA�A #3 (AMARILLO CLARO): ESTAD�STICAS DE COSECHA
// (REGISTRO MANUAL POR SECTOR: PESO EN LA FINCA Y PESO DESPU�S DE SECAR)
// ============================================================================

function calcularVistaPreviaCosecha() {
  const fincaQQEl = document.getElementById('cosechaFincaQQ');
  const fincaLBEl = document.getElementById('cosechaFincaLB');
  const secoQQEl = document.getElementById('cosechaSecoQQ');
  const secoLBEl = document.getElementById('cosechaSecoLB');

  const fincaQQ = fincaQQEl ? (parseFloat(fincaQQEl.value) || 0) : 0;
  const fincaLB = fincaLBEl ? (parseFloat(fincaLBEl.value) || 0) : 0;
  const secoQQ = secoQQEl ? (parseFloat(secoQQEl.value) || 0) : 0;
  const secoLB = secoLBEl ? (parseFloat(secoLBEl.value) || 0) : 0;

  const totalFincaQQ = fincaQQ + (fincaLB / 100);
  const totalSecoQQ = secoQQ + (secoLB / 100);

  const prevFinca = document.getElementById('previewCosechaFinca');
  const prevSeco = document.getElementById('previewCosechaSeco');
  const prevRend = document.getElementById('previewCosechaRendimiento');

  if (prevFinca) prevFinca.textContent = formatoPeso(totalFincaQQ);
  if (prevSeco) {
    prevSeco.textContent = totalSecoQQ > 0
      ? formatoPeso(totalSecoQQ)
      : '? Pendiente de secar (Se puede editar abajo)';
  }

  if (prevRend) {
    if (totalFincaQQ > 0 && totalSecoQQ > 0) {
      const pctSeco = ((totalSecoQQ / totalFincaQQ) * 100).toFixed(1);
      const reduccionQQ = Math.max(0, totalFincaQQ - totalSecoQQ);
      prevRend.textContent = `${pctSeco}% seco (Merma: -${formatoPeso(reduccionQQ)})`;
    } else {
      prevRend.textContent = '? Pendiente de secar';
    }
  }

  return { fincaQQ, fincaLB, totalFincaQQ, secoQQ, secoLB, totalSecoQQ };
}

function guardarRegistroCosecha() {
  const fecha = (document.getElementById('cosechaFecha') && document.getElementById('cosechaFecha').value) || obtenerFechaHoyISO();
  const sector = (document.getElementById('cosechaSector') && document.getElementById('cosechaSector').value) || 'El Guineo';
  const notas = (document.getElementById('cosechaNotas') && document.getElementById('cosechaNotas').value.trim()) || '';

  const { fincaQQ, fincaLB, totalFincaQQ, secoQQ, secoLB, totalSecoQQ } = calcularVistaPreviaCosecha();

  if (totalFincaQQ <= 0) {
    alert('Por favor ingresa el Peso en la Finca (antes de secar) en Quintales o Libras.');
    return;
  }

  if (!Array.isArray(estadoFinca.cosechas)) {
    estadoFinca.cosechas = [];
  }

  estadoFinca.cosechas.unshift({
    id: 'cosecha_' + Date.now(),
    fecha,
    sector,
    fincaQQ,
    fincaLB,
    totalFincaQQ,
    secoQQ,
    secoLB,
    totalSecoQQ,
    notas
  });

  if (document.getElementById('cosechaFincaQQ')) document.getElementById('cosechaFincaQQ').value = '';
  if (document.getElementById('cosechaFincaLB')) document.getElementById('cosechaFincaLB').value = '';
  if (document.getElementById('cosechaSecoQQ')) document.getElementById('cosechaSecoQQ').value = '';
  if (document.getElementById('cosechaSecoLB')) document.getElementById('cosechaSecoLB').value = '';
  if (document.getElementById('cosechaNotas')) document.getElementById('cosechaNotas').value = '';
  calcularVistaPreviaCosecha();

  guardarDatos();
  actualizarSelectoresDeAnios();
  renderizarTodo();
}

function actualizarPesoSecoCosecha(cosechaId) {
  const item = (estadoFinca.cosechas || []).find(c => c.id === cosechaId);
  if (!item) return;

  const inputQQ = document.getElementById(`editSecoQQ_${cosechaId}`);
  const inputLB = document.getElementById(`editSecoLB_${cosechaId}`);

  const secoQQ = inputQQ ? (parseFloat(inputQQ.value) || 0) : 0;
  const secoLB = inputLB ? (parseFloat(inputLB.value) || 0) : 0;
  const totalSecoQQ = secoQQ + (secoLB / 100);

  item.secoQQ = secoQQ;
  item.secoLB = secoLB;
  item.totalSecoQQ = totalSecoQQ;

  guardarDatos();
  renderizarTodo();
}

function eliminarRegistroCosecha(cosechaId) {
  const c = (estadoFinca.cosechas || []).find(item => item.id === cosechaId);
  const desc = c ? `cosecha del sector "${c.sector}" del ${formatearFechaCorta(c.fecha)} (${formatoPeso(c.totalFincaQQ)})` : 'este registro de cosecha';
  mostrarModalConfirmacionEliminar(
    `�Est�s seguro de que deseas borrar el registro de ${desc}? Esta acci�n no se puede deshacer.`,
    () => {
      estadoFinca.cosechas = (estadoFinca.cosechas || []).filter(item => item.id !== cosechaId);
      guardarDatos();
      renderizarTodo();
    }
  );
}

function renderizarEstadisticasCosecha() {
  const sectorHistFiltro = document.getElementById('filtroSectorHistorialCosecha')
    ? document.getElementById('filtroSectorHistorialCosecha').value
    : 'TODOS';

  const listaCosechas = Array.isArray(estadoFinca.cosechas) ? estadoFinca.cosechas : [];

  // HISTORIAL DETALLADO DE COSECHAS REGISTRADAS POR SECTOR (CON EDICIÓN DE PESO SECO)
  const tbodyHistCos = document.getElementById('tablaHistorialCosechasBody');
  if (tbodyHistCos) {
    tbodyHistCos.innerHTML = '';
    const cosechasFiltradas = listaCosechas
      .filter(c => {
        if (sectorHistFiltro !== 'TODOS' && c.sector !== sectorHistFiltro) return false;
        return true;
      })
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

    let sumaHistFincaQQ = 0;
    let sumaHistFincaConSecoQQ = 0;
    let sumaHistSecoQQ = 0;

    if (cosechasFiltradas.length === 0) {
      tbodyHistCos.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:24px; color:#666; font-size:18px;">
            Aún no hay cosechas registradas. Usa el formulario de arriba para ingresar cuánto cosechó cada sector.
          </td>
        </tr>
      `;
    } else {
      cosechasFiltradas.forEach(c => {
        const fQQ = Number(c.totalFincaQQ || 0);
        const sQQ = Number(c.totalSecoQQ || 0);
        sumaHistFincaQQ += fQQ;
        sumaHistSecoQQ += sQQ;
        if (sQQ > 0) sumaHistFincaConSecoQQ += fQQ;

        const valSecoQQ = c.secoQQ !== undefined && c.secoQQ > 0 ? c.secoQQ : '';
        const valSecoLB = c.secoLB !== undefined && c.secoLB > 0 ? c.secoLB : '';

        const celdaPesoSecoActual = sQQ > 0
          ? `<div style="color:#14532d; font-weight:900; font-size:22px;">☀️ ${formatoPeso(sQQ)}</div>
             <span style="background:#dcfce7; color:#166534; font-size:15px; font-weight:800; padding:2px 8px; border-radius:6px;">✅ Ya secado</span>`
          : `<div style="background:#fef3c7; color:#92400e; border:2px solid #f59e0b; padding:8px 12px; border-radius:8px; font-weight:800; font-size:18px;">
               ⏳ Pendiente de secar<br/>
               <span style="font-size:15px; font-weight:600;">Anótalo al lado cuando se seque ➡️</span>
             </div>`;

        const celdaRendimiento = sQQ > 0 && fQQ > 0
          ? `<b>${((sQQ / fQQ) * 100).toFixed(1)}% seco</b><br/><span style="color:#666; font-size:17px;">Merma: -${Math.max(0, fQQ - sQQ).toFixed(2)} qq</span>`
          : '<span style="color:#92400e; font-weight:700;">⏳ En secado</span>';

        const tr = document.createElement('tr');
        if (sQQ === 0) {
          tr.style.backgroundColor = '#fffbeb';
        }
        tr.innerHTML = `
          <td><b>${formatearFechaCorta(c.fecha)}</b></td>
          <td><b>${c.sector}</b></td>
          <td style="color:#854d0e; font-weight:800;">${formatoPeso(fQQ)}</td>
          <td>${celdaPesoSecoActual}</td>
          <td style="background:#f0fdf4; border-left:2px solid #86efac; border-right:2px solid #86efac;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <div>
                <label style="font-size:15px; font-weight:800; color:#14532d; display:block;">Quintales (qq):</label>
                <input type="number" id="editSecoQQ_${c.id}" min="0" step="0.01" value="${valSecoQQ}" placeholder="qq"
                  style="width:105px; padding:8px; font-size:19px; font-weight:800; border:2px solid #16a34a; border-radius:8px;" />
              </div>
              <div>
                <label style="font-size:15px; font-weight:800; color:#14532d; display:block;">Libras (lb):</label>
                <input type="number" id="editSecoLB_${c.id}" min="0" step="0.1" value="${valSecoLB}" placeholder="lb"
                  style="width:105px; padding:8px; font-size:19px; font-weight:800; border:2px solid #16a34a; border-radius:8px;" />
              </div>
              <button class="btn btn-primary" style="padding:10px 16px; font-size:17px; margin-top:18px;"
                onclick="actualizarPesoSecoCosecha('${c.id}')">
                💾 Guardar Peso Seco
              </button>
            </div>
          </td>
          <td>${celdaRendimiento}</td>
          <td>${c.notas || '—'}</td>
          <td>
            <button class="btn btn-danger" onclick="eliminarRegistroCosecha('${c.id}')">Borrar</button>
          </td>
        `;
        tbodyHistCos.appendChild(tr);
      });
    }

    const pieFinca = document.getElementById('pieTotalCosechaFinca');
    const pieSeco = document.getElementById('pieTotalCosechaSeco');
    const pieRend = document.getElementById('pieTotalCosechaRendimiento');
    if (pieFinca) pieFinca.textContent = formatoPeso(sumaHistFincaQQ);
    if (pieSeco) pieSeco.textContent = formatoPeso(sumaHistSecoQQ);
    if (pieRend) {
      pieRend.textContent = sumaHistFincaConSecoQQ > 0
        ? `${((sumaHistSecoQQ / sumaHistFincaConSecoQQ) * 100).toFixed(1)}% de rendimiento seco`
        : '—';
    }
  }
}

// ============================================================================
// PESTA�A #4 (VERDE CLARO): REPORTE DE VENTAS (SOLO CACAO SECO + D�A/SEMANA/MES/A�O/5 A�OS)
// ============================================================================

function obtenerDatosSuministroCacaoSeco() {
  const cosechadoPorSector = {};
  const vendidoPorSector = {};
  SECTORES.forEach(s => {
    cosechadoPorSector[s] = 0;
    vendidoPorSector[s] = 0;
  });
  vendidoPorSector['Toda la Finca'] = 0;

  let totalCosechadoSecoQQ = 0;
  let totalFincaSinSecarQQ = 0;
  let registrosPendientesSecar = 0;

  (estadoFinca.cosechas || []).forEach(c => {
    const sQQ = Number(c.totalSecoQQ || 0);
    const fQQ = Number(c.totalFincaQQ || 0);
    totalCosechadoSecoQQ += sQQ;
    if (sQQ <= 0 && fQQ > 0) {
      totalFincaSinSecarQQ += fQQ;
      registrosPendientesSecar++;
    }
    if (cosechadoPorSector[c.sector] !== undefined) {
      cosechadoPorSector[c.sector] += sQQ;
    }
  });

  let totalVendidoSecoQQ = 0;
  (estadoFinca.ventas || []).forEach(v => {
    const q = Number(v.totalQuintales || 0);
    totalVendidoSecoQQ += q;
    const sec = vendidoPorSector[v.sector] !== undefined ? v.sector : 'Toda la Finca';
    vendidoPorSector[sec] += q;
  });

  const totalDisponibleSecoQQ = totalCosechadoSecoQQ - totalVendidoSecoQQ;

  return {
    totalCosechadoSecoQQ,
    totalVendidoSecoQQ,
    totalDisponibleSecoQQ,
    totalFincaSinSecarQQ,
    registrosPendientesSecar,
    cosechadoPorSector,
    vendidoPorSector
  };
}

function renderizarSuministroCacaoSecoEnVentas() {
  const info = obtenerDatosSuministroCacaoSeco();

  const elCos = document.getElementById('suministroTotalCosechadoSeco');
  const elVen = document.getElementById('suministroTotalVendidoSeco');
  const elDisp = document.getElementById('suministroTotalDisponibleSeco');
  const elSubPend = document.getElementById('suministroSubPendienteSecado');
  const elEstado = document.getElementById('suministroEstadoTexto');
  const cardDisp = document.getElementById('cardSuministroDisponible');

  if (elCos) elCos.textContent = formatoPeso(info.totalCosechadoSecoQQ);
  if (elVen) elVen.textContent = formatoPeso(info.totalVendidoSecoQQ);
  if (elDisp) elDisp.textContent = formatoPeso(info.totalDisponibleSecoQQ);

  if (elSubPend) {
    if (info.registrosPendientesSecar > 0) {
      elSubPend.innerHTML = `? +${formatoPeso(info.totalFincaSinSecarQQ)} en finca pendientes de secar`;
    } else {
      elSubPend.textContent = 'Todo el cacao cosechado ya tiene su peso seco';
    }
  }

  if (cardDisp && elEstado) {
    if (info.totalDisponibleSecoQQ > 0.005) {
      cardDisp.classList.remove('negative');
      elEstado.textContent = '? Cacao seco en bodega listo para vender';
    } else if (Math.abs(info.totalDisponibleSecoQQ) <= 0.005) {
      cardDisp.classList.remove('negative');
      elEstado.textContent = '?? Todo el cacao seco cosechado ya fue vendido (0.00 qq en bodega)';
    } else {
      cardDisp.classList.add('negative');
      elEstado.textContent = `?? Se ha vendido ${formatoPeso(Math.abs(info.totalDisponibleSecoQQ))} m�s de lo registrado como seco en Pesta�a #3`;
    }
  }

  const tbody = document.getElementById('tablaSuministroCacaoSecoBody');
  if (tbody) {
    tbody.innerHTML = '';
    SECTORES.forEach(sec => {
      const cosQQ = info.cosechadoPorSector[sec] || 0;
      const venQQ = info.vendidoPorSector[sec] || 0;
      const dispQQ = cosQQ - venQQ;

      let badgeDisp = '';
      if (dispQQ > 0.005) {
        badgeDisp = `<span style="color:#14532d; font-weight:900; font-size:21px;">? ${formatoPeso(dispQQ)}</span>`;
      } else if (Math.abs(dispQQ) <= 0.005) {
        badgeDisp = `<span style="color:#6b7280; font-weight:800;">0.00 qq (0 lb) � Todo vendido</span>`;
      } else {
        badgeDisp = `<span style="color:#b91c1c; font-weight:900;">?? ${formatoPeso(dispQQ)} (Falta anotar cosecha seca)</span>`;
      }

      const btnAccion = dispQQ > 0.005
        ? `<button type="button" class="btn btn-primary" style="padding:8px 14px; font-size:16px;"
             onclick="seleccionarSuministroSectorParaVenta('${sec}', ${dispQQ.toFixed(4)})">
             ?? Vender este disponible
           </button>`
        : `<button type="button" class="btn btn-outline" style="padding:6px 12px; font-size:15px;"
             onclick="seleccionarSectorEnFormularioVenta('${sec}')">
             Elegir Sector
           </button>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>${sec}</b></td>
        <td style="color:#15803d; font-weight:800;">${formatoPeso(cosQQ)}</td>
        <td style="color:#0369a1; font-weight:800;">${formatoPeso(venQQ)}</td>
        <td>${badgeDisp}</td>
        <td>${btnAccion}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  calcularVistaPreviaVenta();
}

function seleccionarSectorEnFormularioVenta(sector) {
  const sel = document.getElementById('ventaSector');
  if (sel) sel.value = sector;
  calcularVistaPreviaVenta();
}

function seleccionarSuministroSectorParaVenta(sector, disponibleQQ) {
  const sel = document.getElementById('ventaSector');
  if (sel) sel.value = sector;

  const totalLibras = Math.round(Number(disponibleQQ) * 100);
  const qqEnteros = Math.floor(totalLibras / 100);
  const lbSueltas = totalLibras % 100;

  const inputQQ = document.getElementById('ventaQuintales');
  const inputLB = document.getElementById('ventaLibras');
  if (inputQQ) inputQQ.value = qqEnteros > 0 ? qqEnteros : '';
  if (inputLB) inputLB.value = lbSueltas > 0 ? lbSueltas : '';

  const inputPrecio = document.getElementById('ventaPrecioPorQQ');
  if (inputPrecio && !inputPrecio.value && precioMercadoCacaoActual.precioQuintal > 0) {
    inputPrecio.value = precioMercadoCacaoActual.precioQuintal.toFixed(2);
  }

  calcularVistaPreviaVenta();
}

function usarPrecioMercadoEnVenta() {
  const inputPrecio = document.getElementById('ventaPrecioPorQQ');
  if (inputPrecio && precioMercadoCacaoActual.precioQuintal > 0) {
    inputPrecio.value = precioMercadoCacaoActual.precioQuintal.toFixed(2);
    calcularVistaPreviaVenta();
  }
}

function calcularVistaPreviaVenta() {
  const qqInputEl = document.getElementById('ventaQuintales');
  const lbInputEl = document.getElementById('ventaLibras');
  const precioInputEl = document.getElementById('ventaPrecioPorQQ');
  if (!qqInputEl || !lbInputEl || !precioInputEl) {
    return { qq: 0, lb: 0, totalQuintales: 0, precioQQ: 0, totalDinero: 0 };
  }

  const qq = parseFloat(qqInputEl.value) || 0;
  const lb = parseFloat(lbInputEl.value) || 0;
  const precioQQ = parseFloat(precioInputEl.value) || 0;

  const totalQuintales = qq + (lb / 100);
  const totalDinero = totalQuintales * precioQQ;
  const precioPorLibra = precioQQ / 100;

  document.getElementById('previewPesoTotal').textContent = formatoPeso(totalQuintales);
  document.getElementById('previewPrecioLibra').textContent = `${formatoDinero(precioPorLibra)} / lb`;
  document.getElementById('previewTotalVenta').textContent = formatoDinero(totalDinero);

  // Mostrar el suministro de cacao seco disponible para el sector seleccionado y cu�nto quedar� despu�s de esta venta
  const infoSum = obtenerDatosSuministroCacaoSeco();
  const sectorSel = document.getElementById('ventaSector') ? document.getElementById('ventaSector').value : 'Toda la Finca';
  const dispActualQQ = sectorSel === 'Toda la Finca'
    ? infoSum.totalDisponibleSecoQQ
    : ((infoSum.cosechadoPorSector[sectorSel] || 0) - (infoSum.vendidoPorSector[sectorSel] || 0));

  const elHelperSec = document.getElementById('helperSuministroSectorSeleccionado');
  if (elHelperSec) {
    elHelperSec.textContent = sectorSel === 'Toda la Finca'
      ? `Suministro seco disponible en Toda la Finca: ${formatoPeso(dispActualQQ)}`
      : `Suministro seco disponible en ${sectorSel}: ${formatoPeso(dispActualQQ)}`;
    elHelperSec.style.color = dispActualQQ >= 0 ? '#14532d' : '#b91c1c';
  }

  const elRestante = document.getElementById('previewRestanteSuministro');
  if (elRestante) {
    const restanteDespuesQQ = dispActualQQ - totalQuintales;
    if (totalQuintales <= 0) {
      elRestante.style.color = '#166534';
      elRestante.textContent = `?? Suministro disponible actual (${sectorSel}): ${formatoPeso(dispActualQQ)}`;
    } else if (restanteDespuesQQ >= -0.005) {
      elRestante.style.color = '#166534';
      elRestante.textContent = `?? Suministro restante en ${sectorSel} despu�s de esta venta: ${formatoPeso(Math.max(0, restanteDespuesQQ))}`;
    } else {
      elRestante.style.color = '#b91c1c';
      elRestante.textContent = `?? Atenci�n: Esta venta supera el cacao seco cosechado disponible en ${sectorSel} por ${formatoPeso(Math.abs(restanteDespuesQQ))}`;
    }
  }

  return { qq, lb, totalQuintales, precioQQ, totalDinero };
}

function guardarVentaCacao() {
  const fecha = document.getElementById('ventaFecha').value || obtenerFechaHoyISO();
  const sector = document.getElementById('ventaSector').value;
  const comprador = document.getElementById('ventaComprador').value.trim();
  const notas = document.getElementById('ventaNotas').value.trim();

  const { qq, lb, totalQuintales, precioQQ, totalDinero } = calcularVistaPreviaVenta();

  if (totalQuintales <= 0) {
    alert('Por favor ingresa el peso del cacao seco vendido (en Quintales o Libras).');
    return;
  }
  if (precioQQ <= 0) {
    alert('Por favor ingresa el precio de venta por Quintal de cacao seco ($ USD).');
    return;
  }

  const nuevaVenta = {
    id: 'venta_' + Date.now(),
    fecha,
    sector,
    tipo: 'Cacao Seco',
    comprador,
    quintales: qq,
    libras: lb,
    totalQuintales,
    precioPorQQ: precioQQ,
    totalDinero,
    notas
  };

  estadoFinca.ventas.unshift(nuevaVenta);

  document.getElementById('ventaQuintales').value = '';
  document.getElementById('ventaLibras').value = '';
  document.getElementById('ventaNotas').value = '';
  calcularVistaPreviaVenta();

  guardarDatos();
  actualizarSelectoresDeAnios();
  renderizarTodo();
}

function eliminarVenta(ventaId) {
  const v = (estadoFinca.ventas || []).find(item => item.id === ventaId);
  const desc = v ? `la venta de ${formatoPeso(v.totalQuintales)} (${formatoDinero(v.totalDinero)}) del ${formatearFechaCorta(v.fecha)}` : 'esta venta';
  mostrarModalConfirmacionEliminar(
    `�Est�s seguro de que deseas borrar ${desc}? Esta acci�n no se puede deshacer.`,
    () => {
      estadoFinca.ventas = estadoFinca.ventas.filter(item => item.id !== ventaId);
      guardarDatos();
      renderizarTodo();
    }
  );
}

function renderizarTablaVentas() {
  const tbody = document.getElementById('tablaVentasBody');
  if (!tbody) return;

  const anioFiltro = document.getElementById('filtroAnioVentas').value || 'TODOS';
  const sectorFiltro = document.getElementById('filtroSectorVentas').value || 'TODOS';

  const ventasFiltradas = estadoFinca.ventas
    .filter(v => {
      const anioVenta = (v.fecha || '').substring(0, 4);
      const pasaAnio = anioFiltro === 'TODOS' || anioVenta === anioFiltro;
      const pasaSector = sectorFiltro === 'TODOS' || v.sector === sectorFiltro;
      return pasaAnio && pasaSector;
    })
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  tbody.innerHTML = '';
  let sumaQuintales = 0;
  let sumaDinero = 0;

  if (ventasFiltradas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:24px; color:#666;">
          A�n no hay ventas de cacao seco registradas en este periodo.
        </td>
      </tr>
    `;
  } else {
    ventasFiltradas.forEach(v => {
      sumaQuintales += Number(v.totalQuintales || 0);
      sumaDinero += Number(v.totalDinero || 0);

      const detalleCliente = [v.comprador, v.notas].filter(Boolean).join(' � ') || '�';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>${formatearFechaCorta(v.fecha)}</b></td>
        <td><b>${v.sector}</b></td>
        <td><b>${formatoPeso(v.totalQuintales)}</b></td>
        <td>${formatoDinero(v.precioPorQQ)} / qq</td>
        <td style="color:#14532d; font-weight:900; font-size:22px;">${formatoDinero(v.totalDinero)}</td>
        <td>${detalleCliente}</td>
        <td>
          <button class="btn btn-danger" onclick="eliminarVenta('${v.id}')">Borrar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('totalPesoVentasTabla').textContent = formatoPeso(sumaQuintales);
  document.getElementById('totalDineroVentasTabla').textContent = formatoDinero(sumaDinero);
}

function cambiarModoReporte(nuevoModo) {
  modoReporteActual = nuevoModo;
  ['DIARIO', 'SEMANAL', 'MENSUAL', 'ANUAL', 'CINCO_ANIOS'].forEach(m => {
    const btn = document.getElementById(`btnModo-${m}`);
    if (btn) btn.classList.toggle('active', m === nuevoModo);
  });

  const barraFiltros = document.getElementById('barraFiltrosReporte');
  const contenedorMes = document.getElementById('contenedorFiltroMes');
  const contenedorDia = document.getElementById('contenedorFiltroDia');

  if (nuevoModo === 'DIARIO') {
    barraFiltros.style.display = 'flex';
    contenedorMes.style.display = 'inline-flex';
    contenedorDia.style.display = 'inline-flex';
  } else if (nuevoModo === 'SEMANAL') {
    barraFiltros.style.display = 'flex';
    contenedorMes.style.display = 'inline-flex';
    contenedorDia.style.display = 'none';
  } else if (nuevoModo === 'MENSUAL') {
    barraFiltros.style.display = 'flex';
    contenedorMes.style.display = 'none';
    contenedorDia.style.display = 'none';
  } else if (nuevoModo === 'ANUAL' || nuevoModo === 'CINCO_ANIOS') {
    barraFiltros.style.display = 'none';
  }

  renderizarGanancias();
}

function limpiarFiltroDiaEspecifico() {
  document.getElementById('filtroDiaEspecifico').value = '';
  renderizarGanancias();
}

function obtenerTodosLosAniosDisponibles() {
  const aniosSet = new Set();
  const anioActual = String(new Date().getFullYear());
  aniosSet.add(anioActual);

  (estadoFinca.cosechas || []).forEach(c => {
    if (c.fecha && c.fecha.length >= 4) aniosSet.add(c.fecha.substring(0, 4));
  });

  estadoFinca.ventas.forEach(v => {
    if (v.fecha && v.fecha.length >= 4) aniosSet.add(v.fecha.substring(0, 4));
  });

  Object.values(estadoFinca.horarios).forEach(h => {
    if (h.semanaLunes && h.semanaLunes.length >= 4) aniosSet.add(h.semanaLunes.substring(0, 4));
  });

  estadoFinca.gastos.forEach(g => {
    if (g.fecha && g.fecha.length >= 4) aniosSet.add(g.fecha.substring(0, 4));
  });

  return Array.from(aniosSet).sort((a, b) => b.localeCompare(a));
}

function actualizarSelectoresDeAnios() {
  const anios = obtenerTodosLosAniosDisponibles();
  const selectIds = [
    'filtroAnioVentas',
    'filtroAnioGanancias',
    'filtroHistAnio',
    'filtroAnioCosecha',
    'filtroAnioGastosReporte',
    'filtroAnioSector'
  ];

  selectIds.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const valorPrevio = sel.value;
    sel.innerHTML = `<option value="TODOS">Todos los A�os</option>`;
    anios.forEach(anio => {
      const opt = document.createElement('option');
      opt.value = anio;
      opt.textContent = `${anio}`;
      sel.appendChild(opt);
    });
    if (valorPrevio && (valorPrevio === 'TODOS' || anios.includes(valorPrevio))) {
      sel.value = valorPrevio;
    } else {
      sel.value = 'TODOS';
    }
  });
}

function obtenerMovimientosDiariosDeHorarios() {
  const movimientos = [];
  Object.values(estadoFinca.horarios).forEach(reg => {
    const trab = estadoFinca.trabajadores.find(t => t.id === reg.trabajadorId);
    if (!trab || !reg.semanaLunes) return;

    const tarifaFull = Number(trab.tarifaDiaCompleto || 0);
    const tarifaHalf = Number(trab.tarifaMedioDia || 0);

    SECTORES.forEach(sector => {
      const turnosSec = (reg.turnos && reg.turnos[sector]) || {};
      DIAS_SEMANA.forEach(dia => {
        const valor = turnosSec[dia.id] || 'NONE';
        if (valor === 'FULL' || valor === 'HALF') {
          const fechaExacta = sumarDiasAFechaISO(reg.semanaLunes, dia.offset);
          const costo = valor === 'FULL' ? tarifaFull : tarifaHalf;
          const diasEq = valor === 'FULL' ? 1 : 0.5;
          const horas = valor === 'FULL' ? HORAS_DIA_COMPLETO : HORAS_MEDIO_DIA;
          movimientos.push({
            fecha: fechaExacta,
            semanaLunes: reg.semanaLunes,
            trabajadorId: trab.id,
            sector,
            diaId: dia.id,
            diaNombre: dia.nombre,
            costo,
            diasEq,
            horas
          });
        }
      });
    });
  });
  return movimientos;
}

function renderizarGanancias() {
  const anioFiltro = document.getElementById('filtroAnioGanancias').value || 'TODOS';
  const mesFiltro = document.getElementById('filtroMesGanancias').value || 'TODOS';
  const diaEspecifico = document.getElementById('filtroDiaEspecifico') ? document.getElementById('filtroDiaEspecifico').value : '';

  const coincidePeriodo = (fechaISO) => {
    if (!fechaISO) return false;
    if (modoReporteActual === 'ANUAL' || modoReporteActual === 'CINCO_ANIOS') {
      return true;
    }
    if (modoReporteActual === 'DIARIO' && diaEspecifico) {
      return fechaISO === diaEspecifico;
    }
    const anio = fechaISO.substring(0, 4);
    const mes = fechaISO.substring(5, 7);
    if (anioFiltro !== 'TODOS' && anio !== anioFiltro) return false;
    if ((modoReporteActual === 'SEMANAL' || modoReporteActual === 'DIARIO') && mesFiltro !== 'TODOS' && mes !== mesFiltro) {
      return false;
    }
    return true;
  };

  let totalVentasDinero = 0;
  let totalVentasQQ = 0;
  const estadisticasSector = {};
  [...SECTORES, 'Toda la Finca'].forEach(sec => {
    estadisticasSector[sec] = {
      pesoQQ: 0,
      ventasDinero: 0,
      diasEquivalentes: 0,
      costoManoObra: 0
    };
  });

  estadoFinca.ventas.forEach(v => {
    if (coincidePeriodo(v.fecha)) {
      const dinero = Number(v.totalDinero || 0);
      const qq = Number(v.totalQuintales || 0);
      totalVentasDinero += dinero;
      totalVentasQQ += qq;

      const sec = estadisticasSector[v.sector] ? v.sector : 'Toda la Finca';
      estadisticasSector[sec].pesoQQ += qq;
      estadisticasSector[sec].ventasDinero += dinero;
    }
  });

  let totalPagoTrabajadores = 0;
  let totalDiasEquivalentes = 0;
  const movimientosHorarios = obtenerMovimientosDiariosDeHorarios();

  movimientosHorarios.forEach(mov => {
    if (coincidePeriodo(mov.fecha)) {
      totalPagoTrabajadores += mov.costo;
      totalDiasEquivalentes += mov.diasEq;
      if (estadisticasSector[mov.sector]) {
        estadisticasSector[mov.sector].diasEquivalentes += mov.diasEq;
        estadisticasSector[mov.sector].costoManoObra += mov.costo;
      }
    }
  });

  let totalOtrosGastos = 0;
  estadoFinca.gastos.forEach(g => {
    if (coincidePeriodo(g.fecha)) {
      totalOtrosGastos += Number(g.monto || 0);
    }
  });

  const gananciaNeta = totalVentasDinero - totalPagoTrabajadores - totalOtrosGastos;

  document.getElementById('kpiVentasDinero').textContent = formatoDinero(totalVentasDinero);
  document.getElementById('kpiVentasPeso').textContent = `Peso vendido: ${formatoPeso(totalVentasQQ)}`;
  document.getElementById('kpiPagoTrabajadores').textContent = formatoDinero(totalPagoTrabajadores);
  document.getElementById('kpiHorasTrabajadores').textContent = `${totalDiasEquivalentes} d�as trabajados`;
  document.getElementById('kpiOtrosGastos').textContent = formatoDinero(totalOtrosGastos);
  document.getElementById('kpiGananciaNeta').textContent = formatoDinero(gananciaNeta);

  const cardGanancia = document.getElementById('kpiCardGananciaNeta');
  const subGanancia = document.getElementById('kpiGananciaSub');
  if (gananciaNeta >= 0) {
    cardGanancia.classList.remove('negative');
    subGanancia.textContent = '? Ganancia positiva para la finca';
  } else {
    cardGanancia.classList.add('negative');
    subGanancia.textContent = '?? Los gastos superan a las ventas en este periodo';
  }

  renderizarTablaDesglosePorModo(coincidePeriodo, anioFiltro, movimientosHorarios);
}

function renderizarTablaDesglosePorModo(coincidePeriodo, anioFiltro, movimientosHorarios) {
  const tituloPeriodo = document.getElementById('tituloPeriodoGanancias');
  const tituloTabla = document.getElementById('tituloTablaDesgloseTiempo');
  const colNombre = document.getElementById('columnaPeriodoNombre');
  const tbody = document.getElementById('tablaDesgloseTiempoBody');
  tbody.innerHTML = '';

  if (modoReporteActual === 'DIARIO') {
    tituloPeriodo.textContent = '?? Reporte de Ventas por D�a: Ventas, Pagos de Trabajadores, Gastos y Ganancias';
    tituloTabla.textContent = '?? Historial D�a por D�a';
    colNombre.textContent = 'Fecha';

    const diasMap = {};
    const asegurarDia = (fechaISO) => {
      if (!diasMap[fechaISO]) {
        diasMap[fechaISO] = { qq: 0, ventas: 0, nomina: 0, gastos: 0 };
      }
    };

    const hoyISO = obtenerFechaHoyISO();
    if (coincidePeriodo(hoyISO)) {
      asegurarDia(hoyISO);
    }

    estadoFinca.ventas.forEach(v => {
      if (coincidePeriodo(v.fecha)) {
        asegurarDia(v.fecha);
        diasMap[v.fecha].qq += Number(v.totalQuintales || 0);
        diasMap[v.fecha].ventas += Number(v.totalDinero || 0);
      }
    });

    movimientosHorarios.forEach(mov => {
      if (coincidePeriodo(mov.fecha)) {
        asegurarDia(mov.fecha);
        diasMap[mov.fecha].nomina += mov.costo;
      }
    });

    estadoFinca.gastos.forEach(g => {
      if (coincidePeriodo(g.fecha)) {
        asegurarDia(g.fecha);
        diasMap[g.fecha].gastos += Number(g.monto || 0);
      }
    });

    const diasOrdenados = Object.keys(diasMap).sort((a, b) => b.localeCompare(a));
    diasOrdenados.forEach(fecha => {
      const d = diasMap[fecha];
      const ganancia = d.ventas - d.nomina - d.gastos;
      const colorG = ganancia >= 0 ? '#14532d' : '#991b1b';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>${formatearFechaConDiaEspanol(fecha)}</b></td>
        <td><b>${formatoPeso(d.qq)}</b></td>
        <td style="color:#15803d; font-weight:800;">${formatoDinero(d.ventas)}</td>
        <td style="color:#b45309; font-weight:800;">${formatoDinero(d.nomina)}</td>
        <td style="color:#b91c1c; font-weight:800;">${formatoDinero(d.gastos)}</td>
        <td style="color:${colorG}; font-weight:900; font-size:22px;">${formatoDinero(ganancia)}</td>
      `;
      tbody.appendChild(tr);
    });
    return;
  }

  if (modoReporteActual === 'SEMANAL') {
    tituloPeriodo.textContent = '?? Reporte de Ventas por Semana: Ventas, Pagos de Trabajadores, Gastos y Ganancias';
    tituloTabla.textContent = '?? Historial Semana por Semana';
    colNombre.textContent = 'Semana (Fechas)';

    const semanasMap = {};
    const asegurarSemana = (lunesISO) => {
      if (!semanasMap[lunesISO]) {
        semanasMap[lunesISO] = { qq: 0, ventas: 0, nomina: 0, gastos: 0 };
      }
    };

    if (coincidePeriodo(semanaActualLunes)) {
      asegurarSemana(semanaActualLunes);
    }

    estadoFinca.ventas.forEach(v => {
      if (coincidePeriodo(v.fecha)) {
        const lun = obtenerLunesDeFecha(v.fecha);
        asegurarSemana(lun);
        semanasMap[lun].qq += Number(v.totalQuintales || 0);
        semanasMap[lun].ventas += Number(v.totalDinero || 0);
      }
    });

    Object.values(estadoFinca.horarios).forEach(reg => {
      if (coincidePeriodo(reg.semanaLunes)) {
        const trab = estadoFinca.trabajadores.find(t => t.id === reg.trabajadorId);
        const calc = calcularTotalesRegistroHorario(reg, trab);
        if (calc.totalPagar > 0 || calc.totalHoras > 0) {
          asegurarSemana(reg.semanaLunes);
          semanasMap[reg.semanaLunes].nomina += calc.totalPagar;
        }
      }
    });

    estadoFinca.gastos.forEach(g => {
      if (coincidePeriodo(g.fecha)) {
        const lun = obtenerLunesDeFecha(g.fecha);
        asegurarSemana(lun);
        semanasMap[lun].gastos += Number(g.monto || 0);
      }
    });

    const semanasOrdenadas = Object.keys(semanasMap).sort((a, b) => b.localeCompare(a));
    semanasOrdenadas.forEach(lun => {
      const d = semanasMap[lun];
      const ganancia = d.ventas - d.nomina - d.gastos;
      const colorG = ganancia >= 0 ? '#14532d' : '#991b1b';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>${formatearRangoSemanaNumerico(lun)}</b></td>
        <td><b>${formatoPeso(d.qq)}</b></td>
        <td style="color:#15803d; font-weight:800;">${formatoDinero(d.ventas)}</td>
        <td style="color:#b45309; font-weight:800;">${formatoDinero(d.nomina)}</td>
        <td style="color:#b91c1c; font-weight:800;">${formatoDinero(d.gastos)}</td>
        <td style="color:${colorG}; font-weight:900; font-size:22px;">${formatoDinero(ganancia)}</td>
      `;
      tbody.appendChild(tr);
    });
    return;
  }

  if (modoReporteActual === 'MENSUAL') {
    const anioTexto = anioFiltro === 'TODOS' ? 'Todos los A�os' : `${anioFiltro}`;
    tituloPeriodo.textContent = `??? Reporte de Ventas por Mes (${anioTexto}): Ventas, Gastos y Ganancias Mes por Mes`;
    tituloTabla.textContent = `??? Resumen Mes por Mes (${anioTexto})`;
    colNombre.textContent = 'Mes';

    const mesesMap = {};
    const asegurarMes = (ym) => {
      if (!mesesMap[ym]) {
        mesesMap[ym] = { qq: 0, ventas: 0, nomina: 0, gastos: 0 };
      }
    };

    const anioBase = anioFiltro === 'TODOS' ? String(new Date().getFullYear()) : anioFiltro;
    for (let m = 1; m <= 12; m++) {
      asegurarMes(`${anioBase}-${String(m).padStart(2, '0')}`);
    }

    estadoFinca.ventas.forEach(v => {
      if (coincidePeriodo(v.fecha) && v.fecha.length >= 7) {
        const ym = v.fecha.substring(0, 7);
        asegurarMes(ym);
        mesesMap[ym].qq += Number(v.totalQuintales || 0);
        mesesMap[ym].ventas += Number(v.totalDinero || 0);
      }
    });

    movimientosHorarios.forEach(mov => {
      if (coincidePeriodo(mov.fecha) && mov.fecha.length >= 7) {
        const ym = mov.fecha.substring(0, 7);
        asegurarMes(ym);
        mesesMap[ym].nomina += mov.costo;
      }
    });

    estadoFinca.gastos.forEach(g => {
      if (coincidePeriodo(g.fecha) && g.fecha.length >= 7) {
        const ym = g.fecha.substring(0, 7);
        asegurarMes(ym);
        mesesMap[ym].gastos += Number(g.monto || 0);
      }
    });

    const mesesOrdenados = Object.keys(mesesMap).sort((a, b) => a.localeCompare(b));
    mesesOrdenados.forEach(ym => {
      const [y, mStr] = ym.split('-');
      const nombreMes = NOMBRES_MESES[parseInt(mStr, 10) - 1] || mStr;
      const d = mesesMap[ym];
      const ganancia = d.ventas - d.nomina - d.gastos;
      const colorG = ganancia >= 0 ? '#14532d' : '#991b1b';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>${mStr}/${y} (${nombreMes})</b></td>
        <td><b>${formatoPeso(d.qq)}</b></td>
        <td style="color:#15803d; font-weight:800;">${formatoDinero(d.ventas)}</td>
        <td style="color:#b45309; font-weight:800;">${formatoDinero(d.nomina)}</td>
        <td style="color:#b91c1c; font-weight:800;">${formatoDinero(d.gastos)}</td>
        <td style="color:${colorG}; font-weight:900; font-size:22px;">${formatoDinero(ganancia)}</td>
      `;
      tbody.appendChild(tr);
    });
    return;
  }

  if (modoReporteActual === 'ANUAL') {
    tituloPeriodo.textContent = '?? Reporte de Ventas por A�o: Resultados de la Finca A�o por A�o';
    tituloTabla.textContent = '?? Resumen Hist�rico A�o por A�o';
    colNombre.textContent = 'A�o';

    const anios = obtenerTodosLosAniosDisponibles();
    anios.forEach(anio => {
      const d = calcularTotalesDeAnioEspecifico(anio);
      const ganancia = d.ventas - d.nomina - d.gastos;
      const colorG = ganancia >= 0 ? '#14532d' : '#991b1b';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b style="font-size:22px;">${anio}</b></td>
        <td><b>${formatoPeso(d.qq)}</b></td>
        <td style="color:#15803d; font-weight:800;">${formatoDinero(d.ventas)}</td>
        <td style="color:#b45309; font-weight:800;">${formatoDinero(d.nomina)}</td>
        <td style="color:#b91c1c; font-weight:800;">${formatoDinero(d.gastos)}</td>
        <td style="color:${colorG}; font-weight:900; font-size:24px;">${formatoDinero(ganancia)}</td>
      `;
      tbody.appendChild(tr);
    });
    return;
  }

  if (modoReporteActual === 'CINCO_ANIOS') {
    tituloPeriodo.textContent = '?? Reporte de Ventas de 5 A�os: Acumulado por Ciclos de 5 A�os';
    tituloTabla.textContent = '?? Resumen por Bloques de 5 A�os y Desglose del Ciclo';
    colNombre.textContent = 'Ciclo de 5 A�os / A�o';

    const aniosNum = obtenerTodosLosAniosDisponibles().map(Number).sort((a, b) => a - b);
    const minAnio = aniosNum[0] || new Date().getFullYear();
    const maxAnio = Math.max(aniosNum[aniosNum.length - 1] || minAnio, minAnio + 4);

    for (let inicio = minAnio; inicio <= maxAnio; inicio += 5) {
      const fin = inicio + 4;
      let qqBloque = 0;
      let ventasBloque = 0;
      let nominaBloque = 0;
      let gastosBloque = 0;

      for (let y = inicio; y <= fin; y++) {
        const dAnio = calcularTotalesDeAnioEspecifico(String(y));
        qqBloque += dAnio.qq;
        ventasBloque += dAnio.ventas;
        nominaBloque += dAnio.nomina;
        gastosBloque += dAnio.gastos;
      }

      const gananciaBloque = ventasBloque - nominaBloque - gastosBloque;
      const colorB = gananciaBloque >= 0 ? '#14532d' : '#991b1b';

      const trBloque = document.createElement('tr');
      trBloque.style.backgroundColor = '#dcfce7';
      trBloque.innerHTML = `
        <td><b style="font-size:23px; color:#14532d;">?? CICLO 5 A�OS: ${inicio} - ${fin}</b></td>
        <td><b>${formatoPeso(qqBloque)}</b></td>
        <td style="color:#15803d; font-weight:900;">${formatoDinero(ventasBloque)}</td>
        <td style="color:#b45309; font-weight:900;">${formatoDinero(nominaBloque)}</td>
        <td style="color:#b91c1c; font-weight:900;">${formatoDinero(gastosBloque)}</td>
        <td style="color:${colorB}; font-weight:900; font-size:25px;">${formatoDinero(gananciaBloque)}</td>
      `;
      tbody.appendChild(trBloque);

      for (let y = inicio; y <= fin; y++) {
        const dAnio = calcularTotalesDeAnioEspecifico(String(y));
        const gAnio = dAnio.ventas - dAnio.nomina - dAnio.gastos;
        const colorA = gAnio >= 0 ? '#14532d' : '#991b1b';

        const trAnio = document.createElement('tr');
        trAnio.innerHTML = `
          <td style="padding-left:36px;">? ${y} (${y - inicio + 1}/5)</td>
          <td>${formatoPeso(dAnio.qq)}</td>
          <td>${formatoDinero(dAnio.ventas)}</td>
          <td>${formatoDinero(dAnio.nomina)}</td>
          <td>${formatoDinero(dAnio.gastos)}</td>
          <td style="color:${colorA}; font-weight:800;">${formatoDinero(gAnio)}</td>
        `;
        tbody.appendChild(trAnio);
      }
    }
  }
}

function calcularTotalesDeAnioEspecifico(anioStr) {
  let qq = 0;
  let ventas = 0;
  let nomina = 0;
  let gastos = 0;

  estadoFinca.ventas.forEach(v => {
    if ((v.fecha || '').startsWith(anioStr)) {
      qq += Number(v.totalQuintales || 0);
      ventas += Number(v.totalDinero || 0);
    }
  });

  Object.values(estadoFinca.horarios).forEach(reg => {
    if ((reg.semanaLunes || '').startsWith(anioStr)) {
      const trab = estadoFinca.trabajadores.find(t => t.id === reg.trabajadorId);
      const calc = calcularTotalesRegistroHorario(reg, trab);
      nomina += calc.totalPagar;
    }
  });

  estadoFinca.gastos.forEach(g => {
    if ((g.fecha || '').startsWith(anioStr)) {
      gastos += Number(g.monto || 0);
    }
  });

  return { qq, ventas, nomina, gastos };
}

// ============================================================================
// MOTOR DE PREDICCIONES Y RECONOCIMIENTO DE PATRONES EN CADA PESTA�A (#1, #2, #3, #4)
// ============================================================================

function renderizarPrediccionesYPatronesEnCadaPestana() {
  const semanasCosechas = new Set();
  const semanasVentas = new Set();
  const semanasHorarios = new Set();
  const semanasGastos = new Set();
  const todasLasSemanas = new Set();

  let totalCosechaFincaQQ = 0;
  let totalCosechaSecoQQ = 0;
  const cosechaFincaPorSector = {};
  const cosechaSecoPorSector = {};
  const cosechaSecoPorMes = {};

  SECTORES.forEach(s => {
    cosechaFincaPorSector[s] = 0;
    cosechaSecoPorSector[s] = 0;
  });

  (estadoFinca.cosechas || []).forEach(c => {
    const fQQ = Number(c.totalFincaQQ || 0);
    const sQQ = Number(c.totalSecoQQ || 0);
    if (fQQ > 0 || sQQ > 0) {
      totalCosechaFincaQQ += fQQ;
      totalCosechaSecoQQ += sQQ;
      const lun = obtenerLunesDeFecha(c.fecha);
      semanasCosechas.add(lun);
      todasLasSemanas.add(lun);

      const sec = cosechaSecoPorSector[c.sector] !== undefined ? c.sector : SECTORES[0];
      cosechaFincaPorSector[sec] += fQQ;
      cosechaSecoPorSector[sec] += sQQ;

      const mesNum = (c.fecha || '').substring(5, 7);
      if (mesNum) {
        cosechaSecoPorMes[mesNum] = (cosechaSecoPorMes[mesNum] || 0) + sQQ;
      }
    }
  });

  let totalQQ = 0;
  let totalVentas = 0;
  let precioMaximoQQ = 0;
  const ventasPorSector = {};

  [...SECTORES, 'Toda la Finca'].forEach(s => {
    ventasPorSector[s] = 0;
  });

  estadoFinca.ventas.forEach(v => {
    const q = Number(v.totalQuintales || 0);
    const d = Number(v.totalDinero || 0);
    const p = Number(v.precioPorQQ || 0);
    if (p > precioMaximoQQ) precioMaximoQQ = p;

    if (q > 0 || d > 0) {
      totalQQ += q;
      totalVentas += d;
      const lun = obtenerLunesDeFecha(v.fecha);
      semanasVentas.add(lun);
      todasLasSemanas.add(lun);

      const sec = ventasPorSector[v.sector] !== undefined ? v.sector : 'Toda la Finca';
      ventasPorSector[sec] += d;
    }
  });

  let totalNomina = 0;
  let totalHoras = 0;
  let totalDiasEq = 0;
  const diasTrabPorSector = {};
  const horasPorDiaSemana = {};
  const horasPorTrabajador = {};

  SECTORES.forEach(s => { diasTrabPorSector[s] = 0; });
  DIAS_SEMANA.forEach(d => { horasPorDiaSemana[d.nombre] = 0; });

  const movimientosHorarios = obtenerMovimientosDiariosDeHorarios();
  movimientosHorarios.forEach(mov => {
    totalNomina += mov.costo;
    totalHoras += mov.horas;
    totalDiasEq += mov.diasEq;
    semanasHorarios.add(mov.semanaLunes);
    todasLasSemanas.add(mov.semanaLunes);

    if (diasTrabPorSector[mov.sector] !== undefined) {
      diasTrabPorSector[mov.sector] += mov.diasEq;
    }
    if (horasPorDiaSemana[mov.diaNombre] !== undefined) {
      horasPorDiaSemana[mov.diaNombre] += mov.horas;
    }
    const trab = estadoFinca.trabajadores.find(t => t.id === mov.trabajadorId);
    const nombreT = trab ? trab.nombre : 'Trabajador';
    horasPorTrabajador[nombreT] = (horasPorTrabajador[nombreT] || 0) + mov.horas;
  });

  let totalGastosOtros = 0;
  let totalMatAbono = 0;
  let totalTranspOtros = 0;
  const gastoPorCategoria = {
    'Mano de Obra (Trabajadores)': totalNomina,
    'Materiales y Herramientas': 0,
    'Abono y Fertilizantes': 0,
    'Transporte y Combustible': 0,
    'Mantenimiento y Reparaciones': 0,
    'Otros Gastos': 0
  };
  const gastoPorSector = {};

  estadoFinca.gastos.forEach(g => {
    const m = Number(g.monto || 0);
    if (m > 0) {
      totalGastosOtros += m;
      const lun = obtenerLunesDeFecha(g.fecha);
      semanasGastos.add(lun);
      todasLasSemanas.add(lun);

      const cat = gastoPorCategoria[g.categoria] !== undefined ? g.categoria : 'Otros Gastos';
      gastoPorCategoria[cat] += m;

      if (cat === 'Materiales y Herramientas' || cat === 'Abono y Fertilizantes') {
        totalMatAbono += m;
      } else {
        totalTranspOtros += m;
      }

      const sec = g.sector || 'Toda la Finca';
      gastoPorSector[sec] = (gastoPorSector[sec] || 0) + m;
    }
  });

  const numSemanasGeneral = Math.max(1, todasLasSemanas.size);
  const numSemanasCosechas = Math.max(1, semanasCosechas.size);
  const numSemanasVentas = Math.max(1, semanasVentas.size);
  const numSemanasHorarios = Math.max(1, semanasHorarios.size);

  const promSemanalCosechaFincaQQ = totalCosechaFincaQQ / numSemanasCosechas;
  const promSemanalCosechaSecoQQ = totalCosechaSecoQQ / numSemanasCosechas;
  const promSemanalQQ = totalQQ / numSemanasVentas;
  const promSemanalVentas = totalVentas / numSemanasVentas;
  const promSemanalNomina = totalNomina / numSemanasHorarios;
  const promSemanalHoras = totalHoras / numSemanasHorarios;
  const promSemanalDias = totalDiasEq / numSemanasHorarios;
  const promSemanalMatAbono = totalMatAbono / numSemanasGeneral;
  const promSemanalTranspOtros = totalTranspOtros / numSemanasGeneral;
  const promSemanalGastosOtros = totalGastosOtros / numSemanasGeneral;
  const promSemanalGastoTotal = promSemanalNomina + promSemanalGastosOtros;
  const promSemanalGanancia = promSemanalVentas - promSemanalGastoTotal;

  const horizontes = [
    { titulo: '?? Por D�a', factor: 1 / 6 },
    { titulo: '?? Pr�xima Semana', factor: 1 },
    { titulo: '??? Pr�ximo Mes', factor: 52 / 12 },
    { titulo: '?? Pr�ximo A�o', factor: 52 },
    { titulo: '?? Pr�ximos 5 A�os', factor: 52 * 5 }
  ];

  // =========================================================================
  // 1. PESTA�A #1: PATRONES Y PREDICCIONES DE EMPLEADOS Y HORARIO
  // =========================================================================
  const sectorMasTrabajo = obtenerMaximoDeObjeto(diasTrabPorSector) || 'El Guineo';
  const diaMasTrabajo = obtenerMaximoDeObjeto(horasPorDiaSemana) || 'Lunes';
  const empleadoMasHoras = obtenerMaximoDeObjeto(horasPorTrabajador) || (estadoFinca.trabajadores[0] ? estadoFinca.trabajadores[0].nombre : '�');

  const ulPatronesEmp = document.getElementById('patronesEmpleadosLista');
  if (ulPatronesEmp) {
    ulPatronesEmp.innerHTML = `
      <li class="pattern-item">?? <b>Sector con Mayor Demanda Laboral:</b><br/>${totalDiasEq > 0 ? `${sectorMasTrabajo} (${diasTrabPorSector[sectorMasTrabajo]} d�as trabajados)` : 'Registra turnos para detectar el lote con m�s trabajo'}</li>
      <li class="pattern-item">?? <b>D�a de Mayor Asistencia:</b><br/>${totalHoras > 0 ? `${diaMasTrabajo} (${horasPorDiaSemana[diaMasTrabajo]} hrs acumuladas)` : 'Sin turnos registrados a�n'}</li>
      <li class="pattern-item">?? <b>Trabajador con M�s Horas:</b><br/>${totalHoras > 0 ? `${empleadoMasHoras} (${horasPorTrabajador[empleadoMasHoras]} hrs)` : 'Registra una planilla semanal'}</li>
      <li class="pattern-item">?? <b>Promedio Semanal de N�mina:</b><br/>${formatoDinero(promSemanalNomina)} por semana (${promSemanalHoras.toFixed(1)} hrs/sem)</li>
    `;
  }

  const gridPredEmp = document.getElementById('gridPrediccionEmpleados');
  if (gridPredEmp) {
    gridPredEmp.innerHTML = horizontes.map(h => `
      <div class="pred-card">
        <h3>${h.titulo}</h3>
        <div class="pred-row">
          <span>?? D�as de Trabajo:</span>
          <b>${(promSemanalDias * h.factor).toFixed(1)} d�as</b>
        </div>
        <div class="pred-row">
          <span>?? Horas Estimadas:</span>
          <b>${Math.round(promSemanalHoras * h.factor)} hrs</b>
        </div>
        <div class="pred-row pred-profit-row">
          <span>?? Pago Previsto:</span>
          <span style="color:#b45309;">${formatoDinero(promSemanalNomina * h.factor)}</span>
        </div>
      </div>
    `).join('');
  }

  // =========================================================================
  // 2. PESTA�A #2: PATRONES Y PREDICCIONES DE GASTOS
  // =========================================================================
  const granTotalGastoHist = totalNomina + totalGastosOtros;
  const catMayorGasto = obtenerMaximoDeObjeto(gastoPorCategoria) || 'Mano de Obra (Trabajadores)';
  const pctCatMayor = granTotalGastoHist > 0 ? ((gastoPorCategoria[catMayorGasto] / granTotalGastoHist) * 100).toFixed(1) + '%' : '0%';
  const pctManoObra = granTotalGastoHist > 0 ? ((totalNomina / granTotalGastoHist) * 100).toFixed(1) + '%' : '0%';

  const ulPatronesGastos = document.getElementById('patronesGastosLista');
  if (ulPatronesGastos) {
    ulPatronesGastos.innerHTML = `
      <li class="pattern-item">?? <b>Principal Categor�a de Gasto:</b><br/>${granTotalGastoHist > 0 ? `${catMayorGasto} (${pctCatMayor} del gasto total)` : 'Sin gastos registrados a�n'}</li>
      <li class="pattern-item">?? <b>Peso de la Mano de Obra:</b><br/>Los trabajadores representan el <b>${pctManoObra}</b> de todos los gastos de la finca</li>
      <li class="pattern-item">?? <b>Materiales y Abono vs. Transporte:</b><br/>Materiales/Abono: ${formatoDinero(totalMatAbono)} | Transporte/Otros: ${formatoDinero(totalTranspOtros)}</li>
      <li class="pattern-item">?? <b>Ritmo de Gasto Total:</b><br/>Promedio de <b>${formatoDinero(promSemanalGastoTotal)}</b> por semana (${formatoDinero(promSemanalGastoTotal * (52/12))} al mes)</li>
    `;
  }

  const gridPredGastos = document.getElementById('gridPrediccionGastos');
  if (gridPredGastos) {
    gridPredGastos.innerHTML = horizontes.map(h => `
      <div class="pred-card">
        <h3>${h.titulo}</h3>
        <div class="pred-row">
          <span>?? Trabajadores:</span>
          <b style="color:#b45309;">${formatoDinero(promSemanalNomina * h.factor)}</b>
        </div>
        <div class="pred-row">
          <span>?? Materiales/Abono:</span>
          <b style="color:#b91c1c;">${formatoDinero(promSemanalMatAbono * h.factor)}</b>
        </div>
        <div class="pred-row">
          <span>?? Transporte/Otros:</span>
          <b style="color:#b91c1c;">${formatoDinero(promSemanalTranspOtros * h.factor)}</b>
        </div>
        <div class="pred-row pred-profit-row">
          <span>?? Gasto Total:</span>
          <span style="color:#991b1b;">${formatoDinero(promSemanalGastoTotal * h.factor)}</span>
        </div>
      </div>
    `).join('');
  }

  // =========================================================================
  // 3. PESTA�A #3: PATRONES Y PREDICCIONES DE COSECHA (PESO EN FINCA Y PESO SECO)
  // =========================================================================
  const mejorSectorCosecha = obtenerMaximoDeObjeto(cosechaSecoPorSector) || obtenerMaximoDeObjeto(cosechaFincaPorSector) || 'El Guineo';
  const mesMejorCosechaNum = obtenerMaximoDeObjeto(cosechaSecoPorMes);
  const nombreMesMejor = mesMejorCosechaNum ? NOMBRES_MESES[parseInt(mesMejorCosechaNum, 10) - 1] : '�';
  const pctRendimientoHist = totalCosechaFincaQQ > 0 ? ((totalCosechaSecoQQ / totalCosechaFincaQQ) * 100).toFixed(1) + '%' : '�';
  const lbSecasPorDiaHist = totalDiasEq > 0 ? Math.round((totalCosechaSecoQQ * 100) / totalDiasEq) : 0;

  const ulPatronesCosecha = document.getElementById('patronesCosechaLista');
  if (ulPatronesCosecha) {
    ulPatronesCosecha.innerHTML = `
      <li class="pattern-item">?? <b>Sector M�s Productivo:</b><br/>${totalCosechaSecoQQ > 0 ? `${mejorSectorCosecha} (Finca: ${cosechaFincaPorSector[mejorSectorCosecha].toFixed(2)} qq | Seco: ${cosechaSecoPorSector[mejorSectorCosecha].toFixed(2)} qq)` : 'Registra una cosecha arriba para ver el lote l�der'}</li>
      <li class="pattern-item">?? <b>Rendimiento Promedio de Secado:</b><br/>${totalCosechaFincaQQ > 0 ? `El cacao seco conserva el <b>${pctRendimientoHist}</b> del peso cosechado en finca` : 'Ingresa peso en finca y peso seco para calcular merma'}</li>
      <li class="pattern-item">??? <b>Mejor Mes de Cosecha:</b><br/>${mesMejorCosechaNum ? `${nombreMesMejor} (${cosechaSecoPorMes[mesMejorCosechaNum].toFixed(2)} qq secos)` : 'Registra cosechas para detectar temporada alta'}</li>
      <li class="pattern-item">? <b>Productividad por D�a Trabajado:</b><br/><b>${lbSecasPorDiaHist} libras de cacao seco</b> producidas por cada d�a de trabajo</li>
    `;
  }

  const gridPredCosecha = document.getElementById('gridPrediccionCosecha');
  if (gridPredCosecha) {
    gridPredCosecha.innerHTML = horizontes.map(h => {
      const fincaEstQQ = promSemanalCosechaFincaQQ * h.factor;
      const secoEstQQ = promSemanalCosechaSecoQQ * h.factor;
      const secoEstLB = Math.round(secoEstQQ * 100);
      return `
        <div class="pred-card">
          <h3>${h.titulo}</h3>
          <div class="pred-row">
            <span>?? Peso en Finca:</span>
            <b style="color:#854d0e;">${fincaEstQQ.toFixed(2)} qq</b>
          </div>
          <div class="pred-row">
            <span>?? Peso Seco (qq):</span>
            <b style="color:#14532d;">${secoEstQQ.toFixed(2)} qq</b>
          </div>
          <div class="pred-row pred-profit-row">
            <span>?? Libras Secas:</span>
            <span style="color:#14532d;">${secoEstLB.toLocaleString('en-US')} lb</span>
          </div>
        </div>
      `;
    }).join('');
  }

  const tbodyPredCosSec = document.getElementById('tablaPrediccionCosechaSectoresBody');
  if (tbodyPredCosSec) {
    tbodyPredCosSec.innerHTML = '';
    SECTORES.forEach(sec => {
      const fincaSemSec = (cosechaFincaPorSector[sec] || 0) / numSemanasCosechas;
      const secoSemSec = (cosechaSecoPorSector[sec] || 0) / numSemanasCosechas;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>${sec}</b></td>
        <td style="color:#854d0e; font-weight:800;">${formatoPeso(fincaSemSec * 52)}</td>
        <td style="color:#14532d; font-weight:900;">${formatoPeso(secoSemSec * 52)}</td>
        <td style="color:#854d0e; font-weight:800;">${formatoPeso(fincaSemSec * 52 * 5)}</td>
        <td style="color:#14532d; font-weight:900; font-size:21px;">${formatoPeso(secoSemSec * 52 * 5)}</td>
      `;
      tbodyPredCosSec.appendChild(tr);
    });
  }

  // =========================================================================
  // 4. PESTA�A #4: PATRONES Y PREDICCIONES DE VENTAS Y GANANCIAS
  // =========================================================================
  const precioPromQQ = totalQQ > 0 ? (totalVentas / totalQQ) : 0;
  const mejorSectorVentas = obtenerMaximoDeObjeto(ventasPorSector) || 'El Guineo';
  const gananciaTotalHist = totalVentas - granTotalGastoHist;
  const margenGananciaPct = totalVentas > 0 ? ((gananciaTotalHist / totalVentas) * 100).toFixed(1) + '%' : '0.0%';

  const ulPatronesVentas = document.getElementById('patronesVentasLista');
  if (ulPatronesVentas) {
    ulPatronesVentas.innerHTML = `
      <li class="pattern-item">?? <b>Precio Promedio y M�ximo por Quintal:</b><br/>Promedio: <b>${formatoDinero(precioPromQQ)}/qq</b> | M�ximo alcanzado: <b>${formatoDinero(precioMaximoQQ)}/qq</b></li>
      <li class="pattern-item">?? <b>Sector con Mayores Ingresos:</b><br/>${totalVentas > 0 ? `${mejorSectorVentas} (${formatoDinero(ventasPorSector[mejorSectorVentas])} vendidos)` : 'Registra tu primera venta arriba'}</li>
      <li class="pattern-item">?? <b>Margen de Ganancia de la Finca:</b><br/><b>${margenGananciaPct}</b> de las ventas queda como ganancia libre despu�s de pagar todo</li>
      <li class="pattern-item">?? <b>Promedio Semanal de Ganancia Libre:</b><br/><b>${formatoDinero(promSemanalGanancia)}</b> libres por semana (${formatoDinero(promSemanalGanancia * (52/12))} al mes)</li>
    `;
  }

  const gridPredVentas = document.getElementById('gridPrediccionVentas');
  if (gridPredVentas) {
    gridPredVentas.innerHTML = horizontes.map(h => {
      const vEst = promSemanalVentas * h.factor;
      const gEst = promSemanalGastoTotal * h.factor;
      const ganEst = promSemanalGanancia * h.factor;
      const colorGan = ganEst >= 0 ? '#14532d' : '#991b1b';
      return `
        <div class="pred-card">
          <h3>${h.titulo}</h3>
          <div class="pred-row">
            <span>?? Peso Estimado:</span>
            <b>${(promSemanalQQ * h.factor).toFixed(2)} qq</b>
          </div>
          <div class="pred-row">
            <span>?? Ventas Estimadas:</span>
            <b style="color:#15803d;">${formatoDinero(vEst)}</b>
          </div>
          <div class="pred-row">
            <span>?? Gastos Totales:</span>
            <b style="color:#b91c1c;">${formatoDinero(gEst)}</b>
          </div>
          <div class="pred-row pred-profit-row">
            <span>?? Ganancia Libre:</span>
            <span style="color:${colorGan};">${formatoDinero(ganEst)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  const tbody5 = document.getElementById('tablaPrediccion5AniosBody');
  if (tbody5) {
    tbody5.innerHTML = '';
    const anioActual = new Date().getFullYear();
    const F_ANIO = 52;

    const qqAnual = promSemanalQQ * F_ANIO;
    const ventasAnual = promSemanalVentas * F_ANIO;
    const nominaAnual = promSemanalNomina * F_ANIO;
    const gastosAnual = promSemanalGastosOtros * F_ANIO;
    const gananciaAnual = promSemanalGanancia * F_ANIO;

    for (let i = 1; i <= 5; i++) {
      const anioFuturo = anioActual + i;
      const colorG = gananciaAnual >= 0 ? '#14532d' : '#991b1b';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>${anioFuturo}</b></td>
        <td><b>${formatoPeso(qqAnual)}</b></td>
        <td style="color:#15803d; font-weight:800;">${formatoDinero(ventasAnual)}</td>
        <td style="color:#b45309; font-weight:800;">${formatoDinero(nominaAnual)}</td>
        <td style="color:#b91c1c; font-weight:800;">${formatoDinero(gastosAnual)}</td>
        <td style="color:${colorG}; font-weight:900; font-size:22px;">${formatoDinero(gananciaAnual)}</td>
      `;
      tbody5.appendChild(tr);
    }

    const trTotal5 = document.createElement('tr');
    trTotal5.style.backgroundColor = '#dcfce7';
    const colorTotal5 = (gananciaAnual * 5) >= 0 ? '#14532d' : '#991b1b';
    trTotal5.innerHTML = `
      <td><b style="font-size:22px; color:#14532d;">?? TOTAL 5 A�OS (${anioActual + 1} - ${anioActual + 5})</b></td>
      <td><b>${formatoPeso(qqAnual * 5)}</b></td>
      <td style="color:#15803d; font-weight:900; font-size:22px;">${formatoDinero(ventasAnual * 5)}</td>
      <td style="color:#b45309; font-weight:900; font-size:22px;">${formatoDinero(nominaAnual * 5)}</td>
      <td style="color:#b91c1c; font-weight:900; font-size:22px;">${formatoDinero(gastosAnual * 5)}</td>
      <td style="color:${colorTotal5}; font-weight:900; font-size:26px;">${formatoDinero(gananciaAnual * 5)}</td>
    `;
    tbody5.appendChild(trTotal5);
  }
}

function obtenerMaximoDeObjeto(obj) {
  let maxKey = '';
  let maxVal = 0;
  Object.keys(obj).forEach(k => {
    if (obj[k] > maxVal) {
      maxVal = obj[k];
      maxKey = k;
    }
  });
  return maxKey;
}

// ============================================================================
// DETECCI�N DE ANOMAL�AS Y N�MEROS QUE NO CUADRAN EN CADA PESTA�A (#1, #2, #3, #4, #5)
// ============================================================================

const seccionesReconocidasExpandidas = {};

function reconocerAnomalia(anomaliaId) {
  if (!estadoFinca.anomaliasReconocidas) {
    estadoFinca.anomaliasReconocidas = [];
  }
  if (!estadoFinca.anomaliasReconocidas.includes(anomaliaId)) {
    estadoFinca.anomaliasReconocidas.push(anomaliaId);
    guardarDatos();
    renderizarAnomaliasEnCadaPestana();
  }
}

function reactivarAnomalia(anomaliaId) {
  if (!estadoFinca.anomaliasReconocidas) return;
  estadoFinca.anomaliasReconocidas = estadoFinca.anomaliasReconocidas.filter(id => id !== anomaliaId);
  guardarDatos();
  renderizarAnomaliasEnCadaPestana();
}

function alternarSeccionAnomaliasReconocidas(contenedorId) {
  const sec = document.getElementById(`${contenedorId}_seccionReconocidas`);
  if (!sec) return;
  const estaVisible = sec.style.display === 'block';
  sec.style.display = estaVisible ? 'none' : 'block';
  seccionesReconocidasExpandidas[contenedorId] = !estaVisible;
  const btn = sec.previousElementSibling ? sec.previousElementSibling.querySelector('.btn-toggle-acknowledged') : null;
  if (btn) {
    btn.textContent = !estaVisible ? '? Ocultar Lista' : '? Ver Anomal�as Ocultas';
  }
}

function renderizarListaAnomaliasConReconocimiento(contenedorId, listaAlertas, textoTodoOk) {
  const ul = document.getElementById(contenedorId);
  if (!ul) return;

  const reconocidosSet = new Set(estadoFinca.anomaliasReconocidas || []);
  const activas = listaAlertas.filter(a => !reconocidosSet.has(a.id));
  const reconocidas = listaAlertas.filter(a => reconocidosSet.has(a.id));

  let htmlActivas = '';

  if (activas.length === 0) {
    if (listaAlertas.length === 0) {
      htmlActivas = `
        <li class="abnormality-item abnormality-ok">
          <span class="abnormality-title">? Todo en Orden</span>
          ${textoTodoOk}
        </li>
      `;
    } else {
      htmlActivas = `
        <li class="abnormality-item abnormality-ok">
          <span class="abnormality-title">? Todas las anomal�as han sido reconocidas</span>
          Has revisado y reconocido todas las alertas detectadas en esta secci�n. Puedes consultarlas o reactivarlas en la secci�n oculta abajo.
        </li>
      `;
    }
  } else {
    htmlActivas = activas.map(a => {
      const claseTipo = a.tipo === 'warning' ? 'abnormality-warning' : (a.tipo === 'info' ? 'abnormality-info' : 'abnormality-ok');
      return `
        <li class="abnormality-item ${claseTipo}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap;">
            <div style="flex:1; min-width:280px;">
              <span class="abnormality-title">${a.titulo}</span>
              <div>${a.detalle}</div>
            </div>
            <button type="button" class="btn-acknowledge" onclick="reconocerAnomalia('${a.id}')" title="Marcar como revisado y mover a la secci�n oculta">
              ??? Reconocer y Ocultar
            </button>
          </div>
        </li>
      `;
    }).join('');
  }

  let htmlReconocidas = '';
  if (reconocidas.length > 0) {
    const estaExpandida = Boolean(seccionesReconocidasExpandidas[contenedorId]);
    htmlReconocidas = `
      <li style="list-style:none; margin-top:16px;">
        <div style="background:#f8fafc; border:2px dashed #94a3b8; border-radius:12px; padding:16px 20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <span style="font-weight:900; color:#475569; font-size:19px;">
                ?? Anomal�as Reconocidas y Ocultas (${reconocidas.length})
              </span>
              <div style="font-size:16px; color:#64748b; font-weight:600;">
                Alertas que ya revisaste y decidiste ocultar de la vista principal.
              </div>
            </div>
            <button type="button" class="btn-toggle-acknowledged" onclick="alternarSeccionAnomaliasReconocidas('${contenedorId}')">
              ${estaExpandida ? '? Ocultar Lista' : '? Ver Anomal�as Ocultas'}
            </button>
          </div>
          <div id="${contenedorId}_seccionReconocidas" class="acknowledged-section" style="display:${estaExpandida ? 'block' : 'none'}; margin-top:14px;">
            ${reconocidas.map(r => `
              <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; padding:14px 18px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:flex-start; gap:14px; flex-wrap:wrap;">
                <div style="flex:1; min-width:260px;">
                  <b style="color:#475569; font-size:18px; display:block; margin-bottom:4px;">${r.titulo}</b>
                  <div style="font-size:16px; color:#64748b;">${r.detalle}</div>
                </div>
                <button type="button" class="btn-reactivate" style="background:#e0f2fe; color:#0369a1; border:2px solid #0284c7; padding:8px 14px; font-size:16px; border-radius:8px; font-weight:800; cursor:pointer;" onclick="reactivarAnomalia('${r.id}')" title="Volver a mostrar esta alerta en la lista principal">
                  ?? Reactivar
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </li>
    `;
  }

  ul.innerHTML = htmlActivas + htmlReconocidas;
}

function renderizarAnomaliasEnCadaPestana() {
  const movimientosHorarios = obtenerMovimientosDiariosDeHorarios();

  // =========================================================================
  // 1. ANOMAL�AS EN PESTA�A #1: EMPLEADOS Y HORARIO SEMANAL
  // =========================================================================
  const ulAnomEmp = document.getElementById('anomaliasEmpleadosLista');
  if (ulAnomEmp) {
    const alertasEmp = [];

    // A) Detectar si un mismo trabajador tiene m�s de 1 D�a Completo (o > 8 horas) el mismo d�a en distintos sectores
    const horasPorTrabYFecha = {};
    movimientosHorarios.forEach(mov => {
      const clave = `${mov.trabajadorId}__${mov.fecha}`;
      if (!horasPorTrabYFecha[clave]) {
        const trab = estadoFinca.trabajadores.find(t => t.id === mov.trabajadorId);
        horasPorTrabYFecha[clave] = {
          trabajadorId: mov.trabajadorId,
          nombre: trab ? trab.nombre : 'Trabajador',
          fecha: mov.fecha,
          diasEq: 0,
          horas: 0,
          sectores: []
        };
      }
      horasPorTrabYFecha[clave].diasEq += mov.diasEq;
      horasPorTrabYFecha[clave].horas += mov.horas;
      horasPorTrabYFecha[clave].sectores.push(mov.sector);
    });

    Object.values(horasPorTrabYFecha).forEach(item => {
      if (item.diasEq > 1) {
        alertasEmp.push({
          id: `emp_dup_${item.trabajadorId}_${item.fecha}`,
          tipo: 'warning',
          titulo: `?? Turno Duplicado en el Mismo D�a (${item.nombre})`,
          detalle: `El d�a <b>${formatearFechaCorta(item.fecha)}</b> aparece con <b>${item.diasEq} d�as (${item.horas} hrs)</b> en varios sectores al mismo tiempo (${item.sectores.join(', ')}). Revisa si se marc� dos veces por error.`
        });
      }
    });

    // B) Comparar horas y pago total por semana para detectar ca�das o subidas bruscas entre semanas
    const resumenPorSemanaEmp = {};
    Object.values(estadoFinca.horarios).forEach(reg => {
      const trab = estadoFinca.trabajadores.find(t => t.id === reg.trabajadorId);
      if (!trab || !reg.semanaLunes) return;
      const calc = calcularTotalesRegistroHorario(reg, trab);
      if (calc.totalHoras > 0 || calc.totalPagar > 0) {
        if (!resumenPorSemanaEmp[reg.semanaLunes]) {
          resumenPorSemanaEmp[reg.semanaLunes] = { horas: 0, pago: 0 };
        }
        resumenPorSemanaEmp[reg.semanaLunes].horas += calc.totalHoras;
        resumenPorSemanaEmp[reg.semanaLunes].pago += calc.totalPagar;
      }
    });

    const semanasEmpOrdenadas = Object.keys(resumenPorSemanaEmp).sort();
    if (semanasEmpOrdenadas.length >= 2) {
      const totalHorasSem = semanasEmpOrdenadas.reduce((acc, s) => acc + resumenPorSemanaEmp[s].horas, 0);
      const promHorasSem = totalHorasSem / semanasEmpOrdenadas.length;

      for (let i = 1; i < semanasEmpOrdenadas.length; i++) {
        const semAnt = semanasEmpOrdenadas[i - 1];
        const semAct = semanasEmpOrdenadas[i];
        const hAnt = resumenPorSemanaEmp[semAnt].horas;
        const hAct = resumenPorSemanaEmp[semAct].horas;
        const pAnt = resumenPorSemanaEmp[semAnt].pago;
        const pAct = resumenPorSemanaEmp[semAct].pago;

        if (hAnt > 0 && hAct < hAnt * 0.65) {
          const pctCaida = Math.round(((hAnt - hAct) / hAnt) * 100);
          alertasEmp.push({
            id: `emp_caida_${semAct}`,
            tipo: 'warning',
            titulo: `?? Ca�da Brusca de Trabajo Semanal (-${pctCaida}%)`,
            detalle: `En la semana <b>${formatearRangoSemanaNumerico(semAnt)}</b> se trabajaron <b>${hAnt} hrs (${formatoDinero(pAnt)})</b>, pero en la semana siguiente <b>${formatearRangoSemanaNumerico(semAct)}</b> baj� a solo <b>${hAct} hrs (${formatoDinero(pAct)})</b>. Verifica si faltan planillas por registrar.`
          });
        } else if (hAnt > 0 && hAct > hAnt * 1.5) {
          const pctSubida = Math.round(((hAct - hAnt) / hAnt) * 100);
          alertasEmp.push({
            id: `emp_subida_${semAct}`,
            tipo: 'warning',
            titulo: `?? Aumento Inusual de N�mina Semanal (+${pctSubida}%)`,
            detalle: `En la semana <b>${formatearRangoSemanaNumerico(semAct)}</b> el trabajo subi� a <b>${hAct} hrs (${formatoDinero(pAct)})</b> comparado con <b>${hAnt} hrs (${formatoDinero(pAnt)})</b> de la semana anterior (promedio habitual: ${promHorasSem.toFixed(0)} hrs/sem).`
          });
        }
      }
    }

    // C) Detectar sectores con d�as trabajados pero 0 cosecha registrada
    const diasPorSector = {};
    const cosechaPorSector = {};
    SECTORES.forEach(s => {
      diasPorSector[s] = 0;
      cosechaPorSector[s] = 0;
    });
    movimientosHorarios.forEach(m => {
      if (diasPorSector[m.sector] !== undefined) diasPorSector[m.sector] += m.diasEq;
    });
    (estadoFinca.cosechas || []).forEach(c => {
      if (cosechaPorSector[c.sector] !== undefined) {
        cosechaPorSector[c.sector] += Number(c.totalFincaQQ || 0) + Number(c.totalSecoQQ || 0);
      }
    });
    SECTORES.forEach(s => {
      if (diasPorSector[s] >= 2 && cosechaPorSector[s] === 0) {
        alertasEmp.push({
          id: `emp_sin_cos_${s}`,
          tipo: 'warning',
          titulo: `?? Trabajo Registrado sin Cosecha en "${s}"`,
          detalle: `Se han pagado <b>${diasPorSector[s]} d�as de trabajo</b> en el sector <b>${s}</b>, pero en Estad�sticas de Cosecha aparece con <b>0.00 qq cosechados</b>. Verifica si falta anotar la cosecha de ese lote.`
        });
      }
    });

    // D) Detectar tarifas incoherentes (Medio d�a mayor o igual a D�a completo)
    estadoFinca.trabajadores.forEach(t => {
      const full = Number(t.tarifaDiaCompleto || 0);
      const half = Number(t.tarifaMedioDia || 0);
      if (full <= 0 || half <= 0) {
        alertasEmp.push({
          id: `emp_tarifa_cero_${t.id}`,
          tipo: 'warning',
          titulo: `?? Tarifa en $0.00 para ${t.nombre}`,
          detalle: `El trabajador <b>${t.nombre}</b> tiene una tarifa en cero (D�a: ${formatoDinero(full)} / Medio D�a: ${formatoDinero(half)}).`
        });
      } else if (half >= full) {
        alertasEmp.push({
          id: `emp_tarifa_medio_${t.id}`,
          tipo: 'warning',
          titulo: `?? Tarifa de Medio D�a no cuadra (${t.nombre})`,
          detalle: `La tarifa de Medio D�a (${formatoDinero(half)}) es igual o mayor que la de D�a Completo (${formatoDinero(full)}).`
        });
      } else if (Math.abs(half - full / 2) > 2) {
        alertasEmp.push({
          id: `emp_tarifa_rev_${t.id}`,
          tipo: 'info',
          titulo: `?? Revisi�n de Tarifa (${t.nombre})`,
          detalle: `D�a Completo es <b>${formatoDinero(full)}</b> y Medio D�a es <b>${formatoDinero(half)}</b> (la mitad exacta ser�a ${formatoDinero(full / 2)}).`
        });
      }
    });

    // E) Planillas con horas anotadas pero que a�n no se han enviado con el bot�n de guardar
    let sinEnviar = 0;
    Object.values(estadoFinca.horarios).forEach(reg => {
      const trab = estadoFinca.trabajadores.find(t => t.id === reg.trabajadorId);
      if (!trab) return;
      const calc = calcularTotalesRegistroHorario(reg, trab);
      if (calc.totalHoras > 0 && !reg.enviado && !reg.firmado) {
        sinEnviar++;
      }
    });
    if (sinEnviar > 0) {
      alertasEmp.push({
        id: 'emp_sin_enviar',
        tipo: 'info',
        titulo: `?? ${sinEnviar} Planilla(s) en Edici�n sin Enviar`,
        detalle: `Hay <b>${sinEnviar} hoja(s) de horario</b> con turnos marcados que a�n dicen "En edici�n". Recuerda presionar <b>"? ENVIAR Y GUARDAR PLANILLA"</b> cuando termines la semana.`
      });
    }

    renderizarListaAnomaliasConReconocimiento(
      'anomaliasEmpleadosLista',
      alertasEmp,
      'No se detectaron turnos duplicados, tarifas err�neas ni ca�das bruscas de horas entre semanas.'
    );
  }

  // =========================================================================
  // 2. ANOMAL�AS EN PESTA�A #2: GASTOS (TRABAJADORES, MATERIALES, TRANSPORTE, ETC.)
  // =========================================================================
  const ulAnomGas = document.getElementById('anomaliasGastosLista');
  if (ulAnomGas) {
    const alertasGas = [];

    const totalNomina = movimientosHorarios.reduce((acc, m) => acc + m.costo, 0);
    const totalOtrosGastos = estadoFinca.gastos.reduce((acc, g) => acc + Number(g.monto || 0), 0);
    const granTotalGastos = totalNomina + totalOtrosGastos;
    const totalVentasDinero = estadoFinca.ventas.reduce((acc, v) => acc + Number(v.totalDinero || 0), 0);

    // A) Gastos totales superan las ventas totales
    if (granTotalGastos > totalVentasDinero && granTotalGastos > 0) {
      alertasGas.push({
        id: 'gas_sup_ventas',
        tipo: 'warning',
        titulo: `?? Gastos Totales Superan a las Ventas (${formatoDinero(granTotalGastos)} vs ${formatoDinero(totalVentasDinero)})`,
        detalle: `El total de gastos acumulados (N�mina: ${formatoDinero(totalNomina)} + Materiales/Otros: ${formatoDinero(totalOtrosGastos)}) es mayor que los ingresos por ventas de cacao seco. D�ficit actual: <b>${formatoDinero(totalVentasDinero - granTotalGastos)}</b>.`
      });
    }

    // B) Comparar gasto semanal para detectar semanas donde el gasto se dispar�
    const gastosPorSemana = {};
    movimientosHorarios.forEach(m => {
      gastosPorSemana[m.semanaLunes] = (gastosPorSemana[m.semanaLunes] || 0) + m.costo;
    });
    estadoFinca.gastos.forEach(g => {
      const lun = obtenerLunesDeFecha(g.fecha);
      gastosPorSemana[lun] = (gastosPorSemana[lun] || 0) + Number(g.monto || 0);
    });

    const semanasGasOrd = Object.keys(gastosPorSemana).sort();
    if (semanasGasOrd.length >= 2) {
      const promSemGas = semanasGasOrd.reduce((a, s) => a + gastosPorSemana[s], 0) / semanasGasOrd.length;
      semanasGasOrd.forEach(sem => {
        const montoSem = gastosPorSemana[sem];
        if (promSemGas > 0 && montoSem > promSemGas * 1.45) {
          const pctExtra = Math.round(((montoSem - promSemGas) / promSemGas) * 100);
          alertasGas.push({
            id: `gas_pico_${sem}`,
            tipo: 'warning',
            titulo: `?? Pico Inusual de Gastos en la Semana ${formatearRangoSemanaNumerico(sem)} (+${pctExtra}%)`,
            detalle: `En esa semana se gastaron <b>${formatoDinero(montoSem)}</b>, mientras que el gasto promedio por semana es de <b>${formatoDinero(promSemGas)}</b>. Revisa qu� compras o pagos extraordinarios ocurrieron.`
          });
        }
      });
    }

    // C) Detectar compras individuales fuera de lo com�n (m�s del doble del gasto promedio por compra)
    if (estadoFinca.gastos.length >= 2) {
      const promCompra = totalOtrosGastos / estadoFinca.gastos.length;
      estadoFinca.gastos.forEach(g => {
        const m = Number(g.monto || 0);
        if (m >= promCompra * 1.8 && m >= 100) {
          alertasGas.push({
            id: `gas_alto_${g.id}`,
            tipo: 'warning',
            titulo: `?? Gasto Individual Muy Alto: ${formatoDinero(m)} (${g.categoria})`,
            detalle: `El <b>${formatearFechaCorta(g.fecha)}</b> en <b>${g.sector || 'Toda la Finca'}</b> se registr� <b>"${g.descripcion || g.concepto || g.categoria}"</b> por <b>${formatoDinero(m)}</b>, casi el doble del promedio por gasto (${formatoDinero(promCompra)}).`
          });
        }
      });
    }

    // D) Gastos de materiales/abono en sectores que tienen 0 cosecha registrada
    const gastoPorSector = {};
    estadoFinca.gastos.forEach(g => {
      if (SECTORES.includes(g.sector)) {
        gastoPorSector[g.sector] = (gastoPorSector[g.sector] || 0) + Number(g.monto || 0);
      }
    });
    SECTORES.forEach(sec => {
      const cosechaSec = (estadoFinca.cosechas || [])
        .filter(c => c.sector === sec)
        .reduce((acc, c) => acc + Number(c.totalFincaQQ || 0) + Number(c.totalSecoQQ || 0), 0);
      if ((gastoPorSector[sec] || 0) > 0 && cosechaSec === 0) {
        alertasGas.push({
          id: `gas_sin_cos_${sec}`,
          tipo: 'info',
          titulo: `?? Gastos en "${sec}" (${formatoDinero(gastoPorSector[sec])}) sin Cosecha Registrada`,
          detalle: `Se han invertido <b>${formatoDinero(gastoPorSector[sec])}</b> en materiales/insumos para <b>${sec}</b>, pero ese sector a�n tiene <b>0.00 qq</b> de cosecha registrada.`
        });
      }
    });

    renderizarListaAnomaliasConReconocimiento(
      'anomaliasGastosLista',
      alertasGas,
      'No se detectaron sobrecostos bruscos ni compras fuera de lo normal en la finca.'
    );
  }

  // =========================================================================
  // 3. ANOMAL�AS EN PESTA�A #3: ESTAD�STICAS DE COSECHA (CA�DAS DE PRODUCCI�N Y SECADO)
  // =========================================================================
  const ulAnomCos = document.getElementById('anomaliasCosechaLista');
  if (ulAnomCos) {
    const alertasCos = [];
    const listaCosechas = estadoFinca.cosechas || [];

    // A) Comparar cosecha semana a semana (Ej: cosechar 3 toneladas / 60 qq una semana y 1 tonelada / 20 qq la siguiente)
    const cosechaPorSemana = {};
    listaCosechas.forEach(c => {
      const lun = obtenerLunesDeFecha(c.fecha);
      if (!cosechaPorSemana[lun]) {
        cosechaPorSemana[lun] = { fincaQQ: 0, secoQQ: 0, registros: 0 };
      }
      cosechaPorSemana[lun].fincaQQ += Number(c.totalFincaQQ || 0);
      cosechaPorSemana[lun].secoQQ += Number(c.totalSecoQQ || 0);
      cosechaPorSemana[lun].registros += 1;
    });

    const semanasCosOrd = Object.keys(cosechaPorSemana).sort();
    if (semanasCosOrd.length >= 2) {
      const sumaFincaSem = semanasCosOrd.reduce((acc, s) => acc + cosechaPorSemana[s].fincaQQ, 0);
      const promFincaSem = sumaFincaSem / semanasCosOrd.length;

      for (let i = 1; i < semanasCosOrd.length; i++) {
        const semAnt = semanasCosOrd[i - 1];
        const semAct = semanasCosOrd[i];
        const fAnt = cosechaPorSemana[semAnt].fincaQQ;
        const fAct = cosechaPorSemana[semAct].fincaQQ;

        if (fAnt > 0 && fAct < fAnt * 0.70) {
          const pctCaida = Math.round(((fAnt - fAct) / fAnt) * 100);
          const tonAnt = (fAnt / 20).toFixed(2);
          const tonAct = (fAct / 20).toFixed(2);
          alertasCos.push({
            id: `cos_caida_${semAct}`,
            tipo: 'warning',
            titulo: `?? Ca�da Brusca de Cosecha Entre Semanas (-${pctCaida}%)`,
            detalle: `En la semana <b>${formatearRangoSemanaNumerico(semAnt)}</b> se cosecharon <b>${formatoPeso(fAnt)} (~${tonAnt} Toneladas)</b> en finca, pero en la semana siguiente <b>${formatearRangoSemanaNumerico(semAct)}</b> cay� a solo <b>${formatoPeso(fAct)} (~${tonAct} Toneladas)</b>. (Promedio habitual: ${promFincaSem.toFixed(2)} qq/semana). Revisa si falt� anotar alg�n sector o si hubo plaga/clima adverso.`
          });
        } else if (fAnt > 0 && fAct > fAnt * 1.50) {
          const pctSubida = Math.round(((fAct - fAnt) / fAnt) * 100);
          alertasCos.push({
            id: `cos_subida_${semAct}`,
            tipo: 'info',
            titulo: `?? Subida Fuerte de Cosecha Semanal (+${pctSubida}%)`,
            detalle: `En la semana <b>${formatearRangoSemanaNumerico(semAct)}</b> la cosecha subi� a <b>${formatoPeso(fAct)}</b> frente a <b>${formatoPeso(fAnt)}</b> de la semana previa.`
          });
        }
      }
    }

    // B) Revisar cada registro de cosecha para detectar n�meros imposibles o mermas anormales en el secado
    listaCosechas.forEach(c => {
      const fQQ = Number(c.totalFincaQQ || 0);
      const sQQ = Number(c.totalSecoQQ || 0);

      if (sQQ > 0 && sQQ > fQQ) {
        alertasCos.push({
          id: `cos_err_peso_${c.id}`,
          tipo: 'warning',
          titulo: `? Error de Peso en "${c.sector}" (${formatearFechaCorta(c.fecha)}): Peso Seco Mayor que Peso en Finca`,
          detalle: `El peso despu�s de secar (<b>${formatoPeso(sQQ)}</b>) es mayor que el peso cosechado en la finca (<b>${formatoPeso(fQQ)}</b>). Eso no es posible f�sicamente porque el cacao pierde agua al secarse. Corrige el peso en la tabla de abajo.`
        });
      } else if (sQQ > 0 && fQQ > 0) {
        const pctSeco = (sQQ / fQQ) * 100;
        if (pctSeco < 28) {
          alertasCos.push({
            id: `cos_perd_exc_${c.id}`,
            tipo: 'warning',
            titulo: `?? P�rdida Excesiva al Secar en "${c.sector}" (${formatearFechaCorta(c.fecha)}): Solo rindi� ${pctSeco.toFixed(1)}%`,
            detalle: `De <b>${formatoPeso(fQQ)}</b> en finca solo quedaron <b>${formatoPeso(sQQ)}</b> secos (lo normal es entre 33% y 48%). Se perdi� demasiado peso; revisa si hubo cacao da�ado, p�rdida en tendal o error al anotar.`
          });
        } else if (pctSeco > 68) {
          alertasCos.push({
            id: `cos_rend_alto_${c.id}`,
            tipo: 'warning',
            titulo: `?? Rendimiento de Secado Inusualmente Alto en "${c.sector}" (${formatearFechaCorta(c.fecha)}): ${pctSeco.toFixed(1)}%`,
            detalle: `De <b>${formatoPeso(fQQ)}</b> en finca se anotaron <b>${formatoPeso(sQQ)}</b> secos (${pctSeco.toFixed(1)}%). Verifica si el cacao a�n estaba h�medo al pesarlo o si el peso en finca fue mayor.`
          });
        }
      }
    });

    // C) Comparar producci�n entre sectores para avisar si un lote est� rindiendo muy por debajo del promedio
    const fincaPorSector = {};
    SECTORES.forEach(s => { fincaPorSector[s] = 0; });
    listaCosechas.forEach(c => {
      if (fincaPorSector[c.sector] !== undefined) {
        fincaPorSector[c.sector] += Number(c.totalFincaQQ || 0);
      }
    });
    const totalFincaTodos = Object.values(fincaPorSector).reduce((a, b) => a + b, 0);
    const promPorSector = totalFincaTodos / SECTORES.length;
    if (totalFincaTodos > 0) {
      SECTORES.forEach(sec => {
        const val = fincaPorSector[sec];
        if (val === 0) {
          alertasCos.push({
            id: `cos_cero_${sec}`,
            tipo: 'warning',
            titulo: `?? Sector "${sec}" Tiene 0.00 qq de Cosecha Registrada`,
            detalle: `Mientras que el promedio por lote es de <b>${formatoPeso(promPorSector)}</b>, en <b>${sec}</b> no se ha registrado ninguna cosecha todav�a.`
          });
        } else if (val < promPorSector * 0.55) {
          const pctBajo = Math.round(((promPorSector - val) / promPorSector) * 100);
          alertasCos.push({
            id: `cos_baja_${sec}`,
            tipo: 'warning',
            titulo: `?? Baja Producci�n en Sector "${sec}" (-${pctBajo}% debajo del promedio)`,
            detalle: `El sector <b>${sec}</b> solo ha cosechado <b>${formatoPeso(val)}</b> en finca, muy por debajo del promedio de los lotes (<b>${formatoPeso(promPorSector)}</b>).`
          });
        }
      });
    }

    // D) Cosechas pendientes de secado
    const pendientesSecado = listaCosechas.filter(c => Number(c.totalSecoQQ || 0) <= 0);
    if (pendientesSecado.length > 0) {
      const qqPendientesFinca = pendientesSecado.reduce((a, c) => a + Number(c.totalFincaQQ || 0), 0);
      alertasCos.push({
        id: 'cos_pend_secado',
        tipo: 'info',
        titulo: `? ${pendientesSecado.length} Cosecha(s) Pendiente(s) de Anotar Peso Seco`,
        detalle: `Hay <b>${formatoPeso(qqPendientesFinca)}</b> cosechados en finca que a�n tienen el Peso Seco en <b>0.00 qq</b>. Cuando terminen de secarse en el tendal, ed�talos en la tabla de abajo.`
      });
    }

    renderizarListaAnomaliasConReconocimiento(
      'anomaliasCosechaLista',
      alertasCos,
      'Los pesos en finca, pesos secos y rendimientos por sector cuadran correctamente sin ca�das anormales.'
    );
  }

  // =========================================================================
  // 4. ANOMAL�AS EN PESTA�A #4: VENTAS DE CACAO SECO vs. COSECHA SECA
  // =========================================================================
  const ulAnomVen = document.getElementById('anomaliasVentasLista');
  if (ulAnomVen) {
    const alertasVen = [];
    const listaCosechas = estadoFinca.cosechas || [];
    const listaVentas = estadoFinca.ventas || [];

    const totalCosechaSecoQQ = listaCosechas.reduce((acc, c) => acc + Number(c.totalSecoQQ || 0), 0);
    const totalVentasQQ = listaVentas.reduce((acc, v) => acc + Number(v.totalQuintales || 0), 0);
    const totalVentasDinero = listaVentas.reduce((acc, v) => acc + Number(v.totalDinero || 0), 0);

    // A) Comparar total de Cacao Seco Vendido vs. Cacao Seco Cosechado en toda la finca
    if (totalVentasQQ > totalCosechaSecoQQ + 0.05) {
      const excesoQQ = totalVentasQQ - totalCosechaSecoQQ;
      alertasVen.push({
        id: 'ven_supera_cosecha',
        tipo: 'warning',
        titulo: `?? Ventas Superan al Cacao Seco Cosechado (+${formatoPeso(excesoQQ)} de diferencia)`,
        detalle: `En Ventas figuran <b>${formatoPeso(totalVentasQQ)}</b> vendidos, pero en Estad�sticas de Cosecha solo hay <b>${formatoPeso(totalCosechaSecoQQ)}</b> de cacao seco registrado. Falta anotar peso seco en la Pesta�a #3 o se duplic� una venta.`
      });
    } else if (totalCosechaSecoQQ > totalVentasQQ + 0.05) {
      const sobranteQQ = totalCosechaSecoQQ - totalVentasQQ;
      alertasVen.push({
        id: 'ven_sobrante_bodega',
        tipo: 'info',
        titulo: `?? Cacao Seco en Bodega Sin Vender: ${formatoPeso(sobranteQQ)}`,
        detalle: `Se han cosechado y secado <b>${formatoPeso(totalCosechaSecoQQ)}</b> en la Pesta�a #3, y hasta ahora se han vendido <b>${formatoPeso(totalVentasQQ)}</b>. Quedan <b>${formatoPeso(sobranteQQ)}</b> disponibles o pendientes de registrar en ventas.`
      });
    }

    // B) Comparar Cacao Seco Vendido vs. Cacao Seco Cosechado POR SECTOR
    SECTORES.forEach(sec => {
      const secoCosSec = listaCosechas
        .filter(c => c.sector === sec)
        .reduce((acc, c) => acc + Number(c.totalSecoQQ || 0), 0);
      const secoVenSec = listaVentas
        .filter(v => v.sector === sec)
        .reduce((acc, v) => acc + Number(v.totalQuintales || 0), 0);

      if (secoVenSec > secoCosSec + 0.05) {
        const dif = secoVenSec - secoCosSec;
        alertasVen.push({
          id: `ven_descuadre_${sec}`,
          tipo: 'warning',
          titulo: `?? Descuadre en Sector "${sec}": Se vendi� m�s de lo cosechado (+${formatoPeso(dif)})`,
          detalle: `Del sector <b>${sec}</b> aparecen vendidos <b>${formatoPeso(secoVenSec)}</b> de cacao seco, pero en la Pesta�a #3 ese lote solo tiene <b>${formatoPeso(secoCosSec)}</b> secos registrados.`
        });
      }
    });

    // C) Detectar ventas con precio por quintal inusualmente bajo o alto
    if (listaVentas.length >= 2 && totalVentasQQ > 0) {
      const precioProm = totalVentasDinero / totalVentasQQ;
      listaVentas.forEach(v => {
        const p = Number(v.precioPorQQ || 0);
        if (p < precioProm * 0.85) {
          const pctBajo = Math.round(((precioProm - p) / precioProm) * 100);
          alertasVen.push({
            id: `ven_precio_bajo_${v.id}`,
            tipo: 'warning',
            titulo: `?? Precio de Venta Bajo el Promedio (${formatoDinero(p)}/qq el ${formatearFechaCorta(v.fecha)})`,
            detalle: `La venta de <b>${formatoPeso(v.totalQuintales)}</b> a <b>${v.comprador || 'Comprador'}</b> se registr� a <b>${formatoDinero(p)}/qq</b>, que es un <b>${pctBajo}% menor</b> al precio promedio de la finca (${formatoDinero(precioProm)}/qq).`
          });
        } else if (p > precioProm * 1.25) {
          const pctAlto = Math.round(((p - precioProm) / precioProm) * 100);
          alertasVen.push({
            id: `ven_precio_alto_${v.id}`,
            tipo: 'info',
            titulo: `?? Precio de Venta Superior al Promedio (${formatoDinero(p)}/qq el ${formatearFechaCorta(v.fecha)})`,
            detalle: `Venta registrada un <b>+${pctAlto}%</b> por encima del promedio habitual (${formatoDinero(precioProm)}/qq).`
          });
        }
      });
    }

    // D) Comparar ventas semana a semana para detectar ca�das bruscas de ingresos
    const ventasPorSem = {};
    listaVentas.forEach(v => {
      const lun = obtenerLunesDeFecha(v.fecha);
      if (!ventasPorSem[lun]) ventasPorSem[lun] = { qq: 0, dinero: 0 };
      ventasPorSem[lun].qq += Number(v.totalQuintales || 0);
      ventasPorSem[lun].dinero += Number(v.totalDinero || 0);
    });
    const semVenOrd = Object.keys(ventasPorSem).sort();
    if (semVenOrd.length >= 2) {
      for (let i = 1; i < semVenOrd.length; i++) {
        const sAnt = semVenOrd[i - 1];
        const sAct = semVenOrd[i];
        const qAnt = ventasPorSem[sAnt].qq;
        const qAct = ventasPorSem[sAct].qq;
        if (qAnt > 0 && qAct < qAnt * 0.65) {
          const pctCaida = Math.round(((qAnt - qAct) / qAnt) * 100);
          alertasVen.push({
            id: `ven_caida_${sAct}`,
            tipo: 'warning',
            titulo: `?? Ca�da de Ventas Semanales (-${pctCaida}%)`,
            detalle: `En la semana <b>${formatearRangoSemanaNumerico(sAnt)}</b> se vendieron <b>${formatoPeso(qAnt)} (${formatoDinero(ventasPorSem[sAnt].dinero)})</b>, pero en la semana <b>${formatearRangoSemanaNumerico(sAct)}</b> baj� a <b>${formatoPeso(qAct)} (${formatoDinero(ventasPorSem[sAct].dinero)})</b>.`
          });
        }
      }
    }

    renderizarListaAnomaliasConReconocimiento(
      'anomaliasVentasLista',
      alertasVen,
      'El peso de cacao seco vendido coincide con la cosecha seca y los precios est�n dentro del rango normal.'
    );
  }

  // =========================================================================
  // 5. ANOMAL�AS EN PESTA�A #5: BALANCE POR SECTOR (COSTOS, INGRESOS Y GANANCIAS)
  // =========================================================================
  const ulAnomSec = document.getElementById('anomaliasSectoresLista');
  if (ulAnomSec) {
    const alertasSec = [];
    const infoSectores = calcularEstadisticasDetalladasPorSector(() => true);

    SECTORES.forEach(sec => {
      const st = infoSectores[sec];
      if (!st) return;

      // A) Sector con balance negativo (p�rdidas)
      if (st.ganancia < 0) {
        alertasSec.push({
          id: `sec_perdida_${sec}`,
          tipo: 'warning',
          titulo: `?? Sector "${sec}" est� Operando a P�rdida (${formatoDinero(st.ganancia)})`,
          detalle: `En <b>${sec}</b> los costos totales (${formatoDinero(st.costoTotal)}: Mano de obra ${formatoDinero(st.costoManoObra)} + Insumos ${formatoDinero(st.costoInsumos)}) superan a las ventas de cacao seco (${formatoDinero(st.ingresosVentas)}). Hay un d�ficit de <b>${formatoDinero(Math.abs(st.ganancia))}</b>.`
        });
      }

      // B) Sector con muchos d�as de trabajo pero sin ventas ni cosecha
      if (st.diasEquivalentes >= 2 && st.cacaoSecoVendidoQQ === 0 && st.cacaoSecoCosechadoQQ === 0) {
        alertasSec.push({
          id: `sec_trab_sin_prod_${sec}`,
          tipo: 'warning',
          titulo: `?? Mucho Trabajo sin Producci�n en "${sec}" (${st.diasEquivalentes} d�as trabajados)`,
          detalle: `Se han invertido <b>${st.diasEquivalentes} d�as de trabajo (${formatoDinero(st.costoManoObra)})</b> en <b>${sec}</b>, pero tiene <b>0.00 qq cosechados</b> y <b>$0.00 en ventas</b>.`
        });
      }

      // C) Sector con cacao cosechado seco pero nada vendido
      if (st.cacaoSecoCosechadoQQ > 0 && st.cacaoSecoVendidoQQ === 0) {
        alertasSec.push({
          id: `sec_listo_sin_ven_${sec}`,
          tipo: 'info',
          titulo: `?? Cacao Seco Listo Sin Vender en "${sec}" (${formatoPeso(st.cacaoSecoCosechadoQQ)})`,
          detalle: `El sector <b>${sec}</b> tiene <b>${formatoPeso(st.cacaoSecoCosechadoQQ)}</b> de cacao seco cosechado listo para generar ingresos, pero a�n no se ha registrado ninguna venta para este lote.`
        });
      }

      // D) Costos de mano de obra representan m�s del 80% de los ingresos
      if (st.ingresosVentas > 0 && st.costoManoObra > st.ingresosVentas * 0.8) {
        const pctMano = Math.round((st.costoManoObra / st.ingresosVentas) * 100);
        alertasSec.push({
          id: `sec_costo_mano_${sec}`,
          tipo: 'warning',
          titulo: `?? Alto Costo de Mano de Obra en "${sec}" (${pctMano}% de las ventas)`,
          detalle: `De <b>${formatoDinero(st.ingresosVentas)}</b> vendidos en <b>${sec}</b>, <b>${formatoDinero(st.costoManoObra)}</b> se fueron en pago a trabajadores, dejando poco margen libre.`
        });
      }
    });

    renderizarListaAnomaliasConReconocimiento(
      'anomaliasSectoresLista',
      alertasSec,
      'Todos los lotes (El Guineo, La Fortuna, El Guabo 1, Guabo 2) presentan balances positivos o dentro de rangos normales de operaci�n.'
    );
  }
}

// ============================================================================
// PESTA�A #5 (VERDE CLARO): BALANCE POR SECTOR (COSTOS, INGRESOS Y GANANCIAS)
// ============================================================================

let modoReporteSectorActual = 'HISTORIAL'; // 'HISTORIAL' | 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'ANUAL'

function cambiarModoReporteSector(nuevoModo) {
  modoReporteSectorActual = nuevoModo;
  ['HISTORIAL', 'DIARIO', 'SEMANAL', 'MENSUAL', 'ANUAL'].forEach(m => {
    const btn = document.getElementById(`btnModoSector-${m}`);
    if (btn) btn.classList.toggle('active', m === nuevoModo);
  });

  const contenedorAnio = document.getElementById('contenedorFiltroAnioSector');
  const contenedorMes = document.getElementById('contenedorFiltroMesSector');
  const contenedorDia = document.getElementById('contenedorFiltroDiaSector');

  if (nuevoModo === 'HISTORIAL') {
    if (contenedorAnio) contenedorAnio.style.display = 'none';
    if (contenedorMes) contenedorMes.style.display = 'none';
    if (contenedorDia) contenedorDia.style.display = 'none';
  } else if (nuevoModo === 'DIARIO') {
    if (contenedorAnio) contenedorAnio.style.display = 'inline-flex';
    if (contenedorMes) contenedorMes.style.display = 'inline-flex';
    if (contenedorDia) contenedorDia.style.display = 'inline-flex';
  } else if (nuevoModo === 'SEMANAL') {
    if (contenedorAnio) contenedorAnio.style.display = 'inline-flex';
    if (contenedorMes) contenedorMes.style.display = 'inline-flex';
    if (contenedorDia) contenedorDia.style.display = 'none';
  } else if (nuevoModo === 'MENSUAL') {
    if (contenedorAnio) contenedorAnio.style.display = 'inline-flex';
    if (contenedorMes) contenedorMes.style.display = 'inline-flex';
    if (contenedorDia) contenedorDia.style.display = 'none';
  } else if (nuevoModo === 'ANUAL') {
    if (contenedorAnio) contenedorAnio.style.display = 'inline-flex';
    if (contenedorMes) contenedorMes.style.display = 'none';
    if (contenedorDia) contenedorDia.style.display = 'none';
  }

  renderizarBalanceSectores();
}

function calcularEstadisticasDetalladasPorSector(filtroFechaFn) {
  const sectoresObj = obtenerSectoresConPorcentajes();
  const info = {};

  sectoresObj.forEach(s => {
    info[s.nombre] = {
      sector: s.nombre,
      acres: s.acres,
      porcentaje: s.porcentaje,
      cacaoFincaCosechadoQQ: 0,
      cacaoSecoCosechadoQQ: 0,
      cacaoSecoVendidoQQ: 0,
      ingresosVentas: 0,
      diasEquivalentes: 0,
      horasTrabajadas: 0,
      costoManoObra: 0,
      costoInsumosDirecto: 0,
      costoInsumosCompartido: 0,
      costoInsumos: 0,
      costoTotal: 0,
      ganancia: 0,
      margenPct: 0
    };
  });

  const totalAcresGeneral = sectoresObj.reduce((acc, s) => acc + s.acres, 0);

  info['Toda la Finca'] = {
    sector: 'Toda la Finca',
    acres: totalAcresGeneral,
    porcentaje: 100,
    cacaoFincaCosechadoQQ: 0,
    cacaoSecoCosechadoQQ: 0,
    cacaoSecoVendidoQQ: 0,
    ingresosVentas: 0,
    diasEquivalentes: 0,
    horasTrabajadas: 0,
    costoManoObra: 0,
    costoInsumosDirecto: 0,
    costoInsumosCompartido: 0,
    costoInsumos: 0,
    costoTotal: 0,
    ganancia: 0,
    margenPct: 0
  };

  // 1. Cosecha
  (estadoFinca.cosechas || []).forEach(c => {
    if (filtroFechaFn(c.fecha)) {
      const fQQ = Number(c.totalFincaQQ || 0);
      const sQQ = Number(c.totalSecoQQ || 0);
      const sec = info[c.sector] ? c.sector : 'Toda la Finca';
      info[sec].cacaoFincaCosechadoQQ += fQQ;
      info[sec].cacaoSecoCosechadoQQ += sQQ;
    }
  });

  // 2. Ventas
  (estadoFinca.ventas || []).forEach(v => {
    if (filtroFechaFn(v.fecha)) {
      const qq = Number(v.totalQuintales || 0);
      const dinero = Number(v.totalDinero || 0);
      const sec = info[v.sector] ? v.sector : 'Toda la Finca';
      info[sec].cacaoSecoVendidoQQ += qq;
      info[sec].ingresosVentas += dinero;
    }
  });

  // 3. Mano de Obra (Horarios)
  const movimientosHorarios = obtenerMovimientosDiariosDeHorarios();
  movimientosHorarios.forEach(m => {
    if (filtroFechaFn(m.fecha)) {
      const sec = info[m.sector] ? m.sector : 'Toda la Finca';
      info[sec].diasEquivalentes += m.diasEq;
      info[sec].horasTrabajadas += m.horas;
      info[sec].costoManoObra += m.costo;
    }
  });

  // 4. Insumos y Gastos directos o compartidos ("Toda la Finca")
  (estadoFinca.gastos || []).forEach(g => {
    if (filtroFechaFn(g.fecha)) {
      const monto = Number(g.monto || 0);
      const sec = g.sector || 'Toda la Finca';
      if (sec === 'Toda la Finca' || !info[sec]) {
        // Gasto general para Toda la Finca: se reparte proporcionalmente a cada sector seg�n su % de tama�o (acres)
        sectoresObj.forEach(s => {
          const cuota = monto * (s.porcentaje / 100);
          info[s.nombre].costoInsumosCompartido += cuota;
          info[s.nombre].costoInsumos += cuota;
        });
        info['Toda la Finca'].costoInsumosDirecto += monto;
        info['Toda la Finca'].costoInsumos += monto;
      } else {
        info[sec].costoInsumosDirecto += monto;
        info[sec].costoInsumos += monto;
      }
    }
  });

  // Totales de costo, ganancia y margen
  [...SECTORES, 'Toda la Finca'].forEach(s => {
    if (!info[s]) return;
    const item = info[s];
    item.costoTotal = item.costoManoObra + item.costoInsumos;
    item.ganancia = item.ingresosVentas - item.costoTotal;
    item.margenPct = item.ingresosVentas > 0
      ? (item.ganancia / item.ingresosVentas) * 100
      : (item.costoTotal > 0 ? -100 : 0);
  });

  return info;
}

function renderizarBalanceSectores() {
  const anioFiltro = document.getElementById('filtroAnioSector') ? document.getElementById('filtroAnioSector').value : 'TODOS';
  const mesFiltro = document.getElementById('filtroMesSector') ? document.getElementById('filtroMesSector').value : 'TODOS';
  const diaFiltro = document.getElementById('filtroDiaSector') ? document.getElementById('filtroDiaSector').value : '';

  const coincidePeriodo = (fechaISO) => {
    if (!fechaISO) return false;
    if (modoReporteSectorActual === 'HISTORIAL') return true;
    if (modoReporteSectorActual === 'DIARIO' && diaFiltro) {
      return fechaISO === diaFiltro;
    }
    const anio = fechaISO.substring(0, 4);
    const mes = fechaISO.substring(5, 7);
    if (anioFiltro !== 'TODOS' && anio !== anioFiltro) return false;
    if ((modoReporteSectorActual === 'SEMANAL' || modoReporteSectorActual === 'DIARIO' || modoReporteSectorActual === 'MENSUAL') && mesFiltro !== 'TODOS' && mes !== mesFiltro) {
      return false;
    }
    return true;
  };

  const tituloEl = document.getElementById('tituloPeriodoBalanceSector');
  if (tituloEl) {
    if (modoReporteSectorActual === 'HISTORIAL') {
      tituloEl.textContent = '?? Resumen de Ingresos, Costos y Ganancias por Sector (Todo el Historial)';
    } else if (modoReporteSectorActual === 'DIARIO') {
      tituloEl.textContent = `?? Resumen por Sector � D�a: ${diaFiltro ? formatearFechaCorta(diaFiltro) : 'Todos los d�as'}`;
    } else if (modoReporteSectorActual === 'SEMANAL') {
      tituloEl.textContent = `?? Resumen por Sector � Semana / Mes (${mesFiltro !== 'TODOS' ? mesFiltro + '/' : ''}${anioFiltro})`;
    } else if (modoReporteSectorActual === 'MENSUAL') {
      tituloEl.textContent = `??? Resumen por Sector � Mes ${mesFiltro} de ${anioFiltro}`;
    } else if (modoReporteSectorActual === 'ANUAL') {
      tituloEl.textContent = `?? Resumen por Sector � A�o ${anioFiltro}`;
    }
  }

  const datosSectores = calcularEstadisticasDetalladasPorSector(coincidePeriodo);

  // 1. TARJETAS GRANDES POR CADA SECTOR
  const contTarjetas = document.getElementById('contenedorTarjetasSectores');
  if (contTarjetas) {
    contTarjetas.innerHTML = '';
    SECTORES.forEach(sec => {
      const st = datosSectores[sec];
      if (!st) return;
      const colorGanancia = st.ganancia >= 0 ? '#15803d' : '#b91c1c';
      const bgCard = st.ganancia >= 0 ? '#f0fdf4' : '#fef2f2';
      const borderCard = st.ganancia >= 0 ? '#16a34a' : '#ef4444';

      const div = document.createElement('div');
      div.className = 'card';
      div.style.backgroundColor = bgCard;
      div.style.borderColor = borderCard;
      div.style.margin = '0';
      div.style.padding = '22px 24px';
      div.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';

      const textoInsumos = st.costoInsumosCompartido > 0
        ? `<span>?? Insumos / Gastos Lote (${formatoDinero(st.costoInsumosDirecto)} directo + ${formatoDinero(st.costoInsumosCompartido)} compartido):</span>`
        : `<span>?? Insumos / Gastos Lote:</span>`;

      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid ${borderCard}; padding-bottom:12px; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
          <div>
            <h3 style="margin:0; font-size:25px; color:#14532d; font-weight:900;">?? ${sec}</h3>
            <span style="font-size:16px; font-weight:800; color:#1e40af; background:#dbeafe; padding:2px 8px; border-radius:6px; border:1px solid #93c5fd; display:inline-block; margin-top:4px;">
              ?? ${st.acres} acres � ${st.porcentaje ? st.porcentaje.toFixed(1) : 0}% de la finca
            </span>
          </div>
          <span style="font-size:16px; font-weight:800; background:#fff; padding:4px 10px; border-radius:6px; border:1px solid ${borderCard}; color:${colorGanancia};">
            ${st.margenPct >= 0 ? '+' : ''}${st.margenPct.toFixed(1)}% Margen
          </span>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px; font-size:19px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#4b5563;">?? Cacao Seco Vendido:</span>
            <b style="color:#14532d;">${formatoPeso(st.cacaoSecoVendidoQQ)}</b>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#4b5563;">?? Ingresos por Ventas:</span>
            <b style="color:#15803d; font-size:22px;">${formatoDinero(st.ingresosVentas)}</b>
          </div>

          <div style="border-top:1px dashed #cbd5e1; padding-top:8px; margin-top:2px;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:17px; color:#6b7280;">
              <span>?? Mano de Obra (${st.diasEquivalentes} d�as):</span>
              <span style="font-weight:700; color:#b45309;">${formatoDinero(st.costoManoObra)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:16px; color:#6b7280; margin-top:4px;">
              ${textoInsumos}
              <span style="font-weight:700; color:#b91c1c;">${formatoDinero(st.costoInsumos)}</span>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-weight:800; border-top:1px solid #cbd5e1; padding-top:8px;">
            <span style="color:#991b1b;">?? Costo Total del Sector:</span>
            <span style="color:#991b1b; font-size:21px;">${formatoDinero(st.costoTotal)}</span>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; border:2px solid ${borderCard}; padding:10px 14px; border-radius:10px; margin-top:6px;">
            <span style="font-weight:900; color:#1f2937; font-size:20px;">?? Ganancia Neta:</span>
            <span style="font-weight:900; font-size:26px; color:${colorGanancia};">${formatoDinero(st.ganancia)}</span>
          </div>
        </div>
      `;
      contTarjetas.appendChild(div);
    });
  }

  // 2. TABLA PRINCIPAL DEL BALANCE POR SECTOR
  const tbody = document.getElementById('tablaBalanceSectoresBody');
  const pie = document.getElementById('pieTablaBalanceSectores');
  if (tbody) {
    tbody.innerHTML = '';
    let sumaAcres = 0;
    let sumaCosSecQQ = 0;
    let sumaVenSecQQ = 0;
    let sumaIngresos = 0;
    let sumaManoObra = 0;
    let sumaInsumos = 0;
    let sumaCostoTotal = 0;
    let sumaGanancia = 0;

    SECTORES.forEach(sec => {
      const st = datosSectores[sec];
      if (!st) return;
      sumaAcres += st.acres || 0;
      sumaCosSecQQ += st.cacaoSecoCosechadoQQ;
      sumaVenSecQQ += st.cacaoSecoVendidoQQ;
      sumaIngresos += st.ingresosVentas;
      sumaManoObra += st.costoManoObra;
      sumaInsumos += st.costoInsumos;
      sumaCostoTotal += st.costoTotal;
      sumaGanancia += st.ganancia;

      const colorG = st.ganancia >= 0 ? '#14532d' : '#991b1b';
      const tr = document.createElement('tr');
      const desgloseInsumos = st.costoInsumosCompartido > 0
        ? `<br><small style="font-size:14px; color:#6b7280;">(Dir: ${formatoDinero(st.costoInsumosDirecto)} + Comp: ${formatoDinero(st.costoInsumosCompartido)})</small>`
        : '';

      tr.innerHTML = `
        <td><b style="font-size:22px;">?? ${sec}</b></td>
        <td style="color:#1e40af; font-weight:800; font-size:19px;">${st.acres} acres <span style="font-size:15px; color:#475569;">(${st.porcentaje ? st.porcentaje.toFixed(1) : 0}%)</span></td>
        <td style="color:#15803d; font-weight:800;">${formatoPeso(st.cacaoSecoCosechadoQQ)}</td>
        <td style="color:#14532d; font-weight:800;">${formatoPeso(st.cacaoSecoVendidoQQ)}</td>
        <td style="color:#15803d; font-weight:900; font-size:22px;">${formatoDinero(st.ingresosVentas)}</td>
        <td style="color:#b45309; font-weight:800;">${formatoDinero(st.costoManoObra)} <span style="font-size:15px; color:#6b7280;">(${st.diasEquivalentes}d)</span></td>
        <td style="color:#b91c1c; font-weight:800;">${formatoDinero(st.costoInsumos)}${desgloseInsumos}</td>
        <td style="color:#991b1b; font-weight:900; font-size:22px;">${formatoDinero(st.costoTotal)}</td>
        <td style="color:${colorG}; font-weight:900; font-size:24px;">${formatoDinero(st.ganancia)}</td>
        <td style="font-weight:800; color:${colorG};">${st.margenPct >= 0 ? '+' : ''}${st.margenPct.toFixed(1)}%</td>
      `;
      tbody.appendChild(tr);
    });

    if (pie) {
      const colorPieG = sumaGanancia >= 0 ? '#14532d' : '#991b1b';
      const margenTotal = sumaIngresos > 0 ? ((sumaGanancia / sumaIngresos) * 100).toFixed(1) : '0.0';
      pie.innerHTML = `
        <td>TOTAL GENERAL:</td>
        <td style="color:#1e40af; font-size:20px;">${sumaAcres.toFixed(1)} acres (100.0%)</td>
        <td>${formatoPeso(sumaCosSecQQ)}</td>
        <td>${formatoPeso(sumaVenSecQQ)}</td>
        <td style="color:#14532d; font-size:24px;">${formatoDinero(sumaIngresos)}</td>
        <td>${formatoDinero(sumaManoObra)}</td>
        <td>${formatoDinero(sumaInsumos)}</td>
        <td style="color:#991b1b; font-size:24px;">${formatoDinero(sumaCostoTotal)}</td>
        <td style="color:${colorPieG}; font-size:26px;">${formatoDinero(sumaGanancia)}</td>
        <td style="color:${colorPieG};">${margenTotal}%</td>
      `;
    }
  }

  renderizarDetalleMovimientosSector();
  renderizarPrediccionesSectores();
}

function renderizarDetalleMovimientosSector() {
  const tbody = document.getElementById('tablaDetalleMovimientosSectorBody');
  if (!tbody) return;

  const sectorFiltro = document.getElementById('filtroSectorDetalleEspecifico') ? document.getElementById('filtroSectorDetalleEspecifico').value : 'TODOS';
  const movimientosHorarios = obtenerMovimientosDiariosDeHorarios();

  const todosMovimientos = [];

  // Ventas (+)
  (estadoFinca.ventas || []).forEach(v => {
    if (sectorFiltro === 'TODOS' || v.sector === sectorFiltro) {
      todosMovimientos.push({
        fecha: v.fecha,
        sector: v.sector,
        tipo: 'Venta de Cacao Seco',
        concepto: `Venta a ${v.comprador || 'Comprador'} ${v.notas ? '(' + v.notas + ')' : ''}`,
        pesoSeco: Number(v.totalQuintales || 0),
        monto: Number(v.totalDinero || 0),
        esIngreso: true,
        origenTipo: 'venta',
        origenId: v.id
      });
    }
  });

  // Mano de Obra (-)
  movimientosHorarios.forEach(m => {
    if (sectorFiltro === 'TODOS' || m.sector === sectorFiltro) {
      const trab = estadoFinca.trabajadores.find(t => t.id === m.trabajadorId);
      todosMovimientos.push({
        fecha: m.fecha,
        sector: m.sector,
        tipo: 'Mano de Obra (Trabajador)',
        concepto: `${trab ? trab.nombre : 'Trabajador'} (${m.diasEq} d�a / ${m.horas} hrs)`,
        pesoSeco: 0,
        monto: m.costo,
        esIngreso: false,
        origenTipo: 'horario',
        semanaLunes: m.semanaLunes,
        trabajadorId: m.trabajadorId
      });
    }
  });

  // Insumos y Gastos (-)
  (estadoFinca.gastos || []).forEach(g => {
    const secG = g.sector || 'Toda la Finca';
    if (sectorFiltro === 'TODOS') {
      todosMovimientos.push({
        fecha: g.fecha,
        sector: secG,
        tipo: g.categoria || 'Gasto',
        concepto: secG === 'Toda la Finca' ? `${g.descripcion || g.concepto || g.categoria} (Compartido entre todos los sectores seg�n acres)` : (g.descripcion || g.concepto || g.categoria),
        pesoSeco: 0,
        monto: Number(g.monto || 0),
        esIngreso: false,
        origenTipo: 'gasto',
        origenId: g.id
      });
    } else if (sectorFiltro === 'Toda la Finca') {
      if (secG === 'Toda la Finca') {
        todosMovimientos.push({
          fecha: g.fecha,
          sector: secG,
          tipo: g.categoria || 'Gasto General',
          concepto: `${g.descripcion || g.concepto || g.categoria} (Distribuido proporcionalmente a todos los sectores)`,
          pesoSeco: 0,
          monto: Number(g.monto || 0),
          esIngreso: false,
          origenTipo: 'gasto',
          origenId: g.id
        });
      }
    } else {
      // Sector espec�fico seleccionado
      if (secG === sectorFiltro) {
        todosMovimientos.push({
          fecha: g.fecha,
          sector: secG,
          tipo: g.categoria || 'Gasto Directo',
          concepto: g.descripcion || g.concepto || g.categoria,
          pesoSeco: 0,
          monto: Number(g.monto || 0),
          esIngreso: false,
          origenTipo: 'gasto',
          origenId: g.id
        });
      } else if (secG === 'Toda la Finca') {
        const sectoresConPct = obtenerSectoresConPorcentajes();
        const objSec = sectoresConPct.find(s => s.nombre === sectorFiltro);
        const pct = objSec ? objSec.porcentaje : 0;
        const cuota = (Number(g.monto || 0) * pct) / 100;
        if (cuota > 0) {
          todosMovimientos.push({
            fecha: g.fecha,
            sector: `${sectorFiltro} (Cuota Finca)`,
            tipo: `${g.categoria || 'Gasto'} (${pct.toFixed(1)}%)`,
            concepto: `${g.descripcion || g.concepto || g.categoria} [Gasto Toda la Finca: ${formatoDinero(g.monto)} � Cuota ${pct.toFixed(1)}%]`,
            pesoSeco: 0,
            monto: cuota,
            esIngreso: false,
            origenTipo: 'gasto',
            origenId: g.id
          });
        }
      }
    }
  });

  todosMovimientos.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const lunesSemanaActual = obtenerLunesDeFecha(new Date());
  const domingoSemanaActual = sumarDiasAFechaISO(lunesSemanaActual, 6);

  const subRangoEl = document.getElementById('subtituloRangoSemanaActualMovimientos');
  if (subRangoEl) {
    subRangoEl.textContent = `Semana del ${formatearFechaCorta(lunesSemanaActual)} al ${formatearFechaCorta(domingoSemanaActual)}`;
  }

  const movsSemanaActual = [];
  const movsAnteriores = [];

  todosMovimientos.forEach(m => {
    if (m.fecha && m.fecha >= lunesSemanaActual && m.fecha <= domingoSemanaActual) {
      movsSemanaActual.push(m);
    } else {
      movsAnteriores.push(m);
    }
  });

  // 1. Renderizar movimientos de la semana actual (VISIBLE)
  const tbodyActual = document.getElementById('tablaDetalleMovimientosSectorBody');
  if (tbodyActual) {
    tbodyActual.innerHTML = '';
    if (movsSemanaActual.length === 0) {
      tbodyActual.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:22px; color:#666; font-size:18px;">
            ?? No hay movimientos de ventas ni costos registrados en la semana actual (${formatearFechaCorta(lunesSemanaActual)} al ${formatearFechaCorta(domingoSemanaActual)}).
          </td>
        </tr>
      `;
    } else {
      movsSemanaActual.forEach(m => {
        tbodyActual.appendChild(crearFilaMovimientoDetalleSector(m));
      });
    }
  }

  // 2. Renderizar movimientos de semanas anteriores (OCULTO / EXPANDIBLE)
  const tbodyAnteriores = document.getElementById('tablaDetalleMovimientosSectorAnterioresBody');
  if (tbodyAnteriores) {
    tbodyAnteriores.innerHTML = '';
    if (movsAnteriores.length === 0) {
      tbodyAnteriores.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:22px; color:#666; font-size:18px;">
            ?? No hay movimientos registrados en semanas anteriores.
          </td>
        </tr>
      `;
    } else {
      movsAnteriores.forEach(m => {
        tbodyAnteriores.appendChild(crearFilaMovimientoDetalleSector(m));
      });
    }
  }

  // Actualizar textos del bot�n y banner de expansi�n
  const btnToggle = document.getElementById('btnToggleHistorialSector');
  const titResumen = document.getElementById('tituloResumenHistorialSector');
  if (btnToggle) {
    btnToggle.textContent = historialSectorExpandido
      ? `? Ocultar Resto del Historial (${movsAnteriores.length} registros)`
      : `? Expandir Resto del Historial (${movsAnteriores.length} registros)`;
  }
  if (titResumen) {
    titResumen.textContent = historialSectorExpandido
      ? `?? Resto del Historial / Semanas Anteriores (${movsAnteriores.length} registros - Visible)`
      : `?? Resto del Historial / Semanas Anteriores (${movsAnteriores.length} registros - Oculto)`;
  }
}

function crearFilaMovimientoDetalleSector(m) {
  const colorImpacto = m.esIngreso ? '#15803d' : '#b91c1c';
  const signo = m.esIngreso ? '+ ' : '- ';

  let botonAccion = '';
  if (m.origenTipo === 'venta') {
    botonAccion = `<button class="btn btn-danger" style="padding:6px 12px; font-size:16px;" onclick="eliminarVenta('${m.origenId}')">??? Borrar</button>`;
  } else if (m.origenTipo === 'gasto') {
    botonAccion = `<button class="btn btn-danger" style="padding:6px 12px; font-size:16px;" onclick="eliminarOtroGasto('${m.origenId}')">??? Borrar</button>`;
  } else if (m.origenTipo === 'horario') {
    botonAccion = `<button class="btn btn-danger" style="padding:6px 12px; font-size:16px;" onclick="solicitarEliminarPlanilla('${m.semanaLunes}', '${m.trabajadorId}')">??? Borrar</button>`;
  }

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><b>${formatearFechaCorta(m.fecha)}</b></td>
    <td><b>${m.sector}</b></td>
    <td><span style="font-weight:700; color:${m.esIngreso ? '#15803d' : '#9a3412'};">${m.tipo}</span></td>
    <td>${m.concepto}</td>
    <td>${m.pesoSeco > 0 ? formatoPeso(m.pesoSeco) : '�'}</td>
    <td style="font-weight:800;">${formatoDinero(m.monto)}</td>
    <td style="color:${colorImpacto}; font-weight:900; font-size:20px;">${signo}${formatoDinero(m.monto)}</td>
    <td>${botonAccion}</td>
  `;
  return tr;
}

function renderizarPrediccionesSectores() {
  const ulPatronesSec = document.getElementById('patronesSectoresLista');
  const gridPredSec = document.getElementById('gridPrediccionSectores');
  if (!ulPatronesSec || !gridPredSec) return;

  const infoTotal = calcularEstadisticasDetalladasPorSector(() => true);

  let secMasRentable = SECTORES[0];
  let maxGanancia = -Infinity;
  let secMayorCosto = SECTORES[0];
  let maxCosto = -Infinity;

  SECTORES.forEach(s => {
    if (infoTotal[s].ganancia > maxGanancia) {
      maxGanancia = infoTotal[s].ganancia;
      secMasRentable = s;
    }
    if (infoTotal[s].costoTotal > maxCosto) {
      maxCosto = infoTotal[s].costoTotal;
      secMayorCosto = s;
    }
  });

  ulPatronesSec.innerHTML = `
    <li class="pattern-item">?? <b>Sector M�s Rentable:</b><br/><b>${secMasRentable}</b> lidera las ganancias netas de la finca con <b>${formatoDinero(maxGanancia)}</b> libres (${infoTotal[secMasRentable].margenPct.toFixed(1)}% margen).</li>
    <li class="pattern-item">?? <b>Sector con Mayor Inversi�n / Costo:</b><br/><b>${secMayorCosto}</b> tiene el costo acumulado m�s alto (<b>${formatoDinero(maxCosto)}</b> en mano de obra e insumos).</li>
    <li class="pattern-item">?? <b>Eficiencia Laboral por Lote:</b><br/>En <b>${secMasRentable}</b> cada d�a de trabajo ha generado <b>${infoTotal[secMasRentable].diasEquivalentes > 0 ? formatoDinero(infoTotal[secMasRentable].ingresosVentas / infoTotal[secMasRentable].diasEquivalentes) : '$0.00'}</b> en ventas de cacao seco.</li>
  `;

  const horizontes = [
    { titulo: '?? Por D�a', factor: 1 / 6 },
    { titulo: '?? Pr�xima Semana', factor: 1 },
    { titulo: '??? Pr�ximo Mes', factor: 52 / 12 },
    { titulo: '?? Pr�ximo A�o', factor: 52 },
    { titulo: '?? Pr�ximos 5 A�os', factor: 52 * 5 }
  ];

  // Estimar ganancia semanal por sector
  const gananciaSemanalPorSector = {};
  SECTORES.forEach(s => {
    gananciaSemanalPorSector[s] = infoTotal[s].ganancia / 4; // base aproximada 4 semanas registradas
  });

  gridPredSec.innerHTML = horizontes.map(h => `
    <div class="pred-card">
      <h3>${h.titulo}</h3>
      ${SECTORES.map(sec => {
        const ganSec = gananciaSemanalPorSector[sec] * h.factor;
        const color = ganSec >= 0 ? '#14532d' : '#991b1b';
        return `
          <div class="pred-row">
            <span>?? ${sec}:</span>
            <b style="color:${color};">${formatoDinero(ganSec)}</b>
          </div>
        `;
      }).join('')}
    </div>
  `).join('');
}

// ============================================================================
// MODAL DE CONFIRMACI�N DE ELIMINACI�N Y GESTI�N DE BORRADOS
// ============================================================================

let accionConfirmarEliminacionPendiente = null;

function mostrarModalConfirmacionEliminar(mensaje, onConfirmar) {
  const modal = document.getElementById('modalConfirmacionEliminar');
  const texto = document.getElementById('textoModalConfirmacionEliminar');
  const btnConfirmar = document.getElementById('btnConfirmarAccionEliminar');

  if (!modal) {
    if (confirm(mensaje)) {
      onConfirmar();
    }
    return;
  }

  if (texto) {
    texto.textContent = mensaje;
  }

  accionConfirmarEliminacionPendiente = onConfirmar;

  if (btnConfirmar) {
    btnConfirmar.onclick = () => {
      if (typeof accionConfirmarEliminacionPendiente === 'function') {
        accionConfirmarEliminacionPendiente();
      }
      cerrarModalEliminar();
    };
  }

  modal.style.display = 'flex';
}

function cerrarModalEliminar() {
  const modal = document.getElementById('modalConfirmacionEliminar');
  if (modal) {
    modal.style.display = 'none';
  }
  accionConfirmarEliminacionPendiente = null;
}

function solicitarEliminarPlanilla(semanaLunes, trabId) {
  const trab = estadoFinca.trabajadores.find(t => t.id === trabId);
  const nombreTrab = trab ? trab.nombre : 'Trabajador';
  const rango = formatearRangoSemanaNumerico(semanaLunes);

  mostrarModalConfirmacionEliminar(
    `�Est�s seguro de que deseas eliminar permanentemente la planilla de la semana ${rango} para "${nombreTrab}"? Se borrar�n todos los turnos marcados y notas asociadas.`,
    () => {
      const clave = `${semanaLunes}__${trabId}`;
      if (estadoFinca.horarios[clave]) {
        delete estadoFinca.horarios[clave];
      }
      guardarDatos();
      renderizarTodo();
    }
  );
}

// ============================================================================
// CONTROL EXPANDIR / OCULTAR HISTORIAL DETALLADO DEL SECTOR (PESTA�A #5)
// ============================================================================

let historialSectorExpandido = false;

function alternarExpandirHistorialSector() {
  historialSectorExpandido = !historialSectorExpandido;
  const cont = document.getElementById('contenedorHistorialSectorExpandible');
  if (cont) {
    cont.style.display = historialSectorExpandido ? 'block' : 'none';
  }
  renderizarDetalleMovimientosSector();
}


