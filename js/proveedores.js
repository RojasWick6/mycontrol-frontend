var proveedoresTodos = []
var statsCompras     = {}

async function cargarTodo() {
    mostrarLoading("Cargando proveedores...")
    try {
        const [resProv, resCompras] = await Promise.all([
            fetch(API + "/proveedores?empresa_id=" + EMPRESA_ID),
            fetch(API + "/reportes/compras?empresa_id=" + EMPRESA_ID)
        ])
        proveedoresTodos = await resProv.json()
        var historial    = await resCompras.json()

        statsCompras = {}
        var totalInvertido = 0
        historial.forEach(function(c) {
            var p = c.proveedor || "Sin proveedor"
            if (!statsCompras[p]) statsCompras[p] = { num: 0, total: 0 }
            statsCompras[p].num++
            statsCompras[p].total += parseFloat(c.total)
            totalInvertido += parseFloat(c.total)
        })

        document.getElementById("statTotal").textContent     = proveedoresTodos.length
        document.getElementById("statInvertido").textContent = "$" + totalInvertido.toFixed(2)
        document.getElementById("statCompras").textContent   = historial.length

        renderProveedores(proveedoresTodos)

        if (ES_ADMIN) {
            var btn1 = document.getElementById("btnAgregar")
            var btn2 = document.getElementById("btnAgregarWrap")
            if (btn1) btn1.style.display = "block"
            if (btn2) btn2.style.display = "block"
        }
    } catch (err) {
        console.error("Error:", err)
    } finally {
        ocultarLoading()
    }
}

function filtrarProveedores() {
    var texto    = document.getElementById("buscadorProv").value.toLowerCase()
    var filtrados = proveedoresTodos.filter(function(p) {
        return p.nombre.toLowerCase().includes(texto) ||
               (p.telefono    && p.telefono.includes(texto)) ||
               (p.descripcion && p.descripcion.toLowerCase().includes(texto))
    })
    renderProveedores(filtrados)
}

function renderProveedores(lista) {
    var grid = document.getElementById("proveedoresGrid")
    grid.innerHTML = ""

    if (lista.length === 0) {
        grid.innerHTML =
            '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#ccc;background:white;border-radius:16px">' +
            '<p style="font-size:40px">👥</p>' +
            '<p style="margin-top:10px;font-size:14px">No hay proveedores registrados</p>' +
            '</div>'
        return
    }

    var colores = ["#FF8500","#27ae60","#1976d2","#9c27b0","#e91e63","#00bcd4","#ff5722","#607d8b"]

    lista.forEach(function(p) {
        var stats  = statsCompras[p.nombre] || { num: 0, total: 0 }
        var inicial = p.nombre.charAt(0).toUpperCase()
        var color   = colores[p.id % colores.length]

        var card = document.createElement("div")
        card.style.cssText = "background:white;border-radius:16px;padding:20px;box-shadow:0 1px 6px rgba(0,0,0,0.07);transition:transform 0.2s,box-shadow 0.2s"
        card.onmouseenter = function() { this.style.transform = "translateY(-2px)"; this.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)" }
        card.onmouseleave = function() { this.style.transform = "none"; this.style.boxShadow = "0 1px 6px rgba(0,0,0,0.07)" }

        // Contacto dinámico
        var contactoHTML = ""
        if (p.telefono)    contactoHTML += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span>📞</span><span style="font-size:13px;color:#555">' + p.telefono + '</span></div>'
        if (p.telefono2)   contactoHTML += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span>📱</span><span style="font-size:13px;color:#555">' + p.telefono2 + '</span></div>'
        if (p.email)       contactoHTML += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span>✉️</span><span style="font-size:13px;color:#555">' + p.email + '</span></div>'
        if (p.direccion)   contactoHTML += '<div style="display:flex;align-items:center;gap:8px"><span>🗺️</span><span style="font-size:13px;color:#555">' + p.direccion + '</span></div>'
        if (!contactoHTML) contactoHTML = '<p style="font-size:12px;color:#ccc;text-align:center">Sin información de contacto</p>'

        card.innerHTML =
            '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">' +
                '<div style="width:52px;height:52px;border-radius:14px;background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:white;flex-shrink:0">' + inicial + '</div>' +
                '<div style="flex:1;min-width:0">' +
                    '<p style="font-weight:800;font-size:16px;color:#333;margin-bottom:2px">' + p.nombre + '</p>' +
                    (p.descripcion
                        ? '<p style="font-size:12px;color:#FF8500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + p.descripcion + '">📍 ' + p.descripcion + '</p>'
                        : '<p style="font-size:12px;color:#ccc">Sin descripción</p>') +
                '</div>' +
            '</div>' +
            '<div style="background:#fafafa;border-radius:10px;padding:12px;margin-bottom:14px">' + contactoHTML + '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">' +
                '<div style="text-align:center;background:' + color + '18;border-radius:10px;padding:10px">' +
                    '<p style="font-size:18px;font-weight:800;color:' + color + '">' + stats.num + '</p>' +
                    '<p style="font-size:11px;color:#888">compras</p>' +
                '</div>' +
                '<div style="text-align:center;background:#27ae6018;border-radius:10px;padding:10px">' +
                    '<p style="font-size:18px;font-weight:800;color:#27ae60">$' + stats.total.toFixed(0) + '</p>' +
                    '<p style="font-size:11px;color:#888">invertido</p>' +
                '</div>' +
            '</div>' +
            (ES_ADMIN
                ? '<div style="display:flex;gap:8px">' +
                  // ← CAMBIO CLAVE: pasamos solo el ID, no el objeto completo
                  '<button onclick="abrirEditar(' + p.id + ')" style="flex:1;padding:9px;background:#f5f5f5;color:#555;border:none;border-radius:10px;font-size:13px;cursor:pointer;font-weight:600">✏️ Editar</button>' +
                  '<button onclick="eliminarProveedor(' + p.id + ')" style="padding:9px 14px;background:#fff0f0;color:#e74c3c;border:1px solid #ffcdd2;border-radius:10px;font-size:13px;cursor:pointer">🗑️</button>' +
                  '</div>'
                : '')

        grid.appendChild(card)
    })
}

