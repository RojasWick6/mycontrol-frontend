var todosPedidos   = []
var estadoActivo   = "todos"

var COLORES_ESTADO = {
    pendiente:  { bg: "#fff8e1", color: "#f59e0b", label: "⏳ Pendiente"  },
    confirmado: { bg: "#e8f5e9", color: "#27ae60", label: "✅ Confirmado" },
    completado: { bg: "#e3f2fd", color: "#1976d2", label: "🏁 Completado" },
    cancelado:  { bg: "#fce4ec", color: "#e91e63", label: "❌ Cancelado"  }
}

async function cargarPedidos() {
    mostrarLoading("Cargando pedidos...")
    try {
        const res    = await fetch(API + "/pedidos?empresa_id=" + EMPRESA_ID)
        todosPedidos = await res.json()

        // Stats
        var ahora  = new Date()
        var mesStr = ahora.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).substring(0, 7)

        var pendientes  = todosPedidos.filter(function(p) { return p.estado === "pendiente"  })
        var confirmados = todosPedidos.filter(function(p) { return p.estado === "confirmado" })
        var completados = todosPedidos.filter(function(p) { return p.estado === "completado" })

        var totalMes = todosPedidos
            .filter(function(p) {
                if (!p.fecha) return false
                return new Date(p.fecha.replace(" ","T")+"Z")
                    .toLocaleDateString("sv-SE",{timeZone:"America/Mexico_City"})
                    .startsWith(mesStr)
            })
            .reduce(function(a, p) { return a + parseFloat(p.total || 0) }, 0)

        document.getElementById("statPendientes").textContent  = pendientes.length
        document.getElementById("statConfirmados").textContent = confirmados.length
        document.getElementById("statCompletados").textContent = completados.length
        document.getElementById("statTotal").textContent       = "$" + totalMes.toFixed(2)

        renderPedidos()
    } catch (err) {
        console.error("Error pedidos:", err)
    } finally {
        ocultarLoading()
    }
}

function filtrarEstado(estado) {
    estadoActivo = estado
    document.querySelectorAll(".filtro-estado").forEach(function(btn) {
        var esActivo = btn.dataset.estado === estado
        btn.style.background   = esActivo ? "#FF8500" : "white"
        btn.style.color        = esActivo ? "white"   : "#555"
        btn.style.borderColor  = esActivo ? "#FF8500" : "#eee"
    })
    renderPedidos()
}

