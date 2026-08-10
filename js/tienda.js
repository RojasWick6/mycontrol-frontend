// ── CONFIGURACIÓN ────────────────────────────────────────────
var API_URL        = "https://mycontrol-backend-production-3402.up.railway.app"
var slug           = new URLSearchParams(window.location.search).get("s")
var tiendaData     = null
var todosProductos = []
var carrito        = []   // { id, nombre, precio, stock, imagen_url, cantidad }
var clienteSession = null // { id, nombre, telefono, email, empresa_id }

// ── ARRANQUE ─────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", async function() {
    if (!slug) {
        mostrarError("No se encontró la tienda. Verifica el enlace.")
        return
    }

    // Restaurar sesión de cliente si existe
    var sesGuardada = sessionStorage.getItem("cliente_" + slug)
    if (sesGuardada) clienteSession = JSON.parse(sesGuardada)
    actualizarClienteInfo()

    await cargarTienda()
})


// ── MENÚ HAMBURGUESA ──────────────────────────────────────────
function toggleMenu() {
    var menu = document.getElementById("navMenu")
    menu.classList.toggle("open")
}
function cerrarMenu() {
    document.getElementById("navMenu").classList.remove("open")
}

// Cerrar menú al hacer click fuera
document.addEventListener("click", function(e) {
    var menu = document.getElementById("navMenu")
    var hamburger = document.getElementById("hamburger")
    if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
        menu.classList.remove("open")
    }
})

// ── CARGAR TIENDA ─────────────────────────────────────────────
async function cargarTienda() {
    try {
        const res = await fetch(API_URL + "/tienda/publica/" + slug)
        if (!res.ok) {
            mostrarError("Esta tienda no existe o no está disponible.")
            return
        }
        tiendaData = await res.json()

        // Aplicar color personalizado
        document.documentElement.style.setProperty("--color", tiendaData.color_primario || "#FF8500")

        // Llenar header y navbar brand
        document.title                                      = tiendaData.nombre_negocio + " — Catálogo"
        document.getElementById("catNombre").textContent      = tiendaData.nombre_negocio
        document.getElementById("catDescripcion").textContent = tiendaData.descripcion || ""
        
        var navBrand = document.getElementById("navBrand")
        if (navBrand) navBrand.textContent = "🛍️ " + tiendaData.nombre_negocio

        // Redes sociales
        var redes = document.getElementById("catRedes")
        redes.innerHTML = ""
        if (tiendaData.whatsapp) {
            redes.innerHTML += '<a href="https://wa.me/' + tiendaData.whatsapp + '" target="_blank">💬 WhatsApp</a>'
        }
        if (tiendaData.instagram) {
            var ig = tiendaData.instagram.replace("@", "")
            redes.innerHTML += '<a href="https://instagram.com/' + ig + '" target="_blank">📸 Instagram</a>'
        }

        // Cargar productos
        todosProductos = tiendaData.productos || []
        renderProductos(todosProductos)

    } catch (err) {
        console.error(err)
        mostrarError("Ocurrió un error al cargar la tienda.")
    }
}