// ── MODAL CREAR ───────────────────────────────────────────────
function abrirModalCrear() {
    document.getElementById("modalProvTitle").textContent = "Nuevo proveedor"
    document.getElementById("provId").value          = ""
    document.getElementById("provNombre").value      = ""
    document.getElementById("provDescripcion").value = ""
    document.getElementById("provDireccion").value   = ""
    document.getElementById("provTelefono").value    = ""
    document.getElementById("provTelefono2").value   = ""
    document.getElementById("provEmail").value       = ""
    document.getElementById("modalProveedor").classList.add("active")
}

// ── MODAL EDITAR — busca por ID en el array, sin problemas de JSON ────
function abrirEditar(id) {
    var p = proveedoresTodos.find(function(x) { return x.id === id })
    if (!p) return

    document.getElementById("modalProvTitle").textContent = "Editar proveedor"
    document.getElementById("provId").value          = p.id
    document.getElementById("provNombre").value      = p.nombre          || ""
    document.getElementById("provDescripcion").value = p.descripcion     || ""
    document.getElementById("provDireccion").value   = p.direccion       || ""
    document.getElementById("provTelefono").value    = p.telefono        || ""
    document.getElementById("provTelefono2").value   = p.telefono2       || ""
    document.getElementById("provEmail").value       = p.email           || ""
    document.getElementById("modalProveedor").classList.add("active")
}

function cerrarModal() {
    document.getElementById("modalProveedor").classList.remove("active")
}

async function guardarProveedor() {
    var id = document.getElementById("provId").value
    var nombre = document.getElementById("provNombre").value.trim()
    if (!nombre) { alert("El nombre es obligatorio"); return }

    var body = {
        empresa_id:  EMPRESA_ID,
        nombre:      nombre,
        descripcion: document.getElementById("provDescripcion").value.trim() || null,
        direccion:   document.getElementById("provDireccion").value.trim()   || null,
        telefono:    document.getElementById("provTelefono").value.trim()    || null,
        telefono2:   document.getElementById("provTelefono2").value.trim()   || null,
        email:       document.getElementById("provEmail").value.trim()       || null
    }

    try {
        const res  = await fetch(
            id ? API + "/proveedores/" + id : API + "/proveedores",
            { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        )
        const data = await res.json()
        if (data.error) { alert(data.error); return }
        cerrarModal()
        await cargarTodo()
        alert("✅ Proveedor " + (id ? "actualizado" : "creado"))
    } catch (err) {
        alert("Error al guardar proveedor")
        console.error(err)
    }
}

async function eliminarProveedor(id) {
    if (!confirm("¿Eliminar este proveedor?")) return
    try {
        await fetch(API + "/proveedores/" + id, { method: "DELETE" })
        await cargarTodo()
    } catch (err) { alert("Error al eliminar") }
}

cargarTodo()