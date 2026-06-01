async function cargarReportes() {
    await Promise.all([
        cargarResumenMes(),
        cargarMetricas(),
        cargarMasVendidos(),
        cargarStockBajo(),
        cargarCompras()
    ])
}

// ── RESUMEN MES ───────────────────────────────────────────────
async function cargarResumenMes() {
    try {
        const res    = await fetch(API + "/ventas?empresa_id=" + EMPRESA_ID)
        const ventas = await res.json()

        const ahora = new Date()
        const mesStr = ahora.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).substring(0, 7)

        const ventasMes = ventas.filter(function(v) {
            const f = new Date(v.fecha.replace(" ", "T") + "Z")
            return f.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).startsWith(mesStr)
        })

        const total = ventasMes.reduce(function(acc, v) { return acc + parseFloat(v.total) }, 0)
        document.getElementById("ventasMes").textContent = "$" + total.toFixed(2)
    } catch (err) {
        console.error("Error resumen mes:", err)
    }
}

// ── MÉTRICAS CLAVE ────────────────────────────────────────────
async function cargarMetricas() {
    try {
        const res    = await fetch(API + "/ventas?empresa_id=" + EMPRESA_ID)
        const ventas = await res.json()

        const ahora  = new Date()
        const mesStr = ahora.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).substring(0, 7)

        const ventasMes = ventas.filter(function(v) {
            const f = new Date(v.fecha.replace(" ", "T") + "Z")
            return f.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).startsWith(mesStr)
        })

        document.getElementById("numVentasMes").textContent = ventasMes.length

        if (ventasMes.length > 0) {
            const totalMes = ventasMes.reduce(function(acc, v) { return acc + parseFloat(v.total) }, 0)
            document.getElementById("ticketPromedio").textContent = "$" + (totalMes / ventasMes.length).toFixed(2)
        }

        // Mejor día del mes
        var porDia = {}
        ventasMes.forEach(function(v) {
            const f   = new Date(v.fecha.replace(" ", "T") + "Z")
            const dia = f.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })
            porDia[dia] = (porDia[dia] || 0) + parseFloat(v.total)
        })

        var mejorDia = null, mejorMonto = 0
        Object.keys(porDia).forEach(function(dia) {
            if (porDia[dia] > mejorMonto) { mejorMonto = porDia[dia]; mejorDia = dia }
        })

        if (mejorDia) {
            const fechaFormato = new Date(mejorDia + "T12:00:00").toLocaleDateString("es-MX", {
                weekday: "short", day: "numeric", month: "short"
            })
            document.getElementById("mejorDia").textContent     = fechaFormato
            document.getElementById("mejorDiaMonto").textContent = "$" + mejorMonto.toFixed(2)
        }

        // Método más usado
        var porMetodo = {}
        ventasMes.forEach(function(v) {
            var m = v.metodo_pago || "efectivo"
            porMetodo[m] = (porMetodo[m] || 0) + 1
        })

        var metodoTop = null, metodoMax = 0
        Object.keys(porMetodo).forEach(function(m) {
            if (porMetodo[m] > metodoMax) { metodoMax = porMetodo[m]; metodoTop = m }
        })

        if (metodoTop && ventasMes.length > 0) {
            document.getElementById("metodoPrincipal").textContent = metodoTop
            document.getElementById("metodoPct").textContent = Math.round((metodoMax / ventasMes.length) * 100) + "% de las ventas"
        }
    } catch (err) {
        console.error("Error métricas:", err)
    }
}

// ── MÁS VENDIDOS ─────────────────────────────────────────────
async function cargarMasVendidos() {
    try {
        const res   = await fetch(API + "/reportes/mas-vendidos?empresa_id=" + EMPRESA_ID)
        const datos = await res.json()
        const cont  = document.getElementById("masVendidosList")
        cont.innerHTML = ""

        if (datos.length === 0) {
            cont.innerHTML = '<div class="lista-empty">Sin datos de ventas</div>'
            return
        }

        const max = parseFloat(datos[0].total_vendido)
        datos.forEach(function(p, i) {
            const pct  = Math.round((parseFloat(p.total_vendido) / max) * 100)
            const item = document.createElement("div")
            item.className = "ranking-item"
            item.innerHTML =
                '<div class="ranking-pos">' + (i + 1) + '</div>' +
                '<div class="ranking-info">' +
                    '<div class="ranking-nombre">' + p.nombre + '</div>' +
                    '<div class="ranking-barra"><div class="ranking-barra-fill" style="width:' + pct + '%"></div></div>' +
                '</div>' +
                '<div class="ranking-datos">' +
                    '<span class="ranking-uds">' + p.total_vendido + ' uds</span>' +
                    '<span class="ranking-monto">$' + parseFloat(p.total_ingresos).toFixed(2) + '</span>' +
                '</div>'
            cont.appendChild(item)
        })
    } catch (err) {
        console.error("Error más vendidos:", err)
    }
}

