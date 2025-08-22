// Definición de variables del DOM
const cameraFeed = document.getElementById('camera-feed');
const cameraBtn = document.getElementById('camera-btn');
const captureBtn = document.getElementById('capture-btn');
const retakeBtn = document.getElementById('retake-btn');
const capturedImageCanvas = document.getElementById('captured-image');
const descriptionSection = document.getElementById('description-section');
const productPartNumber = document.getElementById('product-part-number');
const productDescription = document.getElementById('product-description');
const addBtn = document.getElementById('add-btn');
const catalogPreview = document.getElementById('catalog-preview');
// Nuevas variables para guardar/cargar JSON
const saveJsonBtn = document.getElementById('save-json-btn');
const loadJsonBtn = document.getElementById('load-json-btn');
const loadJsonInput = document.getElementById('load-json-input');
// Nueva variable para descargar PDF
const downloadPdfBtn = document.getElementById('download-pdf-btn');

// Array para almacenar los productos del catálogo
let catalog = [];
let stream; // Variable para mantener la referencia al stream de la cámara

// Asegurarse de que las librerías de PDF estén cargadas
const { jsPDF } = window.jspdf;

/**
 * Muestra un mensaje en una caja de diálogo personalizada.
 * @param {string} message El mensaje a mostrar.
 * @param {string} title El título del mensaje.
 */
function showMessageBox(message, title = "Aviso") {
    // Si ya existe una caja de mensaje, la elimina para evitar duplicados.
    const existingMessageBox = document.querySelector('.message-box');
    if (existingMessageBox) {
        existingMessageBox.parentElement.remove();
    }

    // Crea el contenedor del mensaje y el overlay.
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-box-overlay';
    
    messageContainer.innerHTML = `
        <div class="message-box bg-white p-8 rounded-xl shadow-2xl max-w-sm mx-auto text-center relative z-20">
            <h3 class="text-2xl font-bold mb-4 text-gray-800">${title}</h3>
            <p class="text-gray-600 mb-6">${message}</p>
            <button class="py-2 px-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors duration-300 shadow-md" onclick="this.parentElement.parentElement.remove()">Cerrar</button>
        </div>
    `;
    
    document.body.appendChild(messageContainer);
}


/**
 * Inicia el stream de la cámara y lo muestra en el elemento de video.
 */
async function startCamera() {
    try {
        // Solicita acceso a la cámara.
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        cameraFeed.srcObject = stream;
        cameraFeed.classList.add('active'); // Muestra el video
        capturedImageCanvas.classList.remove('active'); // Oculta el canvas
        
        // Cambia la visibilidad de los botones
        cameraBtn.style.display = 'none';
        uploadBtn.style.display = 'none';
        captureBtn.style.display = 'block';
        retakeBtn.style.display = 'none';
        descriptionSection.style.display = 'none';
        addBtn.style.display = 'none';
        
    } catch (err) {
        // Maneja los errores si el usuario deniega el permiso o si la cámara no está disponible.
        console.error("Error al acceder a la cámara:", err);
        showMessageBox("No se pudo iniciar la cámara. Asegúrate de que tu dispositivo tenga una cámara y que le hayas dado permiso de acceso.", "Error de Cámara");
    }
}

/**
 * Detiene el stream de la cámara.
 */
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

/**
 * Captura un fotograma del video y lo dibuja en el canvas.
 */
function capturePhoto() {
    // Configura el canvas para que tenga las mismas dimensiones que el video.
    capturedImageCanvas.width = cameraFeed.videoWidth;
    capturedImageCanvas.height = cameraFeed.videoHeight;
    const ctx = capturedImageCanvas.getContext('2d');
    
    // Dibuja el fotograma del video en el canvas.
    ctx.drawImage(cameraFeed, 0, 0, capturedImageCanvas.width, capturedImageCanvas.height);
    
    // Oculta el video y muestra el canvas con la imagen capturada.
    cameraFeed.classList.remove('active');
    capturedImageCanvas.classList.add('active');
    
    // Detiene el stream de la cámara para ahorrar batería.
    stopCamera();
    
    // Muestra los botones y secciones correspondientes
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'block';
    descriptionSection.style.display = 'block';
    addBtn.style.display = 'block';
}

/**
 * Agrega un producto al catálogo y actualiza la vista previa.
 */
function addProduct() {
    const partNumber = productPartNumber.value.trim();
    const description = productDescription.value.trim();
    if (!partNumber || !description) {
        showMessageBox("Por favor, agrega el Part Number y la descripción antes de agregar el producto.");
        return;
    }
    
    // Obtiene la imagen del canvas en formato Base64.
    const imageDataUrl = capturedImageCanvas.toDataURL('image/png');
    
    // Crea un objeto de producto y lo agrega al array.
    const product = {
        image: imageDataUrl,
        partNumber: partNumber,
        description: description
    };
    catalog.push(product);
    
    // Limpia los campos y esconde las secciones para el próximo producto.
    productPartNumber.value = '';
    productDescription.value = '';
    retakeBtn.style.display = 'none';
    descriptionSection.style.display = 'none';
    addBtn.style.display = 'none';
    
    // Oculta el canvas y muestra los botones de inicio
    capturedImageCanvas.classList.remove('active');
    cameraBtn.style.display = 'block';
    uploadBtn.style.display = 'block';

    // Renderiza el nuevo producto en la vista previa del catálogo.
    renderCatalogPreview();
}

