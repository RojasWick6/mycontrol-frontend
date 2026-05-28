let todasLasVentas  = []
let filtroActual    = "hoy"

// ── CARGAR VENTAS ─────────────────────────────────────────────
async function cargarVentas() {
    mostrarLoading("Cargando historial...")
    try {
        const res      = await fetch(API + "/ventas?empresa_id=" + EMPRESA_ID)
        todasLasVentas = await res.json()
        filtrarPor("hoy")
    } catch (err) {
        console.error("Error al cargar ventas:", err)
    } finally {
        ocultarLoading()
    }
}

// ── FILTROS ───────────────────────────────────────────────────
function filtrarPor(periodo) {
    filtroActual = periodo

    document.querySelectorAll(".filtro-btn").forEach(function(b) {
        b.classList.remove("active")
    })
    var btns = document.querySelectorAll(".filtro-btn")
    var map  = { hoy: 0, ayer: 1, semana: 2, mes: 3, todo: 4 }
    if (map[periodo] !== undefined) btns[map[periodo]].classList.add("active")

    const ahora  = new Date()
    const hoyStr = ahora.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })

    var filtradas = todasLasVentas.filter(function(v) {
        // Convertir fecha UTC a hora México
        const fechaMx    = new Date(v.fecha.replace(" ", "T") + "Z")
        const fechaMxStr = fechaMx.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })

        if (periodo === "hoy") return fechaMxStr === hoyStr

        if (periodo === "ayer") {
            const ayer = new Date(ahora)
            ayer.setDate(ahora.getDate() - 1)
            return fechaMxStr === ayer.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })
        }

        if (periodo === "semana") {
            const lunes = new Date(ahora)
            const dia   = ahora.getDay() || 7
            lunes.setDate(ahora.getDate() - dia + 1)
            lunes.setHours(0, 0, 0, 0)
            return fechaMx >= lunes
        }

        if (periodo === "mes") {
            const mMx = fechaMx.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).substring(0, 7)
            const mHoy = hoyStr.substring(0, 7)
            return mMx === mHoy
        }

        return true
    })

    renderVentas(filtradas)
}

function filtrarPorFecha(fecha) {
    if (!fecha) return
    document.querySelectorAll(".filtro-btn").forEach(function(b) {
        b.classList.remove("active")
    })
    var filtradas = todasLasVentas.filter(function(v) {
        const fechaMx = new Date(v.fecha.replace(" ", "T") + "Z")
            .toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })
        return fechaMx === fecha
    })
    renderVentas(filtradas)
}


// ── RENDER ────────────────────────────────────────────────────
function renderVentas(ventas) {
    const contenedor = document.getElementById("ventasLista")
    contenedor.innerHTML = ""

    // Actualizar resumen
    const totalNum   = ventas.length
    const totalMonto = ventas.reduce(function(acc, v) { return acc + parseFloat(v.total) }, 0)
    document.getElementById("resumenNum").textContent   = totalNum
    document.getElementById("resumenTotal").textContent = "$" + totalMonto.toFixed(2)

    if (ventas.length === 0) {
        contenedor.innerHTML =
            '<div style="text-align:center;padding:40px;color:#aaa;background:white;border-radius:12px">' +
            '<p style="font-size:32px">🧾</p>' +
            '<p style="margin-top:8px">No hay ventas en este período</p>' +
            '</div>'
        return
    }

    ventas.forEach(function(venta) {
        // Corrección de parsing e inyección de zona horaria explícita
        const fecha    = new Date(venta.fecha.replace(" ", "T") + "Z")
        const fechaStr = fecha.toLocaleDateString("es-MX", {
            timeZone: "America/Mexico_City",
            weekday: "short", day: "numeric", month: "short", year: "numeric"
        })
        const horaStr  = fecha.toLocaleTimeString("es-MX", {
            timeZone: "America/Mexico_City",
            hour: "2-digit", minute: "2-digit"
        })

        const accion = ES_ADMIN
            ? '<button onclick="cancelarVenta(' + venta.id + ')" class="btn-cancelar-venta">🗑️ Cancelar</button>'
            : '<button onclick="solicitarCancelacion(' + venta.id + ', ' + venta.total + ')" class="btn-solicitar-cancelar">📩 Solicitar</button>'

        const card = document.createElement("div")
        card.className = "venta-card-historial"
        card.innerHTML =
            '<div class="venta-card-top">' +
                '<div class="venta-card-fecha">' +
                    '<span class="fecha-dia">' + fechaStr + '</span>' +
                    '<span class="fecha-hora">🕐 ' + horaStr + '</span>' +
                '</div>' +
                '<div class="venta-card-monto">$' + parseFloat(venta.total).toFixed(2) + '</div>' +
            '</div>' +
            '<div class="venta-card-mid">' +
                '<span class="venta-metodo">' + (venta.metodo_pago || "efectivo") + '</span>' +
                '<span class="venta-id">#' + venta.id + '</span>' +
            '</div>' +
            '<div class="venta-productos" id="productos-' + venta.id + '">' +
                '<span style="color:#aaa;font-size:12px">Cargando productos...</span>' +
            '</div>' +
            '<div class="venta-card-bottom">' + accion + '</div>'

        contenedor.appendChild(card)
        cargarDetalleVenta(venta.id)
    })
}

