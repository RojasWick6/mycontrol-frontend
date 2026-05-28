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
menuItems.forEach(function(item) {
    item.addEventListener("click", function() {
        if (window.innerWidth < 900) cerrarSidebar()
    })
})

// ── LOADING ───────────────────────────────────────────────────
function mostrarLoading(texto) {
    const overlay = document.getElementById("loadingOverlay")
    if (!overlay) return
    const txt = overlay.querySelector(".loading-texto")
    if (txt) txt.textContent = texto || "Cargando..."
    overlay.classList.add("active")

    // Timeout de seguridad — máximo 8 segundos
    if (window._loadingTimeout) clearTimeout(window._loadingTimeout)
    window._loadingTimeout = setTimeout(function() {
        ocultarLoading()
    }, 8000)
}

function ocultarLoading() {
    if (window._loadingTimeout) {
        clearTimeout(window._loadingTimeout)
        window._loadingTimeout = null
    }
    const overlay = document.getElementById("loadingOverlay")
    if (overlay) overlay.classList.remove("active")
}

// ── TOPBAR ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
    const topbar = document.querySelector(".topbar")

    if (topbar && USUARIO_NOMBRE) {
        const badge = document.createElement("div")
        badge.style.cssText = "margin-left:auto;display:flex;align-items:center;gap:10px;font-size:14px;color:#555;flex-shrink:0;"
        badge.innerHTML =
            '<span style="font-weight:500">👤 ' + USUARIO_NOMBRE + '</span>' +
            '<button onclick="cerrarSesion()" style="background:#e74c3c;color:white;border:none;padding:6px 14px;border-radius:8px;font-size:13px;cursor:pointer;font-weight:500">Salir</button>'
        topbar.appendChild(badge)

        const relojEl = document.createElement("div")
        relojEl.id    = "relojTopbar"
        relojEl.style.cssText = "margin-left:15px;font-size:13px;font-weight:600;color:#555;display:flex;flex-direction:column;align-items:flex-end;line-height:1.3;flex-shrink:0;"
        topbar.insertBefore(relojEl, topbar.lastElementChild)

        function actualizarReloj() {
            const ahora = new Date()
            const hora  = ahora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            const fecha = ahora.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })
            relojEl.innerHTML =
                '<span style="font-size:15px;color:#FF8500;font-weight:700">' + hora + '</span>' +
                '<span style="font-size:11px;color:#aaa;text-transform:capitalize">' + fecha + '</span>'
        }
        actualizarReloj()
        setInterval(actualizarReloj, 1000)

        if (ES_ADMIN) cargarSolicitudesPendientes()
    }

    // Ocultar menú según rol
    if (!ES_ADMIN) {
        var restringidos = ["compras.html", "proveedores.html", "reportes.html", "configuracion.html"]
        document.querySelectorAll(".menu-item").forEach(function(item) {
            restringidos.forEach(function(pagina) {
                if (item.href && item.href.includes(pagina)) item.style.display = "none"
            })
        })
    }
})

// ── SOLICITUDES PENDIENTES ────────────────────────────────────
async function cargarSolicitudesPendientes() {
    try {
        const res   = await fetch(API + "/solicitudes-cancelacion?empresa_id=" + EMPRESA_ID)
        const datos = await res.json()
        if (datos.length === 0) return

        const topbar = document.querySelector(".topbar")
        if (!topbar) return

        const alerta      = document.createElement("a")
        alerta.href       = "ventas-historial.html"
        alerta.style.cssText = "background:#e74c3c;color:white;padding:6px 12px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;display:flex;align-items:center;gap:6px;"
        alerta.innerHTML  = "🔔 " + datos.length + " solicitud" + (datos.length > 1 ? "es" : "")
        topbar.insertBefore(alerta, topbar.lastElementChild)
    } catch(err) {
        console.error("Error solicitudes:", err)
    }
}

// ── TIEMPO TRANSCURRIDO ───────────────────────────────────────
function tiempoTranscurrido(fechaStr) {
    const fecha = new Date(fechaStr.replace(" ", "T") + "Z")
    const ahora = new Date()
    const diff  = Math.floor((ahora - fecha) / 1000)
    if (diff < 60)    return "hace unos segundos"
    if (diff < 3600)  return "hace " + Math.floor(diff / 60) + " min"
    if (diff < 86400) return "hace " + Math.floor(diff / 3600) + " h"
    return "hace " + Math.floor(diff / 86400) + " día(s)"
}