// ── STOCK BAJO ────────────────────────────────────────────────
async function cargarStockBajo() {
    try {
        const res   = await fetch(API + "/reportes/stock-bajo?empresa_id=" + EMPRESA_ID)
        const datos = await res.json()
        const cont  = document.getElementById("stockBajoList")
        cont.innerHTML = ""

        document.getElementById("numStockBajo").textContent = datos.length
        const card = document.getElementById("cardStockBajo")
        card.classList.toggle("alerta-activa", datos.length > 0)

        if (datos.length === 0) {
            cont.innerHTML = '<div class="lista-empty">✅ Todo el stock está bien</div>'
            return
        }

        datos.forEach(function(p) {
            const urgente = p.stock === 0
            const item    = document.createElement("div")
            item.className = "stock-item " + (urgente ? "stock-urgente" : "stock-bajo")
            item.innerHTML =
                '<div class="stock-icono">' + (urgente ? "🚨" : "⚠️") + '</div>' +
                '<div class="stock-info">' +
                    '<span class="stock-nombre">' + p.nombre + '</span>' +
                    '<span class="stock-codigo">Cód: ' + (p.codigo || "—") + '</span>' +
                '</div>' +
                '<div class="stock-derecha">' +
                    '<span class="stock-cant ' + (urgente ? "cant-cero" : "cant-bajo") + '">' + p.stock + ' uds</span>' +
                    '<span class="stock-precio">$' + parseFloat(p.precio).toFixed(2) + '</span>' +
                '</div>'
            cont.appendChild(item)
        })
    } catch (err) {
        console.error("Error stock bajo:", err)
    }
}

// ── HISTORIAL COMPRAS ─────────────────────────────────────────
async function cargarCompras() {
    try {
        const res   = await fetch(API + "/reportes/compras?empresa_id=" + EMPRESA_ID)
        const datos = await res.json()
        const tbody = document.getElementById("comprasList")
        tbody.innerHTML = ""

        const ahora  = new Date()
        const mesStr = ahora.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).substring(0, 7)

        const totalMes = datos
            .filter(function(c) {
                const f = new Date(c.fecha.replace(" ", "T") + "Z")
                return f.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).startsWith(mesStr)
            })
            .reduce(function(acc, c) { return acc + parseFloat(c.total) }, 0)

        document.getElementById("comprasMes").textContent = "$" + totalMes.toFixed(2)

        if (datos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">Sin compras registradas</td></tr>'
            return
        }

        datos.forEach(function(c) {
            const fecha = new Date(c.fecha.replace(" ", "T") + (c.fecha.includes("T") ? "" : "Z"))
                .toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" })
            const fila  = document.createElement("tr")
            fila.innerHTML =
                "<td>#" + c.id + "</td>" +
                "<td>" + fecha + "</td>" +
                "<td>" + (c.proveedor || "—") + "</td>" +
                "<td>" + c.num_productos + "</td>" +
                "<td><strong>$" + parseFloat(c.total).toFixed(2) + "</strong></td>"
            tbody.appendChild(fila)
        })
    } catch (err) {
        console.error("Error historial compras:", err)
    }
}

// ── CORTE DE CAJA ─────────────────────────────────────────────
var modalCorte     = document.getElementById("modalCorte")
var btnCorte       = document.getElementById("btnCorte")
var btnCerrarCorte = document.getElementById("btnCerrarCorte")

function formatFecha(date) { return date.toLocaleDateString("sv-SE") }

function setHoy() {
    var hoy = formatFecha(new Date())
    document.getElementById("fechaInicio").value = hoy
    document.getElementById("fechaFin").value    = hoy
}
function setAyer() {
    var ayer = new Date(); ayer.setDate(ayer.getDate() - 1)
    document.getElementById("fechaInicio").value = formatFecha(ayer)
    document.getElementById("fechaFin").value    = formatFecha(ayer)
}
function setSemana() {
    var hoy   = new Date()
    var lunes = new Date(hoy); lunes.setDate(hoy.getDate() - hoy.getDay() + 1)
    document.getElementById("fechaInicio").value = formatFecha(lunes)
    document.getElementById("fechaFin").value    = formatFecha(hoy)
}
function setMes() {
    var hoy    = new Date()
    var inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    document.getElementById("fechaInicio").value = formatFecha(inicio)
    document.getElementById("fechaFin").value    = formatFecha(hoy)
}

