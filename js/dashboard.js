const toggle  = document.getElementById("menuToggle")
const sidebar = document.getElementById("sidebar")
const overlay = document.getElementById("sidebarOverlay")

function abrirSidebar() {
    sidebar.classList.add("active")
    if (overlay) overlay.classList.add("active")
}

function cerrarSidebar() {
    sidebar.classList.remove("active")
    if (overlay) overlay.classList.remove("active")
}

if (toggle) toggle.addEventListener("click", abrirSidebar)
if (overlay) overlay.addEventListener("click", cerrarSidebar)

const menuItems = document.querySelectorAll(".menu-item")
menuItems.forEach(item => {
    item.addEventListener("click", () => {
        if (window.innerWidth < 900) cerrarSidebar()
    })
})

// Mostrar usuario en topbar
document.addEventListener("DOMContentLoaded", () => {
    const topbar = document.querySelector(".topbar")
    if (topbar && USUARIO_NOMBRE) {
        const badge = document.createElement("div")
        badge.style.cssText = `
            margin-left:auto;
            display:flex;
            align-items:center;
            gap:10px;
            font-size:14px;
            color:#555;
            flex-shrink:0;
        `
        badge.innerHTML = `
            <span style="font-weight:500">👤 ${USUARIO_NOMBRE}</span>
            <button onclick="cerrarSesion()" style="
                background:#e74c3c;
                color:white;
                border:none;
                padding:6px 14px;
                border-radius:8px;
                font-size:13px;
                cursor:pointer;
                font-weight:500;
            ">Salir</button>
        `
        topbar.appendChild(badge)
    }
})

// ── TIEMPO TRANSCURRIDO ───────────────────────────────────────
function tiempoTranscurrido(fechaStr) {
    const fecha = new Date(fechaStr.replace(" ", "T") + "Z")
    const ahora = new Date()
    const diff  = Math.floor((ahora - fecha) / 1000)
    if (diff < 60)    return "hace unos segundos"
    if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
    return `hace ${Math.floor(diff / 86400)} día(s)`
}

// ── INVENTARIO ────────────────────────────────────────────────
async function cargarInventario() {
    try {
        const res       = await fetch(`${API}/productos?empresa_id=${EMPRESA_ID}`)
        const productos = await res.json()
        document.getElementById("productosTotal").textContent  = productos.length
        const totalStock = productos.reduce((acc, p) => acc + p.stock, 0)
        document.getElementById("inventarioTotal").textContent = totalStock
    } catch (err) {
        console.error("Error inventario:", err)
    }
}

// ── VENTAS DEL DÍA ────────────────────────────────────────────
async function cargarVentasHoy() {
    try {
        const res       = await fetch(`${API}/ventas?empresa_id=${EMPRESA_ID}`)
        const ventas    = await res.json()
        const hoy       = new Date().toLocaleDateString("sv-SE")
        const ventasHoy = ventas.filter(v => v.fecha.startsWith(hoy))
        const total     = ventasHoy.reduce((acc, v) => acc + Number(v.total), 0)
        document.getElementById("ventasHoy").textContent = `$${total.toFixed(2)}`
    } catch (err) {
        console.error("Error ventas hoy:", err)
    }
}

// ── GRÁFICA SEMANA ────────────────────────────────────────────
async function cargarGraficaSemana() {
    try {
        const res   = await fetch(`${API}/ventas/semana?empresa_id=${EMPRESA_ID}`)
        const datos = await res.json()

        const dias = []
        for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            dias.push(d.toISOString().split("T")[0])
        }

        const labels  = dias.map(d =>
            new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric" })
        )
        const totales = dias.map(d => {
            const found = datos.find(r => r.dia.startsWith(d))
            return found ? parseFloat(found.total) : 0
        })

        const ctx = document.getElementById("graficaSemana")
        if (!ctx) return

        new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Ventas ($)",
                    data: totales,
                    borderColor: "#FF8500",
                    backgroundColor: "rgba(255,133,0,0.1)",
                    borderWidth: 2.5,
                    pointBackgroundColor: "#FF8500",
                    pointRadius: 4,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
        console.error("Error gráfica semana:", err)
    }
}

// ── ACTIVIDAD RECIENTE ────────────────────────────────────────
async function cargarActividad() {
    try {
        const res        = await fetch(`${API}/actividad?empresa_id=${EMPRESA_ID}`)
        const actividad  = await res.json()
        const contenedor = document.getElementById("actividadReciente")
        if (!contenedor) return
        contenedor.innerHTML = ""

        if (actividad.length === 0) {
            contenedor.innerHTML = `<div class="activity-empty">Sin movimientos recientes</div>`
            return
        }

        actividad.forEach(item => {
            const el = document.createElement("div")

            if (item.tipo === "venta") {
                el.className = "act-item act-venta"
                el.innerHTML = `
                    <div class="act-icono">💰</div>
                    <div class="act-info">
                        <span class="act-titulo">Venta registrada</span>
                        <span class="act-desc">$${parseFloat(item.total).toFixed(2)} — ${item.metodo_pago || "efectivo"}</span>
                        <span class="act-tiempo">${tiempoTranscurrido(item.fecha)}</span>
                    </div>
                    <span class="act-badge badge-venta">VENTA</span>
                `
            } else if (item.tipo === "compra") {
                el.className = "act-item act-compra"
                el.innerHTML = `
                    <div class="act-icono">🧾</div>
                    <div class="act-info">
                        <span class="act-titulo">Compra registrada</span>
                        <span class="act-desc">$${parseFloat(item.total).toFixed(2)} — ${item.proveedor || "Sin proveedor"}</span>
                        <span class="act-tiempo">${tiempoTranscurrido(item.fecha)}</span>
                    </div>
                    <span class="act-badge badge-compra">COMPRA</span>
                `
            } else if (item.tipo === "stock") {
                const urgente = item.stock === 0
                el.className = `act-item act-stock ${urgente ? "act-urgente" : ""}`
                el.innerHTML = `
                    <div class="act-icono">${urgente ? "🚨" : "⚠️"}</div>
                    <div class="act-info">
                        <span class="act-titulo">Stock bajo</span>
                        <span class="act-desc">${item.nombre} — quedan ${item.stock} uds</span>
                        <span class="act-tiempo">Alerta activa</span>
                    </div>
                    <span class="act-badge ${urgente ? "badge-urgente" : "badge-stock"}">
                        ${urgente ? "URGENTE" : "BAJO"}
                    </span>
                `
            }

            contenedor.appendChild(el)
        })

    } catch (err) {
        console.error("Error actividad:", err)
    }
}

// ── INIT ──────────────────────────────────────────────────────
cargarInventario()
cargarVentasHoy()
cargarGraficaSemana()
cargarActividad()