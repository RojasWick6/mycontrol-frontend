var todasActividades   = []
var clientesLista      = []
var proveedoresLista   = []
var usuariosLista      = []
var pedidosLista       = []
var stockBajoLista     = []

var mesActual    = new Date().getMonth()
var añoActual    = new Date().getFullYear()
var diaSeleccionado = null
var filtroActual = "todas"

var TIPOS = {
    tarea:      { icon:"📌", bg:"#fff8e1", color:"#f59e0b" },
    cliente:    { icon:"👤", bg:"#e3f2fd", color:"#1976d2" },
    inventario: { icon:"📦", bg:"#e8f5e9", color:"#27ae60" },
    proveedor:  { icon:"🚚", bg:"#fce4ec", color:"#e91e63" },
    pedido:     { icon:"🛒", bg:"#f3e5f5", color:"#9c27b0" },
    finanzas:   { icon:"💰", bg:"#fff3e0", color:"#FF8500" },
    evento:     { icon:"📅", bg:"#e0f7fa", color:"#00acc1" }
}

var RECORDATORIO_LABELS = {
    0: "", 5:"⏰ 5 min antes", 15:"⏰ 15 min antes",
    30:"⏰ 30 min antes", 60:"⏰ 1 hora antes", 1440:"⏰ 1 día antes"
}

// ── INIT ──────────────────────────────────────────────────────
async function init() {
    mostrarLoading("Cargando agenda...")
    try {
        await Promise.all([
            cargarAgenda(),
            cargarClientes(),
            cargarProveedores(),
            cargarUsuarios(),
            cargarPedidosPendientes(),
            cargarStockBajo()
        ])
        renderCalendario()
        verificarRecordatorios()
    } catch (err) {
        console.error("Error init agenda:", err)
    } finally {
        ocultarLoading()
    }
}

// ── CARGAR DATOS ──────────────────────────────────────────────
async function cargarAgenda() {
    const res       = await fetch(API + "/agenda?empresa_id=" + EMPRESA_ID)
    todasActividades = await res.json()
    calcularStats()
    renderLista()
    renderSugerencias()
}

async function cargarClientes() {
    try {
        const res    = await fetch(API + "/clientes?empresa_id=" + EMPRESA_ID)
        clientesLista = await res.json()
        var sel = document.getElementById("actCliente")
        clientesLista.forEach(function(c) {
            var opt = document.createElement("option")
            opt.value = c.id; opt.textContent = c.nombre; sel.appendChild(opt)
        })
    } catch(e) {}
}

async function cargarProveedores() {
    try {
        const res      = await fetch(API + "/proveedores?empresa_id=" + EMPRESA_ID)
        proveedoresLista = await res.json()
        var sel = document.getElementById("actProveedor")
        proveedoresLista.forEach(function(p) {
            var opt = document.createElement("option")
            opt.value = p.id; opt.textContent = p.nombre; sel.appendChild(opt)
        })
    } catch(e) {}
}

async function cargarUsuarios() {
    try {
        if (!ES_ADMIN) return
        const res    = await fetch(API + "/usuarios?empresa_id=" + EMPRESA_ID)
        usuariosLista = await res.json()
        var sec = document.getElementById("seccionAsignar")
        var sel = document.getElementById("actAsignado")
        if (sec) sec.style.display = "block"
        usuariosLista.forEach(function(u) {
            var opt = document.createElement("option")
            opt.value = u.id; opt.textContent = u.nombre + " (" + u.rol + ")"; sel.appendChild(opt)
        })
    } catch(e) {}
}

async function cargarPedidosPendientes() {
    try {
        const res    = await fetch(API + "/pedidos?empresa_id=" + EMPRESA_ID)
        var pedidos  = await res.json()
        pedidosLista = pedidos.filter(function(p) { return p.estado === "pendiente" })
    } catch(e) {}
}

async function cargarStockBajo() {
    try {
        const res       = await fetch(API + "/reportes/stock-bajo?empresa_id=" + EMPRESA_ID)
        stockBajoLista  = await res.json()
    } catch(e) {}
}

