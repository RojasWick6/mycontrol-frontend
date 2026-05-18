const ventasList = document.getElementById("ventasList")
const filtro     = document.getElementById("filtroHistorial")

let todasLasVentas = []

async function cargarVentas() {
    try {
        const res      = await fetch(API + "/ventas?empresa_id=" + EMPRESA_ID)
        todasLasVentas = await res.json()
        renderVentas(todasLasVentas)
    } catch (err) {
        console.error("Error al cargar ventas:", err)
    }
}

function renderVentas(ventas) {
    ventasList.innerHTML = ""

    if (ventas.length === 0) {
        ventasList.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;color:#aaa;padding:30px">
                    No hay ventas registradas
                </td>
            </tr>`
        return
    }

    ventas.forEach(function(venta) {
        const fecha = new Date(venta.fecha).toLocaleDateString("es-MX", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        })

        const accion = ES_ADMIN
            ? '<button onclick="cancelarVenta(' + venta.id + ')" style="' +
              'background:#fdecea;color:#e74c3c;border:none;padding:6px 12px;' +
              'border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">' +
              '🗑️ Cancelar</button>'
            : '<button onclick="solicitarCancelacion(' + venta.id + ', ' + venta.total + ')" style="' +
              'background:#fff3e0;color:#e65100;border:none;padding:6px 12px;' +
              'border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">' +
              '📩 Solicitar</button>'

        const fila = document.createElement("tr")
        fila.innerHTML =
            "<td>#" + venta.id + "</td>" +
            "<td>" + fecha + "</td>" +
            "<td>" + (venta.metodo_pago || "—") + "</td>" +
            '<td style="text-align:right;font-weight:600">$' + parseFloat(venta.total).toFixed(2) + "</td>" +
            "<td>" + accion + "</td>"
        ventasList.appendChild(fila)
    })
}

// ── ADMIN: CANCELAR VENTA ─────────────────────────────────────
async function cancelarVenta(id) {
    if (!confirm("¿Cancelar esta venta? Se restaurará el stock automáticamente.")) return
    try {
        mostrarLoading("Cancelando venta...")
        const res = await fetch(API + "/ventas/" + id, { method: "DELETE" })
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

// ── EMPLEADO: SOLICITAR CANCELACIÓN ──────────────────────────
async function solicitarCancelacion(venta_id, total) {
    const motivo = prompt(
        "Venta #" + venta_id + " — $" + parseFloat(total).toFixed(2) +
        "\n\nEscribe el motivo de la cancelación:"
    )
    if (!motivo || motivo.trim() === "") return

    try {
        const res = await fetch(API + "/solicitudes-cancelacion", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                venta_id,
                empresa_id: EMPRESA_ID,
                usuario_id: USUARIO_ID,
                motivo:     motivo.trim()
            })
        })
        const data = await res.json()
        if (data.id) {
            alert("✅ Solicitud enviada. El admin revisará tu petición.")
        }
    } catch (err) {
        alert("Error al enviar solicitud")
    }
}

// ── ADMIN: VER SOLICITUDES PENDIENTES ─────────────────────────
async function cargarSolicitudes() {
    if (!ES_ADMIN) return

    try {
        const res   = await fetch(API + "/solicitudes-cancelacion?empresa_id=" + EMPRESA_ID)
        const datos = await res.json()

        const contenedor = document.getElementById("solicitudesList")
        if (!contenedor) return

        if (datos.length === 0) {
            contenedor.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px">Sin solicitudes pendientes</p>'
            return
        }

        contenedor.innerHTML = ""
        datos.forEach(function(s) {
            const div = document.createElement("div")
            div.style.cssText = "background:#fff8f0;border:1px solid #FFE0B2;border-radius:10px;padding:14px;margin-bottom:10px"
            div.innerHTML =
                '<div style="display:flex;justify-content:space-between;align-items:start;gap:10px">' +
                    '<div>' +
                        '<p style="font-weight:700;color:#333">Venta #' + s.venta_id + ' — $' + parseFloat(s.total).toFixed(2) + '</p>' +
                        '<p style="font-size:13px;color:#888;margin-top:2px">Solicitado por: ' + s.solicitado_por + '</p>' +
                        '<p style="font-size:13px;color:#555;margin-top:4px">Motivo: ' + s.motivo + '</p>' +
                    '</div>' +
                    '<div style="display:flex;gap:8px;flex-shrink:0">' +
                        '<button onclick="responderSolicitud(' + s.id + ', ' + s.venta_id + ', true)" style="background:#27ae60;color:white;border:none;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">✅ Aprobar</button>' +
                        '<button onclick="responderSolicitud(' + s.id + ', ' + s.venta_id + ', false)" style="background:#eee;color:#555;border:none;padding:8px 12px;border-radius:8px;font-size:12px;cursor:pointer">❌ Rechazar</button>' +
                    '</div>' +
                '</div>'
            contenedor.appendChild(div)
        })
    } catch (err) {
        console.error("Error solicitudes:", err)
    }
}

async function responderSolicitud(solicitud_id, venta_id, aprobar) {
    try {
        mostrarLoading(aprobar ? "Cancelando venta..." : "Rechazando solicitud...")

        if (aprobar) {
            const res = await fetch(API + "/ventas/" + venta_id, { method: "DELETE" })
            const data = await res.json()
            if (!data.ok) { alert("Error al cancelar venta"); return }
        }

        await fetch(API + "/solicitudes-cancelacion/" + solicitud_id, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ estado: aprobar ? "aprobada" : "rechazada" })
        })

        alert(aprobar ? "✅ Venta cancelada y stock restaurado" : "Solicitud rechazada")
        await cargarVentas()
        await cargarSolicitudes()

    } catch (err) {
        alert("Error al procesar solicitud")
    } finally {
        ocultarLoading()
    }
}

if (filtro) {
    filtro.addEventListener("input", function() {
        const texto = filtro.value.toLowerCase()
        const filtradas = todasLasVentas.filter(function(v) {
            return String(v.id).includes(texto) ||
                v.fecha.toLowerCase().includes(texto) ||
                (v.metodo_pago && v.metodo_pago.toLowerCase().includes(texto))
        })
        renderVentas(filtradas)
    })
}

// Mostrar sección solicitudes solo a admin
if (ES_ADMIN) {
    const sec = document.getElementById("seccionSolicitudes")
    if (sec) sec.style.display = "block"
}

cargarVentas()
cargarSolicitudes()