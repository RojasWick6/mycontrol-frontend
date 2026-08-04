var clientesTodos        = []
var pedidosPorCliente    = {}

// Mostrar botón agregar inmediatamente si es admin
if (ES_ADMIN) {
    document.getElementById("btnNuevoCliente").style.display = "block"
}

async function cargarTodo() {
    mostrarLoading("Cargando clientes...")
    try {
        const [resCli, resPed] = await Promise.all([
            fetch(API + "/clientes-tienda?empresa_id=" + EMPRESA_ID),
            fetch(API + "/pedidos?empresa_id=" + EMPRESA_ID)
        ])
        clientesTodos = await resCli.json()
        var pedidos   = await resPed.json()

        pedidosPorCliente = {}
        pedidos.forEach(function(p) {
            pedidosPorCliente[p.cliente_id] = (pedidosPorCliente[p.cliente_id] || 0) + 1
        })

        document.getElementById("statTotal").textContent   = clientesTodos.length
        document.getElementById("statPedidos").textContent = pedidos.length

        var ahora  = new Date()
        var mesStr = ahora.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).substring(0, 7)
        var nuevos = clientesTodos.filter(function(c) {
            if (!c.fecha_registro) return false
            return new Date(c.fecha_registro.replace(" ", "T") + "Z")
                .toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })
                .startsWith(mesStr)
        })
        document.getElementById("statNuevos").textContent = nuevos.length

        renderClientes(clientesTodos)
    } catch (err) {
        console.error("Error clientes:", err)
    } finally {
        ocultarLoading()
    }
}

function filtrarClientes() {
    var texto = document.getElementById("buscadorClientes").value.toLowerCase()
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
            '<div style="grid-column:1/-1;text-align:center;padding:60px;background:white;border-radius:16px;color:#ccc">' +
            '<p style="font-size:40px">🧑‍🤝‍🧑</p>' +
            '<p style="margin-top:10px;font-size:14px">No hay clientes todavía</p>' +
            '</div>'
        return
    }

    var colores = ["#FF8500","#27ae60","#1976d2","#9c27b0","#e91e63","#00bcd4","#ff5722"]

    lista.forEach(function(c) {
        var inicial    = c.nombre.charAt(0).toUpperCase()
        var color      = colores[c.id % colores.length]
        var numPedidos = pedidosPorCliente[c.id] || 0
        var fecha      = c.fecha_registro
            ? new Date(c.fecha_registro.replace(" ", "T") + "Z")
                .toLocaleDateString("es-MX", { timeZone:"America/Mexico_City", day:"numeric", month:"short", year:"numeric" })
            : "—"

        var card = document.createElement("div")
        card.style.cssText = "background:white;border-radius:16px;padding:20px;box-shadow:0 1px 6px rgba(0,0,0,0.07);transition:transform 0.2s,box-shadow 0.2s"
        card.onmouseenter = function() { this.style.transform="translateY(-2px)"; this.style.boxShadow="0 8px 24px rgba(0,0,0,0.1)" }
        card.onmouseleave = function() { this.style.transform="none"; this.style.boxShadow="0 1px 6px rgba(0,0,0,0.07)" }

        card.innerHTML =
            '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">' +
                '<div style="width:52px;height:52px;border-radius:50%;background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:white;flex-shrink:0">' + inicial + '</div>' +
                '<div style="flex:1;min-width:0">' +
                    '<p style="font-weight:800;font-size:16px;color:#333;margin-bottom:2px">' + c.nombre + '</p>' +
                    '<p style="font-size:12px;color:#aaa">Cliente desde ' + fecha + '</p>' +
                '</div>' +
            '</div>' +
            '<div style="background:#fafafa;border-radius:10px;padding:12px;margin-bottom:14px">' +
                (c.telefono ? '<div style="display:flex;gap:8px;margin-bottom:6px"><span>📞</span><span style="font-size:13px;color:#555">' + c.telefono + '</span></div>' : '') +
                (c.email    ? '<div style="display:flex;gap:8px"><span>✉️</span><span style="font-size:13px;color:#555">' + c.email + '</span></div>' : '') +
                (!c.telefono && !c.email ? '<p style="font-size:12px;color:#ccc;text-align:center">Sin datos de contacto</p>' : '') +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">' +
                '<div style="text-align:center;background:' + color + '18;border-radius:10px;padding:10px">' +
                    '<p style="font-size:18px;font-weight:800;color:' + color + '">' + numPedidos + '</p>' +
                    '<p style="font-size:11px;color:#888">pedido' + (numPedidos !== 1 ? 's' : '') + '</p>' +
                '</div>' +
                '<div style="text-align:center;background:#f0fff4;border-radius:10px;padding:10px;display:flex;align-items:center;justify-content:center">' +
                    (c.telefono
                        ? '<a href="https://wa.me/' + c.telefono.replace(/\D/g,"") + '" target="_blank" style="font-size:13px;font-weight:700;color:#25D366;text-decoration:none">💬 WhatsApp</a>'
                        : '<span style="font-size:11px;color:#ccc">Sin teléfono</span>') +
                '</div>' +
            '</div>' +
            (ES_ADMIN
                ? '<div style="display:flex;gap:8px">' +
                  '<button onclick="abrirEditar(' + c.id + ')" style="flex:1;padding:9px;background:#f5f5f5;color:#555;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-weight:600">✏️ Editar</button>' +
                  '<button onclick="eliminarCliente(' + c.id + ')" style="padding:9px 14px;background:#fff0f0;color:#e74c3c;border:1px solid #ffcdd2;border-radius:10px;font-size:13px;cursor:pointer">🗑️</button>' +
                  '</div>'
                : '')

        grid.appendChild(card)
    })
}