btnCorte.addEventListener("click", function() { setHoy(); modalCorte.classList.add("active") })
btnCerrarCorte.addEventListener("click", function() { modalCorte.classList.remove("active") })

// ── CONVERTIR FECHA LOCAL A UTC PARA ENVIAR AL SERVIDOR ───────
function fechaAUTC(fechaStr, hora) {
    var d = new Date(fechaStr + "T" + hora)
    return d.getUTCFullYear() + "-" +
           String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
           String(d.getUTCDate()).padStart(2, "0") + " " +
           String(d.getUTCHours()).padStart(2, "0") + ":" +
           String(d.getUTCMinutes()).padStart(2, "0") + ":" +
           String(d.getUTCSeconds()).padStart(2, "0")
}

async function obtenerDatosCorte() {
    var fechaInicio = document.getElementById("fechaInicio").value
    var fechaFin    = document.getElementById("fechaFin").value
    if (!fechaInicio || !fechaFin) { alert("Selecciona las fechas"); return null }

    // Convertir a UTC: la BD guarda en UTC, enviamos el rango en UTC
    var inicioUTC = fechaAUTC(fechaInicio, "00:00:00")
    var finUTC    = fechaAUTC(fechaFin,    "23:59:59")

    var res = await fetch(
        API + "/corte-caja?empresa_id=" + EMPRESA_ID +
        "&fecha_inicio=" + encodeURIComponent(inicioUTC) +
        "&fecha_fin="    + encodeURIComponent(finUTC)
    )
    return await res.json()
}

document.getElementById("btnGenerarPDF").addEventListener("click", async function() {
    var datos = await obtenerDatosCorte(); if (!datos) return
    var ventana = window.open("", "_blank")
    ventana.document.write(generarHTMLCorte(datos, "pdf"))
    ventana.document.close(); ventana.focus()
    setTimeout(function() { ventana.print() }, 500)
    modalCorte.classList.remove("active")
})

document.getElementById("btnGenerarTicket").addEventListener("click", async function() {
    var datos = await obtenerDatosCorte(); if (!datos) return
    var ventana = window.open("", "_blank")
    ventana.document.write(generarHTMLCorte(datos, "ticket"))
    ventana.document.close(); ventana.focus()
    setTimeout(function() { ventana.print() }, 500)
    modalCorte.classList.remove("active")
})

// ── EXTRAER HORA DEL STRING YA EN HORA MÉXICO ─────────────────
function extraerHoraCorte(fechaStr) {
    if (!fechaStr) return "—"
    var partes = fechaStr.split(" ")
    if (partes.length < 2) return "—"
    var t    = partes[1].split(":")
    var h    = parseInt(t[0])
    var m    = t[1] || "00"
    var ampm = h >= 12 ? "p.m." : "a.m."
    h = h % 12
    if (h === 0) h = 12
    return h + ":" + m + " " + ampm
}

