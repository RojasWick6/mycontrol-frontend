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
    try {
        const res = await fetch(`${API}/productos?empresa_id=${EMPRESA_ID}`)
        productos = await res.json()
        renderProductos(productos)
    } catch (err) {
        console.error("Error al cargar productos:", err)
    }
}

// ── RENDER CARTAS ─────────────────────────────────────────────
function renderProductos(lista) {
    productosGrid.innerHTML = ""

    if (lista.length === 0) {
        productosGrid.innerHTML = `
            <div class="empty-state">
                <p>No hay productos registrados</p>
            </div>`
        return
    }

    lista.forEach(p => {
        const carta = document.createElement("div")
        carta.classList.add("producto-carta")

        const imagenSrc  = p.imagen_url
            ? `${API}${p.imagen_url}`
            : "assets/img/no-image.png"

        const stockColor = p.stock === 0
            ? "#e74c3c"
            : p.stock <= 5
                ? "#e67e22"
                : "#2ecc71"

        carta.innerHTML = `
            <div class="carta-imagen">
                <img src="${imagenSrc}" alt="${p.nombre}"
                    onerror="this.src='assets/img/no-image.png'">
            </div>
            <div class="carta-body">
                <h3 class="carta-nombre">${p.nombre}</h3>
                <p class="carta-codigo">Cód: ${p.codigo || "—"}</p>
                <div class="carta-info">
                    <div class="carta-precio">$${parseFloat(p.precio).toFixed(2)}</div>
                    <div class="carta-stock" style="color:${stockColor}">
                        📦 ${p.stock} uds
                    </div>
                </div>
            </div>
            <div class="carta-acciones">
                <button class="btn-editar"   onclick="editarProducto(${p.id})">✏️ Editar</button>
                <button class="btn-eliminar" onclick="eliminarProducto(${p.id})">🗑️ Eliminar</button>
            </div>
        `
        productosGrid.appendChild(carta)
    })
}

// ── BUSCADOR ──────────────────────────────────────────────────
buscador.addEventListener("input", () => {
    const texto     = buscador.value.toLowerCase()
    const filtrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(texto) ||
        (p.codigo && p.codigo.toLowerCase().includes(texto))
    )
    renderProductos(filtrados)
})

// ── IMAGEN PREVIEW ────────────────────────────────────────────
inputImagen.addEventListener("change", async () => {
    const file = inputImagen.files[0]
    if (!file) return

    const reader  = new FileReader()
    reader.onload = e => { previewImg.src = e.target.result }
    reader.readAsDataURL(file)

    try {
        const formData = new FormData()
        formData.append("imagen", file)
        const res    = await fetch(`${API}/uploads`, { method: "POST", body: formData })
        const data   = await res.json()
        imagenSubida = data.url
    } catch (err) {
        console.error("Error al subir imagen:", err)
        alert("Error al subir la imagen")
    }
})

// ── ABRIR MODAL NUEVO ─────────────────────────────────────────
openModalBtn.addEventListener("click", () => {
    productoEditando        = null
    imagenSubida            = null
    modalTitulo.textContent = "Nuevo producto"
    previewImg.src          = "assets/img/no-image.png"
    limpiarForm()
    abrirModal()
})

cerrarModalBtn.addEventListener("click", cerrarModal)

// ── GUARDAR ───────────────────────────────────────────────────
saveBtn.addEventListener("click", async () => {
    const nombre = nombreInput.value.trim()
    const codigo = codigoInput.value.trim()
    const precio = precioInput.value
    const stock  = stockInput.value

    if (!nombre || !precio || !stock) {
        alert("Nombre, precio y stock son obligatorios")
        return
    }

    const body = { nombre, codigo, precio, stock }
    if (imagenSubida) body.imagen_url = imagenSubida

    try {
        if (productoEditando) {
            await fetch(`${API}/productos/${productoEditando}`, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(body)
            })
        } else {
            await fetch(`${API}/productos`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ empresa_id: EMPRESA_ID, ...body })
            })
        }
        cerrarModal()
        await cargarProductos()
    } catch (err) {
        alert("Error al guardar producto")
        console.error(err)
    }
})

// ── EDITAR ────────────────────────────────────────────────────
function editarProducto(id) {
    const p = productos.find(p => p.id === id)
    if (!p) return

    productoEditando        = id
    imagenSubida            = null
    modalTitulo.textContent = "Editar producto"
    nombreInput.value       = p.nombre
    codigoInput.value       = p.codigo || ""
    precioInput.value       = p.precio
    stockInput.value        = p.stock
    previewImg.src          = p.imagen_url
        ? `${API}${p.imagen_url}`
        : "assets/img/no-image.png"

    abrirModal()
}

// ── ELIMINAR ──────────────────────────────────────────────────
async function eliminarProducto(id) {
    if (!confirm("¿Eliminar este producto?")) return
    try {
        await fetch(`${API}/productos/${id}`, { method: "DELETE" })
        await cargarProductos()
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

cargarProductos()