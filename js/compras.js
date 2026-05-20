let productos = []
let carrito = []

const buscarInput     = document.getElementById("buscarProducto")
const sugerencias     = document.getElementById("sugerencias")
const carritoList     = document.getElementById("carritoList")
const totalSpan       = document.getElementById("totalCompra")
const selectProveedor = document.getElementById("selectProveedor")
const btnRegistrar    = document.getElementById("btnRegistrarCompra")
const btnNuevo        = document.getElementById("btnNuevoProveedor")
const modal           = document.getElementById("modalProveedor")
const formProveedor   = document.getElementById("formProveedor")
const btnCerrar       = document.getElementById("cerrarModal")

async function cargarProductos() {
    const res = await fetch(`${API}/productos?empresa_id=${EMPRESA_ID}`)
    productos = await res.json()
}

async function cargarProveedores() {
    const res = await fetch(`${API}/proveedores?empresa_id=${EMPRESA_ID}`)
    const proveedores = await res.json()
    selectProveedor.innerHTML = `<option value="">-- Selecciona proveedor --</option>`
    proveedores.forEach(p => {
        const opt = document.createElement("option")
        opt.value = p.id
        opt.textContent = p.nombre
        selectProveedor.appendChild(opt)
    })
}

buscarInput.addEventListener("input", () => {
    const texto = buscarInput.value.toLowerCase()
    sugerencias.innerHTML = ""
    if (!texto) return

    const filtrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(texto) ||
        (p.codigo && p.codigo.toLowerCase().includes(texto))
    )

    filtrados.forEach(p => {
        const li = document.createElement("li")
        li.textContent = `${p.nombre} — stock actual: ${p.stock}`
        li.onclick = () => {
            agregarAlCarrito(p)
            buscarInput.value = ""
            sugerencias.innerHTML = ""
        }
        sugerencias.appendChild(li)
    })
})

function agregarAlCarrito(producto) {
    const existe = carrito.find(p => p.id === producto.id)
    if (existe) {
        existe.cantidad++
    } else {
        carrito.push({ ...producto, cantidad: 1, precio_compra: "" })
    }
    renderCarrito()
}

function renderCarrito() {
    carritoList.innerHTML = ""
    let total = 0

    carrito.forEach(item => {
        const precio   = parseFloat(item.precio_compra) || 0
        const subtotal = precio * item.cantidad
        total += subtotal

        const fila = document.createElement("tr")
        fila.innerHTML = `
            <td>${item.nombre}</td>
            <td>
                <input type="number" min="1" value="${item.cantidad}"
                    onchange="actualizarCantidad(${item.id}, this.value)"
                    style="width:60px">
            </td>
            <td>
                <input type="number" min="0" step="0.01"
                    placeholder="0.00" value="${item.precio_compra}"
                    onchange="actualizarPrecio(${item.id}, this.value)"
                    style="width:90px">
            </td>
            <td>$${subtotal.toFixed(2)}</td>
            <td><button onclick="quitarDelCarrito(${item.id})">❌</button></td>
        `
        carritoList.appendChild(fila)
    })

    totalSpan.textContent = total.toFixed(2)
}

function actualizarPrecio(id, val) {
    const item = carrito.find(function(p) { return p.id === id })
    if (!item) return
    const precio = parseFloat(val)
    if (isNaN(precio) || precio < 0) {
        alert("El precio no puede ser negativo")
        return
    }
    item.precio_compra = val
    renderCarrito()
}

function actualizarCantidad(id, val) {
    const item = carrito.find(function(p) { return p.id === id })
    if (!item) return
    const cantidad = parseInt(val)
    if (isNaN(cantidad) || cantidad < 1) {
        alert("La cantidad debe ser al menos 1")
        return
    }
    item.cantidad = cantidad
    renderCarrito()
}

function quitarDelCarrito(id) {
    carrito = carrito.filter(p => p.id !== id)
    renderCarrito()
}

btnRegistrar.addEventListener("click", async () => {
    const proveedor_id = selectProveedor.value
    if (!proveedor_id)       { alert("Selecciona un proveedor"); return }
    if (carrito.length === 0) { alert("Agrega al menos un producto"); return }

    const sinPrecio = carrito.some(p => !p.precio_compra || parseFloat(p.precio_compra) <= 0)
    if (sinPrecio) { alert("Ingresa el precio de compra en todos los productos"); return }

    try {
        const res = await fetch(`${API}/compras`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                empresa_id:   EMPRESA_ID,
                proveedor_id: parseInt(proveedor_id),
                productos: carrito.map(p => ({
                    producto_id:    p.id,
                    cantidad:       p.cantidad,
                    precio_unitario: parseFloat(p.precio_compra)
                }))
            })
        })
        const data = await res.json()
        if (data.ok) {
            alert("✅ Compra registrada. Stock actualizado.")
            carrito = []
            renderCarrito()
            buscarInput.value    = ""
            selectProveedor.value = ""
            await cargarProductos()
        }
    } catch (err) {
        alert("Error al conectar con el servidor")
        console.error(err)
    }
})

// 🔥 Control de modales modificado para usar clases activas
btnNuevo.addEventListener("click", () => {
    modal.classList.add("active")
})

btnCerrar.addEventListener("click", () => {
    modal.classList.remove("active")
    formProveedor.reset()
})

formProveedor.addEventListener("submit", async (e) => {
    e.preventDefault()
    const nombre   = document.getElementById("provNombre").value.trim()
    const telefono = document.getElementById("provTelefono").value.trim()
    const email    = document.getElementById("provEmail").value.trim()

    if (!nombre) { alert("El nombre es obligatorio"); return }

    try {
        const res = await fetch(`${API}/proveedores`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ empresa_id: EMPRESA_ID, nombre, telefono, email })
        })
        const nuevo = await res.json()
        await cargarProveedores()
        selectProveedor.value = nuevo.id
        modal.classList.remove("active") // 🔥 Cambiado
        formProveedor.reset()
    } catch (err) {
        alert("Error al guardar proveedor")
    }
})

cargarProductos()
cargarProveedores()