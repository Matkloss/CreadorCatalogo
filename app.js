document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    const takePhotoButton = document.getElementById('takePhotoButton');
    const uploadInput = document.getElementById('uploadInput');
    const switchCameraButton = document.getElementById('switchCameraButton'); // Nuevo botón para cambiar de cámara
    const addProductButton = document.getElementById('addProductButton');
    const downloadJsonButton = document.getElementById('downloadJsonButton');
    const downloadPdfButton = document.getElementById('downloadPdfButton');
    const loadJsonInput = document.getElementById('loadJsonInput');
    const descriptionInput = document.getElementById('descriptionInput');
    const catalogList = document.getElementById('catalogList');
    const messageBox = document.getElementById('messageBox');

    // Array para almacenar los productos del catálogo
    let catalogProducts = [];
    let currentImage = null; // Almacena la imagen temporalmente
    let stream = null; // Variable para mantener la referencia al stream de la cámara
    let cameras = []; // Array para almacenar las cámaras disponibles
    let currentCameraIndex = 0; // Índice de la cámara actual

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
                // Si hay más de una cámara, muestra el botón de cambio
                switchCameraButton.style.display = 'block';
            } else {
                // Si solo hay una cámara, oculta el botón de cambio
                switchCameraButton.style.display = 'none';
            }
        } catch (err) {
            console.error('Error al enumerar los dispositivos:', err);
            switchCameraButton.style.display = 'none';
        }
    }

    // Inicia la cámara y muestra el video
    async function startCamera(deviceId) {
        // Detiene la cámara actual si existe
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

    // Muestra una imagen en el canvas (ya sea de la cámara o de un archivo)
    function displayImage(imgSrc) {
        // Detiene la cámara para evitar que siga transmitiendo
        stopCamera();

        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            video.style.display = 'none';
            canvas.style.display = 'block';
            currentImage = canvas.toDataURL('image/png');
        };
        img.src = imgSrc;
    }

    // Renderiza la lista completa de productos en la UI
    function renderCatalog() {
        catalogList.innerHTML = ''; // Limpia la lista existente
        catalogProducts.forEach((product, index) => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card flex justify-between items-center';
            productCard.innerHTML = `
                <p class="text-gray-700 font-medium">${product.description}</p>
                <button class="delete-product bg-red-500 text-white font-bold py-2 px-4 rounded-full text-sm hover:bg-red-600 transition duration-300" data-index="${index}">
                    Eliminar
                </button>
            `;
            catalogList.appendChild(productCard);
        });
    }

    // Manejador del botón 'Tomar Foto'
    takePhotoButton.addEventListener('click', () => {
        if (!stream) {
            showMessage('La cámara no está disponible.', 'error');
            return;
        }
        
        // Ajusta el tamaño del canvas para que coincida con el video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        // Dibuja el frame actual del video en el canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Muestra la imagen capturada en lugar del video
        displayImage(canvas.toDataURL('image/png'));
        
        showMessage('Foto tomada. Ahora añade una descripción y agrégala.', 'success');
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
                showMessage('Foto subida. Ahora añade una descripción y agrégala.', 'success');
            };
            reader.readAsDataURL(file);
        }
    });

    // Manejador del botón 'Agregar Producto'
    addProductButton.addEventListener('click', () => {
        const description = descriptionInput.value.trim();

        if (!currentImage) {
            showMessage('Primero debes tomar una foto o subir una.', 'error');
            return;
        }

        if (!description) {
            showMessage('Por favor, añade una descripción para el producto.', 'error');
            return;
        }

        // Crea un objeto con los datos del nuevo producto
        const newProduct = {
            image: currentImage,
            description: description
        };

        // Agrega el nuevo producto al array
        catalogProducts.push(newProduct);

        // Muestra el producto en la lista
        renderCatalog();

        // Limpia el formulario y vuelve a mostrar el video
        descriptionInput.value = '';
        currentImage = null; // Resetea la imagen temporal
        
        // Reinicia la cámara
        startCamera(cameras[currentCameraIndex].deviceId);
        
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
                    // Validación simple de los datos cargados
                    if (Array.isArray(loadedData) && loadedData.every(p => p.image && p.description)) {
                        catalogProducts = loadedData;
                        renderCatalog(); // Vuelve a renderizar el catálogo
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

    // Manejador del evento de clic en la lista para eliminar productos
    catalogList.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-product')) {
            const index = event.target.dataset.index;
            catalogProducts.splice(index, 1); // Elimina el producto del array
            renderCatalog(); // Vuelve a renderizar la lista
            showMessage('Producto eliminado del catálogo.', 'info');
        }
    });

    // Manejador del botón 'Descargar en JSON'
    downloadJsonButton.addEventListener('click', () => {
        if (catalogProducts.length === 0) {
            showMessage('El catálogo está vacío. Agrega algunos productos primero.', 'error');
            return;
        }
        
        // Convierte el array de productos a una cadena JSON
        const jsonData = JSON.stringify(catalogProducts, null, 2);
        
        // Crea un objeto Blob para el archivo JSON
        const blob = new Blob([jsonData], { type: 'application/json' });
        
        // Crea un enlace temporal para la descarga
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'catalogo.json';
        
        // Simula un clic en el enlace para iniciar la descarga
        document.body.appendChild(a);
        a.click();
        
        // Limpia los elementos temporales
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

        // Inicializa el documento PDF
        const doc = new window.jspdf.jsPDF();
        
        const title = 'Catálogo de Productos';
        const productGap = 10;
        const pageMargin = 20;

        let y = pageMargin;

        // Añade el título del documento
        doc.setFontSize(22);
        doc.text(title, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 20;

        // Itera sobre cada producto para agregarlo al PDF
        catalogProducts.forEach((product) => {
            const img = new Image();
            img.src = product.image;

            // Define el ancho de la imagen en el PDF
            const imgWidth = 80;

            // Calcula la altura proporcionalmente para evitar distorsión
            let imgHeight = (img.height * imgWidth) / img.width;

            // Si la imagen es demasiado grande, la ajusta a la página
            if (imgHeight > doc.internal.pageSize.getHeight() - pageMargin * 2 - 20) {
                imgHeight = doc.internal.pageSize.getHeight() - pageMargin * 2 - 20;
            }

            // Si no hay suficiente espacio para el siguiente producto, crea una nueva página
            if (y + imgHeight + productGap + 20 > doc.internal.pageSize.getHeight() - pageMargin) {
                doc.addPage();
                y = pageMargin;
            }

            // Agrega la imagen
            doc.addImage(img, 'PNG', pageMargin, y, imgWidth, imgHeight);
            
            // Agrega la descripción
            doc.setFontSize(12);
            doc.text(product.description, pageMargin + imgWidth + 10, y + imgHeight / 2, {maxWidth: doc.internal.pageSize.getWidth() - pageMargin - imgWidth - 20});

            y += imgHeight + productGap;
        });

        // Guarda el documento
        doc.save('catalogo.pdf');
        showMessage('Catálogo descargado como catalogo.pdf.', 'success');
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
