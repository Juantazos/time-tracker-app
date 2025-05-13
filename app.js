"use strict";

console.log("app.js: Script cargado y ejecutándose."); // Log inicial

// -------------------------------------
//  CONSTANTES GLOBALES Y CONFIGURACIÓN
// -------------------------------------
const LOCAL_STORAGE_KEY = 'timeTrackerAppHistory_v1.2'; // Nueva versión por si acaso
const MS_IN_HOUR = 3600000;
const MS_IN_MINUTE = 60000;
const MS_IN_SECOND = 1000;

const CHART_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98FB98', '#ADD8E6',
    '#FFD700', '#DA70D6', '#32CD32', '#6A5ACD', '#FFC0CB', '#F0E68C'
];

// -------------------------------------
//  SELECTORES DEL DOM (CACHEADOS)
// -------------------------------------
// Es crucial que estos IDs y clases coincidan EXACTAMENTE con tu HTML
const DOMElements = {
    startStopBtn: null,
    timerDisplay: null,
    categorySelect: null,
    historyList: null,
    chartCanvas: null,
    deleteHistoryBtn: null
};

function cacheDOMElements() {
    console.log("app.js: Intentando cachear elementos del DOM...");
    DOMElements.startStopBtn = document.getElementById('startStopBtn');
    DOMElements.timerDisplay = document.getElementById('timerDisplay');
    DOMElements.categorySelect = document.getElementById('category');
    DOMElements.historyList = document.getElementById('historyList');
    DOMElements.chartCanvas = document.getElementById('chart');
    DOMElements.deleteHistoryBtn = document.querySelector('.delete-btn');

    // Verificación de elementos
    for (const key in DOMElements) {
        if (DOMElements[key] === null) {
            console.error(`app.js: ERROR - Elemento del DOM no encontrado: ${key}. Verifica el ID/clase en HTML.`);
        } else {
            // console.log(`app.js: Elemento del DOM encontrado: ${key}`, DOMElements[key]); // Descomentar para depuración detallada
        }
    }
}


// -------------------------------------
//  ESTADO DE LA APLICACIÓN
// -------------------------------------
let appState = {
    timerIntervalId: null,
    currentSessionStartTime: 0,
    isTimerRunning: false,
    timeEntries: [],
    chartInstance: null
};