/**
 * Renderiza la vista previa de todos los productos en el catálogo.
 */
function renderCatalogPreview() {
    catalogPreview.innerHTML = ''; // Limpia el contenedor
    catalog.forEach((product, index) => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card bg-slate-50 p-4 rounded-xl shadow-md transition-transform duration-200';
        productCard.innerHTML = `
            <img src="${product.image}" alt="Producto ${index + 1}" class="w-full h-48 object-cover rounded-t-xl mb-3">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Part Number: ${product.partNumber}</h3>
            <p class="text-sm text-gray-700 leading-relaxed p-2">${product.description}</p>
        `;
        catalogPreview.appendChild(productCard);
    });
}

/**
 * Descarga el catálogo en un archivo PDF.
 */
function downloadCatalogAsPdf() {
    if (catalog.length === 0) {
        showMessageBox("No hay productos para descargar. Por favor, agrega algunos primero.");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const element = catalogPreview; // El elemento HTML a convertir
    
    // Ocultar temporalmente los botones que no queremos en el PDF
    const buttons = document.querySelectorAll('.product-card button');
    buttons.forEach(btn => btn.style.display = 'none');

    // Usar html2canvas para renderizar el contenido HTML como una imagen
    html2canvas(element, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // Ancho A4 en mm
        const pageHeight = 297; // Alto A4 en mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            doc.addPage();
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        doc.save('catalogo.pdf');
        
        // Volver a mostrar los botones
        buttons.forEach(btn => btn.style.display = 'block');
    }).catch(error => {
        console.error("Error al generar el PDF:", error);
        showMessageBox("Ocurrió un error al generar el PDF. Por favor, inténtalo de nuevo.");
    });
}

// Función para descargar el catálogo como JSON
function saveCatalogAsJson() {
    if (catalog.length === 0) {
        showMessageBox("No hay productos para guardar. Por favor, agrega algunos primero.");
        return;
    }
    const dataStr = JSON.stringify(catalog, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catalogo.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Función para cargar un catálogo desde un archivo JSON
function loadCatalogFromJson(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loadedCatalog = JSON.parse(e.target.result);
                // Validación básica de los datos cargados
                if (Array.isArray(loadedCatalog) && loadedCatalog.every(p => p.image && p.partNumber && p.description)) {
                    catalog = loadedCatalog;
                    renderCatalogPreview();
                    showMessageBox("Catálogo cargado exitosamente.");
                } else {
                    showMessageBox("El archivo JSON no tiene el formato de catálogo correcto.");
                }
            } catch (error) {
                showMessageBox("Error al leer el archivo. Asegúrate de que es un JSON válido.");
                console.error("Error parsing JSON:", error);
            }
        };
        reader.readAsText(file);
    }
}


// Escuchadores de eventos para los botones
cameraBtn.addEventListener('click', startCamera);
captureBtn.addEventListener('click', capturePhoto);
retakeBtn.addEventListener('click', () => {
    // Detiene la cámara si está activa
    stopCamera();
    // Muestra los botones iniciales y oculta el canvas
    capturedImageCanvas.classList.remove('active');
    cameraBtn.style.display = 'block';
    uploadBtn.style.display = 'block';
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'none';
    descriptionSection.style.display = 'none';
    addBtn.style.display = 'none';
});
addBtn.addEventListener('click', addProduct);
downloadPdfBtn.addEventListener('click', downloadCatalogAsPdf);
saveJsonBtn.addEventListener('click', saveCatalogAsJson);
loadJsonBtn.addEventListener('click', () => loadJsonInput.click());
loadJsonInput.addEventListener('change', loadCatalogFromJson);

// Nuevo escuchador de eventos para el botón de subir foto
const fileUpload = document.getElementById('file-upload'); // Declaración correcta de la variable
uploadBtn.addEventListener('click', () => fileUpload.click());

// Nuevo escuchador de eventos para el campo de entrada de archivos
fileUpload.addEventListener('change', (e) => {
    // Detiene la cámara si está activa
    stopCamera();
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Dibuja la imagen en el canvas
                const ctx = capturedImageCanvas.getContext('2d');
                capturedImageCanvas.width = img.width;
                capturedImageCanvas.height = img.height;
                ctx.drawImage(img, 0, 0, capturedImageCanvas.width, capturedImageCanvas.height);
                
                // Muestra el canvas con la imagen y la sección de descripción
                cameraFeed.classList.remove('active');
                capturedImageCanvas.classList.add('active');
                retakeBtn.style.display = 'block';
                descriptionSection.style.display = 'block';
                addBtn.style.display = 'block';

                // Oculta los botones de inicio y captura
                cameraBtn.style.display = 'none';
                uploadBtn.style.display = 'none';
                captureBtn.style.display = 'none';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});