// ── STATS ─────────────────────────────────────────────────────
function calcularStats() {
    var hoy     = new Date().toLocaleDateString("sv-SE")
    var lunes   = getLunes(new Date())
    var domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6)
    var domStr  = domingo.toLocaleDateString("sv-SE")
    var lunStr  = lunes.toLocaleDateString("sv-SE")

    var statHoy  = todasActividades.filter(function(a){ return a.fecha === hoy }).length
    var statSem  = todasActividades.filter(function(a){ return a.fecha >= lunStr && a.fecha <= domStr }).length
    var statPend = todasActividades.filter(function(a){ return !a.completada }).length
    var statComp = todasActividades.filter(function(a){ return a.completada }).length

    document.getElementById("statHoy").textContent        = statHoy
    document.getElementById("statSemana").textContent     = statSem
    document.getElementById("statPendientes").textContent = statPend
    document.getElementById("statCompletadas").textContent = statComp

    // Banner hoy
    var banner = document.getElementById("bannerHoy")
    if (statHoy > 0) {
        banner.style.display = "flex"
        var pendHoy = todasActividades.filter(function(a){ return a.fecha === hoy && !a.completada }).length
        document.getElementById("bannerHoyTexto").textContent =
            pendHoy + " pendiente" + (pendHoy!==1?"s":"") + " para hoy"
    } else {
        banner.style.display = "none"
    }
}

function getLunes(d) {
    var dia  = d.getDay() || 7
    var lunes = new Date(d)
    lunes.setDate(d.getDate() - dia + 1)
    return lunes
}

// ── SUGERENCIAS AUTOMÁTICAS ───────────────────────────────────
function renderSugerencias() {
    var sugerencias = []

    // Pedidos pendientes
    pedidosLista.forEach(function(p) {
        var yaExiste = todasActividades.find(function(a){ return a.pedido_id === p.id })
        if (!yaExiste) {
            sugerencias.push({
                tipo:      "pedido",
                titulo:    "Confirmar pedido #" + p.id,
                subtitulo: p.cliente_nombre + " — $" + parseFloat(p.total||0).toFixed(2),
                payload:   { tipo:"pedido", titulo:"Confirmar pedido #"+p.id, pedido_id: p.id }
            })
        }
    })

    // Stock bajo
    if (stockBajoLista.length > 0) {
        var yaExiste = todasActividades.find(function(a){
            return a.tipo === "inventario" && a.titulo.includes("mercancía")
        })
        if (!yaExiste) {
            sugerencias.push({
                tipo:      "inventario",
                titulo:    "Realizar pedido de mercancía",
                subtitulo: stockBajoLista.length + " producto" + (stockBajoLista.length!==1?"s":"") + " con stock bajo",
                payload:   { tipo:"inventario", titulo:"Realizar pedido de mercancía",
                             descripcion: stockBajoLista.map(function(p){ return p.nombre }).join(", ") }
            })
        }
    }

    if (sugerencias.length === 0) return

    var cont = document.getElementById("agendaLista")
    var div  = document.createElement("div")
    div.style.marginBottom = "16px"
    div.innerHTML = '<p style="font-size:12px;font-weight:800;color:#3f51b5;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">💡 Sugerencias automáticas</p>'

    sugerencias.forEach(function(s) {
        var tipo  = TIPOS[s.tipo] || TIPOS.tarea
        var item  = document.createElement("div")
        item.className = "agenda-sugerencia"
        item.innerHTML =
            '<span style="font-size:22px">' + tipo.icon + '</span>' +
            '<div class="agenda-sugerencia-texto">' +
                '<strong>' + s.titulo + '</strong>' + s.subtitulo +
            '</div>' +
            '<button class="btn-agregar-sugerencia" onclick="agregarSugerencia(' + JSON.stringify(s.payload).replace(/"/g,"'") + ')">+ Agregar</button>'
        div.appendChild(item)
    })

    cont.prepend(div)
}

function agregarSugerencia(payload) {
    // Llenar el modal con los datos de la sugerencia
    document.getElementById("actTitulo").value      = payload.titulo || ""
    document.getElementById("actTipo").value        = payload.tipo   || "tarea"
    document.getElementById("actDescripcion").value = payload.descripcion || ""
    document.getElementById("actId").value          = ""
    // Fecha mañana por default
    var manana = new Date(); manana.setDate(manana.getDate() + 1)
    document.getElementById("actFecha").value = manana.toLocaleDateString("sv-SE")
    document.getElementById("actHora").value  = ""
    document.getElementById("actCliente").value   = ""
    document.getElementById("actProveedor").value = ""
    document.getElementById("actAsignado").value  = ""
    document.getElementById("actRecordatorio").value = "0"
    document.getElementById("modalActTitle").textContent = "Nueva actividad (sugerida)"
    document.getElementById("modalActividad").classList.add("active")
}

