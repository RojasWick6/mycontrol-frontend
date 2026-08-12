var clientesTodos  = []
var ventasTodas    = []

if (ES_ADMIN) {
    document.getElementById("btnNuevoCliente").style.display = "block"
}

async function cargarTodo() {
    mostrarLoading("Cargando clientes...")
    try {
        const [resCli, resVentas] = await Promise.all([
            fetch(API + "/clientes?empresa_id=" + EMPRESA_ID),
            fetch(API + "/ventas?empresa_id=" + EMPRESA_ID)
        ])
        clientesTodos = await resCli.json()
        ventasTodas   = await resVentas.json()

        var totalFacturado = clientesTodos.reduce(function(a, c) {
            return a + parseFloat(c.total_gastado || 0)
        }, 0)

        var ahora  = new Date()
        var mesStr = ahora.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).substring(0, 7)
        var nuevos = clientesTodos.filter(function(c) {
            if (!c.fecha_registro) return false
            return new Date(c.fecha_registro.replace(" ", "T") + "Z")
                .toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })
                .startsWith(mesStr)
        })

        // Top cliente
        var topCliente = clientesTodos.reduce(function(top, c) {
            return parseFloat(c.total_gastado || 0) > parseFloat(top.total_gastado || 0) ? c : top
        }, clientesTodos[0] || {})

        document.getElementById("statTotal").textContent     = clientesTodos.length
        document.getElementById("statFacturado").textContent = "$" + totalFacturado.toFixed(2)
        document.getElementById("statNuevos").textContent    = nuevos.length
        document.getElementById("statTopCliente").textContent = topCliente && topCliente.nombre
            ? topCliente.nombre.split(" ")[0]
            : "—"

        renderClientes(clientesTodos)
    } catch (err) {
        console.error("Error clientes:", err)
    } finally {
        ocultarLoading()
    }
}

function filtrarClientes() {
    var texto     = document.getElementById("buscadorClientes").value.toLowerCase()
    var filtrados = clientesTodos.filter(function(c) {
        return c.nombre.toLowerCase().includes(texto) ||
               (c.telefono && c.telefono.includes(texto)) ||
               (c.email && c.email.toLowerCase().includes(texto))
    })
    renderClientes(filtrados)
}

