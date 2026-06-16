var productosLista   = []
var carritoCompra    = []
var historialTotal   = []
var proveedoresLista = []

// ── INIT ──────────────────────────────────────────────────────
async function init() {
    mostrarLoading("Cargando compras...")
    try {
        await Promise.all([cargarProveedores(), cargarHistorial()])
        if (ES_ADMIN) {
            var btn = document.getElementById("btnNuevoProv")
            if (btn) btn.style.display = "block"
        }
    } finally {
        ocultarLoading()
    }
}

// ── PROVEEDORES ───────────────────────────────────────────────
async function cargarProveedores() {
    try {
        const res    = await fetch(API + "/proveedores?empresa_id=" + EMPRESA_ID)
        proveedoresLista = await res.json()

        var sel1 = document.getElementById("proveedorSelect")
        var sel2 = document.getElementById("filtroProv")
        sel1.innerHTML = '<option value="">Selecciona un proveedor...</option>'
        sel2.innerHTML = '<option value="">Todos los proveedores</option>'

        proveedoresLista.forEach(function(p) {
            sel1.innerHTML += '<option value="' + p.id + '">' + p.nombre + '</option>'
            sel2.innerHTML += '<option value="' + p.id + '">' + p.nombre + '</option>'
        })
    } catch (err) { console.error("Error proveedores:", err) }
}

// ── HISTORIAL + STATS ─────────────────────────────────────────
async function cargarHistorial() {
    try {
        const res     = await fetch(API + "/reportes/compras?empresa_id=" + EMPRESA_ID)
        historialTotal = await res.json()
        calcularStats()
        renderHistorial(historialTotal)
    } catch (err) { console.error("Error historial:", err) }
}

function calcularStats() {
    const ahora  = new Date()
    const mesStr = ahora.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).substring(0, 7)

    const delMes = historialTotal.filter(function(c) {
        if (!c.fecha) return false
        return new Date(c.fecha.replace(" ", "T") + "Z")
            .toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })
            .startsWith(mesStr)
    })

    const total = delMes.reduce(function(a, c) { return a + parseFloat(c.total) }, 0)
    document.getElementById("statGastado").textContent = "$" + total.toFixed(2)
    document.getElementById("statNum").textContent     = delMes.length

    var porProv = {}
    historialTotal.forEach(function(c) {
        var p = c.proveedor || "Sin proveedor"
        porProv[p] = (porProv[p] || 0) + 1
    })
    var top = null, topMax = 0
    Object.keys(porProv).forEach(function(p) {
        if (porProv[p] > topMax) { topMax = porProv[p]; top = p }
    })
    document.getElementById("statTopProv").textContent = top || "—"
}

function aplicarFiltroProv() {
    var id = document.getElementById("filtroProv").value
    if (!id) { renderHistorial(historialTotal); return }
    var filtrado = historialTotal.filter(function(c) {
        return proveedoresLista.find(function(p) { return p.id == id && p.nombre === c.proveedor })
    })
    renderHistorial(filtrado)
}

function renderHistorial(lista) {
    var cont = document.getElementById("historialLista")
    cont.innerHTML = ""

    if (lista.length === 0) {
        cont.innerHTML = '<div style="text-align:center;padding:40px;color:#ccc"><p style="font-size:28px">📭</p><p style="margin-top:8px;font-size:13px">Sin compras registradas</p></div>'
        return
    }

    lista.forEach(function(c) {
        var fecha    = new Date(c.fecha.replace(" ", "T") + "Z")
        var fechaStr = fecha.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day:"numeric", month:"short", year:"numeric" })
        var horaStr  = fecha.toLocaleTimeString("es-MX", { timeZone: "America/Mexico_City", hour:"2-digit", minute:"2-digit" })

        var div = document.createElement("div")
        div.style.cssText = "border:1.5px solid #f0f0f0;border-radius:12px;padding:14px;margin-bottom:10px;transition:box-shadow 0.2s"
        div.onmouseenter = function() { this.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)" }
        div.onmouseleave = function() { this.style.boxShadow = "none" }
        div.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">' +
                '<div style="flex:1;min-width:0">' +
                    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
                        '<span style="font-weight:700;color:#333;font-size:14px">' + (c.proveedor || "Sin proveedor") + '</span>' +
                        '<span style="background:#f5f5f5;color:#999;font-size:11px;padding:2px 8px;border-radius:20px">#' + c.id + '</span>' +
                    '</div>' +
                    '<div style="display:flex;gap:10px;margin-top:5px;flex-wrap:wrap">' +
                        '<span style="font-size:12px;color:#aaa">🕐 ' + horaStr + '</span>' +
                        '<span style="font-size:12px;color:#aaa">📅 ' + fechaStr + '</span>' +
                        '<span style="font-size:12px;color:#aaa">📦 ' + c.num_productos + ' producto' + (c.num_productos != 1 ? 's' : '') + '</span>' +
                    '</div>' +
                '</div>' +
                '<div style="text-align:right;flex-shrink:0">' +
                    '<p style="font-size:17px;font-weight:800;color:#FF8500">$' + parseFloat(c.total).toFixed(2) + '</p>' +
                '</div>' +
            '</div>'
        cont.appendChild(div)
    })
}