// ── DETALLE PRODUCTOS ─────────────────────────────────────────
async function cargarDetalleVenta(venta_id) {
    try {
        const res    = await fetch(API + "/ventas/" + venta_id + "/detalle")
        const items  = await res.json()
        const el     = document.getElementById("productos-" + venta_id)
        if (!el) return

        if (items.length === 0) {
            el.innerHTML = '<span style="color:#aaa;font-size:12px">Sin detalle</span>'
            return
        }

        el.innerHTML = items.map(function(item) {
            return '<span class="producto-tag">' +
                item.nombre + ' x' + item.cantidad +
                '</span>'
        }).join("")
    } catch (err) {
        const el = document.getElementById("productos-" + venta_id)
        if (el) el.innerHTML = ""
    }
}

// ── CANCELAR VENTA (admin) ────────────────────────────────────
async function cancelarVenta(id) {
    if (!confirm("¿Cancelar esta venta? Se restaurará el stock automáticamente.")) return
    try {
        mostrarLoading("Cancelando venta...")
        const res  = await fetch(API + "/ventas/" + id, { method: "DELETE" })
        const data = await res.json()
        if (data.ok) {
            alert("✅ Venta cancelada y stock restaurado")
            await cargarVentas()
        }
    } catch (err) {
        alert("Error al cancelar venta")
    } finally {
        ocultarLoading()
    }
}

// ── SOLICITAR CANCELACIÓN (empleado) ─────────────────────────
async function solicitarCancelacion(venta_id, total) {
    const motivo = prompt(
        "Venta #" + venta_id + " — $" + parseFloat(total).toFixed(2) +
        "\n\nEscribe el motivo de la cancelación:"
    )
    if (!motivo || motivo.trim() === "") return

    try {
        const res  = await fetch(API + "/solicitudes-cancelacion", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                venta_id,
                empresa_id: EMPRESA_ID,
                usuario_id: USUARIO_ID,
                motivo:     motivo.trim()
            })
        })
        const data = await res.json()
        if (data.id) alert("✅ Solicitud enviada. El admin revisará tu petición.")
    } catch (err) {
        alert("Error al enviar solicitud")
    }
}

// ── SOLICITUDES PENDIENTES (admin) ────────────────────────────
async function cargarSolicitudes() {
    if (!ES_ADMIN) return
    try {
        const res   = await fetch(API + "/solicitudes-cancelacion?empresa_id=" + EMPRESA_ID)
        const datos = await res.json()
        const cont  = document.getElementById("solicitudesList")
        if (!cont) return

        if (datos.length === 0) {
            cont.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px">Sin solicitudes pendientes</p>'
            return
        }

        cont.innerHTML = ""
        datos.forEach(function(s) {
            const div = document.createElement("div")
            div.style.cssText = "background:#fff8f0;border:1px solid #FFE0B2;border-radius:10px;padding:14px;margin-bottom:10px"
            div.innerHTML =
                '<div style="display:flex;justify-content:space-between;align-items:start;gap:10px;flex-wrap:wrap">' +
                    '<div>' +
                        '<p style="font-weight:700;color:#333">Venta #' + s.venta_id + ' — $' + parseFloat(s.total).toFixed(2) + '</p>' +
                        '<p style="font-size:13px;color:#888;margin-top:2px">Por: ' + s.solicitado_por + '</p>' +
                        '<p style="font-size:13px;color:#555;margin-top:4px">Motivo: ' + s.motivo + '</p>' +
                    '</div>' +
                    '<div style="display:flex;gap:8px">' +
                        '<button onclick="responderSolicitud(' + s.id + ',' + s.venta_id + ',true)" style="background:#27ae60;color:white;border:none;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">✅ Aprobar</button>' +
                        '<button onclick="responderSolicitud(' + s.id + ',' + s.venta_id + ',false)" style="background:#eee;color:#555;border:none;padding:8px 12px;border-radius:8px;font-size:12px;cursor:pointer">❌ Rechazar</button>' +
                    '</div>' +
                '</div>'
            cont.appendChild(div)
        })
    } catch (err) {
        console.error("Error solicitudes:", err)
    }
}

async function responderSolicitud(solicitud_id, venta_id, aprobar) {
    try {
        mostrarLoading(aprobar ? "Cancelando venta..." : "Rechazando...")
        if (aprobar) {
            const res  = await fetch(API + "/ventas/" + venta_id, { method: "DELETE" })
            const data = await res.json()
            if (!data.ok) { alert("Error al cancelar venta"); return }
        }
        await fetch(API + "/solicitudes-cancelacion/" + solicitud_id, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ estado: aprobar ? "aprobada" : "rechazada" })
        })
        alert(aprobar ? "✅ Venta cancelada" : "Solicitud rechazada")
        await cargarVentas()
        await cargarSolicitudes()
    } catch (err) {
        alert("Error al procesar solicitud")
    } finally {
        ocultarLoading()
    }
}

// ── INIT ──────────────────────────────────────────────────────
if (ES_ADMIN) {
    const sec = document.getElementById("seccionSolicitudes")
    if (sec) sec.style.display = "block"
}

cargarVentas()
cargarSolicitudes()