function renderClientes(lista) {
    var grid = document.getElementById("clientesGrid")
    grid.innerHTML = ""

    if (lista.length === 0) {
        grid.innerHTML =
            '<div style="grid-column:1/-1;text-align:center;padding:50px 20px;background:white;border-radius:16px;color:#ccc">' +
            '<p style="font-size:40px">🧑‍🤝‍🧑</p>' +
            '<p style="margin-top:10px;font-size:15px;color:#aaa">No hay clientes todavía</p>' +
            '<p style="font-size:13px;margin-top:6px;color:#ddd">Agrega tu primer cliente arriba</p>' +
            '</div>'
        return
    }

    var colores = ["#FF8500","#27ae60","#1976d2","#9c27b0","#e91e63","#00bcd4","#ff5722","#607d8b"]

    lista.forEach(function(c) {
        var inicial     = c.nombre.charAt(0).toUpperCase()
        var color       = colores[c.id % colores.length]
        var compras     = parseInt(c.total_compras) || 0
        var gastado     = parseFloat(c.total_gastado) || 0
        var fecha       = c.fecha_registro
            ? new Date(c.fecha_registro.replace(" ", "T") + "Z")
                .toLocaleDateString("es-MX", { timeZone:"America/Mexico_City", day:"numeric", month:"short", year:"numeric" })
            : "—"

        var contactoHTML = ""
        if (c.telefono) contactoHTML +=
            '<a href="https://wa.me/' + c.telefono.replace(/\D/g,"") + '" target="_blank" ' +
            'style="display:flex;align-items:center;gap:8px;margin-bottom:7px;text-decoration:none;color:#555">' +
            '<span style="background:#e8f5e9;border-radius:6px;padding:3px 6px;font-size:13px">📞</span>' +
            '<span style="font-size:13px">' + c.telefono + '</span>' +
            '<span style="font-size:11px;color:#25D366;font-weight:700;margin-left:auto">WhatsApp ↗</span></a>'
        if (c.email) contactoHTML +=
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">' +
            '<span style="background:#e3f2fd;border-radius:6px;padding:3px 6px;font-size:13px">✉️</span>' +
            '<span style="font-size:13px;color:#555;word-break:break-all">' + c.email + '</span></div>'
        if (c.direccion) contactoHTML +=
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">' +
            '<span style="background:#f3e5f5;border-radius:6px;padding:3px 6px;font-size:13px">📍</span>' +
            '<span style="font-size:13px;color:#555">' + c.direccion + '</span></div>'
        if (c.notas) contactoHTML +=
            '<div style="display:flex;align-items:flex-start;gap:8px">' +
            '<span style="background:#fff8e1;border-radius:6px;padding:3px 6px;font-size:13px;flex-shrink:0">📝</span>' +
            '<span style="font-size:12px;color:#aaa;font-style:italic;line-height:1.4">' + c.notas + '</span></div>'
        if (!contactoHTML) contactoHTML = '<p style="font-size:12px;color:#ddd;text-align:center;padding:8px 0">Sin datos de contacto</p>'

        // Badge top cliente
        var esMasComprador = clientesTodos[0] && clientesTodos[0].id === c.id && gastado > 0
        var badgeHTML      = esMasComprador
            ? '<span style="background:#fff3e0;color:#FF8500;font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;margin-left:6px">⭐ Top</span>'
            : ""

        var card = document.createElement("div")
        card.className = "cliente-card"

        card.innerHTML =
            '<div class="cliente-card-header">' +
                '<div class="cliente-avatar" style="background:' + color + '">' + inicial + '</div>' +
                '<div class="cliente-header-info">' +
                    '<p class="cliente-nombre">' + c.nombre + badgeHTML + '</p>' +
                    '<p class="cliente-fecha">Desde ' + fecha + '</p>' +
                '</div>' +
            '</div>' +

            '<div class="cliente-contacto">' + contactoHTML + '</div>' +

            '<div class="cliente-stats">' +
                '<div class="cliente-stat" style="border-color:' + color + '22;background:' + color + '0d">' +
                    '<span class="stat-num" style="color:' + color + '">' + compras + '</span>' +
                    '<span class="stat-label">compra' + (compras !== 1 ? 's' : '') + '</span>' +
                '</div>' +
                '<div class="cliente-stat" style="border-color:#27ae6022;background:#27ae600d">' +
                    '<span class="stat-num" style="color:#27ae60">$' + (gastado >= 1000 ? (gastado/1000).toFixed(1)+"k" : gastado.toFixed(0)) + '</span>' +
                    '<span class="stat-label">facturado</span>' +
                '</div>' +
            '</div>' +

            '<div class="cliente-acciones">' +
                '<button onclick="verHistorial(' + c.id + ',\'' + c.nombre.replace(/'/g,"\\'") + '\')" class="btn-cli btn-cli-historial">📋 Historial</button>' +
                (ES_ADMIN
                    ? '<button onclick="abrirAsociarVenta(' + c.id + ',\'' + c.nombre.replace(/'/g,"\\'") + '\')" class="btn-cli btn-cli-asociar">🔗 Asociar venta</button>' +
                      '<button onclick="abrirEditar(' + c.id + ')" class="btn-cli btn-cli-edit">✏️</button>' +
                      '<button onclick="eliminarCliente(' + c.id + ')" class="btn-cli btn-cli-del">🗑️</button>'
                    : '') +
            '</div>'

        grid.appendChild(card)
    })
}

// ── HISTORIAL ─────────────────────────────────────────────────
async function verHistorial(id, nombre) {
    document.getElementById("historialTitle").textContent = "📋 " + nombre
    document.getElementById("historialContenido").innerHTML =
        '<div style="text-align:center;padding:24px;color:#aaa">Cargando...</div>'
    document.getElementById("modalHistorial").classList.add("active")

    try {
        const res    = await fetch(API + "/clientes/" + id + "/historial")
        const ventas = await res.json()
        var cont     = document.getElementById("historialContenido")

        if (ventas.length === 0) {
            cont.innerHTML =
                '<div style="text-align:center;padding:30px;color:#ccc">' +
                '<p style="font-size:32px">🧾</p>' +
                '<p style="margin-top:8px;font-size:13px">Sin compras registradas</p>' +
                '<p style="font-size:12px;color:#ddd;margin-top:4px">Usa "Asociar venta" para vincular compras existentes</p>' +
                '</div>'
            return
        }

        var totalGeneral = ventas.reduce(function(a, v) { return a + parseFloat(v.total) }, 0)
        var html =
            '<div style="background:#fff3e0;border-radius:10px;padding:12px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">' +
            '<span style="font-size:13px;color:#888">' + ventas.length + ' compra' + (ventas.length !== 1 ? 's' : '') + '</span>' +
            '<span style="font-size:18px;font-weight:800;color:#FF8500">$' + totalGeneral.toFixed(2) + '</span>' +
            '</div>'

        ventas.forEach(function(v) {
            var fecha = new Date(v.fecha.replace(" ","T")+"Z")
                .toLocaleString("es-MX",{timeZone:"America/Mexico_City",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})
            html +=
                '<div style="border:1.5px solid #f0f0f0;border-radius:12px;padding:14px;margin-bottom:10px">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
                        '<span style="font-size:13px;color:#888">🕐 ' + fecha + '</span>' +
                        '<span style="font-size:16px;font-weight:800;color:#FF8500">$' + parseFloat(v.total).toFixed(2) + '</span>' +
                    '</div>' +
                    '<p style="font-size:13px;color:#555;line-height:1.4;margin-bottom:8px">' + (v.productos || "Sin detalle") + '</p>' +
                    '<div style="display:flex;align-items:center;justify-content:space-between">' +
                        '<span style="background:#f5f5f5;color:#888;font-size:11px;padding:3px 10px;border-radius:10px">' + (v.metodo_pago || "efectivo") + '</span>' +
                        (ES_ADMIN
                            ? '<button onclick="desasociarVenta(' + v.id + ',' + v.cliente_id_real + ')" style="font-size:11px;color:#e74c3c;background:none;border:none;cursor:pointer;padding:3px 8px">✕ Quitar</button>'
                            : '') +
                    '</div>' +
                '</div>'
        })

        cont.innerHTML = html
    } catch (err) {
        document.getElementById("historialContenido").innerHTML =
            '<div style="text-align:center;padding:20px;color:#e74c3c">Error al cargar historial</div>'
    }
}

function cerrarHistorial() {
    document.getElementById("modalHistorial").classList.remove("active")
}

// ── ASOCIAR VENTA ─────────────────────────────────────────────
var clienteAsociarId = null

function abrirAsociarVenta(clienteId, nombre) {
    clienteAsociarId = clienteId
    document.getElementById("asociarTitle").textContent = "Asociar venta a " + nombre

    // Ventas sin cliente asignado
    var ventasSinCliente = ventasTodas.filter(function(v) {
        return !v.cliente_id
    })

    var lista = document.getElementById("asociarLista")
    lista.innerHTML = ""

    if (ventasSinCliente.length === 0) {
        lista.innerHTML =
            '<p style="text-align:center;padding:20px;color:#aaa;font-size:13px">Todas las ventas ya tienen cliente asignado</p>'
    } else {
        ventasSinCliente.forEach(function(v) {
            var fecha = new Date(v.fecha.replace(" ","T")+"Z")
                .toLocaleString("es-MX",{timeZone:"America/Mexico_City",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})
            var item = document.createElement("div")
            item.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:12px;border:1.5px solid #eee;border-radius:10px;margin-bottom:8px;cursor:pointer;transition:border-color 0.2s"
            item.onmouseenter = function() { this.style.borderColor="#FF8500" }
            item.onmouseleave = function() { this.style.borderColor="#eee" }
            item.innerHTML =
                '<div>' +
                    '<p style="font-size:14px;font-weight:700;color:#333">Venta #' + v.id + ' — $' + parseFloat(v.total).toFixed(2) + '</p>' +
                    '<p style="font-size:12px;color:#aaa;margin-top:2px">🕐 ' + fecha + ' · ' + (v.metodo_pago || "efectivo") + '</p>' +
                '</div>' +
                '<button onclick="confirmarAsociar(' + v.id + ')" style="padding:7px 14px;background:#FF8500;color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Asociar</button>'
            lista.appendChild(item)
        })
    }

    document.getElementById("modalAsociar").classList.add("active")
}

function cerrarAsociar() {
    document.getElementById("modalAsociar").classList.remove("active")
    clienteAsociarId = null
}

async function confirmarAsociar(ventaId) {
    try {
        const res = await fetch(API + "/ventas/asociar-cliente", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ venta_id: ventaId, cliente_id: clienteAsociarId })
        })
        const data = await res.json()
        if (data.ok) {
            cerrarAsociar()
            await cargarTodo()
            alert("✅ Venta asociada correctamente")
        }
    } catch (err) {
        alert("Error al asociar venta")
    }
}