// ── RENDER LISTA ──────────────────────────────────────────────
function renderLista() {
    var cont = document.getElementById("agendaLista")
    cont.innerHTML = ""

    var hoy    = new Date().toLocaleDateString("sv-SE")
    var lunes  = getLunes(new Date()).toLocaleDateString("sv-SE")
    var dom    = new Date(getLunes(new Date())); dom.setDate(dom.getDate()+6)
    var domStr = dom.toLocaleDateString("sv-SE")

    var lista = todasActividades.filter(function(a) {
        if (filtroActual === "hoy")       return a.fecha === hoy
        if (filtroActual === "semana")    return a.fecha >= lunes && a.fecha <= domStr
        if (filtroActual === "pendientes") return !a.completada
        return true
    })

    if (diaSeleccionado) {
        lista = todasActividades.filter(function(a){ return a.fecha === diaSeleccionado })
    }

    if (lista.length === 0 && !diaSeleccionado) {
        renderSugerencias()
        var empty = document.createElement("div")
        empty.className = "agenda-empty"
        empty.innerHTML = '<p>📅</p><p>No hay actividades aquí todavía</p>'
        cont.appendChild(empty)
        return
    }

    if (lista.length === 0 && diaSeleccionado) {
        var empty = document.createElement("div")
        empty.className = "agenda-empty"
        empty.innerHTML = '<p>📅</p><p>Sin actividades para este día</p>' +
            '<button onclick="abrirModalCrearConFecha(\'' + diaSeleccionado + '\')" ' +
            'style="margin-top:12px;padding:10px 20px;background:#FF8500;color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">' +
            '+ Agregar actividad</button>'
        cont.appendChild(empty)
        renderSugerencias()
        return
    }

    // Agrupar por fecha
    var grupos = {}
    lista.forEach(function(a) {
        if (!grupos[a.fecha]) grupos[a.fecha] = []
        grupos[a.fecha].push(a)
    })

    Object.keys(grupos).sort().forEach(function(fecha) {
        var d         = new Date(fecha + "T12:00:00")
        var etiqueta  = d.toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long" })
        if (fecha === hoy) etiqueta = "Hoy — " + etiqueta

        var grupo = document.createElement("div")
        grupo.innerHTML = '<div class="agenda-grupo-fecha">' + etiqueta + '</div>'

        grupos[fecha].forEach(function(a) {
            grupo.appendChild(crearItemHTML(a))
        })

        cont.appendChild(grupo)
    })

    renderSugerencias()
}

function crearItemHTML(a) {
    var tipo  = TIPOS[a.tipo] || TIPOS.tarea
    var hora  = a.hora ? '<span class="agenda-item-hora">🕐 ' + formatHora(a.hora) + '</span>' : ''
    var rec   = (a.recordatorio && a.recordatorio > 0)
        ? '<span class="agenda-item-recordatorio">' + (RECORDATORIO_LABELS[a.recordatorio]||"") + '</span>' : ''

    var vinculos = ""
    if (a.cliente_nombre)   vinculos += '<span class="agenda-item-vinculo">👤 ' + a.cliente_nombre + '</span>'
    if (a.proveedor_nombre) vinculos += '<span class="agenda-item-vinculo">🚚 ' + a.proveedor_nombre + '</span>'
    if (a.asignado_nombre)  vinculos += '<span class="agenda-item-vinculo">👥 ' + a.asignado_nombre + '</span>'

    var div = document.createElement("div")
    div.className = "agenda-item" + (a.completada ? " completada" : "")
    div.innerHTML =
        '<div class="agenda-tipo-icon" style="background:' + tipo.bg + '">' + tipo.icon + '</div>' +
        '<div class="agenda-item-body">' +
            '<div class="agenda-item-titulo">' + a.titulo + '</div>' +
            '<div class="agenda-item-meta">' + hora + rec + vinculos + '</div>' +
            (a.descripcion ? '<div class="agenda-item-desc">' + a.descripcion + '</div>' : '') +
        '</div>' +
        '<div class="agenda-item-acciones">' +
            '<button class="btn-agenda-check" onclick="toggleCompletar(' + a.id + ',' + a.completada + ',event)" title="' + (a.completada?"Marcar pendiente":"Completar") + '">' +
                (a.completada ? '✓' : '○') +
            '</button>' +
            '<button class="btn-agenda-edit" onclick="abrirEditar(' + a.id + ',event)" title="Editar">✏️</button>' +
            '<button class="btn-agenda-del"  onclick="eliminarActividad(' + a.id + ',event)" title="Eliminar">🗑️</button>' +
        '</div>'

    return div
}

function formatHora(hora) {
    if (!hora) return ""
    var p = hora.split(":"); var h = parseInt(p[0]); var m = p[1]; var ampm = h>=12?"p.m.":"a.m."
    h = h%12||12; return h + ":" + m + " " + ampm
}