// ── RENDER PRODUCTOS ──────────────────────────────────────────
function renderProductos(lista) {
    var grid = document.getElementById("catGrid")
    var contador = document.getElementById("catContador")
    grid.innerHTML = ""

    if (lista.length === 0) {
        contador.textContent = "Sin productos disponibles"
        grid.innerHTML =
            '<div class="cat-empty" style="grid-column:1/-1">' +
            '<p>🛍️</p><p>No hay productos en este catálogo todavía</p></div>'
        return
    }

    contador.innerHTML =
        "<strong>" + lista.length + "</strong> producto" +
        (lista.length !== 1 ? "s" : "") +
        " disponibles"

    lista.forEach(function(p) {
        var enCarrito = carrito.find(function(c) {
            return c.id === p.id
        })

        var cantidad = enCarrito ? enCarrito.cantidad : 0
        var agotado = p.stock <= 0
        var imgSrc = p.imagen_url || ""

        var card = document.createElement("div")
        card.className = "cat-card" + (agotado ? " agotado" : "")
        card.id = "card-" + p.id

        card.innerHTML =
            (cantidad > 0
                ? '<div class="cat-card-qty-badge">' + cantidad + '</div>'
                : '') +

            (agotado
                ? '<div class="cat-card-agotado-badge">Agotado</div>'
                : '') +

            '<img class="cat-card-img" ' +
                'src="' + imgSrc + '" ' +
                'onerror="this.src=\'\';this.style.background=\'#f0f0f0\'" ' +
                'alt="' + p.nombre + '">' +

            '<div class="cat-card-body">' +

                '<div class="cat-card-nombre">' +
                    p.nombre +
                '</div>' +

                '<div class="cat-card-precio">' +
                    '$' + parseFloat(p.precio).toFixed(2) +
                '</div>' +

                '<div class="cat-card-stock">' +
                    (agotado
                        ? "⚠️ Sin stock"
                        : "✅ Disponible — " + p.stock + " uds") +
                '</div>' +

                (agotado
                    ? ''
                    :
                    '<div class="cat-card-controles">' +

                        '<div class="cat-card-cantidad">' +

                            '<button class="btn-menos" ' +
                                'onclick="cambiarCantidad(' + p.id + ', -1)" ' +
                                (cantidad === 0 ? 'disabled' : '') +
                            '>−</button>' +

                            '<span class="cat-card-cant" id="cant-' + p.id + '">' +
                                cantidad +
                            '</span>' +

                            '<button class="btn-mas" ' +
                                'onclick="cambiarCantidad(' + p.id + ', 1)"' +
                            '>+</button>' +

                        '</div>' +

                        (cantidad === 0
                            ? '<button class="btn-agregar" ' +
                                'onclick="cambiarCantidad(' + p.id + ', 1)">' +
                                'Agregar' +
                              '</button>'
                            : '') +

                    '</div>'
                ) +

            '</div>'

        grid.appendChild(card)
    })
}

// ── FILTRO DE BÚSQUEDA ────────────────────────────────────────
function filtrarProductos() {
    var texto = document.getElementById("catBuscar").value.toLowerCase().trim()
    if (!texto) { renderProductos(todosProductos); return }
    var filtrados = todosProductos.filter(function(p) {
        return p.nombre.toLowerCase().includes(texto)
    })
    renderProductos(filtrados)
}

// ── CAMBIAR CANTIDAD ──────────────────────────────────────────
function cambiarCantidad(id, delta) {
    var producto = todosProductos.find(function(p) { return p.id === id })
    if (!producto) return

    var existe = carrito.find(function(c) { return c.id === id })

    if (delta > 0) {
        if (!existe) {
            carrito.push({ id: producto.id, nombre: producto.nombre, precio: producto.precio, stock: producto.stock, imagen_url: producto.imagen_url, cantidad: 1 })
        } else {
            if (existe.cantidad >= producto.stock) {
                alert("Solo hay " + producto.stock + " disponibles")
                return
            }
            existe.cantidad++
        }
    } else {
        if (!existe) return
        existe.cantidad--
        if (existe.cantidad <= 0) {
            carrito = carrito.filter(function(c) { return c.id !== id })
        }
    }

    actualizarFab()
    // Re-render solo la card afectada
    var texto = document.getElementById("catBuscar").value.toLowerCase().trim()
    var lista  = texto ? todosProductos.filter(function(p) { return p.nombre.toLowerCase().includes(texto) }) : todosProductos
    renderProductos(lista)
}

// ── FAB CARRITO ───────────────────────────────────────────────
function actualizarFab() {
    var fab   = document.getElementById("carritoFab")
    var total = carrito.reduce(function(a, c) { return a + c.precio * c.cantidad }, 0)
    var items = carrito.reduce(function(a, c) { return a + c.cantidad }, 0)

    if (items > 0) {
        fab.style.display = "flex"
        document.getElementById("carritoFabTotal").textContent = "$" + total.toFixed(2)
        // Badge navbar
        var badge = document.getElementById("navCarritoBadge")
        if (badge) badge.textContent = items
        // Badge menú móvil
        var menuBadge = document.getElementById("navMenuBadge")
        if (menuBadge) menuBadge.textContent = items + " items — $" + total.toFixed(2)
        // Mostrar botón carrito en navbar si hay sesión
        if (clienteSession) {
            var navCarrito = document.getElementById("navCarritoBtn")
            if (navCarrito) navCarrito.style.display = "flex"
            var menuCarrito = document.getElementById("navMenuCarrito")
            if (menuCarrito) menuCarrito.style.display = "flex"
        }
    } else {
        fab.style.display = "none"
    }
}

