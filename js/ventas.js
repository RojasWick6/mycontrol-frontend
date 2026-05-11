let productos = []
let carrito   = []

const buscarInput = document.getElementById("buscarProducto")
const totalSpan   = document.getElementById("total")

// ── CARGAR PRODUCTOS ──────────────────────────────────────────
async function cargarProductos() {
    try {
        const res = await fetch(API + "/productos?empresa_id=" + EMPRESA_ID)
        productos = await res.json()
        renderCards(productos)
        actualizarContador(productos.length)
    } catch (err) {
        console.error("Error al cargar productos:", err)
    }
}

// ── RENDER CARDS ──────────────────────────────────────────────
function renderCards(lista) {
    const grid = document.getElementById("productosGrid")
    grid.innerHTML = ""

    if (lista.length === 0) {
        grid.innerHTML = '<div class="venta-empty">No se encontraron productos</div>'
        return
    }

    lista.forEach(function(p) {
        const enCarrito  = carrito.find(function(c) { return c.id === p.id })
        const cantidad   = enCarrito ? enCarrito.cantidad : 0
        const sinStock   = p.stock <= 0
        const imagenSrc  = p.imagen_url
            ? (p.imagen_url.startsWith("data:") || p.imagen_url.startsWith("http")
                ? p.imagen_url
                : API + p.imagen_url)
            : "assets/img/no-image.png"

        const card = document.createElement("div")
        card.className = "venta-card" + (sinStock ? " venta-card-agotado" : "")

        card.innerHTML =
            '<div class="venta-card-img">' +
                '<img src="' + imagenSrc + '" alt="' + p.nombre + '" onerror="this.src=\'assets/img/no-image.png\'">' +
                (sinStock ? '<div class="venta-card-agotado-tag">Sin stock</div>' : '') +
                (cantidad > 0 ? '<div class="venta-card-qty-badge">' + cantidad + '</div>' : '') +
            '</div>' +
            '<div class="venta-card-body">' +
                '<p class="venta-card-nombre">' + p.nombre + '</p>' +
                '<p class="venta-card-precio">$' + parseFloat(p.precio).toFixed(2) + '</p>' +
                '<p class="venta-card-stock">📦 ' + p.stock + ' disponibles</p>' +
            '</div>' +
            '<div class="venta-card-acciones">' +
                (sinStock
                    ? '<div class="venta-card-btn-agotado">Agotado</div>'
                    : '<button class="venta-card-btn-menos" onclick="cambiarCantidad(' + p.id + ', -1)" ' + (cantidad === 0 ? 'disabled' : '') + '>−</button>' +
                      '<span class="venta-card-cant">' + cantidad + '</span>' +
                      '<button class="venta-card-btn-mas" onclick="cambiarCantidad(' + p.id + ', 1)">+</button>'
                ) +
            '</div>'

        grid.appendChild(card)
    })
}

function actualizarContador(total) {
    const el = document.getElementById("contadorProductos")
    if (el) el.textContent = total + " producto" + (total !== 1 ? "s" : "")
}

// ── BUSCADOR ──────────────────────────────────────────────────
buscarInput.addEventListener("input", function() {
    const texto     = buscarInput.value.toLowerCase()
    const filtrados = productos.filter(function(p) {
        return p.nombre.toLowerCase().includes(texto) ||
               (p.codigo && p.codigo.toLowerCase().includes(texto))
    })
    renderCards(filtrados)
    actualizarContador(filtrados.length)
})

// ── CAMBIAR CANTIDAD ──────────────────────────────────────────
function cambiarCantidad(id, delta) {
    const producto = productos.find(function(p) { return p.id === id })
    if (!producto) return

    const existe = carrito.find(function(c) { return c.id === id })

    if (delta > 0) {
        if (producto.stock <= 0) {
            alert("Sin stock disponible")
            return
        }
        if (existe) {
            if (existe.cantidad >= producto.stock) {
                alert("Stock máximo alcanzado: " + producto.stock + " unidades")
                return
            }
            existe.cantidad++
        } else {
            carrito.push(Object.assign({}, producto, { cantidad: 1 }))
        }
    } else {
        if (!existe) return
        existe.cantidad--
        if (existe.cantidad <= 0) {
            carrito = carrito.filter(function(c) { return c.id !== id })
        }
    }

    renderCarrito()
    renderCards(filtrarActual())
}