// ── CALENDARIO ────────────────────────────────────────────────
function renderCalendario() {
    var meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                 "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    document.getElementById("calTitulo").textContent = meses[mesActual] + " " + añoActual

    var primerDia = new Date(añoActual, mesActual, 1).getDay()
    var diasMes   = new Date(añoActual, mesActual+1, 0).getDate()
    var diasAntes = new Date(añoActual, mesActual, 0).getDate()
    var hoy       = new Date().toLocaleDateString("sv-SE")

    // Fechas con actividades
    var fechasConAct = {}
    todasActividades.forEach(function(a){ fechasConAct[a.fecha] = true })

    var grid = document.getElementById("calGrid")
    grid.innerHTML = ""

    // Días del mes anterior
    for (var i = primerDia-1; i >= 0; i--) {
        var d = document.createElement("div")
        d.className = "cal-dia otro-mes"
        d.innerHTML = '<span>' + (diasAntes-i) + '</span><span class="cal-punto-dia"></span>'
        grid.appendChild(d)
    }

    // Días del mes actual
    for (var dia = 1; dia <= diasMes; dia++) {
        var fechaStr = añoActual + "-" + String(mesActual+1).padStart(2,"0") + "-" + String(dia).padStart(2,"0")
        var d        = document.createElement("div")
        var clases   = "cal-dia"
        if (fechaStr === hoy)              clases += " hoy"
        if (fechaStr === diaSeleccionado)  clases += " seleccionado"
        if (fechasConAct[fechaStr])        clases += " con-actividades"
        d.className  = clases
        d.innerHTML  = '<span>' + dia + '</span><span class="cal-punto-dia"></span>'
        d.onclick    = (function(f){ return function(){ seleccionarDia(f) } })(fechaStr)
        grid.appendChild(d)
    }

    // Días del mes siguiente
    var total    = grid.children.length
    var restante = total % 7 === 0 ? 0 : 7 - (total % 7)
    for (var i = 1; i <= restante; i++) {
        var d = document.createElement("div")
        d.className = "cal-dia otro-mes"
        d.innerHTML = '<span>' + i + '</span><span class="cal-punto-dia"></span>'
        grid.appendChild(d)
    }
}

function cambiarMes(delta) {
    mesActual += delta
    if (mesActual > 11) { mesActual = 0; añoActual++ }
    if (mesActual < 0)  { mesActual = 11; añoActual-- }
    diaSeleccionado = null
    document.getElementById("listaTitulo").textContent = "Todas las actividades"
    renderCalendario()
    renderLista()
}

function seleccionarDia(fecha) {
    diaSeleccionado = fecha === diaSeleccionado ? null : fecha
    var d = new Date(fecha + "T12:00:00")
    document.getElementById("listaTitulo").textContent = diaSeleccionado
        ? d.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long"})
        : "Todas las actividades"
    renderCalendario()
    renderLista()
}

function verHoy() {
    var hoy = new Date().toLocaleDateString("sv-SE")
    diaSeleccionado = hoy
    mesActual = new Date().getMonth()
    añoActual = new Date().getFullYear()
    renderCalendario()
    var d = new Date()
    document.getElementById("listaTitulo").textContent =
        d.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long"})
    renderLista()
}

// ── FILTROS ───────────────────────────────────────────────────
function cambiarFiltro(filtro, btn) {
    filtroActual    = filtro
    diaSeleccionado = null
    document.querySelectorAll(".filtro-agenda").forEach(function(b){ b.classList.remove("active") })
    btn.classList.add("active")
    var titulos = { todas:"Todas las actividades", hoy:"Hoy", semana:"Esta semana", pendientes:"Pendientes" }
    document.getElementById("listaTitulo").textContent = titulos[filtro] || "Actividades"
    renderCalendario()
    renderLista()
}

// ── RECORDATORIOS ─────────────────────────────────────────────
function verificarRecordatorios() {
    var ahora    = new Date()
    var hoyStr   = ahora.toLocaleDateString("sv-SE")
    var horaActual = ahora.getHours() * 60 + ahora.getMinutes()

    var pendientes = todasActividades.filter(function(a) {
        if (a.completada || a.recordatorio === 0 || !a.hora) return false
        if (a.fecha !== hoyStr) return false
        var partes  = a.hora.split(":")
        var horaAct = parseInt(partes[0]) * 60 + parseInt(partes[1])
        var diff    = horaAct - horaActual
        return diff >= 0 && diff <= parseInt(a.recordatorio)
    })

    pendientes.forEach(function(a) {
        var key = "rec_mostrado_" + a.id
        if (sessionStorage.getItem(key)) return
        sessionStorage.setItem(key, "1")
        setTimeout(function() {
            alert("⏰ Recordatorio — " + a.titulo + "\n" + formatHora(a.hora))
        }, 500)
    })
}

