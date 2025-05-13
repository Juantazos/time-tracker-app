<!DOCTYPE html>
<html lang="es"> <!-- 1. Añadido atributo lang para especificar el idioma del documento -->
<head>
    <meta charset="UTF-8"> <!-- 2. Especificar la codificación de caracteres, fundamental -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> <!-- 3. Esencial para el diseño responsivo -->
    <meta name="description" content="Una aplicación para registrar y visualizar el tiempo dedicado a diferentes actividades."> <!-- 4. Descripción para SEO -->
    
    <title>TimeTracker ⏱️</title>
    <link rel="stylesheet" href="styles.css">
    <!-- 5. (Opcional) Considera añadir un favicon: -->
    <!-- <link rel="icon" href="favicon.ico" type="image/x-icon"> -->
</head>
<body>
    <!-- 6. Usar <main> para el contenido principal de la página mejora la semántica y accesibilidad -->
    <main class="container">
        <h1>Registro de Tiempo 🕹️</h1>
        
        <!-- 7. Usar <section> para agrupar contenido temáticamente relacionado -->
        <section class="timer-card" aria-labelledby="timer-heading"> 
            <!-- 7a. (Opcional) Podrías añadir un h2 visualmente oculto si necesitas un encabezado para esta sección por accesibilidad -->
            <!-- <h2 id="timer-heading" class="visually-hidden">Controles del Temporizador</h2> -->
            
            <!-- 8. Añadir un <label> para el <select> mejora la accesibilidad -->
            <label for="category">Categoría:</label>
            <select id="category">
                <option value="Videojuegos">🎮 Videojuegos</option>
                <option value="Redes">📱 Redes Sociales</option>
                <option value="Streaming">🎥 Streaming</option>
                <!-- 8a. (Opcional) Considera una opción por defecto no seleccionable o "Selecciona categoría" -->
                <!-- <option value="" disabled selected>Selecciona una categoría</option> -->
            </select>
            
            <!-- 9. Especificar type="button" para los botones que no envían formularios -->
            <!-- 9a. Mover los manejadores de eventos (onclick) a JavaScript es una mejor práctica (separación de conceptos),
                 pero se mantienen aquí para no alterar tu lógica JS actual sin ver ese archivo. -->
            <button type="button" id="startStopBtn" onclick="toggleTimer()">▶️ Iniciar</button>
            
            <!-- 10. Para el display del temporizador, añadir role="timer" y aria-live para accesibilidad -->
            <p id="timerDisplay" role="timer" aria-live="polite">00:00:00</p>
            
            <button type="button" onclick="clearHistory()" class="delete-btn">🗑️ Borrar Historial</button>
        </section>

        <section class="stats" aria-labelledby="stats-heading">
            <h2 id="stats-heading">Estadísticas 📊</h2>
            
            <!-- 11. Añadir contenido de fallback y label para el canvas por accesibilidad -->
            <canvas id="chart" role="img" aria-label="Gráfico de estadísticas de tiempo">
                Tu navegador no soporta el elemento canvas. Aquí se mostraría un gráfico de tiempo.
            </canvas>
            
            <!-- 12. (Opcional) Si la lista de historial puede ser muy larga, considera envolverla en un div con overflow -->
            <ul id="historyList">
                <!-- Los elementos de la lista (li) se añadirán dinámicamente con JavaScript -->
            </ul>
        </section>
    </main>
    
    <!-- 13. Añadir el atributo defer a los scripts para que se ejecuten después de parsear el HTML sin bloquear el renderizado -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js" defer></script>
    <script src="app.js" defer></script>
</body>
</html>
