const openModalBtn   = document.getElementById("openModal")
const modal          = document.getElementById("productModal")
const cerrarModalBtn = document.getElementById("cerrarModal")
const saveBtn        = document.getElementById("saveProduct")
const modalTitulo    = document.getElementById("modalTitulo")
const nombreInput    = document.getElementById("nombre")
const codigoInput    = document.getElementById("codigo")
const precioInput    = document.getElementById("precio")
const stockInput     = document.getElementById("stock")
const productosGrid  = document.getElementById("productosGrid")
const inputImagen    = document.getElementById("inputImagen")
const previewImg     = document.getElementById("previewImg")
const buscador       = document.getElementById("buscadorInventario")

let productos        = []
let productoEditando = null
let imagenSubida     = null

// ── HELPERS MODAL ─────────────────────────────────────────────
function abrirModal()  { modal.classList.add("active") }
function cerrarModal() { modal.classList.remove("active"); limpiarForm() }

// ── CARGAR ────────────────────────────────────────────────────
async function cargarProductos() {
    mostrarLoading("Cargando productos..."); 
    try {
        const res = await fetch(API + "/productos?empresa_id=" + EMPRESA_ID)
        productos = await res.json()
        renderProductos(productos)
    } catch (err) {
        console.error("Error al cargar productos:", err)
    } finally {
        ocultarLoading()
    }
}

// ── LAZY LOADING ──────────────────────────────────────────────
function activarLazyImages() {
    const imgs = document.querySelectorAll("img.lazy-img")
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const img = entry.target
                    img.src = img.dataset.src
                    img.classList.remove("lazy-img")
                    observer.unobserve(img)
                }
            })
        }, { rootMargin: "150px" })
        imgs.forEach(function(img) { observer.observe(img) })
    } else {
        imgs.forEach(function(img) { img.src = img.dataset.src })
    }
}

// ── RENDER CARTAS ─────────────────────────────────────────────
function renderProductos(lista) {
    productosGrid.innerHTML = ""

    if (lista.length === 0) {
        productosGrid.innerHTML = '<div class="empty-state"><p>No hay productos registrados</p></div>'
        return
    }

    lista.forEach(function(p) {
        const carta = document.createElement("div")
        carta.classList.add("producto-carta")

        const imagenSrc = p.imagen_url
            ? (p.imagen_url.startsWith("data:") || p.imagen_url.startsWith("http")
                ? p.imagen_url
                : API + p.imagen_url)
            : "assets/img/no-image.png"

        const stockColor = p.stock === 0
            ? "#e74c3c"
            : p.stock <= 5
                ? "#e67e22"
                : "#2ecc71"

        carta.innerHTML =
            '<div class="carta-imagen">' +
                '<img data-src="' + imagenSrc + '" src="assets/img/no-image.png" ' +
                'class="lazy-img" alt="' + p.nombre + '" ' +
                'onerror="this.src=\'assets/img/no-image.png\'">' +
            '</div>' +
            '<div class="carta-body">' +
                '<h3 class="carta-nombre">' + p.nombre + '</h3>' +
                '<p class="carta-codigo">Cód: ' + (p.codigo || "—") + '</p>' +
                '<div class="carta-info">' +
                    '<div class="carta-precio">$' + parseFloat(p.precio).toFixed(2) + '</div>' +
                    '<div class="carta-stock" style="color:' + stockColor + '">📦 ' + p.stock + ' uds</div>' +
                '</div>' +
            '</div>' +
            '<div class="carta-acciones">' +
                '<button class="btn-editar" onclick="editarProducto(' + p.id + ')">✏️ Editar</button>' +
                '<button class="btn-eliminar" onclick="eliminarProducto(' + p.id + ')">🗑️ Eliminar</button>' +
            '</div>'

        productosGrid.appendChild(carta)
    })

    activarLazyImages()
}

// ── BUSCADOR ──────────────────────────────────────────────────
buscador.addEventListener("input", function() {
    const texto     = buscador.value.toLowerCase()
    const filtrados = productos.filter(function(p) {
        return p.nombre.toLowerCase().includes(texto) ||
               (p.codigo && p.codigo.toLowerCase().includes(texto))
    })
    renderProductos(filtrados)
})

// ── IMAGEN PREVIEW ────────────────────────────────────────────
inputImagen.addEventListener("change", async function() {
    const file = inputImagen.files[0]
    if (!file) return

    const reader  = new FileReader()
    reader.onload = function(e) { previewImg.src = e.target.result }
    reader.readAsDataURL(file)

    previewImg.style.opacity = "0.5"
    saveBtn.disabled         = true
    saveBtn.textContent      = "Subiendo imagen..."

    try {
        const formData = new FormData()
        formData.append("imagen", file)
        const res    = await fetch(API + "/uploads", { method: "POST", body: formData })
        const data   = await res.json()
        imagenSubida             = data.url
        previewImg.style.opacity = "1"
        saveBtn.disabled         = false
        saveBtn.textContent      = "Guardar"
    } catch (err) {
        console.error("Error al subir imagen:", err)
        alert("Error al subir la imagen")
        previewImg.style.opacity = "1"
        saveBtn.disabled         = false
        saveBtn.textContent      = "Guardar"
    }
})