function renderPedidos() {
    var lista = estadoActivo === "todos"
        ? todosPedidos
        : todosPedidos.filter(function(p) { return p.estado === estadoActivo })

    var cont = document.getElementById("pedidosLista")
    cont.innerHTML = ""

    if (lista.length === 0) {
        cont.innerHTML =
            '<div style="text-align:center;padding:60px;background:white;border-radius:16px;color:#ccc">' +
            '<p style="font-size:40px">📭</p>' +
            '<p style="margin-top:10px;font-size:14px">No hay pedidos en esta categoría</p>' +
            '</div>'
        return
    }

    lista.forEach(function(p) {
        var cfg      = COLORES_ESTADO[p.estado] || COLORES_ESTADO.pendiente
        var fecha    = p.fecha
            ? new Date(p.fecha.replace(" ","T")+"Z")
                .toLocaleString("es-MX",{timeZone:"America/Mexico_City",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})
            : "—"
        var total    = parseFloat(p.total || 0)
        var prods    = Array.isArray(p.productos) ? p.productos : []

        var productosHTML = prods.map(function(item) {
            return '<span style="display:inline-block;background:#f5f5f5;padding:3px 10px;border-radius:20px;font-size:12px;margin:2px">' +
                   item.nombre + ' x' + item.cantidad + '</span>'
        }).join("")

        // Botones según estado
        var botonesHTML = ""
        if (p.estado === "pendiente") {
            botonesHTML =
                '<button onclick="cambiarEstado(' + p.id + ',\'confirmado\')" style="flex:1;padding:9px;background:#27ae60;color:white;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-weight:700">✅ Confirmar</button>' +
                '<button onclick="cambiarEstado(' + p.id + ',\'cancelado\')" style="padding:9px 14px;background:#fff0f0;color:#e74c3c;border:1px solid #ffcdd2;border-radius:10px;font-size:13px;cursor:pointer">❌ Cancelar</button>'
        } else if (p.estado === "confirmado") {
            botonesHTML =
                '<button onclick="cambiarEstado(' + p.id + ',\'completado\')" style="flex:1;padding:9px;background:#1976d2;color:white;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-weight:700">🏁 Marcar completado</button>'
        }

        // WhatsApp del cliente
        var waHTML = ""
        if (p.cliente_telefono) {
            var telefono = p.cliente_telefono.replace(/\D/g,"")
            var msg = "¡Hola " + p.cliente_nombre + "! Te confirmo tu pedido #" + p.id + " por $" + total.toFixed(2) + " 🛍️ ¿Coordinamos la entrega?"
            waHTML = '<a href="https://wa.me/' + telefono + '?text=' + encodeURIComponent(msg) + '" target="_blank" ' +
                'style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#25D366;color:white;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;margin-left:auto">' +
                '💬 WhatsApp</a>'
        }

        var card = document.createElement("div")
        card.style.cssText = "background:white;border-radius:16px;padding:20px;margin-bottom:14px;box-shadow:0 1px 6px rgba(0,0,0,0.07)"

        card.innerHTML =
            '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap">' +
                '<div>' +
                    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
                        '<span style="font-size:16px;font-weight:900;color:#333">Pedido #' + p.id + '</span>' +
                        '<span style="background:' + cfg.bg + ';color:' + cfg.color + ';font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px">' + cfg.label + '</span>' +
                    '</div>' +
                    '<p style="font-size:12px;color:#aaa;margin-top:4px">🕐 ' + fecha + '</p>' +
                '</div>' +
                '<p style="font-size:22px;font-weight:900;color:#FF8500;flex-shrink:0">$' + total.toFixed(2) + '</p>' +
            '</div>' +

            '<div style="background:#fafafa;border-radius:12px;padding:14px;margin-bottom:14px">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
                    '<div>' +
                        '<p style="font-size:14px;font-weight:700;color:#333">👤 ' + (p.cliente_nombre || "Cliente") + '</p>' +
                        (p.cliente_email ? '<p style="font-size:12px;color:#aaa;margin-top:2px">✉️ ' + p.cliente_email + '</p>' : '') +
                    '</div>' +
                    waHTML +
                '</div>' +
            '</div>' +

            '<div style="margin-bottom:14px">' +
                '<p style="font-size:12px;color:#888;font-weight:700;margin-bottom:8px;text-transform:uppercase">Productos solicitados</p>' +
                '<div>' + (productosHTML || '<span style="color:#ccc;font-size:13px">Sin detalle</span>') + '</div>' +
            '</div>' +

            (botonesHTML
                ? '<div style="display:flex;gap:8px">' + botonesHTML + '</div>'
                : '')

        cont.appendChild(card)
    })
}

async function cambiarEstado(id, nuevoEstado) {
    var mensajes = {
        confirmado: "¿Confirmar este pedido? Se le generará el link de WhatsApp para contactar al cliente.",
        completado: "¿Marcar este pedido como completado?",
        cancelado:  "¿Cancelar este pedido?"
    }
    if (!confirm(mensajes[nuevoEstado] || "¿Cambiar estado?")) return

    try {
        mostrarLoading("Actualizando...")
        const res  = await fetch(API + "/pedidos/" + id, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ estado: nuevoEstado })
        })
        const data = await res.json()
        if (!data.ok) { alert("Error al actualizar"); return }
        await cargarPedidos()
    } catch (err) {
        alert("Error al conectar")
    } finally {
        ocultarLoading()
    }
}

cargarPedidos()