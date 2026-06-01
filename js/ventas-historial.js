let todasLasVentas    = []
let ventasFiltradas   = []   // Las que el usuario ve actualmente en pantalla
let detallesVentas    = {}   // Cache de productos por venta_id
let filtroActual      = "hoy"
let filtroFechaManual = ""   // Cuando usa el datepicker

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
    filtroActual      = periodo
    filtroFechaManual = ""

    document.querySelectorAll(".filtro-btn").forEach(function(b) {
        b.classList.remove("active")
    })
    var btns = document.querySelectorAll(".filtro-btn")
    var map  = { hoy: 0, ayer: 1, semana: 2, mes: 3, todo: 4 }
    if (map[periodo] !== undefined) btns[map[periodo]].classList.add("active")

    const ahora  = new Date()
    const hoyStr = ahora.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })

    var filtradas = todasLasVentas.filter(function(v) {
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
            return fechaMxStr.startsWith(hoyStr.substring(0, 7))
        }

        return true
    })

    ventasFiltradas = filtradas   // ← guarda para el corte
    renderVentas(filtradas)
}

function filtrarPorFecha(fecha) {
    if (!fecha) return
    filtroActual      = "manual"
    filtroFechaManual = fecha

    document.querySelectorAll(".filtro-btn").forEach(function(b) {
        b.classList.remove("active")
    })

    var filtradas = todasLasVentas.filter(function(v) {
        const fechaMx = new Date(v.fecha.replace(" ", "T") + "Z")
            .toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })
        return fechaMx === fecha
    })

    ventasFiltradas = filtradas   // ← guarda para el corte
    renderVentas(filtradas)
}

// ── RENDER ────────────────────────────────────────────────────
function renderVentas(ventas) {
    const contenedor = document.getElementById("ventasLista")
    contenedor.innerHTML = ""

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
        const res   = await fetch(API + "/ventas/" + venta_id + "/detalle")
        const items = await res.json()

        detallesVentas[venta_id] = items   // ← guarda en cache para el corte

        const el = document.getElementById("productos-" + venta_id)
        if (!el) return

        if (items.length === 0) {
            el.innerHTML = '<span style="color:#aaa;font-size:12px">Sin detalle</span>'
            return
        }

        el.innerHTML = items.map(function(item) {
            return '<span class="producto-tag">' + item.nombre + ' x' + item.cantidad + '</span>'
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

// ── CORTE DE CAJA ─────────────────────────────────────────────
function obtenerEtiquetaPeriodo() {
    const ahora = new Date()
    const opMx  = { timeZone: "America/Mexico_City" }

    if (filtroActual === "hoy")
        return "Hoy — " + ahora.toLocaleDateString("es-MX", Object.assign({ weekday:"long", day:"numeric", month:"long" }, opMx))

    if (filtroActual === "ayer") {
        const ayer = new Date(ahora); ayer.setDate(ahora.getDate() - 1)
        return "Ayer — " + ayer.toLocaleDateString("es-MX", Object.assign({ weekday:"long", day:"numeric", month:"long" }, opMx))
    }

    if (filtroActual === "semana") {
        const lunes  = new Date(ahora); lunes.setDate(ahora.getDate() - (ahora.getDay() || 7) + 1)
        const lStr   = lunes.toLocaleDateString("es-MX", Object.assign({ day:"numeric", month:"short" }, opMx))
        const hStr   = ahora.toLocaleDateString ("es-MX", Object.assign({ day:"numeric", month:"short" }, opMx))
        return "Esta semana — " + lStr + " al " + hStr
    }

    if (filtroActual === "mes")
        return "Este mes — " + ahora.toLocaleDateString("es-MX", Object.assign({ month:"long", year:"numeric" }, opMx))

    if (filtroActual === "manual" && filtroFechaManual)
        return new Date(filtroFechaManual + "T12:00:00").toLocaleDateString("es-MX", { day:"numeric", month:"long", year:"numeric" })

    return "Todo el historial"
}

function abrirModalCorte() {
    if (ventasFiltradas.length === 0) {
        alert("No hay ventas en el período seleccionado para generar un corte.")
        return
    }
    document.getElementById("labelPeriodo").textContent = obtenerEtiquetaPeriodo()
    document.getElementById("modalCorteHistorial").style.display = "flex"
}

function cerrarModalCorte() {
    document.getElementById("modalCorteHistorial").style.display = "none"
}

async function generarCorte(tipo) {
    cerrarModalCorte()
    mostrarLoading("Generando corte...")

    try {
        // 1. Cargar detalles de ventas que aún no están en cache
        const pendientes = ventasFiltradas.filter(function(v) { return !detallesVentas[v.id] })
        await Promise.all(pendientes.map(function(v) { return cargarDetalleVenta(v.id) }))

        // 2. Obtener compras y filtrar por el mismo período
        var comprasFiltradas = []
        try {
            const resC        = await fetch(API + "/reportes/compras?empresa_id=" + EMPRESA_ID)
            const todasCompras = await resC.json()
            comprasFiltradas  = filtrarComprasPorPeriodo(todasCompras)
        } catch(e) { console.warn("No se pudieron cargar compras:", e) }

        // 3. Construir y abrir el HTML
        const html    = construirHTMLCorte(ventasFiltradas, comprasFiltradas, tipo)
        const ventana = window.open("", "_blank")
        ventana.document.write(html)
        ventana.document.close()
        ventana.focus()
        setTimeout(function() { ventana.print() }, 500)

    } catch(err) {
        alert("Error al generar el corte")
        console.error(err)
    } finally {
        ocultarLoading()
    }
}

// Filtra compras por el mismo período activo — misma lógica que ventas
function filtrarComprasPorPeriodo(todasCompras) {
    const ahora  = new Date()
    const hoyStr = ahora.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })

    return todasCompras.filter(function(c) {
        if (!c.fecha) return false

        // Normalizar fecha (puede venir como "YYYY-MM-DD HH:MM:SS" o ISO)
        var fs = typeof c.fecha === "string" ? c.fecha
               : new Date(c.fecha).toISOString().replace("T", " ").split(".")[0]

        const d      = new Date(fs.replace(" ", "T") + (fs.includes("T") ? "" : "Z"))
        const fechaMx = d.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })

        if (filtroActual === "hoy")   return fechaMx === hoyStr

        if (filtroActual === "ayer") {
            const ayer = new Date(ahora); ayer.setDate(ahora.getDate() - 1)
            return fechaMx === ayer.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })
        }

        if (filtroActual === "semana") {
            const lunes = new Date(ahora)
            lunes.setDate(ahora.getDate() - (ahora.getDay() || 7) + 1)
            lunes.setHours(0, 0, 0, 0)
            return d >= lunes
        }

        if (filtroActual === "mes")
            return fechaMx.startsWith(hoyStr.substring(0, 7))

        if (filtroActual === "manual" && filtroFechaManual)
            return fechaMx === filtroFechaManual

        return true
    })
}

