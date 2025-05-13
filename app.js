"use strict"; // 1. Habilitar modo estricto para mejores prácticas y errores más claros

// -------------------------------------
//  CONSTANTES GLOBALES Y CONFIGURACIÓN
// -------------------------------------
const LOCAL_STORAGE_KEY = 'timeTrackerAppHistory_v1.1'; // Clave versionada
const MS_IN_HOUR = 3600000;
const MS_IN_MINUTE = 60000;
const MS_IN_SECOND = 1000;

const CHART_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98FB98', '#ADD8E6',
    '#FFD700', '#DA70D6', '#32CD32', '#6A5ACD', '#FFC0CB', '#F0E68C'
]; // Paleta de colores ampliada

// -------------------------------------
//  SELECTORES DEL DOM (CACHEADOS)
// -------------------------------------
// 2. Agrupar selectores para claridad y rendimiento (aunque mínimo aquí, es buena práctica)
const DOMElements = {
    startStopBtn: document.getElementById('startStopBtn'),
    timerDisplay: document.getElementById('timerDisplay'),
    categorySelect: document.getElementById('category'),
    historyList: document.getElementById('historyList'),
    chartCanvas: document.getElementById('chart'),
    deleteHistoryBtn: document.querySelector('.delete-btn') // Asumiendo que solo hay uno
};

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

/**
 * Formatea milisegundos a una cadena HH:MM:SS.
 * @param {number} ms - Milisegundos a formatear.
 * @returns {string} Tiempo formateado.
 */
function formatMillisecondsToTime(ms) {
    if (isNaN(ms) || ms < 0) return '00:00:00'; // 3. Manejo de entrada inválida
    const totalSeconds = Math.floor(ms / MS_IN_SECOND);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Formatea milisegundos a horas con dos decimales.
 * @param {number} ms - Milisegundos a formatear.
 * @returns {number} Horas con dos decimales.
 */
function formatMillisecondsToHours(ms) {
    if (isNaN(ms) || ms < 0) return 0;
    return parseFloat((ms / MS_IN_HOUR).toFixed(2));
}

// -------------------------------------
//  LÓGICA DEL TEMPORIZADOR
// -------------------------------------
function toggleTimer() {
    appState.isTimerRunning = !appState.isTimerRunning;

    if (appState.isTimerRunning) {
        // 4. Validar si se ha seleccionado una categoría antes de iniciar
        if (!DOMElements.categorySelect.value || DOMElements.categorySelect.value === "") {
            alert("Por favor, selecciona una categoría antes de iniciar el temporizador.");
            appState.isTimerRunning = false; // Revertir estado
            return;
        }
        appState.currentSessionStartTime = Date.now();
        DOMElements.startStopBtn.textContent = '⏹️ Detener';
        DOMElements.startStopBtn.classList.add('running'); // Para CSS
        DOMElements.startStopBtn.setAttribute('aria-label', 'Detener temporizador'); // 5. ARIA para accesibilidad
        appState.timerIntervalId = setInterval(updateTimerDisplay, 1000);
    } else {
        if (appState.timerIntervalId) clearInterval(appState.timerIntervalId);
        DOMElements.startStopBtn.textContent = '▶️ Iniciar';
        DOMElements.startStopBtn.classList.remove('running');
        DOMElements.startStopBtn.setAttribute('aria-label', 'Iniciar temporizador'); // 5.
        saveCurrentEntry(); // Guardar solo si realmente se detuvo un temporizador
        renderUI();
    }
}

function updateTimerDisplay() {
    const elapsedMilliseconds = Date.now() - appState.currentSessionStartTime;
    DOMElements.timerDisplay.textContent = formatMillisecondsToTime(elapsedMilliseconds);
}

// -------------------------------------
//  MANEJO DE DATOS (ENTRADAS E HISTORIAL)
// -------------------------------------
function saveCurrentEntry() {
    const category = DOMElements.categorySelect.value;
    const endTime = Date.now();
    const duration = endTime - appState.currentSessionStartTime;

    // No guardar si la duración es muy corta (ej. menos de 1 segundo) o si no hay categoría
    if (duration < MS_IN_SECOND || !category) {
        console.warn("Entrada no guardada: duración muy corta o sin categoría.");
        return;
    }

    appState.timeEntries.push({
        id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 6. ID único para cada entrada
        category: category,
        start: appState.currentSessionStartTime,
        end: endTime,
        duration: duration
    });
    saveEntriesToLocalStorage();
}

function loadEntriesFromLocalStorage() {
    try {
        const storedEntries = localStorage.getItem(LOCAL_STORAGE_KEY);
        appState.timeEntries = storedEntries ? JSON.parse(storedEntries) : [];
    } catch (error) {
        console.error("Error al cargar entradas desde localStorage:", error);
        appState.timeEntries = [];
        // 7. Opcional: Informar al usuario de un problema al cargar datos
        // alert("Hubo un problema al cargar el historial guardado. Es posible que se haya perdido.");
    }
}

function saveEntriesToLocalStorage() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appState.timeEntries));
    } catch (error) {
        console.error("Error al guardar entradas en localStorage:", error);
        alert("No se pudo guardar el historial. El almacenamiento podría estar lleno o los datos ser inválidos.");
    }
}