// ── BUSCADOR PRODUCTOS ────────────────────────────────────────
async function cargarProductosCompra() {
    try {
        const res    = await fetch(API + "/productos/lista?empresa_id=" + EMPRESA_ID)
        productosLista = await res.json()
    } catch (err) { console.error("Error productos:", err) }
}

document.getElementById("buscarProdCompra").addEventListener("input", function() {
    var texto = this.value.toLowerCase().trim()
    var drop  = document.getElementById("dropdownProd")

    if (!texto) { drop.style.display = "none"; return }

    var filtrados = productosLista.filter(function(p) {
        return p.nombre.toLowerCase().includes(texto) ||
               (p.codigo && p.codigo.toLowerCase().includes(texto))
    })

    if (filtrados.length === 0) {
        drop.innerHTML = '<div style="padding:12px;color:#aaa;font-size:13px;text-align:center">Sin resultados</div>'
        drop.style.display = "block"
        return
    }

    drop.innerHTML = ""
    filtrados.slice(0, 8).forEach(function(p) {
        var item = document.createElement("div")
        item.style.cssText = "padding:10px 14px;cursor:pointer;border-bottom:1px solid #f5f5f5;display:flex;justify-content:space-between;align-items:center"
        item.onmouseenter = function() { this.style.background = "#fff8f0" }
        item.onmouseleave = function() { this.style.background = "white" }
        item.innerHTML =
            '<div>' +
                '<p style="font-size:14px;font-weight:600;color:#333">' + p.nombre + '</p>' +
                '<p style="font-size:12px;color:#aaa">Stock: ' + p.stock + ' uds</p>' +
            '</div>' +
            '<span style="font-size:13px;font-weight:700;color:#FF8500">$' + parseFloat(p.precio).toFixed(2) + '</span>'
        item.onclick = function() {
            agregarProductoCompra(p)
            document.getElementById("buscarProdCompra").value = ""
            drop.style.display = "none"
        }
        drop.appendChild(item)
    })
    drop.style.display = "block"
})

document.addEventListener("click", function(e) {
    if (!e.target.closest("#buscarProdCompra") && !e.target.closest("#dropdownProd")) {
        document.getElementById("dropdownProd").style.display = "none"
    }
})

// ── CARRITO DE COMPRA ─────────────────────────────────────────
function agregarProductoCompra(p) {
    var existe = carritoCompra.find(function(c) { return c.id === p.id })
    if (existe) { existe.cantidad++; renderCarritoCompra(); return }
    carritoCompra.push({ id: p.id, nombre: p.nombre, cantidad: 1, precio: 0 })
    renderCarritoCompra()
}

function quitarProductoCompra(id) {
    carritoCompra = carritoCompra.filter(function(c) { return c.id !== id })
    renderCarritoCompra()
}

