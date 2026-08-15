var configActual     = null
var productosLista   = []
var seleccionados    = new Set()

var ITEMS_CONFIG_PAG = 12
var paginaConfig     = 1
var productosFiltradosConfig = []




// ── INIT ──────────────────────────────────────────────────────
async function init() {
    // Solo admin puede configurar la tienda
    if (!ES_ADMIN) {
        window.location.replace("dashboard.html")
        return
    }

    mostrarLoading("Cargando configuración...")
    try {
        await Promise.all([cargarConfig(), cargarProductos()])
    } finally {
        ocultarLoading()
    }
}

// ── CARGAR CONFIGURACIÓN EXISTENTE ────────────────────────────
async function cargarConfig() {
    try {
        const res = await fetch(API + "/tienda/config?empresa_id=" + EMPRESA_ID)
        if (res.status === 404) {
            // Primera vez, no hay config todavía
            return
        }
        const data = await res.json()
        if (!data || data.error) return

        configActual = data

        // Llenar formulario
        document.getElementById("tiendaActiva").checked  = data.activa
        document.getElementById("cfgSlug").value         = data.slug        || ""
        document.getElementById("cfgColor").value        = data.color_primario || "#FF8500"
        document.getElementById("cfgDescripcion").value  = data.descripcion  || ""
        document.getElementById("cfgWhatsapp").value     = data.whatsapp     || ""
        document.getElementById("cfgInstagram").value    = data.instagram    || ""

        actualizarToggle(data.activa, data.slug)

    } catch (err) {
        console.error("Error cargando config:", err)
    }
}

// ── CARGAR PRODUCTOS ──────────────────────────────────────────
async function cargarProductos() {
    try {
        const res  = await fetch(API + "/productos?empresa_id=" + EMPRESA_ID)
        productosLista = await res.json()

        // Marcar los que ya están en tienda
        productosLista.forEach(function(p) {
            if (p.en_tienda) seleccionados.add(p.id)
        })

        renderProductos()
    } catch (err) {
        console.error("Error cargando productos:", err)
    }
}

// ── RENDER PRODUCTOS ──────────────────────────────────────────
function renderProductos() {
    productosFiltradosConfig = productosLista
    paginaConfig = 1
    renderPaginaConfig()
}

function renderPaginaConfig() {
    var lista  = productosFiltradosConfig
    var total  = Math.ceil(lista.length / ITEMS_CONFIG_PAG)
    var inicio = (paginaConfig - 1) * ITEMS_CONFIG_PAG
    var pagina = lista.slice(inicio, inicio + ITEMS_CONFIG_PAG)
    var grid   = document.getElementById("productosGrid")
    grid.innerHTML = ""

    if (lista.length === 0) {
        grid.innerHTML =
            '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#ccc">' +
            '<p style="font-size:28px">📦</p>' +
            '<p style="margin-top:8px;font-size:13px">No tienes productos en el inventario</p>' +
            '</div>'
        return
    }

    pagina.forEach(function(p) {
        var esSel  = seleccionados.has(p.id)
        var imgSrc = p.imagen_url ? p.imagen_url : "assets/img/no-image.png"

        var card = document.createElement("div")
        card.className = "prod-card-check" + (esSel ? " seleccionado" : "")
        card.onclick   = function() { toggleProducto(p.id, card) }

        card.innerHTML =
            '<div class="check-badge">' + (esSel ? "✓" : "") + '</div>' +
            '<img src="' + imgSrc + '" onerror="this.src=\'assets/img/no-image.png\'">' +
            '<div class="prod-nombre">' + p.nombre + '</div>' +
            '<div class="prod-precio">$' + parseFloat(p.precio).toFixed(2) + '</div>' +
            '<div class="prod-stock">' + (p.stock > 0 ? "📦 " + p.stock + " en stock" : "⚠️ Sin stock") + '</div>'

        grid.appendChild(card)
    })

    // Paginación
    var contPag = document.getElementById("productosConfigPag")
    if (!contPag) return
    contPag.innerHTML = ""
    if (total <= 1) return

    var btnPrev = document.createElement("button")
    btnPrev.className   = "pag-btn"
    btnPrev.textContent = "‹"
    btnPrev.disabled    = paginaConfig === 1
    btnPrev.onclick     = function() { paginaConfig--; renderPaginaConfig() }
    contPag.appendChild(btnPrev)

    for (var i = 1; i <= total; i++) {
        var btn = document.createElement("button")
        btn.className   = "pag-btn" + (i === paginaConfig ? " active" : "")
        btn.textContent = i
        btn.onclick     = (function(num) { return function() { paginaConfig = num; renderPaginaConfig() } })(i)
        contPag.appendChild(btn)
    }

    var btnNext = document.createElement("button")
    btnNext.className   = "pag-btn"
    btnNext.textContent = "›"
    btnNext.disabled    = paginaConfig === total
    btnNext.onclick     = function() { paginaConfig++; renderPaginaConfig() }
    contPag.appendChild(btnNext)

    var info = document.createElement("span")
    info.className   = "pag-info"
    info.textContent = lista.length + " productos"
    contPag.appendChild(info)
}