function clearAllHistory() {
    // 8. Usar SweetAlert2 o una modal nativa más bonita para la confirmación, si es posible
    if (confirm("⚠️ ¿Estás seguro de que quieres borrar TODO el historial? Esta acción no se puede deshacer.")) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        appState.timeEntries = [];
        renderUI();
        alert("Historial borrado exitosamente ✅");
    }
}

// -------------------------------------
//  RENDERIZADO DE UI (GRÁFICO E HISTORIAL)
// -------------------------------------
function renderUI() {
    renderChart();
    renderHistoryList();
}

function renderChart() {
    if (!DOMElements.chartCanvas) return; // 9. Comprobación de existencia del elemento canvas
    const ctx = DOMElements.chartCanvas.getContext('2d');

    const categoryTotals = appState.timeEntries.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + entry.duration;
        return acc;
    }, {});

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals).map(ms => formatMillisecondsToHours(ms));

    if (appState.chartInstance) {
        appState.chartInstance.destroy();
    }

    if (labels.length === 0) {
        ctx.clearRect(0, 0, DOMElements.chartCanvas.width, DOMElements.chartCanvas.height);
        ctx.font = "16px " + getComputedStyle(document.body).fontFamily; // Usar fuente del body
        ctx.fillStyle = getComputedStyle(document.body).color; // Usar color de texto del body
        ctx.textAlign = 'center';
        ctx.fillText("No hay datos para mostrar en el gráfico.", DOMElements.chartCanvas.width / 2, DOMElements.chartCanvas.height / 2);
        return;
    }

    appState.chartInstance = new Chart(ctx, {
        type: 'doughnut', // 10. 'doughnut' puede ser más moderno que 'pie'
        data: {
            labels: labels,
            datasets: [{
                label: 'Tiempo por Categoría (horas)',
                data: data,
                backgroundColor: labels.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
                borderColor: getComputedStyle(document.body).getPropertyValue('--primary-bg') || '#FFFFFF', // 11. Borde del color del fondo para mejor look
                borderWidth: 2, // Un poco más grueso
                hoverOffset: 4 // Efecto al pasar el mouse
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { // 12. Añadir animación suave
                duration: 800,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    position: 'bottom', // 'bottom' puede ser mejor en móviles
                    labels: {
                        color: getComputedStyle(document.body).color, // Color de texto de la leyenda
                        padding: 20 // Espacio para la leyenda
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    titleColor: '#FFF',
                    bodyColor: '#FFF',
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.parsed !== null) {
                                // Mostrar horas y minutos en el tooltip
                                const totalMs = Object.values(categoryTotals)[context.dataIndex]; // Obtener los ms originales
                                label += formatMillisecondsToTime(totalMs) + ` (${context.parsed.toFixed(2)}h)`;
                            }
                            return label;
                        }
                    }
                },
                // 13. Título del gráfico (Opcional)
                title: {
                    display: true,
                    text: 'Distribución de Tiempo por Categoría',
                    color: getComputedStyle(document.body).color,
                    font: {
                        size: 18
                    },
                    padding: {
                        top: 10,
                        bottom: 10 // Reducir si la leyenda está arriba, aumentar si está abajo
                    }
                }
            }
        }
    });
}