async function desasociarVenta(ventaId) {
    if (!confirm("¿Quitar la asociación de esta venta con el cliente?")) return
    try {
        await fetch(API + "/ventas/asociar-cliente", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ venta_id: ventaId, cliente_id: null })
        })
        await cargarTodo()
        cerrarHistorial()
        alert("✅ Venta desasociada")
    } catch (err) {
        alert("Error")
    }
}

// ── CRUD ──────────────────────────────────────────────────────
function abrirModalCrear() {
    document.getElementById("modalClienteTitle").textContent = "Nuevo cliente"
    document.getElementById("clienteId").value    = ""
    document.getElementById("cliNombre").value    = ""
    document.getElementById("cliTelefono").value  = ""
    document.getElementById("cliEmail").value     = ""
    document.getElementById("cliDireccion").value = ""
    document.getElementById("cliNotas").value     = ""
    document.getElementById("modalCliente").classList.add("active")
}

function abrirEditar(id) {
    var c = clientesTodos.find(function(x) { return x.id === id })
    if (!c) return
    document.getElementById("modalClienteTitle").textContent = "Editar cliente"
    document.getElementById("clienteId").value    = c.id
    document.getElementById("cliNombre").value    = c.nombre    || ""
    document.getElementById("cliTelefono").value  = c.telefono  || ""
    document.getElementById("cliEmail").value     = c.email     || ""
    document.getElementById("cliDireccion").value = c.direccion || ""
    document.getElementById("cliNotas").value     = c.notas     || ""
    document.getElementById("modalCliente").classList.add("active")
}

