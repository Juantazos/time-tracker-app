let timer = null;
let startTime = 0;
let isRunning = false;

// Datos guardados en localStorage
let history = JSON.parse(localStorage.getItem('timeHistory')) || [];

function toggleTimer() {
    const button = document.getElementById('startStopBtn');
    if (!isRunning) {
        startTime = Date.now();
        isRunning = true;
        button.textContent = '⏹️ Detener';
        timer = setInterval(updateDisplay, 1000);
    } else {
        isRunning = false;
        button.textContent = '▶️ Iniciar';
        clearInterval(timer);
        saveEntry();
        updateStats();
    }
}

function updateDisplay() {
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    document.getElementById('timerDisplay').textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function saveEntry() {
    const category = document.getElementById('category').value;
    history.push({
        category: category,
        start: startTime,
        end: Date.now()
    });
    localStorage.setItem('timeHistory', JSON.stringify(history));
}

function updateStats() {
    const ctx = document.getElementById('chart').getContext('2d');
    const categories = history.reduce((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + (entry.end - entry.start);
        return acc;
    }, {});

    // Destruye el gráfico anterior si existe
    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories).map(ms => ms / 3600000),
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1']
            }]
        },
        options: { responsive: true }
    });

    // Mostrar historial
    const list = document.getElementById('historyList');
    list.innerHTML = history.map(entry => `
        <li>${new Date(entry.start).toLocaleDateString()}: ${entry.category} - ${((entry.end - entry.start)/3600000).toFixed(2)}h</li>
    `).join('');
}

// ====== NUEVA FUNCIÓN PARA BORRAR HISTORIAL ====== //
function clearHistory() {
    if (confirm("⚠️ ¿Borrar TODO el historial? ¡Esta acción no se puede deshacer!")) {
        localStorage.clear();
        history = [];
        updateStats(); // Actualiza el gráfico y la lista
        alert("Historial borrado ✅");
    }
}

// Inicializar estadísticas al cargar
document.addEventListener('DOMContentLoaded', updateStats);