// ── MODAL CARRITO ─────────────────────────────────────────────
function abrirCarrito() {
    var cont = document.getElementById("carritoItems")
    cont.innerHTML = ""

    if (carrito.length === 0) {
        cont.innerHTML = '<div class="cat-empty"><p>🛒</p><p>Tu carrito está vacío</p></div>'
        document.getElementById("carritoResumen").style.display = "none"
        document.getElementById("btnPedir").style.display       = "none"
    } else {
        carrito.forEach(function(item) {
            var div = document.createElement("div")
            div.className = "carrito-item"
            div.innerHTML =
                '<img src="' + (item.imagen_url || "") + '" onerror="this.src=\'\';this.style.background=\'#f0f0f0\'">' +
                '<div class="carrito-item-info">' +
                    '<div class="carrito-item-nombre">' + item.nombre + '</div>' +
                    '<div class="carrito-item-precio">$' + parseFloat(item.precio).toFixed(2) + ' c/u</div>' +
                '</div>' +
                '<div class="carrito-item-controles">' +
                    '<button class="btn-menos" style="width:28px;height:28px;font-size:16px" onclick="cambiarCantidad(' + item.id + ',-1);abrirCarrito()">−</button>' +
                    '<span style="font-weight:800;min-width:18px;text-align:center">' + item.cantidad + '</span>' +
                    '<button class="btn-mas" style="width:28px;height:28px;font-size:16px" onclick="cambiarCantidad(' + item.id + ',1);abrirCarrito()">+</button>' +
                '</div>'
            cont.appendChild(div)
        })

        var total = carrito.reduce(function(a, c) { return a + c.precio * c.cantidad }, 0)
        var items = carrito.reduce(function(a, c) { return a + c.cantidad }, 0)
        document.getElementById("carritoNumItems").textContent  = items + " producto" + (items !== 1 ? "s" : "")
        document.getElementById("carritoTotal").textContent     = "$" + total.toFixed(2)
        document.getElementById("carritoResumen").style.display = "block"
        document.getElementById("btnPedir").style.display       = "block"
    }

    document.getElementById("modalCarrito").classList.add("active")
}

function cerrarCarrito() {
    document.getElementById("modalCarrito").classList.remove("active")
}

// ── PEDIR ─────────────────────────────────────────────────────
function irAPedir() {
    cerrarCarrito()
    if (clienteSession) {
        enviarPedido()
    } else {
        document.getElementById("modalAuth").classList.add("active")
    }
}

function abrirAuth(tab) {
    mostrarTab(tab || "login")
    document.getElementById("modalAuth").classList.add("active")
}


// ── AUTH CLIENTE ──────────────────────────────────────────────
function mostrarTab(tab) {
    document.getElementById("panelLogin").style.display   = tab === "login"    ? "block" : "none"
    document.getElementById("panelRegistro").style.display = tab === "registro" ? "block" : "none"
    document.getElementById("tabLogin").classList.toggle("active",    tab === "login")
    document.getElementById("tabRegistro").classList.toggle("active", tab === "registro")
}

function cerrarAuth() {
    document.getElementById("modalAuth").classList.remove("active")
}

async function hacerLogin() {
    var email    = document.getElementById("loginEmail").value.trim()
    var password = document.getElementById("loginPassword").value.trim()
    if (!email || !password) { alert("Completa todos los campos"); return }

    try {
        const res  = await fetch(API_URL + "/clientes-tienda/login", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ email, password, empresa_id: tiendaData.empresa_id })
        })
        const data = await res.json()
        if (!res.ok) { alert(data.error || "Credenciales incorrectas"); return }

        clienteSession = data.cliente
        sessionStorage.setItem("cliente_" + slug, JSON.stringify(clienteSession))
        actualizarClienteInfo()
        cerrarAuth()
        enviarPedido()
    } catch (err) {
        alert("Error al conectar")
    }
}

