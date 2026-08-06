var clientesTodos = []

if (ES_ADMIN) {
    document.getElementById("btnNuevoCliente").style.display = "block"
}

async function cargarTodo() {
    mostrarLoading("Cargando clientes...")
    try {
        const res     = await fetch(API + "/clientes?empresa_id=" + EMPRESA_ID)
        clientesTodos = await res.json()

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

        document.getElementById("statTotal").textContent     = clientesTodos.length
        document.getElementById("statFacturado").textContent = "$" + totalFacturado.toFixed(2)
        document.getElementById("statNuevos").textContent    = nuevos.length

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
               (c.email    && c.email.toLowerCase().includes(texto))
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
            '<p style="margin-top:10px;font-size:14px">No hay clientes registrados</p>' +
            '<p style="font-size:13px;margin-top:6px;color:#ddd">Agrega tu primer cliente con el botón de arriba</p>' +
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

        var card = document.createElement("div")
        card.style.cssText = "background:white;border-radius:16px;padding:20px;box-shadow:0 1px 6px rgba(0,0,0,0.07);transition:transform 0.2s,box-shadow 0.2s"
        card.onmouseenter = function() { this.style.transform="translateY(-2px)"; this.style.boxShadow="0 8px 24px rgba(0,0,0,0.1)" }
        card.onmouseleave = function() { this.style.transform="none"; this.style.boxShadow="0 1px 6px rgba(0,0,0,0.07)" }

        // Info de contacto
        var contactoHTML = ""
        if (c.telefono) contactoHTML += '<div style="display:flex;gap:8px;margin-bottom:6px"><span>📞</span><span style="font-size:13px;color:#555">' + c.telefono + '</span></div>'
        if (c.email)    contactoHTML += '<div style="display:flex;gap:8px;margin-bottom:6px"><span>✉️</span><span style="font-size:13px;color:#555;word-break:break-all">' + c.email + '</span></div>'
        if (c.direccion) contactoHTML += '<div style="display:flex;gap:8px;margin-bottom:6px"><span>📍</span><span style="font-size:13px;color:#555">' + c.direccion + '</span></div>'
        if (c.notas)    contactoHTML += '<div style="display:flex;gap:8px"><span>📝</span><span style="font-size:12px;color:#aaa;font-style:italic">' + c.notas + '</span></div>'
        if (!contactoHTML) contactoHTML = '<p style="font-size:12px;color:#ccc;text-align:center">Sin datos de contacto</p>'

        card.innerHTML =
            // Avatar y nombre
            '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">' +
                '<div style="width:52px;height:52px;border-radius:50%;background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:white;flex-shrink:0">' + inicial + '</div>' +
                '<div style="flex:1;min-width:0">' +
                    '<p style="font-weight:800;font-size:16px;color:#333;margin-bottom:2px">' + c.nombre + '</p>' +
                    '<p style="font-size:12px;color:#aaa">Registrado el ' + fecha + '</p>' +
                '</div>' +
            '</div>' +

            // Datos de contacto
            '<div style="background:#fafafa;border-radius:10px;padding:12px;margin-bottom:14px">' +
                contactoHTML +
            '</div>' +

            // Stats del cliente
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">' +
                '<div style="text-align:center;background:' + color + '18;border-radius:10px;padding:10px">' +
                    '<p style="font-size:18px;font-weight:800;color:' + color + '">' + compras + '</p>' +
                    '<p style="font-size:11px;color:#888">compra' + (compras !== 1 ? 's' : '') + '</p>' +
                '</div>' +
                '<div style="text-align:center;background:#e8f5e9;border-radius:10px;padding:10px">' +
                    '<p style="font-size:16px;font-weight:800;color:#27ae60">$' + gastado.toFixed(0) + '</p>' +
                    '<p style="font-size:11px;color:#888">facturado</p>' +
                '</div>' +
            '</div>' +

            // Acciones
            '<div style="display:flex;gap:8px">' +
                '<button onclick="verHistorial(' + c.id + ',\'' + c.nombre.replace(/'/g,"\\'") + '\')" ' +
                    'style="flex:1;padding:9px;background:#e3f2fd;color:#1976d2;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-weight:600">📋 Ver historial</button>' +
                (c.telefono
                    ? '<a href="https://wa.me/' + c.telefono.replace(/\D/g,"") + '" target="_blank" ' +
                      'style="padding:9px 12px;background:#e8f5e9;color:#25D366;border-radius:10px;font-size:13px;cursor:pointer;font-weight:600;text-decoration:none;display:flex;align-items:center">💬</a>'
                    : '') +
                (ES_ADMIN
                    ? '<button onclick="abrirEditar(' + c.id + ')" style="padding:9px 12px;background:#f5f5f5;color:#555;border:none;border-radius:10px;font-size:13px;cursor:pointer">✏️</button>' +
                      '<button onclick="eliminarCliente(' + c.id + ')" style="padding:9px 12px;background:#fff0f0;color:#e74c3c;border:1px solid #ffcdd2;border-radius:10px;font-size:13px;cursor:pointer">🗑️</button>'
                    : '') +
            '</div>'

        grid.appendChild(card)
    })
}

// ── HISTORIAL ─────────────────────────────────────────────────
async function verHistorial(id, nombre) {
    document.getElementById("historialTitle").textContent = "📋 Historial de " + nombre
    document.getElementById("historialContenido").innerHTML =
        '<div style="text-align:center;padding:20px;color:#aaa">Cargando...</div>'
    document.getElementById("modalHistorial").classList.add("active")

    try {
        const res   = await fetch(API + "/clientes/" + id + "/historial")
        const ventas = await res.json()
        var cont    = document.getElementById("historialContenido")

        if (ventas.length === 0) {
            cont.innerHTML =
                '<div style="text-align:center;padding:30px;color:#ccc">' +
                '<p style="font-size:32px">🧾</p>' +
                '<p style="margin-top:8px">Sin compras registradas aún</p>' +
                '</div>'
            return
        }

        var totalGeneral = ventas.reduce(function(a, v) { return a + parseFloat(v.total) }, 0)

        var html = '<div style="background:#fff3e0;border-radius:10px;padding:12px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">' +
            '<span style="font-size:13px;color:#888">' + ventas.length + ' compra' + (ventas.length !== 1 ? 's' : '') + '</span>' +
            '<span style="font-size:18px;font-weight:800;color:#FF8500">Total: $' + totalGeneral.toFixed(2) + '</span>' +
            '</div>'

        ventas.forEach(function(v) {
            var fecha = new Date(v.fecha.replace(" ","T")+"Z")
                .toLocaleString("es-MX", { timeZone:"America/Mexico_City", day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
            html +=
                '<div style="border:1px solid #f0f0f0;border-radius:10px;padding:12px;margin-bottom:8px">' +
                    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
                        '<span style="font-size:13px;color:#888">🕐 ' + fecha + '</span>' +
                        '<span style="font-size:15px;font-weight:800;color:#FF8500">$' + parseFloat(v.total).toFixed(2) + '</span>' +
                    '</div>' +
                    '<div style="font-size:12px;color:#555">' + (v.productos || "—") + '</div>' +
                    '<span style="display:inline-block;margin-top:6px;background:#f5f5f5;color:#888;font-size:11px;padding:2px 8px;border-radius:10px">' + (v.metodo_pago || "efectivo") + '</span>' +
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
        console.error(err)
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