// ── CRUD ──────────────────────────────────────────────────────
function abrirModalCrear() {
    limpiarModal()
    var hoy = new Date().toLocaleDateString("sv-SE")
    document.getElementById("actFecha").value = hoy
    document.getElementById("modalActTitle").textContent = "Nueva actividad"
    document.getElementById("modalActividad").classList.add("active")
}

function abrirModalCrearConFecha(fecha) {
    limpiarModal()
    document.getElementById("actFecha").value = fecha
    document.getElementById("modalActTitle").textContent = "Nueva actividad"
    document.getElementById("modalActividad").classList.add("active")
}

function abrirEditar(id, event) {
    if (event) event.stopPropagation()
    var a = todasActividades.find(function(x){ return x.id === id })
    if (!a) return

    document.getElementById("actId").value           = a.id
    document.getElementById("actTitulo").value        = a.titulo        || ""
    document.getElementById("actDescripcion").value   = a.descripcion   || ""
    document.getElementById("actTipo").value          = a.tipo          || "tarea"
    document.getElementById("actFecha").value         = a.fecha         || ""
    document.getElementById("actHora").value          = a.hora          || ""
    document.getElementById("actRecordatorio").value  = a.recordatorio  || 0
    document.getElementById("actCliente").value       = a.cliente_id    || ""
    document.getElementById("actProveedor").value     = a.proveedor_id  || ""
    document.getElementById("actAsignado").value      = a.asignado_a    || ""
    document.getElementById("modalActTitle").textContent = "Editar actividad"
    document.getElementById("modalActividad").classList.add("active")
}

function limpiarModal() {
    document.getElementById("actId").value          = ""
    document.getElementById("actTitulo").value       = ""
    document.getElementById("actDescripcion").value  = ""
    document.getElementById("actTipo").value         = "tarea"
    document.getElementById("actFecha").value        = ""
    document.getElementById("actHora").value         = ""
    document.getElementById("actRecordatorio").value = "0"
    document.getElementById("actCliente").value      = ""
    document.getElementById("actProveedor").value    = ""
    document.getElementById("actAsignado").value     = ""
}

function cerrarModal() {
    document.getElementById("modalActividad").classList.remove("active")
}

async function guardarActividad() {
    var id     = document.getElementById("actId").value
    var titulo = document.getElementById("actTitulo").value.trim()
    var fecha  = document.getElementById("actFecha").value

    if (!titulo || !fecha) { alert("El título y la fecha son obligatorios"); return }

    var body = {
        empresa_id:   EMPRESA_ID,
        titulo:       titulo,
        descripcion:  document.getElementById("actDescripcion").value.trim() || null,
        tipo:         document.getElementById("actTipo").value,
        fecha:        fecha,
        hora:         document.getElementById("actHora").value || null,
        recordatorio: parseInt(document.getElementById("actRecordatorio").value) || 0,
        cliente_id:   document.getElementById("actCliente").value   || null,
        proveedor_id: document.getElementById("actProveedor").value || null,
        asignado_a:   document.getElementById("actAsignado").value  || null,
        creado_por:   USUARIO_ID
    }

    try {
        const res = await fetch(
            id ? API + "/agenda/" + id : API + "/agenda",
            { method: id?"PUT":"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) }
        )
        const data = await res.json()
        if (data.error) { alert(data.error); return }
        cerrarModal()
        await cargarAgenda()
        renderCalendario()
        alert("✅ Actividad " + (id?"actualizada":"creada"))
    } catch(err) {
        alert("Error al guardar")
        console.error(err)
    }
}

async function toggleCompletar(id, estadoActual, event) {
    if (event) event.stopPropagation()
    try {
        var a = todasActividades.find(function(x){ return x.id === id })
        if (!a) return
        await fetch(API + "/agenda/" + id, {
            method:"PUT", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({
                titulo: a.titulo, tipo: a.tipo, fecha: a.fecha,
                completada: !estadoActual,
                recordatorio: a.recordatorio || 0
            })
        })
        await cargarAgenda()
        renderCalendario()
    } catch(err) { console.error(err) }
}

async function eliminarActividad(id, event) {
    if (event) event.stopPropagation()
    if (!confirm("¿Eliminar esta actividad?")) return
    try {
        await fetch(API + "/agenda/" + id, { method:"DELETE" })
        await cargarAgenda()
        renderCalendario()
    } catch(err) { alert("Error al eliminar") }
}

// ── INICIO ────────────────────────────────────────────────────
init()