async function hacerRegistro() {
    var nombre   = document.getElementById("regNombre").value.trim()
    var telefono = document.getElementById("regTelefono").value.trim()
    var email    = document.getElementById("regEmail").value.trim()
    var password = document.getElementById("regPassword").value.trim()

    if (!nombre || !telefono || !email || !password) { alert("Completa todos los campos"); return }

    try {
        const res  = await fetch(API_URL + "/clientes-tienda/registro", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ nombre, telefono, email, password, empresa_id: tiendaData.empresa_id })
        })
        const data = await res.json()
        if (!res.ok) { alert(data.error || "Error al registrarse"); return }

        clienteSession = data.cliente
        sessionStorage.setItem("cliente_" + slug, JSON.stringify(clienteSession))
        actualizarClienteInfo()
        cerrarAuth()
        enviarPedido()
    } catch (err) {
        alert("Error al conectar")
    }
}

// ── ENVIAR PEDIDO ─────────────────────────────────────────────
async function enviarPedido() {
    if (carrito.length === 0) { alert("Tu carrito está vacío"); return }

    try {
        const res = await fetch(API_URL + "/pedidos", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                empresa_id: tiendaData.empresa_id,
                cliente_id: clienteSession.id,
                productos:  carrito.map(function(c) {
                    return { producto_id: c.id, cantidad: c.cantidad, precio_unitario: c.precio }
                })
            })
        })
        const data = await res.json()
        if (!res.ok) { alert(data.error || "Error al enviar pedido"); return }

        // Limpiar carrito
        carrito = []
        actualizarFab()

        // Mensaje de confirmación con WhatsApp
        var total   = data.total || 0
        var msgWa   = "¡Hola! Acabo de hacer un pedido en tu catálogo 🛍️\n"
            + "Nombre: " + clienteSession.nombre + "\n"
            + "Total: $" + parseFloat(total).toFixed(2) + "\n"
            + "Pedido #" + data.pedido_id

        if (tiendaData.whatsapp) {
            document.getElementById("btnWaConfirm").href =
                "https://wa.me/" + tiendaData.whatsapp + "?text=" + encodeURIComponent(msgWa)
            document.getElementById("btnWaConfirm").style.display = "block"
        } else {
            document.getElementById("btnWaConfirm").style.display = "none"
        }

        document.getElementById("confirmMsg").textContent =
            "Tu pedido #" + data.pedido_id + " fue enviado. El vendedor lo revisará pronto."

        document.getElementById("modalConfirm").classList.add("active")
        var lista = document.getElementById("catGrid")
        await cargarTienda()

    } catch (err) {
        alert("Error al enviar pedido")
        console.error(err)
    }
}

function cerrarConfirm() {
    document.getElementById("modalConfirm").classList.remove("active")
}

// ── INFO CLIENTE LOGUEADO ─────────────────────────────────────
function actualizarClienteInfo() {
    var nombre = clienteSession ? clienteSession.nombre : null

    // Navbar desktop
    var navInfo = document.getElementById("navClienteInfo")
    var navAuth = document.getElementById("navAuthBtns")
    var navCarrito = document.getElementById("navCarritoBtn")
    if (nombre) {
        navInfo.style.display = "flex"
        navAuth.style.display = "none"
        navCarrito.style.display = "flex"
        document.getElementById("navClienteNombre").textContent = "👤 " + nombre
    } else {
        navInfo.style.display = "none"
        navAuth.style.display = "flex"
        navCarrito.style.display = "none"
    }

    // Menú móvil
    var menuInfo = document.getElementById("navMenuClienteInfo")
    var menuAuth = document.getElementById("navMenuAuthBtns")
    var menuCarrito = document.getElementById("navMenuCarrito")
    if (nombre) {
        menuInfo.style.display = "flex"
        menuAuth.style.display = "none"
        menuCarrito.style.display = "flex"
        document.getElementById("navMenuNombre").textContent = "👤 " + nombre
    } else {
        menuInfo.style.display = "none"
        menuAuth.style.display = "block"
        menuCarrito.style.display = "none"
    }

    // Info bar
    var infoBar = document.getElementById("catClienteInfoBar")
    if (infoBar) {
        infoBar.textContent = nombre ? "Hola, " + nombre : ""
    }
}

function cerrarSesionCliente() {
    sessionStorage.removeItem("cliente_" + slug)
    clienteSession = null
    actualizarClienteInfo()
}

// ── ERROR ─────────────────────────────────────────────────────
function mostrarError(msg) {
    document.getElementById("catHeader").style.display = "none"
    document.getElementById("catGrid").innerHTML =
        '<div class="cat-empty" style="grid-column:1/-1"><p>😕</p><p>' + msg + '</p></div>'
    document.getElementById("catContador").textContent = ""
}