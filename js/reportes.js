let graficaVentas = null

async function cargarReportes() {
    await Promise.all([
        cargarVentasPorDia(),
        cargarMasVendidos(),
        cargarStockBajo(),
        cargarCompras()
    ])
}

// ── VENTAS POR DÍA ────────────────────────────────────────────
async function cargarVentasPorDia() {
    try {
        const res   = await fetch(`${API}/reportes/ventas-por-dia?empresa_id=${EMPRESA_ID}`)
        const datos = await res.json()

        const labels  = datos.map(d =>
            new Date(d.dia).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
        )
        const totales = datos.map(d => parseFloat(d.total))
        const totalMes = totales.reduce((acc, v) => acc + v, 0)
        document.getElementById("ventasMes").textContent = `$${totalMes.toFixed(2)}`

        const ctx = document.getElementById("graficaVentas").getContext("2d")
        if (graficaVentas) graficaVentas.destroy()

        graficaVentas = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Ventas ($)",
                    data: totales,
                    backgroundColor: "#FF8500",
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: val => `$${val}` }
                    }
                }
            }
        })
    } catch (err) {
        console.error("Error ventas por día:", err)
    }
}

// ── MÁS VENDIDOS ─────────────────────────────────────────────
async function cargarMasVendidos() {
    try {
        const res   = await fetch(`${API}/reportes/mas-vendidos?empresa_id=${EMPRESA_ID}`)
        const datos = await res.json()
        const cont  = document.getElementById("masVendidosList")
        cont.innerHTML = ""

        if (datos.length === 0) {
            cont.innerHTML = `<div class="lista-empty">Sin datos de ventas</div>`
            return
        }

        const max = parseFloat(datos[0].total_vendido)

        datos.forEach((p, i) => {
            const pct  = Math.round((parseFloat(p.total_vendido) / max) * 100)
            const item = document.createElement("div")
            item.className = "ranking-item"
            item.innerHTML = `
                <div class="ranking-pos">${i + 1}</div>
                <div class="ranking-info">
                    <div class="ranking-nombre">${p.nombre}</div>
                    <div class="ranking-barra">
                        <div class="ranking-barra-fill" style="width:${pct}%"></div>
                    </div>
                </div>
                <div class="ranking-datos">
                    <span class="ranking-uds">${p.total_vendido} uds</span>
                    <span class="ranking-monto">$${parseFloat(p.total_ingresos).toFixed(2)}</span>
                </div>
            `
            cont.appendChild(item)
        })
    } catch (err) {
        console.error("Error más vendidos:", err)
    }
}

// ── STOCK BAJO ────────────────────────────────────────────────
async function cargarStockBajo() {
    try {
        const res   = await fetch(`${API}/reportes/stock-bajo?empresa_id=${EMPRESA_ID}`)
        const datos = await res.json()
        const cont  = document.getElementById("stockBajoList")
        cont.innerHTML = ""

        document.getElementById("numStockBajo").textContent = datos.length
        const card = document.getElementById("cardStockBajo")
        card.classList.toggle("alerta-activa", datos.length > 0)

        if (datos.length === 0) {
            cont.innerHTML = `<div class="lista-empty">✅ Todo el stock está bien</div>`
            return
        }

        datos.forEach(p => {
            const urgente = p.stock === 0
            const item    = document.createElement("div")
            item.className = `stock-item ${urgente ? "stock-urgente" : "stock-bajo"}`
            item.innerHTML = `
                <div class="stock-icono">${urgente ? "🚨" : "⚠️"}</div>
                <div class="stock-info">
                    <span class="stock-nombre">${p.nombre}</span>
                    <span class="stock-codigo">Cód: ${p.codigo || "—"}</span>
                </div>
                <div class="stock-derecha">
                    <span class="stock-cant ${urgente ? "cant-cero" : "cant-bajo"}">${p.stock} uds</span>
                    <span class="stock-precio">$${parseFloat(p.precio).toFixed(2)}</span>
                </div>
            `
            cont.appendChild(item)
        })
    } catch (err) {
        console.error("Error stock bajo:", err)
    }
}

// ── HISTORIAL COMPRAS ─────────────────────────────────────────
async function cargarCompras() {
    try {
        const res   = await fetch(`${API}/reportes/compras?empresa_id=${EMPRESA_ID}`)
        const datos = await res.json()
        const tbody = document.getElementById("comprasList")
        tbody.innerHTML = ""

        const hoy      = new Date()
        const totalMes = datos
            .filter(c => new Date(c.fecha).getMonth() === hoy.getMonth())
            .reduce((acc, c) => acc + parseFloat(c.total), 0)
        document.getElementById("comprasMes").textContent = `$${totalMes.toFixed(2)}`

        if (datos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">Sin compras registradas</td></tr>`
            return
        }

        datos.forEach(c => {
            const fecha = new Date(c.fecha).toLocaleDateString("es-MX")
            const fila  = document.createElement("tr")
            fila.innerHTML = `
                <td>#${c.id}</td>
                <td>${fecha}</td>
                <td>${c.proveedor || "—"}</td>
                <td>${c.num_productos}</td>
                <td><strong>$${parseFloat(c.total).toFixed(2)}</strong></td>
            `
            tbody.appendChild(fila)
        })
    } catch (err) {
        console.error("Error historial compras:", err)
    }
}