// -------------------------------------
//  UTILIDADES
// -------------------------------------
function formatMillisecondsToTime(ms) {
    if (typeof ms !== 'number' || isNaN(ms) || ms < 0) { // Verificación de tipo más estricta
        console.warn("app.js: formatMillisecondsToTime recibió un valor inválido:", ms);
        return '00:00:00';
    }
    const totalSeconds = Math.floor(ms / MS_IN_SECOND);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatMillisecondsToHours(ms) {
    if (typeof ms !== 'number' || isNaN(ms) || ms < 0) { // Verificación de tipo más estricta
        console.warn("app.js: formatMillisecondsToHours recibió un valor inválido:", ms);
        return 0;
    }
    return parseFloat((ms / MS_IN_HOUR).toFixed(2));
}

// -------------------------------------
//  LÓGICA DEL TEMPORIZADOR
// -------------------------------------
function toggleTimer() {
    console.log("app.js: toggleTimer llamado. Estado actual isTimerRunning:", appState.isTimerRunning);
    if (!DOMElements.startStopBtn || !DOMElements.categorySelect) { // Defensa extra
        console.error("app.js: Botón Start/Stop o select de categoría no encontrado en toggleTimer.");
        return;
    }

    appState.isTimerRunning = !appState.isTimerRunning;

    if (appState.isTimerRunning) {
        if (!DOMElements.categorySelect.value || DOMElements.categorySelect.value === "") {
            alert("Por favor, selecciona una categoría antes de iniciar el temporizador.");
            console.log("app.js: Inicio de temporizador cancelado, categoría no seleccionada.");
            appState.isTimerRunning = false; // Revertir estado
            // Asegurar que el botón refleje el estado no iniciado
            DOMElements.startStopBtn.textContent = '▶️ Iniciar';
            DOMElements.startStopBtn.classList.remove('running');
            DOMElements.startStopBtn.setAttribute('aria-label', 'Iniciar temporizador');
            return;
        }
        appState.currentSessionStartTime = Date.now();
        DOMElements.startStopBtn.textContent = '⏹️ Detener';
        DOMElements.startStopBtn.classList.add('running');
        DOMElements.startStopBtn.setAttribute('aria-label', 'Detener temporizador');
        appState.timerIntervalId = setInterval(updateTimerDisplay, 1000);
        console.log("app.js: Temporizador iniciado. Interval ID:", appState.timerIntervalId);
    } else {
        if (appState.timerIntervalId) {
            clearInterval(appState.timerIntervalId);
            console.log("app.js: Temporizador detenido. Interval ID:", appState.timerIntervalId, "limpiado.");
            appState.timerIntervalId = null; // Resetear ID
        }
        DOMElements.startStopBtn.textContent = '▶️ Iniciar';
        DOMElements.startStopBtn.classList.remove('running');
        DOMElements.startStopBtn.setAttribute('aria-label', 'Iniciar temporizador');
        
        // Solo guardar si realmente había un tiempo de inicio (para evitar guardar si se da doble clic rápido)
        if (appState.currentSessionStartTime > 0) {
            saveCurrentEntry();
            appState.currentSessionStartTime = 0; // Resetear para la próxima sesión
        }
        renderUI();
    }
}

function updateTimerDisplay() {
    if (!DOMElements.timerDisplay) return; // Defensa
    const elapsedMilliseconds = Date.now() - appState.currentSessionStartTime;
    DOMElements.timerDisplay.textContent = formatMillisecondsToTime(elapsedMilliseconds);
}

// -------------------------------------
//  MANEJO DE DATOS (ENTRADAS E HISTORIAL)
// -------------------------------------
function saveCurrentEntry() {
    if (!DOMElements.categorySelect) return; // Defensa
    const category = DOMElements.categorySelect.value;
    const endTime = Date.now();
    const duration = endTime - appState.currentSessionStartTime;

    if (duration < MS_IN_SECOND || !category) {
        console.warn("app.js: Entrada no guardada: duración muy corta o sin categoría.", { duration, category });
        return;
    }

    const newEntry = {
        id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category: category,
        start: appState.currentSessionStartTime,
        end: endTime,
        duration: duration
    };
    appState.timeEntries.push(newEntry);
    console.log("app.js: Nueva entrada guardada en appState:", newEntry);
    saveEntriesToLocalStorage();
}

function loadEntriesFromLocalStorage() {
    try {
        const storedEntries = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedEntries) {
            appState.timeEntries = JSON.parse(storedEntries);
            console.log("app.js: Entradas cargadas desde localStorage:", appState.timeEntries.length, "entradas.");
        } else {
            appState.timeEntries = [];
            console.log("app.js: No hay entradas en localStorage para cargar.");
        }
    } catch (error) {
        console.error("app.js: Error al cargar/parsear entradas desde localStorage:", error);
        appState.timeEntries = [];
        // Considerar limpiar localStorage si está corrupto
        // localStorage.removeItem(LOCAL_STORAGE_KEY);
        // alert("Hubo un problema al cargar el historial guardado. Es posible que se haya dañado y se haya reseteado.");
    }
}

function saveEntriesToLocalStorage() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState.timeEntries));
        console.log("app.js: Entradas guardadas en localStorage.");
    } catch (error) {
        console.error("app.js: Error al guardar entradas en localStorage:", error);
        alert("No se pudo guardar el historial. El almacenamiento podría estar lleno o los datos ser inválidos.");
    }
}

function clearAllHistory() {
    console.log("app.js: clearAllHistory llamado.");
    if (confirm("⚠️ ¿Estás seguro de que quieres borrar TODO el historial? Esta acción no se puede deshacer.")) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        appState.timeEntries = [];
        renderUI();
        alert("Historial borrado exitosamente ✅");
        console.log("app.js: Historial borrado.");
    } else {
        console.log("app.js: Borrado de historial cancelado por el usuario.");
    }
}

// -------------------------------------
//  RENDERIZADO DE UI (GRÁFICO E HISTORIAL)
// -------------------------------------
function renderUI() {
    console.log("app.js: renderUI llamado.");
    renderChart();
    renderHistoryList();
}