// ── ABRIR MODAL NUEVO ─────────────────────────────────────────
openModalBtn.addEventListener("click", function() {
    productoEditando        = null
    imagenSubida            = null
    modalTitulo.textContent = "Nuevo producto"
    previewImg.src          = "assets/img/no-image.png"
    limpiarForm()
    abrirModal()
})

cerrarModalBtn.addEventListener("click", cerrarModal)

// ── GUARDAR ───────────────────────────────────────────────────
saveBtn.addEventListener("click", async function() {
    const nombre = nombreInput.value.trim()
    const codigo = codigoInput.value.trim()
    const precio = parseFloat(precioInput.value)
    const stock  = parseInt(stockInput.value)

    // Validaciones
    if (!nombre) {
        alert("El nombre del producto es obligatorio")
        nombreInput.focus()
        return
    }
    if (isNaN(precio) || precio < 0) {
        alert("El precio no puede ser negativo")
        precioInput.value = ""
        precioInput.focus()
        return
    }
    if (isNaN(stock) || stock < 0) {
        alert("El stock no puede ser negativo")
        stockInput.value = ""
        stockInput.focus()
        return
    }

    const body = { nombre, codigo, precio, stock }
    if (imagenSubida) body.imagen_url = imagenSubida

    try {
        if (productoEditando) {
            const res         = await fetch(API + "/productos/" + productoEditando, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(body)
            })
            const actualizado = await res.json()
            const idx = productos.findIndex(function(p) { return p.id === productoEditando })
            if (idx !== -1) {
                if (!imagenSubida && productos[idx].imagen_url) {
                    actualizado.imagen_url = productos[idx].imagen_url
                }
                productos[idx] = actualizado
            }
        } else {
            const bodyPost = { empresa_id: EMPRESA_ID, nombre, codigo, precio, stock }
            if (imagenSubida) bodyPost.imagen_url = imagenSubida
            const res   = await fetch(API + "/productos", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(bodyPost)
            })
            const nuevo = await res.json()
            if (imagenSubida && !nuevo.imagen_url) nuevo.imagen_url = imagenSubida
            productos.push(nuevo)
        }
        cerrarModal()
        renderProductos(productos)
    } catch (err) {
        alert("Error al guardar producto")
        console.error(err)
    }
})

// ── EDITAR ────────────────────────────────────────────────────
function editarProducto(id) {
    const p = productos.find(function(p) { return p.id === id })
    if (!p) return

    productoEditando        = id
    imagenSubida            = null
    modalTitulo.textContent = "Editar producto"
    nombreInput.value       = p.nombre
    codigoInput.value       = p.codigo || ""
    precioInput.value       = p.precio
    stockInput.value        = p.stock
    previewImg.src          = p.imagen_url
        ? (p.imagen_url.startsWith("data:") || p.imagen_url.startsWith("http")
            ? p.imagen_url
            : API + p.imagen_url)
        : "assets/img/no-image.png"

    abrirModal()
}

// ── ELIMINAR ──────────────────────────────────────────────────
async function eliminarProducto(id) {
    if (!confirm("¿Eliminar este producto?")) return
    try {
        await fetch(API + "/productos/" + id, { method: "DELETE" })
        productos = productos.filter(function(p) { return p.id !== id })
        renderProductos(productos)
    } catch (err) {
        alert("Error al eliminar")
    }
}

// ── UTILS ─────────────────────────────────────────────────────
function limpiarForm() {
    nombreInput.value = ""
    codigoInput.value = ""
    precioInput.value = ""
    stockInput.value  = ""
    imagenSubida      = null
    productoEditando  = null
}


// ── ESCÁNER CÓDIGO DE BARRAS ──────────────────────────────────
var escanerActivo   = false
var escanerCallback = null

function iniciarEscaner(callback) {
    escanerCallback = callback
    escanerActivo   = false
    document.getElementById("escanerStatus").textContent = "Iniciando cámara..."
    document.getElementById("modalEscaner").classList.add("active")

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.getElementById("escaner-viewport"),
            constraints: {
                facingMode: "environment",
                width:  { min: 300 },
                height: { min: 200 }
            }
        },
        decoder: {
            readers: [
                "ean_reader",
                "ean_8_reader",
                "code_128_reader",
                "code_39_reader",
                "upc_reader",
                "upc_e_reader"
            ]
        },
        locate: true
    }, function(err) {
        if (err) {
            document.getElementById("escanerStatus").textContent = "Error al acceder a la cámara"
            console.error(err)
            return
        }
        Quagga.start()
        document.getElementById("escanerStatus").textContent = "Listo — apunta al código"
    })

    Quagga.onDetected(function(result) {
        if (escanerActivo) return
        const codigo = result.codeResult.code
        if (!codigo) return
        escanerActivo = true

        // Vibrar si el celular lo soporta
        if (navigator.vibrate) navigator.vibrate(100)

        detenerEscaner()

        if (escanerCallback) escanerCallback(codigo)
    })
}

function detenerEscaner() {
    try { Quagga.stop() } catch(e) {}
    document.getElementById("modalEscaner").classList.remove("active")
}

document.getElementById("cerrarEscaner").addEventListener("click", detenerEscaner)

document.getElementById("btnEscanerInventario").addEventListener("click", function() {
    iniciarEscaner(function(codigo) {
        document.getElementById("codigo").value = codigo
    })
})

cargarProductos()