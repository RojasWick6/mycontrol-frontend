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

// Variables de paginación
var ITEMS_POR_PAGINA_INV = 12
var paginaActualInv      = 1
var productosFiltrados   = []

// ── MANEJO DE FLUJO Y RENDER (PAGINADO CORRECTO) ──────────────
function renderProductos(lista) {
    productosFiltrados = lista
    renderPaginaInv()
}

function renderProductosPaginados(lista) {
    productosFiltrados = lista
    renderPaginaInv()
}

function renderPaginaInv() {
    const inicio  = (paginaActualInv - 1) * ITEMS_POR_PAGINA_INV
    const fin     = inicio + ITEMS_POR_PAGINA_INV
    const pagina  = productosFiltrados.slice(inicio, fin)
    const total   = Math.ceil(productosFiltrados.length / ITEMS_POR_PAGINA_INV)

    // Render de las tarjetas en el Grid
    productosGrid.innerHTML = ""
    if (productosFiltrados.length === 0) {
        productosGrid.innerHTML = '<div class="empty-state"><p>No hay productos registrados</p></div>'
    } else {
        pagina.forEach(function(p) {
            var carta = document.createElement("div")
            carta.classList.add("producto-carta")
            var imagenSrc = p.imagen_url
                ? (p.imagen_url.startsWith("data:") || p.imagen_url.startsWith("http") ? p.imagen_url : API + p.imagen_url)
                : "assets/img/no-image.png"
            var stockColor = p.stock === 0 ? "#e74c3c" : p.stock <= 5 ? "#e67e22" : "#2ecc71"
            carta.innerHTML =
                '<div class="carta-imagen">' +
                    '<img data-src="' + imagenSrc + '" src="assets/img/no-image.png" class="lazy-img" alt="' + p.nombre + '" onerror="this.src=\'assets/img/no-image.png\'">' +
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

    // Render de la botonera de Paginación
    var cont = document.getElementById("paginacionInventario")
    if (!cont) return
    cont.innerHTML = ""
    if (total <= 1) return

    // Botón anterior
    var btnPrev = document.createElement("button")
    btnPrev.className   = "pag-btn"
    btnPrev.textContent = "‹"
    btnPrev.disabled    = paginaActualInv === 1
    btnPrev.onclick     = function() { paginaActualInv--; renderPaginaInv() }
    cont.appendChild(btnPrev)

    // Números de página
    for (var i = 1; i <= total; i++) {
        if (total > 7 && i > 2 && i < total - 1 && Math.abs(i - paginaActualInv) > 1) {
            if (i === 3 || i === total - 2) {
                var dots = document.createElement("span")
                dots.className   = "pag-info"
                dots.textContent = "..."
                cont.appendChild(dots)
            }
            continue
        }
        var btn = document.createElement("button")
        btn.className   = "pag-btn" + (i === paginaActualInv ? " active" : "")
        btn.textContent = i
        btn.onclick     = (function(num) { return function() { paginaActualInv = num; renderPaginaInv() } })(i)
        cont.appendChild(btn)
    }

    // Botón siguiente
    var btnNext = document.createElement("button")
    btnNext.className   = "pag-btn"
    btnNext.textContent = "›"
    btnNext.disabled    = paginaActualInv === total
    btnNext.onclick     = function() { paginaActualInv++; renderPaginaInv() }
    cont.appendChild(btnNext)

    // Indicador de cantidad
    var info = document.createElement("span")
    info.className   = "pag-info"
    info.textContent = " " + productosFiltrados.length + " productos"
    cont.appendChild(info)
}

// ── HELPERS MODAL ─────────────────────────────────────────────
function abrirModal()  { modal.classList.add("active") }
function cerrarModal() { modal.classList.remove("active"); limpiarForm() }

// ── CARGAR DATOS ──────────────────────────────────────────────
async function cargarProductos() {
    mostrarLoading("Cargando productos..."); 
    try {
        const res = await fetch(API + "/productos?empresa_id=" + EMPRESA_ID)
        productos = await res.json()
        // Cargamos pasándole los productos de forma que inicialice ambas variables
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

// ── BUSCADOR ──────────────────────────────────────────────────
buscador.addEventListener("input", function() {
    const texto     = buscador.value.toLowerCase()
    const filtrados = productos.filter(function(p) {
        return p.nombre.toLowerCase().includes(texto) ||
               (p.codigo && p.codigo.toLowerCase().includes(texto))
    })
    paginaActualInv = 1
    renderProductosPaginados(filtrados)
})

// ── IMAGEN PREVIEW ────────────────────────────────────────────
inputImagen.addEventListener("change", async function() {
    const file = inputImagen.files[0]
    if (!file) return

    previewImg.style.opacity = "0.5"
    saveBtn.disabled         = true
    saveBtn.textContent      = "Procesando imagen..."

    // Comprimir imagen antes de subir
    comprimirImagen(file, 800, 0.7, function(blob) {
        const reader  = new FileReader()
        reader.onload = function(e) { previewImg.src = e.target.result }
        reader.readAsDataURL(blob)

        const formData = new FormData()
        formData.append("imagen", blob, file.name)

        fetch(API + "/uploads", { method: "POST", body: formData })
            .then(function(res) { return res.json() })
            .then(function(data) {
                imagenSubida             = data.url
                previewImg.style.opacity = "1"
                saveBtn.disabled         = false
                saveBtn.textContent      = "Guardar"
            })
            .catch(function(err) {
                console.error("Error al subir imagen:", err)
                alert("Error al subir la imagen")
                previewImg.style.opacity = "1"
                saveBtn.disabled         = false
                saveBtn.textContent      = "Guardar"
            })
    })
})

function comprimirImagen(file, maxWidth, calidad, callback) {
    const img    = new Image()
    const url    = URL.createObjectURL(file)
    img.onload   = function() {
        const canvas = document.createElement("canvas")
        var ancho  = img.width
        var alto   = img.height

        // Redimensionar si es muy grande
        if (ancho > maxWidth) {
            alto  = Math.round(alto * maxWidth / ancho)
            ancho = maxWidth
        }

        canvas.width  = ancho
        canvas.height = alto

        const ctx = canvas.getContext("2d")
        ctx.drawImage(img, 0, 0, ancho, alto)

        canvas.toBlob(function(blob) {
            URL.revokeObjectURL(url)
            callback(blob)
        }, "image/jpeg", calidad)
    }
    img.src = url
}

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
    if (saveBtn.disabled) return
    saveBtn.disabled    = true
    saveBtn.textContent = "Guardando..."

    const nombre = nombreInput.value.trim()
    const codigo = codigoInput.value.trim()
    const precio = parseFloat(precioInput.value)
    const stock  = parseInt(stockInput.value)

    if (!nombre) {
        alert("El nombre del producto es obligatorio")
        nombreInput.focus()
        saveBtn.disabled    = false
        saveBtn.textContent = "Guardar"
        return
    }
    if (isNaN(precio) || precio < 0) {
        alert("El precio no puede ser negativo")
        precioInput.value   = ""
        precioInput.focus()
        saveBtn.disabled    = false
        saveBtn.textContent = "Guardar"
        return
    }
    if (isNaN(stock) || stock < 0) {
        alert("El stock no puede ser negativo")
        stockInput.value    = ""
        stockInput.focus()
        saveBtn.disabled    = false
        saveBtn.textContent = "Guardar"
        return
    }

    const body = { nombre, codigo, precio, stock }
    if (imagenSubida) body.imagen_url = imagenSubida

    try {
        if (productoEditando) {
            // MODO EDITAR (PUT)
            const res = await fetch(API + "/productos/" + productoEditando, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(body)
            })
            const actualizado = await res.json()

            if (!res.ok) {
                alert("⚠️ " + (actualizado.error || "Error al actualizar el producto"))
                saveBtn.disabled    = false
                saveBtn.textContent = "Guardar"
                return
            }

            const idx = productos.findIndex(function(p) { return p.id === productoEditando })
            if (idx !== -1) {
                if (!imagenSubida && productos[idx].imagen_url) {
                    actualizado.imagen_url = productos[idx].imagen_url
                }
                productos[idx] = actualizado
            }
        } else {
            // MODO NUEVO (POST)
            const bodyPost = { empresa_id: EMPRESA_ID, nombre, codigo, precio, stock }
            if (imagenSubida) bodyPost.imagen_url = imagenSubida

            const res = await fetch(API + "/productos", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(bodyPost)
            })
            const nuevo = await res.json()

            if (!res.ok) {
                alert("⚠️ " + (nuevo.error || "Error al guardar el producto"))
                saveBtn.disabled    = false
                saveBtn.textContent = "Guardar"
                return
            }

            if (imagenSubida && !nuevo.imagen_url) nuevo.imagen_url = imagenSubida
            productos.push(nuevo)
        }

        cerrarModal()
        // Renderizamos preservando la página en la que estábamos o aplicando el filtro activo
        if (buscador.value.trim()) {
            const txt = buscador.value.toLowerCase()
            renderProductos(productos.filter(p => p.nombre.toLowerCase().includes(txt) || (p.codigo && p.codigo.toLowerCase().includes(txt))))
        } else {
            renderProductos(productos)
        }

    } catch (err) {
        alert("❌ Error de conexión o del servidor")
        console.error(err)
    } finally {
        saveBtn.disabled    = false
        saveBtn.textContent = "Guardar"
    }
})

// ── EDITAR PRODUCTO ───────────────────────────────────────────
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
        ? (p.imagen_url.startsWith("data:") || p.imagen_url.startsWith("http") ? p.imagen_url : API + p.imagen_url)
        : "assets/img/no-image.png"

    abrirModal()
}

// ── ELIMINAR PRODUCTO ─────────────────────────────────────────
async function eliminarProducto(id) {
    if (!confirm("¿Eliminar este producto?")) return
    try {
        const res = await fetch(API + "/productos/" + id, { method: "DELETE" })
        if (res.ok) {
            productos = productos.filter(function(p) { return p.id !== id })
            
            // Reajuste por si eliminas el último producto de una página alta
            const totalPaginas = Math.ceil(productos.length / ITEMS_POR_PAGINA_INV)
            if (paginaActualInv > totalPaginas && totalPaginas > 0) paginaActualInv = totalPaginas
            
            renderProductos(productos)
        } else {
            alert("No se pudo eliminar el producto del servidor")
        }
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

// Inicialización de la app
cargarProductos()