// Construye el HTML del corte usando exactamente los mismos datos del historial
function construirHTMLCorte(ventas, compras, tipo) {
    const esTicket       = tipo === "ticket"
    const ancho          = esTicket ? "80mm" : "210mm"
    const fontSize       = esTicket ? "11px" : "13px"
    const empresa        = (SESSION && SESSION.nombre_empresa) ? SESSION.nombre_empresa : "Mi Negocio"
    const fechaImpresion = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })
    const periodoLabel   = obtenerEtiquetaPeriodo()

    const totalVentas  = ventas.reduce(function(a, v) { return a + parseFloat(v.total) }, 0)
    const totalCompras = compras.reduce(function(a, c) { return a + parseFloat(c.total) }, 0)
    const balance      = totalVentas - totalCompras
    const balanceColor = balance >= 0 ? "#27ae60" : "#e74c3c"

    // Por método de pago
    var metodosMap = {}
    ventas.forEach(function(v) {
        var m = v.metodo_pago || "efectivo"
        if (!metodosMap[m]) metodosMap[m] = { num: 0, total: 0 }
        metodosMap[m].num++
        metodosMap[m].total += parseFloat(v.total)
    })

    // Filas ventas — MISMA lógica de horas que el historial
    var ventasRows = ""
    ventas.forEach(function(v) {
        const fecha   = new Date(v.fecha.replace(" ", "T") + "Z")
        const horaStr = fecha.toLocaleTimeString("es-MX", {
            timeZone: "America/Mexico_City",
            hour: "2-digit", minute: "2-digit"
        })
        const items = detallesVentas[v.id] || []
        const prods = items.length > 0
            ? items.map(function(i) { return i.nombre + " x" + i.cantidad }).join(", ")
            : "—"

        ventasRows +=
            "<tr><td>" + horaStr + "</td>" +
            "<td>" + prods + "</td>" +
            "<td>" + (v.metodo_pago || "efectivo") + "</td>" +
            '<td style="text-align:right"><strong>$' + parseFloat(v.total).toFixed(2) + "</strong></td></tr>"
    })

    // Filas métodos
    var metodosRows = ""
    Object.keys(metodosMap).forEach(function(m) {
        var info = metodosMap[m]
        metodosRows +=
            "<tr><td>" + m + "</td>" +
            '<td style="text-align:center">' + info.num + "</td>" +
            '<td style="text-align:right"><strong>$' + info.total.toFixed(2) + "</strong></td></tr>"
    })

    // Filas compras
    var comprasRows = ""
    compras.forEach(function(c) {
        var fs      = typeof c.fecha === "string" ? c.fecha
                    : new Date(c.fecha).toISOString().replace("T", " ").split(".")[0]
        const fecha   = new Date(fs.replace(" ", "T") + (fs.includes("T") ? "" : "Z"))
        const horaStr = fecha.toLocaleTimeString("es-MX", {
            timeZone: "America/Mexico_City",
            hour: "2-digit", minute: "2-digit"
        })
        comprasRows +=
            "<tr><td>#" + c.id + "</td>" +
            "<td>" + horaStr + "</td>" +
            "<td>" + (c.proveedor || "—") + "</td>" +
            '<td style="text-align:right"><strong>$' + parseFloat(c.total).toFixed(2) + "</strong></td></tr>"
    })

    const seccionVM = Object.keys(metodosMap).length > 0
        ? '<table><tr><th>Método</th><th>Ventas</th><th>Total</th></tr>' + metodosRows + "</table>"
        : '<p class="empty">Sin ventas</p>'
    const seccionVD = ventas.length > 0
        ? '<table><tr><th>Hora</th><th>Productos</th><th>Método</th><th>Total</th></tr>' + ventasRows + "</table>"
        : '<p class="empty">Sin ventas</p>'
    const seccionC  = compras.length > 0
        ? '<table><tr><th>ID</th><th>Hora</th><th>Proveedor</th><th>Total</th></tr>' + comprasRows + "</table>"
        : '<p class="empty">Sin compras</p>'

    const css = [
        "* { margin:0; padding:0; box-sizing:border-box; }",
        "body { font-family:" + (esTicket ? "monospace" : "Arial,sans-serif") + "; font-size:" + fontSize + "; width:" + ancho + "; padding:12px; color:#111; }",
        ".cabecera { text-align:center; border-bottom:2px solid #FF8500; padding-bottom:10px; margin-bottom:12px; }",
        ".cabecera h1 { font-size:" + (esTicket ? "14px" : "22px") + "; color:#FF8500; }",
        ".cabecera p { font-size:11px; color:#555; margin-top:3px; }",
        ".seccion { margin-bottom:14px; }",
        ".seccion-titulo { font-weight:bold; text-transform:uppercase; border-bottom:1px solid #eee; padding-bottom:4px; margin-bottom:8px; color:#FF8500; font-size:12px; }",
        "table { width:100%; border-collapse:collapse; }",
        "th { text-align:left; font-size:11px; padding:4px 6px; background:#f5f5f5; border-bottom:1px solid #ddd; }",
        "td { padding:4px 6px; font-size:11px; border-bottom:1px solid #f0f0f0; }",
        ".resumen-box { border:2px solid #FF8500; border-radius:8px; padding:10px; margin:12px 0; }",
        ".resumen-fila { display:flex; justify-content:space-between; padding:3px 0; font-size:13px; }",
        ".balance { font-size:16px; font-weight:bold; border-top:2px solid #ddd; margin-top:6px; padding-top:6px; color:" + balanceColor + "; }",
        ".footer { text-align:center; margin-top:14px; padding-top:10px; border-top:1px solid #eee; font-size:11px; color:#888; }",
        ".empty { color:#aaa; font-style:italic; padding:4px; font-size:11px; }",
        "@media print { @page { size:" + (esTicket ? "80mm auto" : "A4") + "; margin:" + (esTicket ? "0" : "15mm") + "; } }"
    ].join(" ")

    return "<!DOCTYPE html><html><head><meta charset='UTF-8'><style>" + css + "</style></head><body>" +
        "<div class='cabecera'>" +
            "<h1>" + empresa + "</h1>" +
            "<p>CORTE DE CAJA</p>" +
            "<p>" + periodoLabel + "</p>" +
            "<p>Impreso: " + fechaImpresion + "</p>" +
            "<p>Usuario: " + USUARIO_NOMBRE + "</p>" +
        "</div>" +
        "<div class='resumen-box'>" +
            "<div class='resumen-fila'><span>Total ventas (" + ventas.length + ")</span><span style='color:#27ae60'>+$" + totalVentas.toFixed(2) + "</span></div>" +
            "<div class='resumen-fila'><span>Total compras (" + compras.length + ")</span><span style='color:#e74c3c'>-$" + totalCompras.toFixed(2) + "</span></div>" +
            "<div class='resumen-fila balance'><span>BALANCE</span><span>" + (balance >= 0 ? "+" : "") + "$" + balance.toFixed(2) + "</span></div>" +
        "</div>" +
        "<div class='seccion'><div class='seccion-titulo'>Ventas por método de pago</div>" + seccionVM + "</div>" +
        "<div class='seccion'><div class='seccion-titulo'>Detalle de ventas</div>" + seccionVD + "</div>" +
        "<div class='seccion'><div class='seccion-titulo'>Compras realizadas</div>" + seccionC + "</div>" +
        "<div class='footer'><p>MyControl ERP — " + fechaImpresion + "</p><p>Comprobante interno</p></div>" +
        "</body></html>"
}

// ── INIT ──────────────────────────────────────────────────────
if (ES_ADMIN) {
    const sec = document.getElementById("seccionSolicitudes")
    if (sec) sec.style.display = "block"
}

cargarVentas()
cargarSolicitudes()