// ── INVENTARIO ────────────────────────────────────────────────
async function cargarInventario() {
    const elProductos  = document.getElementById("productosTotal")
    const elInventario = document.getElementById("inventarioTotal")
    if (!elProductos || !elInventario) return // no estamos en dashboard

    mostrarLoading("Actualizando datos...")
    try {
        const res       = await fetch(API + "/productos/lista?empresa_id=" + EMPRESA_ID)
        const productos = await res.json()
        elProductos.textContent  = productos.length
        const totalStock = productos.reduce(function(acc, p) { return acc + p.stock }, 0)
        elInventario.textContent = totalStock
    } catch (err) {
        console.error("Error inventario:", err)
    } finally {
        ocultarLoading()
    }
}

// ── VENTAS DEL DÍA ────────────────────────────────────────────
async function cargarVentasHoy() {
    const el = document.getElementById("ventasHoy")
    if (!el) return

    try {
        const res    = await fetch(API + "/ventas?empresa_id=" + EMPRESA_ID)
        const ventas = await res.json()

        // Fecha de hoy en México (hora local del navegador)
        const ahora  = new Date()
        const hoyStr = ahora.toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })

        const ventasHoy = ventas.filter(function(v) {
            // Convertir fecha UTC del servidor a hora México
            const fechaMx = new Date(v.fecha.replace(" ", "T") + "Z")
                .toLocaleDateString("sv-SE", { timeZone: "America/Mexico_City" })
            return fechaMx === hoyStr
        })

        const total    = ventasHoy.reduce(function(acc, v) { return acc + Number(v.total) }, 0)
        el.textContent = "$" + total.toFixed(2)
    } catch (err) {
        console.error("Error ventas hoy:", err)
    }
}

// ── GRÁFICA SEMANA ────────────────────────────────────────────
async function cargarGraficaSemana() {
    const ctx = document.getElementById("graficaSemana")
    if (!ctx) return // no estamos en dashboard

    try {
        const res   = await fetch(API + "/ventas/semana?empresa_id=" + EMPRESA_ID)
        const datos = await res.json()

        const dias = []
        for (var i = 6; i >= 0; i--) {
            var d = new Date()
            d.setDate(d.getDate() - i)
            dias.push(d.toISOString().split("T")[0])
        }

        const labels  = dias.map(function(d) {
            return new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric" })
        })
        const totales = dias.map(function(d) {
            var found = datos.find(function(r) { return r.dia.startsWith(d) })
            return found ? parseFloat(found.total) : 0
        })

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
                        ticks: { callback: function(val) { return "$" + val } }
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
    const contenedor = document.getElementById("actividadReciente")
    if (!contenedor) return // no estamos en dashboard

    try {
        const res       = await fetch(API + "/actividad?empresa_id=" + EMPRESA_ID)
        const actividad = await res.json()
        contenedor.innerHTML = ""

        if (actividad.length === 0) {
            contenedor.innerHTML = '<div class="activity-empty">Sin movimientos recientes</div>'
            return
        }

        actividad.forEach(function(item) {
            const el = document.createElement("div")
            if (item.tipo === "venta") {
                el.className = "act-item act-venta"
                el.innerHTML =
                    '<div class="act-icono">💰</div>' +
                    '<div class="act-info">' +
                        '<span class="act-titulo">Venta registrada</span>' +
                        '<span class="act-desc">$' + parseFloat(item.total).toFixed(2) + ' — ' + (item.metodo_pago || "efectivo") + '</span>' +
                        '<span class="act-tiempo">' + tiempoTranscurrido(item.fecha) + '</span>' +
                    '</div>' +
                    '<span class="act-badge badge-venta">VENTA</span>'
            } else if (item.tipo === "compra") {
                el.className = "act-item act-compra"
                el.innerHTML =
                    '<div class="act-icono">🧾</div>' +
                    '<div class="act-info">' +
                        '<span class="act-titulo">Compra registrada</span>' +
                        '<span class="act-desc">$' + parseFloat(item.total).toFixed(2) + ' — ' + (item.proveedor || "Sin proveedor") + '</span>' +
                        '<span class="act-tiempo">' + tiempoTranscurrido(item.fecha) + '</span>' +
                    '</div>' +
                    '<span class="act-badge badge-compra">COMPRA</span>'
            } else if (item.tipo === "stock") {
                var urgente = item.stock === 0
                el.className = "act-item act-stock" + (urgente ? " act-urgente" : "")
                el.innerHTML =
                    '<div class="act-icono">' + (urgente ? "🚨" : "⚠️") + '</div>' +
                    '<div class="act-info">' +
                        '<span class="act-titulo">Stock bajo</span>' +
                        '<span class="act-desc">' + item.nombre + ' — quedan ' + item.stock + ' uds</span>' +
                        '<span class="act-tiempo">Alerta activa</span>' +
                    '</div>' +
                    '<span class="act-badge ' + (urgente ? "badge-urgente" : "badge-stock") + '">' + (urgente ? "URGENTE" : "BAJO") + '</span>'
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