function renderHistoryList() {
    if (!DOMElements.historyList) return; // 9.

    if (appState.timeEntries.length === 0) {
        DOMElements.historyList.innerHTML = '<li class="history-empty-message">No hay actividades registradas aún.</li>';
        return;
    }

    // 14. Usar document fragments para mejor rendimiento al actualizar muchos elementos del DOM
    const fragment = document.createDocumentFragment();
    appState.timeEntries
        .slice()
        .reverse()
        .forEach(entry => {
            const li = document.createElement('li');
            li.classList.add('history-entry'); // Clase para estilizar
            li.setAttribute('data-entry-id', entry.id); // Atributo para identificar (para futuras acciones como borrar individualmente)

            const entryDate = new Date(entry.start).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            const entryStartTime = new Date(entry.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            const durationFormatted = formatMillisecondsToTime(entry.duration);

            // 15. Estructura HTML más semántica y con más info. Usar `<code>` para datos técnicos.
            li.innerHTML = `
                <div class="entry-header">
                    <strong>${entry.category}</strong>
                    <time datetime="${new Date(entry.start).toISOString()}">${entryDate} - ${entryStartTime}</time>
                </div>
                <div class="entry-details">
                    <span>Duración: <code>${durationFormatted}</code></span>
                    <span>(Total: ${formatMillisecondsToHours(entry.duration)}h)</span>
                </div>
                <!-- Opcional: botón para borrar entrada individual -->
                <!-- <button class="delete-entry-btn" data-id="${entry.id}" aria-label="Borrar esta entrada">🗑️</button> -->
            `;
            fragment.appendChild(li);
        });
    DOMElements.historyList.innerHTML = ''; // Limpiar lista existente
    DOMElements.historyList.appendChild(fragment);
}

// -------------------------------------
//  INICIALIZACIÓN Y EVENT LISTENERS
// -------------------------------------
function initializeApp() {
    // 16. Asegurarse de que todos los elementos del DOM existen antes de añadir listeners
    if (!DOMElements.startStopBtn || !DOMElements.deleteHistoryBtn || !DOMElements.categorySelect) {
        console.error("Error de inicialización: Faltan elementos del DOM esenciales.");
        // Podrías mostrar un mensaje al usuario aquí
        // document.body.innerHTML = "<p>Error al cargar la aplicación. Por favor, recarga la página o contacta soporte.</p>";
        return;
    }

    loadEntriesFromLocalStorage();
    renderUI();

    DOMElements.startStopBtn.addEventListener('click', toggleTimer);
    DOMElements.deleteHistoryBtn.addEventListener('click', clearAllHistory);

    // 17. (Opcional) Añadir una opción "Selecciona categoría" si no existe y seleccionarla
    if (DOMElements.categorySelect.options[0].value !== "") {
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "--- Selecciona Categoría ---";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        DOMElements.categorySelect.prepend(defaultOption);
    }

    // (Opcional) Listener para cambios en la categoría (ej. para actualizar UI si es necesario)
    // DOMElements.categorySelect.addEventListener('change', (event) => {
    //     if (!appState.isTimerRunning) {
    //         // Lógica si cambia la categoría y el timer no está corriendo
    //     }
    // });
}

// Asegurar que Chart.js está cargado antes de inicializar (si no se usa defer en su script tag)
// if (typeof Chart !== 'undefined') {
//    document.addEventListener('DOMContentLoaded', initializeApp);
// } else {
//    console.error("Chart.js no está cargado.");
// }
// Si usas 'defer' en el script de Chart.js y tu app.js, DOMContentLoaded es suficiente.
document.addEventListener('DOMContentLoaded', initializeApp);