function cerrarModal() {
    document.getElementById("modalCliente").classList.remove("active")
}

async function guardarCliente() {
    var id        = document.getElementById("clienteId").value
    var nombre    = document.getElementById("cliNombre").value.trim()
    var telefono  = document.getElementById("cliTelefono").value.trim()
    var email     = document.getElementById("cliEmail").value.trim()
    var direccion = document.getElementById("cliDireccion").value.trim()
    var notas     = document.getElementById("cliNotas").value.trim()

    if (!nombre) { alert("El nombre es obligatorio"); return }

    try {
        const res = await fetch(
            id ? API + "/clientes/" + id : API + "/clientes",
            { method: id ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ empresa_id: EMPRESA_ID, nombre, telefono, email, direccion, notas }) }
        )
        const data = await res.json()
        if (data.error) { alert(data.error); return }
        cerrarModal()
        await cargarTodo()
        alert("✅ Cliente " + (id ? "actualizado" : "creado"))
    } catch (err) {
        alert("Error al guardar")
    }
}

async function eliminarCliente(id) {
    if (!confirm("¿Eliminar este cliente? Sus ventas quedarán sin cliente asignado.")) return
    try {
        await fetch(API + "/clientes/" + id, { method: "DELETE" })
        await cargarTodo()
    } catch (err) {
        alert("Error al eliminar")
    }
}

cargarTodo()