// ── TOGGLE PRODUCTO ───────────────────────────────────────────
function toggleProducto(id, card) {
    if (seleccionados.has(id)) {
        seleccionados.delete(id)
        card.classList.remove("seleccionado")
        card.querySelector(".check-badge").textContent = ""
    } else {
        seleccionados.add(id)
        card.classList.add("seleccionado")
        card.querySelector(".check-badge").textContent = "✓"
    }
}

// ── ACTUALIZAR TOGGLE DE ESTADO ───────────────────────────────
function actualizarToggle(activa, slug) {
    var label  = document.getElementById("toggleLabel")
    var urlBox = document.getElementById("urlBox")

    if (activa && slug) {
        label.textContent     = "✅ Tienda activa"
        label.style.color     = "#27ae60"
        urlBox.style.display  = "block"
        var base = window.location.origin + window.location.pathname.replace("tienda-config.html", "")
        document.getElementById("urlTienda").textContent = base + "tienda.html?s=" + slug
    } else {
        label.textContent     = "Tienda desactivada"
        label.style.color     = "#333"
        urlBox.style.display  = "none"
    }
}

// Listener del toggle
document.getElementById("tiendaActiva").addEventListener("change", function() {
    var slug = document.getElementById("cfgSlug").value.trim()
    actualizarToggle(this.checked, slug)
})

// ── GUARDAR CONFIGURACIÓN ─────────────────────────────────────
async function guardarConfig() {
    var slug = document.getElementById("cfgSlug").value.trim()
    if (!slug) {
        alert("El slug es obligatorio — es el identificador único de tu tienda")
        return
    }
    if (slug.length < 3) {
        alert("El slug debe tener al menos 3 caracteres")
        return
    }

    var body = {
        empresa_id:      EMPRESA_ID,
        activa:          document.getElementById("tiendaActiva").checked,
        slug:            slug,
        color_primario:  document.getElementById("cfgColor").value,
        descripcion:     document.getElementById("cfgDescripcion").value.trim(),
        whatsapp:        document.getElementById("cfgWhatsapp").value.trim(),
        instagram:       document.getElementById("cfgInstagram").value.trim(),
        productos_ids:   Array.from(seleccionados)
    }

    mostrarLoading("Guardando...")
    try {
        const res  = await fetch(API + "/tienda/config", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(body)
        })
        const data = await res.json()
        if (data.error) { alert(data.error); return }

        configActual = data
        actualizarToggle(data.activa, data.slug)
        alert("✅ Tienda guardada correctamente")

    } catch (err) {
        alert("Error al guardar")
        console.error(err)
    } finally {
        ocultarLoading()
    }
}

// ── UTILIDADES URL ────────────────────────────────────────────
function copiarURL() {
    var url = document.getElementById("urlTienda").textContent
    navigator.clipboard.writeText(url).then(function() {
        alert("✅ Enlace copiado al portapapeles")
    })
}

function verTienda() {
    var slug = document.getElementById("cfgSlug").value.trim()
    if (!slug) { alert("Guarda la configuración primero"); return }
    var base = window.location.origin + window.location.pathname.replace("tienda-config.html", "")
    window.open(base + "tienda.html?s=" + slug, "_blank")
}

function compartirWhatsApp() {
    var url = document.getElementById("urlTienda").textContent
    if (!url || url === "—") { alert("Guarda y activa tu tienda primero"); return }
    var nombre = SESSION ? SESSION.nombre_empresa || "Mi Tienda" : "Mi Tienda"
    var texto  = "¡Hola! Te comparto el catálogo de " + nombre + " 🛍️ Puedes ver todos mis productos y hacer pedidos aquí: " + url
    window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank")
}

// ── ARRANQUE ──────────────────────────────────────────────────
init()