function generarHTMLCorte(d, tipo) {
    var esTicket       = tipo === "ticket"
    var ancho          = esTicket ? "80mm" : "210mm"
    var fontSize       = esTicket ? "11px" : "13px"
    var fechaImpresion = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })
    var empresa        = d.empresa ? d.empresa.nombre_empresa : "Mi Empresa"
    var balanceColor   = d.resumen.balance >= 0 ? "#27ae60" : "#e74c3c"

    var ventasRows = ""
    d.ventas.forEach(function(v) {
        var hora = extraerHoraCorte(v.fecha)
        ventasRows += "<tr><td>" + hora + "</td><td>" + (v.productos || "—") + "</td><td>" + (v.metodo_pago || "efectivo") + '</td><td style="text-align:right"><strong>$' + parseFloat(v.total).toFixed(2) + "</strong></td></tr>"
    })

    var metodosRows = ""
    d.por_metodo.forEach(function(m) {
        metodosRows += "<tr><td>" + (m.metodo_pago || "efectivo") + '</td><td style="text-align:center">' + m.num_ventas + '</td><td style="text-align:right"><strong>$' + parseFloat(m.total).toFixed(2) + "</strong></td></tr>"
    })

    var comprasRows = ""
    d.compras.forEach(function(c) {
        var hora = extraerHoraCorte(c.fecha)
        comprasRows += "<tr><td>#" + c.id + "</td><td>" + hora + "</td><td>" + (c.proveedor || "—") + '</td><td style="text-align:right"><strong>$' + parseFloat(c.total).toFixed(2) + "</strong></td></tr>"
    })

    var seccionVentasMetodo  = d.por_metodo.length > 0 ? '<table><tr><th>Método</th><th>Ventas</th><th>Total</th></tr>' + metodosRows + "</table>" : '<p class="empty">Sin ventas</p>'
    var seccionVentasDetalle = d.ventas.length > 0 ? '<table><tr><th>Hora</th><th>Productos</th><th>Método</th><th>Total</th></tr>' + ventasRows + "</table>" : '<p class="empty">Sin ventas</p>'
    var seccionCompras       = d.compras.length > 0 ? '<table><tr><th>ID</th><th>Hora</th><th>Proveedor</th><th>Total</th></tr>' + comprasRows + "</table>" : '<p class="empty">Sin compras</p>'

    var css = "* { margin:0; padding:0; box-sizing:border-box; } body { font-family: " + (esTicket ? "monospace" : "Arial,sans-serif") + "; font-size:" + fontSize + "; width:" + ancho + "; padding:12px; color:#111; } .cabecera { text-align:center; border-bottom:2px solid #FF8500; padding-bottom:10px; margin-bottom:12px; } .cabecera h1 { font-size:" + (esTicket ? "14px" : "22px") + "; color:#FF8500; } .cabecera p { font-size:11px; color:#555; margin-top:3px; } .seccion { margin-bottom:14px; } .seccion-titulo { font-weight:bold; text-transform:uppercase; border-bottom:1px solid #eee; padding-bottom:4px; margin-bottom:8px; color:#FF8500; font-size:12px; } table { width:100%; border-collapse:collapse; } th { text-align:left; font-size:11px; padding:4px 6px; background:#f5f5f5; border-bottom:1px solid #ddd; } td { padding:4px 6px; font-size:11px; border-bottom:1px solid #f0f0f0; } .resumen-box { border:2px solid #FF8500; border-radius:8px; padding:10px; margin:12px 0; } .resumen-fila { display:flex; justify-content:space-between; padding:3px 0; font-size:13px; } .balance { font-size:16px; font-weight:bold; border-top:2px solid #ddd; margin-top:6px; padding-top:6px; color:" + balanceColor + "; } .footer { text-align:center; margin-top:14px; padding-top:10px; border-top:1px solid #eee; font-size:11px; color:#888; } .empty { color:#aaa; font-style:italic; padding:4px; font-size:11px; } @media print { @page { size:" + (esTicket ? "80mm auto" : "A4") + "; margin:" + (esTicket ? "0" : "15mm") + "; } }"

    // Fechas para mostrar en el corte (en hora México)
    var dInicio = new Date(d.fecha_inicio.replace(" ", "T") + "Z")
    var dFin    = new Date(d.fecha_fin.replace(" ", "T") + "Z")
    var fechaInicioStr = dInicio.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" })
    var fechaFinStr    = dFin.toLocaleDateString("es-MX",    { timeZone: "America/Mexico_City" })

    return "<!DOCTYPE html><html><head><meta charset='UTF-8'><style>" + css + "</style></head><body>" +
        "<div class='cabecera'><h1>" + empresa + "</h1><p>CORTE DE CAJA</p><p>Del " + fechaInicioStr + " al " + fechaFinStr + "</p><p>Impreso: " + fechaImpresion + "</p><p>Usuario: " + USUARIO_NOMBRE + "</p></div>" +
        "<div class='resumen-box'>" +
        "<div class='resumen-fila'><span>Total ventas (" + d.resumen.num_ventas + ")</span><span style='color:#27ae60'>+$" + d.resumen.total_ventas.toFixed(2) + "</span></div>" +
        "<div class='resumen-fila'><span>Total compras (" + d.resumen.num_compras + ")</span><span style='color:#e74c3c'>-$" + d.resumen.total_compras.toFixed(2) + "</span></div>" +
        "<div class='resumen-fila balance'><span>BALANCE</span><span>" + (d.resumen.balance >= 0 ? "+" : "") + "$" + d.resumen.balance.toFixed(2) + "</span></div></div>" +
        "<div class='seccion'><div class='seccion-titulo'>Ventas por método de pago</div>" + seccionVentasMetodo + "</div>" +
        "<div class='seccion'><div class='seccion-titulo'>Detalle de ventas</div>" + seccionVentasDetalle + "</div>" +
        "<div class='seccion'><div class='seccion-titulo'>Compras realizadas</div>" + seccionCompras + "</div>" +
        "<div class='footer'><p>MyControl ERP — " + fechaImpresion + "</p><p>Comprobante interno</p></div></body></html>"
}

// ── INIT ──────────────────────────────────────────────────────
cargarReportes()