function renderCarritoCompra() {
    var cont     = document.getElementById("listaCompra")
    var msgVacio = document.getElementById("listaVaciaMsg")

    if (carritoCompra.length === 0) {
        cont.innerHTML = '<div id="listaVaciaMsg" style="text-align:center;padding:24px;color:#ccc"><p style="font-size:28px">🛍️</p><p style="font-size:13px;margin-top:6px">Busca y agrega productos</p></div>'
        actualizarTotalCompra()
        return
    }

    cont.innerHTML = ""

    // Header tabla
    var header = document.createElement("div")
    header.style.cssText = "display:grid;grid-template-columns:1fr 90px 110px 70px 36px;gap:6px;padding:6px 8px;font-size:11px;color:#aaa;font-weight:700;text-transform:uppercase;border-bottom:1px solid #f0f0f0;margin-bottom:6px"
    header.innerHTML = "<span>Producto</span><span style='text-align:center'>Cant.</span><span style='text-align:center'>Precio compra</span><span style='text-align:right'>Subtotal</span><span></span>"
    cont.appendChild(header)

    carritoCompra.forEach(function(item) {
        var fila = document.createElement("div")
        fila.style.cssText = "display:grid;grid-template-columns:1fr 90px 110px 70px 36px;gap:6px;align-items:center;padding:8px 8px;border-bottom:1px solid #fafafa"
        fila.innerHTML =
            '<span style="font-size:13px;font-weight:600;color:#333">' + item.nombre + '</span>' +
            '<input type="number" min="1" value="' + item.cantidad + '" onchange="cambiarCantidadCompra(' + item.id + ',this.value)" style="width:100%;padding:6px;border:1.5px solid #eee;border-radius:8px;font-size:13px;text-align:center;outline:none">' +
            '<input type="number" min="0" step="0.01" value="' + item.precio + '" placeholder="0.00" onchange="cambiarPrecioCompra(' + item.id + ',this.value)" style="width:100%;padding:6px;border:1.5px solid #eee;border-radius:8px;font-size:13px;text-align:center;outline:none">' +
            '<span style="font-size:13px;font-weight:700;color:#333;text-align:right">$' + (item.cantidad * item.precio).toFixed(2) + '</span>' +
            '<button onclick="quitarProductoCompra(' + item.id + ')" style="width:32px;height:32px;background:#fff0f0;color:#e74c3c;border:none;border-radius:8px;cursor:pointer;font-size:14px">✕</button>'
        cont.appendChild(fila)
    })

    actualizarTotalCompra()
}

function cambiarCantidadCompra(id, val) {
    var item = carritoCompra.find(function(c) { return c.id === id })
    if (item) { item.cantidad = Math.max(1, parseInt(val) || 1) }
    renderCarritoCompra()
}

function cambiarPrecioCompra(id, val) {
    var item = carritoCompra.find(function(c) { return c.id === id })
    if (item) { item.precio = parseFloat(val) || 0 }
    actualizarTotalCompra()
}

function actualizarTotalCompra() {
    var total = carritoCompra.reduce(function(acc, c) { return acc + c.cantidad * c.precio }, 0)
    document.getElementById("totalCompraDisplay").textContent = "$" + total.toFixed(2)
}

// ── REGISTRAR COMPRA ──────────────────────────────────────────
async function registrarCompra() {
    var provId = document.getElementById("proveedorSelect").value
    if (!provId) { alert("Selecciona un proveedor"); return }
    if (carritoCompra.length === 0) { alert("Agrega al menos un producto"); return }

    var sinPrecio = carritoCompra.find(function(c) { return c.precio <= 0 })
    if (sinPrecio) { alert("Ingresa el precio de compra para: " + sinPrecio.nombre); return }

    try {
        mostrarLoading("Registrando compra...")
        const res  = await fetch(API + "/compras", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                empresa_id:  EMPRESA_ID,
                proveedor_id: parseInt(provId),
                productos: carritoCompra.map(function(c) {
                    return { producto_id: c.id, cantidad: c.cantidad, precio_unitario: c.precio }
                })
            })
        })
        const data = await res.json()
        if (data.ok) {
            carritoCompra = []
            renderCarritoCompra()
            await cargarHistorial()
            alert("✅ Compra registrada correctamente")
        }
    } catch (err) {
        alert("Error al registrar compra")
    } finally {
        ocultarLoading()
    }
}

// ── PROVEEDOR RÁPIDO ──────────────────────────────────────────
function abrirModalProvRapido() {
    document.getElementById("rpNombre").value   = ""
    document.getElementById("rpTelefono").value = ""
    document.getElementById("modalProvRapido").classList.add("active")
}
function cerrarModalProvRapido() {
    document.getElementById("modalProvRapido").classList.remove("active")
}

async function guardarProvRapido() {
    var nombre = document.getElementById("rpNombre").value.trim()
    if (!nombre) { alert("El nombre es obligatorio"); return }

    try {
        const res  = await fetch(API + "/proveedores", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                empresa_id:  EMPRESA_ID,
                nombre:      nombre,
                telefono:    document.getElementById("rpTelefono").value.trim()    || null,
                telefono2:   document.getElementById("rpTelefono2").value.trim()   || null,
                email:       document.getElementById("rpEmail").value.trim()       || null,
                descripcion: document.getElementById("rpDescripcion").value.trim() || null
            })
        })
        const data = await res.json()
        if (data.id) {
            cerrarModalProvRapido()
            await cargarProveedores()
            document.getElementById("proveedorSelect").value = data.id
            alert("✅ Proveedor creado")
        } else {
            alert(data.error || "Error al crear")
        }
    } catch (err) { alert("Error al crear proveedor") }
}

// ── ARRANQUE ──────────────────────────────────────────────────
cargarProductosCompra()
init()