function abrirModalCrear() {
    document.getElementById("modalClienteTitle").textContent = "Nuevo cliente"
    document.getElementById("clienteId").value   = ""
    document.getElementById("cliNombre").value   = ""
    document.getElementById("cliTelefono").value = ""
    document.getElementById("cliEmail").value    = ""
    document.getElementById("cliPassword").value = ""
    document.getElementById("modalCliente").classList.add("active")
}

function abrirEditar(id) {
    var c = clientesTodos.find(function(x) { return x.id === id })
    if (!c) return
    document.getElementById("modalClienteTitle").textContent = "Editar cliente"
    document.getElementById("clienteId").value   = c.id
    document.getElementById("cliNombre").value   = c.nombre   || ""
    document.getElementById("cliTelefono").value = c.telefono || ""
    document.getElementById("cliEmail").value    = c.email    || ""
    document.getElementById("cliPassword").value = ""
    document.getElementById("modalCliente").classList.add("active")
}

function cerrarModal() {
    document.getElementById("modalCliente").classList.remove("active")
}

async function guardarCliente() {
    var id       = document.getElementById("clienteId").value
    var nombre   = document.getElementById("cliNombre").value.trim()
    var telefono = document.getElementById("cliTelefono").value.trim()
    var email    = document.getElementById("cliEmail").value.trim()
    var password = document.getElementById("cliPassword").value.trim()

    if (!nombre) { alert("El nombre es obligatorio"); return }

    try {
        const res = await fetch(
            id ? API + "/clientes-tienda/" + id : API + "/clientes-tienda",
            { method: id ? "PUT" : "POST", headers: {"Content-Type":"application/json"},
              body: JSON.stringify({ empresa_id: EMPRESA_ID, nombre, telefono, email, password }) }
        )
        const data = await res.json()
        if (data.error) { alert(data.error); return }
        cerrarModal()
        await cargarTodo()
        alert("✅ Cliente " + (id ? "actualizado" : "creado"))
    } catch (err) {
        alert("Error al guardar cliente")
    }
}

async function eliminarCliente(id) {
    if (!confirm("¿Eliminar este cliente? También se eliminarán sus pedidos.")) return
    try {
        await fetch(API + "/clientes-tienda/" + id, { method: "DELETE" })
        await cargarTodo()
    } catch (err) {
        alert("Error al eliminar")
    }
}

cargarTodo()