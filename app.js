document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    const takePhotoButton = document.getElementById('takePhotoButton');
    const uploadInput = document.getElementById('uploadInput');
    const addProductButton = document.getElementById('addProductButton');
    const downloadJsonButton = document.getElementById('downloadJsonButton');
    const downloadPdfButton = document.getElementById('downloadPdfButton');
    const loadJsonInput = document.getElementById('loadJsonInput'); // Nuevo input para cargar JSON
    const descriptionInput = document.getElementById('descriptionInput');
    const catalogList = document.getElementById('catalogList');
    const messageBox = document.getElementById('messageBox');

    // Array para almacenar los productos del catálogo
    let catalogProducts = [];
    let currentImage = null; // Almacena la imagen temporalmente
    let stream = null; // Variable para mantener la referencia al stream de la cámara

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

    // Inicia la cámara y muestra el video
    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.play();
            showMessage('Cámara iniciada. ¡Listo para tomar fotos!', 'success');
        } catch (err) {
            showMessage('Error al acceder a la cámara. Por favor, asegúrate de dar los permisos necesarios.', 'error');
            console.error('Error al acceder a la cámara:', err);
            // Si la cámara no está disponible, oculta el video y el botón de tomar foto.
            video.style.display = 'none';
            takePhotoButton.style.display = 'none';
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
        catalogProducts.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.description}" class="mr-4">
                <p class="text-gray-700">${product.description}</p>
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
        video.style.display = 'block';
        canvas.style.display = 'none';
        currentImage = null; // Resetea la imagen temporal
        
        // Reinicia la cámara
        startCamera();
        
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
        const pageTitle = 'Página';
        const productGap = 10;
        const pageMargin = 20;

        let y = pageMargin;

        // Añade el título del documento
        doc.setFontSize(22);
        doc.text(title, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 20;

        // Itera sobre cada producto para agregarlo al PDF
        catalogProducts.forEach((product) => {
            // Calcula la altura del producto (imagen + descripción)
            const imgWidth = 80; // Ancho fijo para la imagen
            const imgHeight = 80; // Altura fija
            
            // Si no hay suficiente espacio para el siguiente producto, crea una nueva página
            if (y + imgHeight + productGap > doc.internal.pageSize.getHeight() - pageMargin) {
                doc.addPage();
                y = pageMargin;
            }

            // Agrega la imagen
            doc.addImage(product.image, 'PNG', pageMargin, y, imgWidth, imgHeight);
            
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
    startCamera();
});