// ── CORTE DE CAJA ─────────────────────────────────────────────

const modalCorte    = document.getElementById("modalCorte")
const btnCorte      = document.getElementById("btnCorte")
const btnCerrarCorte = document.getElementById("btnCerrarCorte")

function formatFecha(date) {
    return date.toLocaleDateString("sv-SE")
}

function setHoy() {
    const hoy = formatFecha(new Date())
    document.getElementById("fechaInicio").value = hoy
    document.getElementById("fechaFin").value    = hoy
}

function setAyer() {
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)
    const f = formatFecha(ayer)
    document.getElementById("fechaInicio").value = f
    document.getElementById("fechaFin").value    = f
}

function setSemana() {
    const hoy   = new Date()
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - hoy.getDay() + 1)
    document.getElementById("fechaInicio").value = formatFecha(lunes)
    document.getElementById("fechaFin").value    = formatFecha(hoy)
}

function setMes() {
    const hoy    = new Date()
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    document.getElementById("fechaInicio").value = formatFecha(inicio)
    document.getElementById("fechaFin").value    = formatFecha(hoy)
}

btnCorte.addEventListener("click", () => {
    setHoy()
    modalCorte.classList.add("active")
})

btnCerrarCorte.addEventListener("click", () => {
    modalCorte.classList.remove("active")
})

async function obtenerDatosCorte() {
    const fechaInicio = document.getElementById("fechaInicio").value
    const fechaFin    = document.getElementById("fechaFin").value

    if (!fechaInicio || !fechaFin) {
        alert("Selecciona las fechas")
        return null
    }

    const res  = await fetch(
        `${API}/corte-caja?empresa_id=${EMPRESA_ID}&fecha_inicio=${fechaInicio} 00:00:00&fecha_fin=${fechaFin} 23:59:59`
    )
    return await res.json()
}

// ── GENERAR PDF ───────────────────────────────────────────────
document.getElementById("btnGenerarPDF").addEventListener("click", async () => {
    const datos = await obtenerDatosCorte()
    if (!datos) return

    const ventana = window.open("", "_blank")
    ventana.document.write(generarHTMLCorte(datos, "pdf"))
    ventana.document.close()
    ventana.focus()
    setTimeout(() => ventana.print(), 500)
    modalCorte.classList.remove("active")
})

// ── GENERAR TICKET ────────────────────────────────────────────
document.getElementById("btnGenerarTicket").addEventListener("click", async () => {
    const datos = await obtenerDatosCorte()
    if (!datos) return

    const ventana = window.open("", "_blank")
    ventana.document.write(generarHTMLCorte(datos, "ticket"))
    ventana.document.close()
    ventana.focus()
    setTimeout(() => ventana.print(), 500)
    modalCorte.classList.remove("active")
})

