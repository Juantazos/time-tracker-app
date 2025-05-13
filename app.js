"use strict";

console.log("app.js: Script cargado y ejecutándose."); // Log inicial

// -------------------------------------
//  CONSTANTES GLOBALES Y CONFIGURACIÓN
// -------------------------------------
const LOCAL_STORAGE_KEY = 'timeTrackerAppHistory_v1.3'; // Nueva versión por si acaso con borrado individual
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

    for (const key in DOMElements) {
        if (DOMElements[key] === null) {
            console.error(`app.js: ERROR - Elemento del DOM no encontrado: ${key}. Verifica el ID/clase en HTML.`);
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
    if (typeof ms !== 'number' || isNaN(ms) || ms < 0) {
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
    if (typeof ms !== 'number' || isNaN(ms) || ms < 0) {
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
    if (!DOMElements.startStopBtn || !DOMElements.categorySelect) {
        console.error("app.js: Botón Start/Stop o select de categoría no encontrado en toggleTimer.");
        return;
    }

    appState.isTimerRunning = !appState.isTimerRunning;

    if (appState.isTimerRunning) {
        if (!DOMElements.categorySelect.value || DOMElements.categorySelect.value === "") {
            alert("Por favor, selecciona una categoría antes de iniciar el temporizador.");
            console.log("app.js: Inicio de temporizador cancelado, categoría no seleccionada.");
            appState.isTimerRunning = false;
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
            appState.timerIntervalId = null;
        }
        DOMElements.startStopBtn.textContent = '▶️ Iniciar';
        DOMElements.startStopBtn.classList.remove('running');
        DOMElements.startStopBtn.setAttribute('aria-label', 'Iniciar temporizador');
        
        if (appState.currentSessionStartTime > 0) {
            saveCurrentEntry();
            appState.currentSessionStartTime = 0;
        }
        renderUI();
    }
}

function updateTimerDisplay() {
    if (!DOMElements.timerDisplay) return;
    const elapsedMilliseconds = Date.now() - appState.currentSessionStartTime;
    DOMElements.timerDisplay.textContent = formatMillisecondsToTime(elapsedMilliseconds);
}

// -------------------------------------
//  MANEJO DE DATOS (ENTRADAS E HISTORIAL)
// -------------------------------------
function saveCurrentEntry() {
    if (!DOMElements.categorySelect) return;
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

// **** FUNCIÓN PARA BORRAR UNA ENTRADA INDIVIDUAL (AÑADIDA/MODIFICADA) ****
function deleteSingleEntry(entryIdToDelete) {
    console.log("app.js: deleteSingleEntry llamado para ID:", entryIdToDelete);
    if (!entryIdToDelete) {
        console.warn("app.js: Se intentó borrar una entrada sin ID.");
        return;
    }

    const initialLength = appState.timeEntries.length;
    appState.timeEntries = appState.timeEntries.filter(entry => entry.id !== entryIdToDelete);

    if (appState.timeEntries.length < initialLength) {
        console.log("app.js: Entrada borrada del estado. Actualizando localStorage y UI.");
        saveEntriesToLocalStorage();
        renderUI();
    } else {
        console.warn("app.js: No se encontró ninguna entrada con el ID para borrar:", entryIdToDelete);
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
    // ... (código de renderChart se mantiene igual que en la versión anterior con logs) ...
    console.log("app.js: renderChart llamado.");
    if (!DOMElements.chartCanvas) {
        console.warn("app.js: Elemento canvas del gráfico no encontrado. No se renderizará el gráfico.");
        return;
    }
    if (typeof Chart === 'undefined') { 
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
                    borderColor: getComputedStyle(document.body).getPropertyValue('--primary-bg') || '#333333',
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
                        backgroundColor: 'rgba(0,0,0,0.8)',
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
        li.className = 'history-entry';
        li.setAttribute('data-entry-id', entry.id); // ID para borrado

        const entryDate = new Date(entry.start).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        const entryStartTime = new Date(entry.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const durationFormatted = formatMillisecondsToTime(entry.duration);

        // **** HTML DE LA ENTRADA MODIFICADO PARA INCLUIR BOTÓN DE BORRAR ****
        li.innerHTML = `
            <div class="entry-main-content">
                <div class="entry-header">
                    <strong>${entry.category || 'Sin Categoría'}</strong>
                    <time datetime="${new Date(entry.start).toISOString()}">${entryDate} - ${entryStartTime}</time>
                </div>
                <div class="entry-details">
                    <span>Duración: <code>${durationFormatted}</code></span>
                    <span>(Total: ${formatMillisecondsToHours(entry.duration)}h)</span>
                </div>
            </div>
            <button class="delete-entry-btn" data-entry-id="${entry.id}" aria-label="Borrar esta entrada">🗑️</button>
        `;
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
    
    cacheDOMElements();

    if (!DOMElements.startStopBtn || !DOMElements.deleteHistoryBtn || !DOMElements.categorySelect || !DOMElements.timerDisplay || !DOMElements.historyList || !DOMElements.chartCanvas) {
        console.error("app.js: FATAL - Faltan elementos del DOM esenciales para inicializar la aplicación...");
        return;
    }
    
    console.log("app.js: Todos los elementos del DOM necesarios parecen estar presentes.");

    loadEntriesFromLocalStorage();
    renderUI();

    console.log("app.js: Añadiendo event listeners...");
    DOMElements.startStopBtn.addEventListener('click', toggleTimer);
    DOMElements.deleteHistoryBtn.addEventListener('click', clearAllHistory);

    // **** EVENT LISTENER PARA BORRADO INDIVIDUAL (AÑADIDO/MODIFICADO) ****
    if (DOMElements.historyList) {
        DOMElements.historyList.addEventListener('click', function(event) {
            const clickedElement = event.target;
            // Buscar el botón de borrar, incluso si el clic fue en el emoji dentro del botón
            const deleteButton = clickedElement.closest('.delete-entry-btn'); 

            if (deleteButton) {
                console.log("app.js: Clic detectado en botón de borrar entrada individual.");
                const entryId = deleteButton.dataset.entryId;
                if (entryId) {
                    if (confirm("¿Seguro que quieres borrar esta entrada del historial?")) {
                        deleteSingleEntry(entryId);
                    } else {
                        console.log("app.js: Borrado de entrada individual cancelado por usuario.");
                    }
                } else {
                    console.warn("app.js: Botón de borrar entrada individual sin data-entry-id.");
                }
            }
        });
        console.log("app.js: Event listener para borrado individual añadido a historyList.");
    }

    // Añadir opción "Selecciona categoría" si no existe
    if (DOMElements.categorySelect && DOMElements.categorySelect.options.length > 0 && DOMElements.categorySelect.options[0].value !== "") {
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "--- Selecciona Categoría ---";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        DOMElements.categorySelect.prepend(defaultOption);
        console.log("app.js: Opción 'Selecciona Categoría' añadida al select.");
    } else if (DOMElements.categorySelect && DOMElements.categorySelect.options.length === 0) {
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "--- Selecciona Categoría ---";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        DOMElements.categorySelect.appendChild(defaultOption);
        console.log("app.js: Select de categoría estaba vacío, añadida opción por defecto.");
    }

    console.log("app.js: initializeApp completado.");
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("app.js: Evento DOMContentLoaded disparado.");
    try {
        initializeApp();
    } catch (error) {
        console.error("app.js: Error catastrófico durante initializeApp:", error);
    }
});

console.log("app.js: Fin del script.");
