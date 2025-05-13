cacheDOMElements();

if (!DOMElements.startStopBtn || !DOMElements.deleteHistoryBtn || !DOMElements.categorySelect || !DOMElements.timerDisplay || !DOMElements.historyList || !DOMElements.chartCanvas) {
    console.error("app.js: FATAL - Faltan elementos del DOM esenciales para inicializar la aplicación...");
    return;
}

console.log("app.js: Todos los elementos del DOM necesarios parecen estar presentes.");

loadEntriesFromLocalStorage();
renderUI(false); // Primera renderización, no es en tiempo real

console.log("app.js: Añadiendo event listeners...");
DOMElements.startStopBtn.addEventListener('click', toggleTimer);
DOMElements.deleteHistoryBtn.addEventListener('click', clearAllHistory);

if (DOMElements.historyList) {
    DOMElements.historyList.addEventListener('click', function(event) {
        const clickedElement = event.target;
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