function filtrarActual() {
    const texto = buscarInput.value.toLowerCase()
    if (!texto) return productos
    return productos.filter(function(p) {
        return p.nombre.toLowerCase().includes(texto) ||
               (p.codigo && p.codigo.toLowerCase().includes(texto))
    })
}

// ── RENDER CARRITO ────────────────────────────────────────────
function renderCarrito() {
    const contenedor    = document.getElementById("carritoItems")
    const vacio         = document.getElementById("carritoVacio")
    const totalBox      = document.getElementById("carritoTotalBox")
    const badge         = document.getElementById("carritoBadge")

    contenedor.innerHTML = ""

    if (carrito.length === 0) {
        vacio.style.display    = "flex"
        totalBox.style.display = "none"
        badge.textContent      = "0"
        totalSpan.textContent  = "0.00"
        return
    }

    vacio.style.display    = "none"
    totalBox.style.display = "block"

    let total      = 0
    let totalItems = 0

    carrito.forEach(function(item) {
        const subtotal = parseFloat(item.precio) * item.cantidad
        total         += subtotal
        totalItems    += item.cantidad

        const div = document.createElement("div")
        div.className = "carrito-item"
        div.innerHTML =
            '<div class="carrito-item-info">' +
                '<p class="carrito-item-nombre">' + item.nombre + '</p>' +
                '<p class="carrito-item-precio">$' + parseFloat(item.precio).toFixed(2) + ' c/u</p>' +
            '</div>' +
            '<div class="carrito-item-controles">' +
                '<button onclick="cambiarCantidad(' + item.id + ', -1)">−</button>' +
                '<span>' + item.cantidad + '</span>' +
                '<button onclick="cambiarCantidad(' + item.id + ', 1)">+</button>' +
            '</div>' +
            '<div class="carrito-item-subtotal">$' + subtotal.toFixed(2) + '</div>'

        contenedor.appendChild(div)
    })

    badge.textContent     = totalItems
    totalSpan.textContent = total.toFixed(2)
}

// ── REGISTRAR VENTA ───────────────────────────────────────────
document.getElementById("registrarVenta").addEventListener("click", async function() {
    if (carrito.length === 0) { alert("Agrega al menos un producto"); return }

    for (var i = 0; i < carrito.length; i++) {
        var item = carrito[i]
        var prod = productos.find(function(p) { return p.id === item.id })
        if (prod && item.cantidad > prod.stock) {
            alert("Stock insuficiente para: " + item.nombre)
            return
        }
    }

    const metodo = document.getElementById("metodoPago").value

    try {
        const res = await fetch(API + "/ventas", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                empresa_id:  EMPRESA_ID,
                usuario_id:  USUARIO_ID,
                metodo_pago: metodo,
                productos: carrito.map(function(p) {
                    return { producto_id: p.id, cantidad: p.cantidad, precio: p.precio }
                })
            })
        })

        const data = await res.json()

        if (data.venta_id) {
            alert("✅ Venta registrada correctamente")
            carrito = []
            await cargarProductos()
            renderCarrito()
        }
    } catch (err) {
        alert("Error al conectar con el servidor")
        console.error(err)
    }
})

// ── CANCELAR VENTA ────────────────────────────────────────────
document.getElementById("cancelarVenta").addEventListener("click", function() {
    if (carrito.length === 0) return
    if (confirm("¿Cancelar la venta? Se vaciará el carrito.")) {
        carrito = []
        renderCarrito()
        renderCards(filtrarActual())
    }
})

// ── INIT ──────────────────────────────────────────────────────
cargarProductos()
renderCarrito()