// ── HTML DEL CORTE ────────────────────────────────────────────
function generarHTMLCorte(d, tipo) {
    const esTicket = tipo === "ticket"
    const ancho    = esTicket ? "80mm" : "210mm"
    const fontSize = esTicket ? "11px" : "13px"

    const fechaImpresion = new Date().toLocaleString("es-MX")
    const empresa        = d.empresa?.nombre_empresa || "Mi Empresa"

    let ventasRows = d.ventas.map(v => `
        <tr>
            <td>#${v.id}</td>
            <td>${new Date(v.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</td>
            <td>${v.metodo_pago || "efectivo"}</td>
            <td style="text-align:right"><strong>$${parseFloat(v.total).toFixed(2)}</strong></td>
        </tr>
    `).join("")

    let metodosRows = d.por_metodo.map(m => `
        <tr>
            <td>${m.metodo_pago || "efectivo"}</td>
            <td style="text-align:center">${m.num_ventas}</td>
            <td style="text-align:right"><strong>$${parseFloat(m.total).toFixed(2)}</strong></td>
        </tr>
    `).join("")

    let comprasRows = d.compras.map(c => `
        <tr>
            <td>#${c.id}</td>
            <td>${new Date(c.fecha).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</td>
            <td>${c.proveedor || "—"}</td>
            <td style="text-align:right"><strong>$${parseFloat(c.total).toFixed(2)}</strong></td>
        </tr>
    `).join("")

    const balanceColor = d.resumen.balance >= 0 ? "#27ae60" : "#e74c3c"

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Corte de Caja — ${empresa}</title>
<style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
        font-family: ${esTicket ? "'Courier New', monospace" : "Arial, sans-serif"};
        font-size: ${fontSize};
        width: ${ancho};
        max-width: ${ancho};
        padding: ${esTicket ? "8px" : "20px"};
        color: #111;
    }
    .cabecera {
        text-align: center;
        border-bottom: ${esTicket ? "1px dashed #000" : "2px solid #FF8500"};
        padding-bottom: 10px;
        margin-bottom: 12px;
    }
    .cabecera h1 {
        font-size: ${esTicket ? "14px" : "22px"};
        font-weight: bold;
        color: ${esTicket ? "#000" : "#FF8500"};
    }
    .cabecera p { font-size: ${esTicket ? "10px" : "12px"}; color: #555; margin-top:3px; }
    .seccion { margin-bottom: 14px; }
    .seccion-titulo {
        font-size: ${esTicket ? "11px" : "13px"};
        font-weight: bold;
        text-transform: uppercase;
        border-bottom: ${esTicket ? "1px dashed #000" : "1px solid #eee"};
        padding-bottom: 4px;
        margin-bottom: 8px;
        color: ${esTicket ? "#000" : "#FF8500"};
    }
    table { width: 100%; border-collapse: collapse; }
    th {
        text-align: left;
        font-size: ${esTicket ? "10px" : "12px"};
        padding: 4px 6px;
        background: ${esTicket ? "none" : "#f5f5f5"};
        border-bottom: ${esTicket ? "1px dashed #000" : "1px solid #ddd"};
    }
    td { padding: 4px 6px; font-size: ${esTicket ? "10px" : "12px"}; border-bottom: 1px solid #f0f0f0; }
    .resumen-box {
        background: ${esTicket ? "none" : "#f9f9f9"};
        border: ${esTicket ? "1px dashed #000" : "2px solid #FF8500"};
        border-radius: ${esTicket ? "0" : "8px"};
        padding: 10px;
        margin: 12px 0;
    }
    .resumen-fila {
        display: flex;
        justify-content: space-between;
        padding: 3px 0;
        font-size: ${esTicket ? "11px" : "13px"};
    }
    .resumen-fila.balance {
        font-size: ${esTicket ? "13px" : "16px"};
        font-weight: bold;
        border-top: ${esTicket ? "1px dashed #000" : "2px solid #ddd"};
        margin-top: 6px;
        padding-top: 6px;
        color: ${balanceColor};
    }
    .footer {
        text-align: center;
        margin-top: 14px;
        padding-top: 10px;
        border-top: ${esTicket ? "1px dashed #000" : "1px solid #eee"};
        font-size: ${esTicket ? "9px" : "11px"};
        color: #888;
    }
    .empty { color: #aaa; font-style: italic; padding: 4px 6px; font-size: 11px; }
    @media print {
        body { width: 100%; }
        @page { margin: ${esTicket ? "0" : "15mm"}; size: ${esTicket ? "80mm auto" : "A4"}; }
    }
</style>
</head>
<body>

<div class="cabecera">
    <h1>${empresa}</h1>
    <p>CORTE DE CAJA</p>
    <p>Del ${new Date(d.fecha_inicio).toLocaleDateString("es-MX")} al ${new Date(d.fecha_fin).toLocaleDateString("es-MX")}</p>
    <p>Impreso: ${fechaImpresion}</p>
    <p>Usuario: ${USUARIO_NOMBRE}</p>
</div>

<div class="resumen-box">
    <div class="resumen-fila">
        <span>Total ventas (${d.resumen.num_ventas})</span>
        <span style="color:#27ae60">+$${d.resumen.total_ventas.toFixed(2)}</span>
    </div>
    <div class="resumen-fila">
        <span>Total compras (${d.resumen.num_compras})</span>
        <span style="color:#e74c3c">-$${d.resumen.total_compras.toFixed(2)}</span>
    </div>
    <div class="resumen-fila balance">
        <span>BALANCE</span>
        <span>${d.resumen.balance >= 0 ? "+" : ""}$${d.resumen.balance.toFixed(2)}</span>
    </div>
</div>

<div class="seccion">
    <div class="seccion-titulo">Ventas por método de pago</div>
    ${d.por_metodo.length > 0 ? `
    <table>
        <tr><th>Método</th><th style="text-align:center">Ventas</th><th style="text-align:right">Total</th></tr>
        ${metodosRows}
    </table>` : `<p class="empty">Sin ventas en este período</p>`}
</div>

<div class="seccion">
    <div class="seccion-titulo">Detalle de ventas</div>
    ${d.ventas.length > 0 ? `
    <table>
        <tr><th>ID</th><th>Hora</th><th>Método</th><th style="text-align:right">Total</th></tr>
        ${ventasRows}
    </table>` : `<p class="empty">Sin ventas en este período</p>`}
</div>

<div class="seccion">
    <div class="seccion-titulo">Compras realizadas</div>
    ${d.compras.length > 0 ? `
    <table>
        <tr><th>ID</th><th>Hora</th><th>Proveedor</th><th style="text-align:right">Total</th></tr>
        ${comprasRows}
    </table>` : `<p class="empty">Sin compras en este período</p>`}
</div>

<div class="footer">
    <p>MyControl ERP — ${fechaImpresion}</p>
    <p>Este documento es un comprobante interno</p>
</div>

</body>
</html>`
}

// ── INIT ──────────────────────────────────────────────────────
cargarReportes()