function renderChart() {
    console.log("app.js: renderChart llamado.");
    if (!DOMElements.chartCanvas) {
        console.warn("app.js: Elemento canvas del gráfico no encontrado. No se renderizará el gráfico.");
        return;
    }
    if (typeof Chart === 'undefined') { // Comprobar si Chart.js está disponible
        console.error("app.js: Chart.js no está definido. Asegúrate de que la librería está cargada correctamente ANTES que app.js o usa defer correctamente.");
        DOMElements.chartCanvas.innerHTML = '<p style="color:red; text-align:center;">Error: Librería de gráficos no cargada.</p>';
        return;
    }

    const ctx = DOMElements.chartCanvas.getContext('2d');
    if (!ctx) {
        console.error("app.js: No se pudo obtener el contexto 2D del canvas del gráfico.");
        return;
    }

    const categoryTotals = appState.timeEntries.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + entry.duration;
        return acc;
    }, {});

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals).map(ms => formatMillisecondsToHours(ms));

    if (appState.chartInstance) {
        appState.chartInstance.destroy();
        console.log("app.js: Instancia de gráfico anterior destruida.");
    }

    if (labels.length === 0) {
        console.log("app.js: No hay datos para el gráfico. Limpiando canvas.");
        ctx.clearRect(0, 0, DOMElements.chartCanvas.width, DOMElements.chartCanvas.height);
        ctx.font = "16px " + (getComputedStyle(document.body).fontFamily || "Arial, sans-serif");
        ctx.fillStyle = getComputedStyle(document.body).color || "#FFFFFF";
        ctx.textAlign = 'center';
        // Asegurarse que el canvas tiene dimensiones antes de dibujar texto
        if (DOMElements.chartCanvas.width > 0 && DOMElements.chartCanvas.height > 0) {
            ctx.fillText("No hay datos para mostrar en el gráfico.", DOMElements.chartCanvas.width / 2, DOMElements.chartCanvas.height / 2);
        } else {
            console.warn("app.js: Canvas sin dimensiones, no se puede dibujar texto de 'No hay datos'.")
        }
        return;
    }

    try {
        appState.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tiempo por Categoría (horas)',
                    data: data,
                    backgroundColor: labels.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
                    borderColor: getComputedStyle(document.body).getPropertyValue('--primary-bg') || '#333333', // Fallback más oscuro
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeInOutQuart' },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: getComputedStyle(document.body).color || "#FFFFFF", padding: 20 }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)', // Ligeramente más opaco
                        titleColor: '#FFF', bodyColor: '#FFF',
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== null && context.dataIndex < Object.values(categoryTotals).length) {
                                    const totalMs = Object.values(categoryTotals)[context.dataIndex];
                                    label += formatMillisecondsToTime(totalMs) + ` (${context.parsed.toFixed(2)}h)`;
                                } else {
                                    label += context.parsed !== null ? `${context.parsed.toFixed(2)}h (datos incompletos)` : '(datos no disponibles)';
                                }
                                return label;
                            }
                        }
                    },
                    title: {
                        display: true, text: 'Distribución de Tiempo por Categoría',
                        color: getComputedStyle(document.body).color || "#FFFFFF",
                        font: { size: 18 },
                        padding: { top: 10, bottom: 10 }
                    }
                }
            }
        });
        console.log("app.js: Nueva instancia de gráfico creada.");
    } catch (error) {
        console.error("app.js: Error al crear la instancia de Chart.js:", error);
        DOMElements.chartCanvas.innerHTML = '<p style="color:red; text-align:center;">Error al renderizar el gráfico.</p>';

    }
}

