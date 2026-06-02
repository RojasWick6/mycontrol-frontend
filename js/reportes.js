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

        const ahora  = new Date()
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
            document.getElementById("mejorDia").textContent      = fechaFormato
            document.getElementById("mejorDiaMonto").textContent  = "$" + mejorMonto.toFixed(2)
        }

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

// ── HISTORIAL COMPRAS — diseño de cards ───────────────────────
async function cargarCompras() {
    try {
        const res   = await fetch(API + "/reportes/compras?empresa_id=" + EMPRESA_ID)
        const datos = await res.json()
        const cont  = document.getElementById("comprasListCards")
        cont.innerHTML = ""

        // Total del mes
        const ahora  = new Date()
        const mesStr = ahora.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).substring(0, 7)
        const totalMes = datos
            .filter(function(c) {
                const f = new Date(c.fecha.replace(" ", "T") + "Z")
                return f.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).startsWith(mesStr)
            })
            .reduce(function(acc, c) { return acc + parseFloat(c.total) }, 0)

        document.getElementById("comprasMes").textContent     = "$" + totalMes.toFixed(2)
        document.getElementById("comprasMesLabel").textContent = "$" + totalMes.toFixed(2)

        if (datos.length === 0) {
            cont.innerHTML =
                '<div style="text-align:center;padding:40px;color:#aaa;background:white;border-radius:12px">' +
                '<p style="font-size:32px">🛒</p>' +
                '<p style="margin-top:8px">Sin compras registradas</p>' +
                '</div>'
            return
        }

        datos.forEach(function(c) {
            const fecha = new Date(c.fecha.replace(" ", "T") + "Z")
            const fechaStr = fecha.toLocaleDateString("es-MX", {
                timeZone: "America/Mexico_City",
                weekday: "short", day: "numeric", month: "short", year: "numeric"
            })
            const horaStr = fecha.toLocaleTimeString("es-MX", {
                timeZone: "America/Mexico_City",
                hour: "2-digit", minute: "2-digit"
            })

            const esMes = fecha.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" }).startsWith(mesStr)

            const card = document.createElement("div")
            card.style.cssText = [
                "background: white",
                "border-radius: 12px",
                "padding: 14px 16px",
                "margin-bottom: 10px",
                "display: flex",
                "align-items: center",
                "gap: 14px",
                "box-shadow: 0 1px 4px rgba(0,0,0,0.07)",
                "border-left: 4px solid " + (esMes ? "#FF8500" : "#ddd")
            ].join(";")

            card.innerHTML =
                // Icono
                '<div style="width:40px;height:40px;border-radius:10px;background:' + (esMes ? "#fff3e0" : "#f5f5f5") + ';display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🛒</div>' +

                // Info principal
                '<div style="flex:1;min-width:0">' +
                    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
                        '<span style="font-weight:700;color:#333;font-size:14px">' + (c.proveedor || "Sin proveedor") + '</span>' +
                        '<span style="background:#f0f0f0;color:#888;font-size:11px;padding:2px 8px;border-radius:20px">#' + c.id + '</span>' +
                    '</div>' +
                    '<div style="display:flex;align-items:center;gap:12px;margin-top:4px;flex-wrap:wrap">' +
                        '<span style="color:#888;font-size:12px">🕐 ' + horaStr + '</span>' +
                        '<span style="color:#aaa;font-size:11px">•</span>' +
                        '<span style="color:#888;font-size:12px">📅 ' + fechaStr + '</span>' +
                        '<span style="color:#aaa;font-size:11px">•</span>' +
                        '<span style="color:#888;font-size:12px">📦 ' + c.num_productos + ' producto' + (c.num_productos !== 1 ? 's' : '') + '</span>' +
                    '</div>' +
                '</div>' +

                // Monto
                '<div style="text-align:right;flex-shrink:0">' +
                    '<p style="font-size:16px;font-weight:800;color:' + (esMes ? "#FF8500" : "#555") + '">$' + parseFloat(c.total).toFixed(2) + '</p>' +
                '</div>'

            cont.appendChild(card)
        })
    } catch (err) {
        console.error("Error historial compras:", err)
    }
}

// ── INIT ──────────────────────────────────────────────────────
cargarReportes()