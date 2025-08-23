document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    const takePhotoButton = document.getElementById('takePhotoButton');
    const uploadInput = document.getElementById('uploadInput');
    const switchCameraButton = document.getElementById('switchCameraButton');
    const addProductButton = document.getElementById('addProductButton');
    const downloadJsonButton = document.getElementById('downloadJsonButton');
    const downloadPdfButton = document.getElementById('downloadPdfButton');
    const loadJsonInput = document.getElementById('loadJsonInput');
    const catalogList = document.getElementById('catalogList');
    const messageBox = document.getElementById('messageBox');
    const codigoSelect = document.getElementById('codigoSelect');
    const uploadCsvInput = document.getElementById('uploadCsvInput');
    const downloadCsvTemplateButton = document.getElementById('downloadCsvTemplateButton');
    const productInfoDisplay = document.getElementById('productInfoDisplay');
    const selectedCodigoDisplay = document = document.getElementById('selectedCodigo');
    const selectedDescripcionDisplay = document.getElementById('selectedDescripcion');
    const selectedSubgrupoDisplay = document.getElementById('selectedSubgrupo');

    // Array para almacenar los productos del catálogo y los datos del CSV
    let catalogProducts = [];
    let csvData = [];
    let currentImage = null;
    let stream = null;
    let cameras = [];
    let currentCameraIndex = 0;

    // Función para mostrar mensajes al usuario
    const showMessage = (text, type = 'info') => {
        let colorClass = 'text-gray-700';
        if (type === 'success') {
            colorClass = 'text-green-600';
        } else if (type === 'error') {
            colorClass = 'text-red-600';
        }
        messageBox.innerHTML = `<p class="${colorClass} font-semibold">${text}</p>`;
        setTimeout(() => {
            messageBox.innerHTML = '';
        }, 3000);
    };

    // Obtiene la lista de cámaras disponibles
    async function getCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            cameras = devices.filter(device => device.kind === 'videoinput');
            if (cameras.length > 1) {
                switchCameraButton.style.display = 'block';
            } else {
                switchCameraButton.style.display = 'none';
            }
        } catch (err) {
            console.error('Error al enumerar los dispositivos:', err);
            switchCameraButton.style.display = 'none';
        }
    }

    // Inicia la cámara y muestra el video
    async function startCamera(deviceId) {
        stopCamera();
        const constraints = {
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined
            }
        };
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            video.play();
            showMessage('Cámara iniciada. ¡Listo para tomar fotos!', 'success');
            video.style.display = 'block';
            canvas.style.display = 'none';
        } catch (err) {
            showMessage('Error al acceder a la cámara. Por favor, asegúrate de dar los permisos necesarios.', 'error');
            console.error('Error al acceder a la cámara:', err);
            video.style.display = 'none';
            takePhotoButton.style.display = 'none';
            switchCameraButton.style.display = 'none';
        }
    }

    // Detiene la cámara
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    }

    // Muestra una imagen en el canvas
    function displayImage(imgSrc) {
        // CORRECCIÓN: Se elimina stopCamera() para mantener el flujo de video activo en segundo plano
        // y evitar errores de reinicio en dispositivos móviles.
        const img = new Image();
        img.onload = () => {
            canvas.width = img.videoWidth;
            canvas.height = img.videoHeight;
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            video.style.display = 'none';
            canvas.style.display = 'block';
            currentImage = canvas.toDataURL('image/png');
        };
        img.src = imgSrc;
    }

    // Renderiza la lista completa de productos en la UI
    function renderCatalog() {
        catalogList.innerHTML = '';
        catalogProducts.forEach((product, index) => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card flex justify-between items-center';
            // Muestra código, descripción y subgrupo en el catálogo
            productCard.innerHTML = `
                <div class="flex-1">
                    <p class="text-gray-700 font-medium">Código: ${product.codigo}</p>
                    <p class="text-gray-700 font-medium">Descripción: ${product.description}</p>
                    <p class="text-gray-700 font-medium">Subgrupo: ${product.subgrupo}</p>
                </div>
                <button class="delete-product bg-red-500 text-white font-bold py-2 px-4 rounded-full text-sm hover:bg-red-600 transition duration-300" data-index="${index}">
                    Eliminar
                </button>
            `;
            catalogList.appendChild(productCard);
        });
    }

    // Rellena el select de códigos
    function fillCodigoSelect() {
        codigoSelect.innerHTML = '<option value="">Selecciona un código...</option>';
        const catalogedCodes = new Set(catalogProducts.map(p => p.codigo));
        csvData.forEach(item => {
            if (!catalogedCodes.has(item.codigo)) {
                const option = document.createElement('option');
                option.value = item.codigo;
                // Combina el código y la descripción para una visualización más clara
                option.textContent = `${item.codigo} - ${item.descripcion}`; 
                codigoSelect.appendChild(option);
            }
        });
    }

    // Manejador del botón 'Tomar Foto'
    takePhotoButton.addEventListener('click', () => {
        if (!stream) {
            showMessage('La cámara no está disponible.', 'error');
            return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Se llama a displayImage con el canvas como source
        displayImage(canvas.toDataURL('image/png'));
        showMessage('Foto tomada. Ahora selecciona un código y agrégala.', 'success');
    });

    // Manejador del botón 'Cambiar Cámara'
    switchCameraButton.addEventListener('click', () => {
        currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
        const nextCameraId = cameras[currentCameraIndex].deviceId;
        startCamera(nextCameraId);
    });

    // Manejador del input de subir archivo de imagen
    uploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                displayImage(e.target.result);
                // CORRECCIÓN: Si se sube una imagen, el flujo de video se detiene
                // ya que no se necesita más.
                stopCamera();
                showMessage('Foto subida. Ahora selecciona un código y agrégala.', 'success');
            };
            reader.readAsDataURL(file);
        }
    });

    // Manejador del evento change del select de códigos
    codigoSelect.addEventListener('change', (event) => {
        const selectedCodigo = event.target.value;
        if (selectedCodigo) {
            const productData = csvData.find(item => item.codigo === selectedCodigo);
            if (productData) {
                selectedCodigoDisplay.textContent = productData.codigo;
                selectedDescripcionDisplay.textContent = productData.descripcion || 'Sin descripción';
                selectedSubgrupoDisplay.textContent = productData.subgrupo || 'Sin subgrupo';
                productInfoDisplay.style.display = 'block';
            }
        } else {
            productInfoDisplay.style.display = 'none';
        }
    });

    // Manejador del botón 'Agregar Producto'
    addProductButton.addEventListener('click', () => {
        const codigo = codigoSelect.value;
        if (!currentImage) {
            showMessage('Primero debes tomar una foto o subir una.', 'error');
            return;
        }
        if (!codigo) {
            showMessage('Por favor, selecciona un código para el producto.', 'error');
            return;
        }

        // VALIDACIÓN: Evita agregar productos con códigos duplicados
        const isDuplicate = catalogProducts.some(p => p.codigo === codigo);
        if (isDuplicate) {
            showMessage(`El producto con el código ${codigo} ya está en el catálogo.`, 'error');
            return;
        }
        
        // Buscar el producto en los datos del CSV para obtener toda la información
        const productData = csvData.find(item => item.codigo === codigo);

        const newProduct = {
            image: currentImage,
            codigo: productData.codigo,
            description: productData.descripcion || '',
            grupo: productData.grupo || '',
            subgrupo: productData.subgrupo || ''
        };

        catalogProducts.push(newProduct);
        renderCatalog();

        // Reiniciar la UI después de agregar
        currentImage = null;
        codigoSelect.value = '';
        productInfoDisplay.style.display = 'none';
        
        // Actualiza el select de códigos después de agregar un producto
        fillCodigoSelect();
        
        // CORRECCIÓN: En lugar de reiniciar la cámara, solo se muestra el video de nuevo
        // para que el usuario pueda tomar otra foto.
        video.style.display = 'block';
        canvas.style.display = 'none';

        showMessage('Producto agregado al catálogo.', 'success');
    });

    // Manejador del input de cargar JSON
    loadJsonInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const loadedData = JSON.parse(e.target.result);
                    if (Array.isArray(loadedData) && loadedData.every(p => p.image && p.description)) {
                        catalogProducts = loadedData;
                        renderCatalog();
                        // Al cargar el JSON, se actualiza el select para que los códigos ya catalogados no se muestren
                        fillCodigoSelect();
                        showMessage('Catálogo cargado exitosamente. ¡Puedes seguir editando!', 'success');
                    } else {
                        showMessage('El archivo no tiene un formato de catálogo válido.', 'error');
                    }
                } catch (err) {
                    showMessage('Error al leer el archivo JSON.', 'error');
                    console.error('Error parsing JSON:', err);
                }
            };
            reader.readAsText(file);
        }
    });

    // Manejador del input de cargar CSV
    uploadCsvInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim() !== '');
                if (lines.length === 0) {
                    showMessage('El archivo CSV está vacío.', 'error');
                    return;
                }
                const firstLine = lines[0];
                const delimiter = firstLine.includes(';') ? ';' : ',';

                const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());

                const expectedHeaders = ['codigo', 'descripcion', 'grupo', 'subgrupo'];
                const hasRequiredHeaders = expectedHeaders.every(h => headers.includes(h));

                if (!hasRequiredHeaders) {
                    showMessage('El archivo CSV no tiene las columnas requeridas (codigo, descripcion, grupo, subgrupo).', 'error');
                    return;
                }

                csvData = lines.slice(1).map(line => {
                    const values = line.split(delimiter).map(v => v.trim());
                    const obj = {};
                    headers.forEach((header, i) => {
                        obj[header] = values[i];
                    });
                    return obj;
                });
                
                fillCodigoSelect(); // Rellena el select con los datos del CSV
                showMessage('Datos CSV cargados exitosamente. Ahora puedes seleccionar códigos.', 'success');
            };
            reader.readAsText(file);
        }
    });

    // Manejador del botón para descargar la plantilla CSV
    downloadCsvTemplateButton.addEventListener('click', () => {
        const headers = ['codigo', 'descripcion', 'grupo', 'subgrupo'];
        const csvContent = headers.join(',') + '\n';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'plantilla_catalogo.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    // Manejador del evento de clic en la lista para eliminar productos
    catalogList.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-product')) {
            const index = event.target.dataset.index;
            catalogProducts.splice(index, 1);
            renderCatalog();
            fillCodigoSelect(); // Actualiza el select de códigos
            showMessage('Producto eliminado del catálogo.', 'info');
        }
    });

    // Manejador del botón 'Descargar en JSON'
    downloadJsonButton.addEventListener('click', () => {
        if (catalogProducts.length === 0) {
            showMessage('El catálogo está vacío. Agrega algunos productos primero.', 'error');
            return;
        }
        const jsonData = JSON.stringify(catalogProducts, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const timestamp = now.getFullYear() + '-' +
                          String(now.getMonth() + 1).padStart(2, '0') + '-' +
                          String(now.getDate()).padStart(2, '0') + '_' +
                          String(now.getHours()).padStart(2, '0') + '-' +
                          String(now.getMinutes()).padStart(2, '0') + '-' +
                          String(now.getSeconds()).padStart(2, '0');
        a.download = `catalogo-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage('Catálogo descargado como catalogo.json.', 'success');
    });

    // Manejador del botón 'Descargar en PDF'
    downloadPdfButton.addEventListener('click', () => {
        if (catalogProducts.length === 0) {
            showMessage('El catálogo está vacío. Agrega algunos productos primero.', 'error');
            return;
        }
        
        // Define las dimensiones del papel de oficio en puntos (mm * 2.83465)
        const oficioWidth = 215.9 * 2.83465;
        const oficioHeight = 330.2 * 2.83465;

        // Crear el documento PDF con formato Oficio
        const doc = new window.jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: [oficioWidth, oficioHeight]
        });

        const title = 'Catálogo de Productos';
        const pageMargin = 20;
        let y = pageMargin;

        // Título del documento
        doc.setFontSize(22);
        doc.setTextColor(50, 50, 50);
        doc.text(title, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 30; // Más espacio después del título

        // Ordenar productos por código
        catalogProducts.sort((a, b) => (a.codigo > b.codigo) ? 1 : -1);

        const imgSize = 50; // Tamaño de la imagen
        const lineSpacing = 6;
        const cardPadding = 10;
        const gapBetweenCards = 10;
        const cardsPerRow = 2; // Número de tarjetas por fila
        const cardWidth = (doc.internal.pageSize.getWidth() - pageMargin * 2 - (gapBetweenCards * (cardsPerRow - 1))) / cardsPerRow;
        const textXOffset = imgSize + cardPadding + 10;
        // Ajustar el ancho máximo del texto para usar el espacio restante en la tarjeta
        const textMaxWidth = cardWidth - textXOffset - cardPadding;

        let maxYInRow = y;

        catalogProducts.forEach((product, index) => {
            // Calcular la posición x e y de la tarjeta
            const cardIndexInRow = index % cardsPerRow;
            const x = pageMargin + (cardIndexInRow * (cardWidth + gapBetweenCards));
            
            // Medir la altura del texto dinámicamente
            let tempDoc = new window.jspdf.jsPDF(); // Crear un doc temporal para medir el texto
            tempDoc.setFontSize(9);
            const descLines = tempDoc.splitTextToSize(`Descripción: ${product.description}`, textMaxWidth);
            const groupLines = tempDoc.splitTextToSize(`Grupo: ${product.grupo}`, textMaxWidth);
            const subgroupLines = tempDoc.splitTextToSize(`Subgrupo: ${product.subgrupo}`, textMaxWidth);

            // Calcular la altura total del texto
            let textHeight = 0;
            textHeight += descLines.length * lineSpacing;
            textHeight += groupLines.length * lineSpacing;
            textHeight += subgroupLines.length * lineSpacing;
            textHeight += 3 * 2; // Añadir un poco de espacio entre las líneas

            const cardHeight = Math.max(imgSize + cardPadding * 2, textHeight + cardPadding * 2);

            // Si es la primera tarjeta de la fila, verificar si hay espacio en la página
            if (cardIndexInRow === 0) {
                if (y + cardHeight + gapBetweenCards > doc.internal.pageSize.getHeight() - pageMargin) {
                    doc.addPage();
                    y = pageMargin; // Resetear la posición y al inicio de la nueva página
                }
                maxYInRow = y + cardHeight;
            } else {
                // Para la segunda tarjeta en la fila, asegurarse de que se alinee con la tarjeta anterior
                // y de que la fila se mueva hacia abajo basada en la tarjeta más alta.
                if (y + cardHeight > maxYInRow) {
                    maxYInRow = y + cardHeight;
                }
            }

            // Dibujar el cuadro del producto
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(240, 240, 240);
            doc.roundedRect(x, y, cardWidth, cardHeight, 5, 5, 'FD');

            // Cargar y dibujar la imagen
            const img = new Image();
            img.src = product.image;
            doc.addImage(img, 'PNG', x + cardPadding, y + (cardHeight - imgSize) / 2, imgSize, imgSize);

            // Mostrar la información del producto
            let textY = y + cardPadding;
            const textX = x + textXOffset;

            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);

            // Código
            doc.text(`Código: ${product.codigo}`, textX, textY);
            textY += lineSpacing + 2;
            
            // Descripción
            doc.text(doc.splitTextToSize(`Descripción: ${product.description}`, textMaxWidth), textX, textY);
            textY += descLines.length * lineSpacing + 2;
            
            // Grupo
            doc.text(doc.splitTextToSize(`Grupo: ${product.grupo}`, textMaxWidth), textX, textY);
            textY += groupLines.length * lineSpacing + 2;
            
            // Subgrupo
            doc.text(doc.splitTextToSize(`Subgrupo: ${product.subgrupo}`, textMaxWidth), textX, textY);
            
            // Mover a la siguiente fila solo si es la última tarjeta de la fila actual
            if (cardIndexInRow === cardsPerRow - 1 || index === catalogProducts.length - 1) {
                y = maxYInRow + gapBetweenCards;
            }
        });
        
        const now = new Date();
        const timestamp = now.getFullYear() + '-' +
                          String(now.getMonth() + 1).padStart(2, '0') + '-' +
                          String(now.getDate()).padStart(2, '0') + '_' +
                          String(now.getHours()).padStart(2, '0') + '-' +
                          String(now.getMinutes()).padStart(2, '0') + '-' +
                          String(now.getSeconds()).padStart(2, '0');
        doc.save(`catalogo-oficio-${timestamp}.pdf`);
        showMessage('Catálogo descargado como catalogo-oficio.pdf.', 'success');
    });

    // Inicia la aplicación al cargar la página
    async function init() {
        await getCameras();
        if (cameras.length > 0) {
            startCamera(cameras[currentCameraIndex].deviceId);
        } else {
            showMessage('No se encontraron cámaras. Solo puedes subir fotos.', 'info');
            video.style.display = 'none';
            takePhotoButton.style.display = 'none';
        }
    }

    init();
});