function renderHistoryList() {
    console.log("app.js: renderHistoryList llamado.");
    if (!DOMElements.historyList) {
        console.warn("app.js: Elemento de lista de historial no encontrado.");
        return;
    }

    if (appState.timeEntries.length === 0) {
        DOMElements.historyList.innerHTML = '<li class="history-empty-message">No hay actividades registradas aún.</li>';
        return;
    }

    const fragment = document.createDocumentFragment();
    appState.timeEntries.slice().reverse().forEach(entry => {
        const li = document.createElement('li');
        li.className = 'history-entry'; // Usar className es ligeramente más performante que classList.add para un solo elemento
        li.setAttribute('data-entry-id', entry.id);

        const entryDate = new Date(entry.start).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        const entryStartTime = new Date(entry.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const durationFormatted = formatMillisecondsToTime(entry.duration);

        li.innerHTML = `
            <div class="entry-header">
                <strong>${entry.category || 'Sin Categoría'}</strong> <!-- Fallback para categoría -->
                <time datetime="${new Date(entry.start).toISOString()}">${entryDate} - ${entryStartTime}</time>
            </div>
            <div class="entry-details">
                <span>Duración: <code>${durationFormatted}</code></span>
                <span>(Total: ${formatMillisecondsToHours(entry.duration)}h)</span>
            </div>`;
        fragment.appendChild(li);
    });
    DOMElements.historyList.innerHTML = '';
    DOMElements.historyList.appendChild(fragment);
    console.log("app.js: Lista de historial renderizada con", appState.timeEntries.length, "entradas.");
}

// -------------------------------------
//  INICIALIZACIÓN Y EVENT LISTENERS
// -------------------------------------
function initializeApp() {
    console.log("app.js: initializeApp comenzando...");
    
    cacheDOMElements(); // Cachear elementos primero

    // Comprobaciones críticas de elementos del DOM
    if (!DOMElements.startStopBtn || !DOMElements.deleteHistoryBtn || !DOMElements.categorySelect || !DOMElements.timerDisplay || !DOMElements.historyList || !DOMElements.chartCanvas) {
        console.error("app.js: FATAL - Faltan elementos del DOM esenciales para inicializar la aplicación. Comprueba los IDs y clases en tu HTML y el script.");
        // Opcionalmente, mostrar un mensaje de error al usuario en el body
        // document.body.innerHTML = "<p style='color:red; font-size:18px; text-align:center; padding:20px;'>Error crítico: La aplicación no pudo cargarse correctamente debido a elementos faltantes. Por favor, contacta soporte.</p>";
        return; // Detener la inicialización si faltan elementos cruciales
    }
    
    console.log("app.js: Todos los elementos del DOM necesarios parecen estar presentes.");

    loadEntriesFromLocalStorage();
    renderUI();

    console.log("app.js: Añadiendo event listeners...");
    DOMElements.startStopBtn.addEventListener('click', toggleTimer);
    DOMElements.deleteHistoryBtn.addEventListener('click', clearAllHistory);
    console.log("app.js: Event listeners añadidos.");

    // Añadir opción "Selecciona categoría" si no existe
    if (DOMElements.categorySelect && DOMElements.categorySelect.options.length > 0 && DOMElements.categorySelect.options[0].value !== "") {
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "--- Selecciona Categoría ---";
        defaultOption.disabled = true;
        defaultOption.selected = true; // Seleccionar por defecto
        DOMElements.categorySelect.prepend(defaultOption);
        console.log("app.js: Opción 'Selecciona Categoría' añadida al select.");
    } else if (DOMElements.categorySelect && DOMElements.categorySelect.options.length === 0) {
        // Si no hay NINGUNA opción, añadir la de seleccionar y quizás un par por defecto
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "--- Selecciona Categoría ---";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        DOMElements.categorySelect.appendChild(defaultOption);
        // Podrías añadir opciones por defecto aquí si el HTML estuviera completamente vacío
        console.log("app.js: Select de categoría estaba vacío, añadida opción por defecto.");
    }


    console.log("app.js: initializeApp completado.");
}

// El listener DOMContentLoaded es crucial.
document.addEventListener('DOMContentLoaded', () => {
    console.log("app.js: Evento DOMContentLoaded disparado.");
    try {
        initializeApp();
    } catch (error) {
        console.error("app.js: Error catastrófico durante initializeApp:", error);
        // Informar al usuario de un error grave si la app no puede iniciar
        // document.body.innerHTML = "<p style='color:red; font-size:18px; text-align:center; padding:20px;'>La aplicación encontró un error crítico al iniciar. Por favor, intenta recargar la página.</p>";
    }
});

console.log("app.js: Fin del script.");
