let productos = []
let carrito   = []

const buscarInput = document.getElementById("buscarProducto")
const totalSpan   = document.getElementById("total")


function generarTicketVenta(venta_id, metodo, items, total) {
    const empresa    = SESSION ? SESSION.nombre_empresa || "Mi Negocio" : "Mi Negocio"
    const usuario    = USUARIO_NOMBRE || "Cajero"
    const fecha      = new Date().toLocaleString("es-MX")
    const folio      = "V-" + String(venta_id).padStart(5, "0")

    let filasItems = ""
    items.forEach(function(item) {
        const subtotal = parseFloat(item.precio) * item.cantidad
        filasItems +=
            "<tr>" +
            "<td style='padding:4px 6px;font-size:11px;border-bottom:1px solid #f0f0f0'>" + item.nombre + "</td>" +
            "<td style='padding:4px 6px;font-size:11px;text-align:center;border-bottom:1px solid #f0f0f0'>" + item.cantidad + "</td>" +
            "<td style='padding:4px 6px;font-size:11px;text-align:right;border-bottom:1px solid #f0f0f0'>$" + parseFloat(item.precio).toFixed(2) + "</td>" +
            "<td style='padding:4px 6px;font-size:11px;text-align:right;font-weight:700;border-bottom:1px solid #f0f0f0'>$" + subtotal.toFixed(2) + "</td>" +
            "</tr>"
    })

    const html =
        "<!DOCTYPE html><html><head><meta charset='UTF-8'>" +
        "<title>Ticket " + folio + "</title>" +
        "<style>" +
        "* { margin:0; padding:0; box-sizing:border-box; }" +
        "body { font-family:'Courier New',monospace; width:80mm; max-width:80mm; padding:10px; color:#111; }" +
        "@media print { @page { size:80mm auto; margin:0; } body { padding:6px; } .no-print { display:none; } }" +
        "</style></head><body>" +

        "<div style='text-align:center;border-bottom:1px dashed #000;padding-bottom:10px;margin-bottom:10px'>" +
        "<h1 style='font-size:16px;font-weight:900;letter-spacing:2px'>" + empresa.toUpperCase() + "</h1>" +
        "<p style='font-size:10px;color:#555;margin-top:3px'>TICKET DE VENTA</p>" +
        "</div>" +

        "<div style='margin-bottom:10px;font-size:10px;color:#555'>" +
        "<p>Folio: <strong style='color:#111'>" + folio + "</strong></p>" +
        "<p>Fecha: " + fecha + "</p>" +
        "<p>Cajero: " + usuario + "</p>" +
        "<p>Método: " + metodo + "</p>" +
        "</div>" +

        "<table style='width:100%;border-collapse:collapse;margin-bottom:10px'>" +
        "<thead><tr>" +
        "<th style='text-align:left;font-size:10px;padding:4px 6px;border-bottom:1px dashed #000'>Producto</th>" +
        "<th style='text-align:center;font-size:10px;padding:4px 6px;border-bottom:1px dashed #000'>Cant</th>" +
        "<th style='text-align:right;font-size:10px;padding:4px 6px;border-bottom:1px dashed #000'>P.U.</th>" +
        "<th style='text-align:right;font-size:10px;padding:4px 6px;border-bottom:1px dashed #000'>Sub</th>" +
        "</tr></thead>" +
        "<tbody>" + filasItems + "</tbody>" +
        "</table>" +

        "<div style='border-top:1px dashed #000;padding-top:8px;margin-bottom:10px'>" +
        "<div style='display:flex;justify-content:space-between;align-items:center'>" +
        "<span style='font-size:14px;font-weight:700'>TOTAL</span>" +
        "<span style='font-size:18px;font-weight:900'>$" + parseFloat(total).toFixed(2) + "</span>" +
        "</div>" +
        "</div>" +

        "<div style='text-align:center;border-top:1px dashed #000;padding-top:8px;font-size:9px;color:#888'>" +
        "<p>¡Gracias por su compra!</p>" +
        "<p style='margin-top:3px'>MyControl ERP</p>" +
        "</div>" +

        "<div class='no-print' style='margin-top:16px;display:flex;gap:8px'>" +
        "<button onclick='window.print()' style='flex:1;padding:10px;background:#FF8500;color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer'>🖨️ Imprimir</button>" +
        "<button onclick='window.close()' style='flex:1;padding:10px;background:#eee;color:#555;border:none;border-radius:8px;font-size:13px;cursor:pointer'>Cerrar</button>" +
        "</div>" +

        "</body></html>"

        const blob = new Blob([html], { type: "text/html" })
        const url  = URL.createObjectURL(blob)
        window.open(url, "_blank")
}



// ── CARGAR PRODUCTOS ──────────────────────────────────────────
async function cargarProductos() {
    mostrarLoading("Cargando catálogo...");

    try {
        const res = await fetch(API + "/productos?empresa_id=" + EMPRESA_ID)
        productos = await res.json()
        renderCards(productos)
        actualizarContador(productos.length)
    } catch (err) {
        console.error("Error al cargar productos:", err)
    } finally {
        ocultarLoading()
    }
}

// ── RENDER CARDS ──────────────────────────────────────────────
function renderCards(lista) {
    const grid = document.getElementById("productosGrid")
    grid.innerHTML = ""

    if (lista.length === 0) {
        grid.innerHTML = '<div class="venta-empty">No se encontraron productos</div>'
        return
    }

    lista.forEach(function(p) {
        const enCarrito = carrito.find(function(c) { return c.id === p.id })
        const cantidad  = enCarrito ? enCarrito.cantidad : 0
        const sinStock  = p.stock <= 0

        // Imagen lazy — solo carga cuando es visible
        const imagenSrc = p.imagen_url
            ? (p.imagen_url.startsWith("data:") || p.imagen_url.startsWith("http")
                ? p.imagen_url
                : API + p.imagen_url)
            : "assets/img/no-image.png"

        const card = document.createElement("div")
        card.className = "venta-card" + (sinStock ? " venta-card-agotado" : "")

        card.innerHTML =
            '<div class="venta-card-img">' +
                '<img data-src="' + imagenSrc + '" src="assets/img/no-image.png" alt="' + p.nombre + '" class="lazy-img" onerror="this.src=\'assets/img/no-image.png\'">' +
                (sinStock ? '<div class="venta-card-agotado-tag">Sin stock</div>' : '') +
                (cantidad > 0 ? '<div class="venta-card-qty-badge">' + cantidad + '</div>' : '') +
            '</div>' +
            '<div class="venta-card-body">' +
                '<p class="venta-card-nombre">' + p.nombre + '</p>' +
                '<p class="venta-card-precio">$' + parseFloat(p.precio).toFixed(2) + '</p>' +
                '<p class="venta-card-stock">📦 ' + p.stock + ' disponibles</p>' +
            '</div>' +
            '<div class="venta-card-acciones">' +
                (sinStock
                    ? '<div class="venta-card-btn-agotado">Agotado</div>'
                    : '<button class="venta-card-btn-menos" onclick="cambiarCantidad(' + p.id + ', -1)" ' + (cantidad === 0 ? 'disabled' : '') + '>−</button>' +
                      '<span class="venta-card-cant">' + cantidad + '</span>' +
                      '<button class="venta-card-btn-mas" onclick="cambiarCantidad(' + p.id + ', 1)">+</button>'
                ) +
            '</div>'

        grid.appendChild(card)
    })

    // Activar lazy loading
    activarLazyImages()
}

function activarLazyImages() {
    const imgs = document.querySelectorAll("img.lazy-img")

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const img = entry.target
                    img.src = img.dataset.src
                    img.classList.remove("lazy-img")
                    observer.unobserve(img)
                }
            })
        }, { rootMargin: "100px" })

        imgs.forEach(function(img) { observer.observe(img) })
    } else {
        // Fallback para navegadores viejos
        imgs.forEach(function(img) {
            img.src = img.dataset.src
        })
    }
}

function actualizarContador(total) {
    const el = document.getElementById("contadorProductos")
    if (el) el.textContent = total + " producto" + (total !== 1 ? "s" : "")
}

// ── BUSCADOR ──────────────────────────────────────────────────
buscarInput.addEventListener("input", function() {
    const texto     = buscarInput.value.toLowerCase()
    const filtrados = productos.filter(function(p) {
        return p.nombre.toLowerCase().includes(texto) ||
               (p.codigo && p.codigo.toLowerCase().includes(texto))
    })
    renderCards(filtrados)
    actualizarContador(filtrados.length)
})

// ── CAMBIAR CANTIDAD ──────────────────────────────────────────
function cambiarCantidad(id, delta) {
    const producto = productos.find(function(p) { return p.id === id })
    if (!producto) return

    const existe = carrito.find(function(c) { return c.id === id })

    if (delta > 0) {
        if (producto.stock <= 0) {
            alert("⚠️ " + producto.nombre + " no tiene stock disponible")
            return
        }
        if (existe) {
            if (existe.cantidad >= producto.stock) {
                alert("⚠️ Stock máximo: " + producto.stock + " unidades disponibles de " + producto.nombre)
                return
            }
            existe.cantidad++
        } else {
            carrito.push(Object.assign({}, producto, { cantidad: 1 }))
        }
    } else {
        if (!existe) return
        existe.cantidad--
        if (existe.cantidad <= 0) {
            carrito = carrito.filter(function(c) { return c.id !== id })
        }
    }

    renderCarrito()
    renderCards(filtrarActual())
}

function filtrarActual() {
    const texto = buscarInput.value.toLowerCase()
    if (!texto) return productos
    return productos.filter(function(p) {
        return p.nombre.toLowerCase().includes(texto) ||
               (p.codigo && p.codigo.toLowerCase().includes(texto))
    })
}

// ── RENDER CARRITO ────────────────────────────────────────────
function renderCarrito() {
    const contenedor    = document.getElementById("carritoItems")
    const vacio         = document.getElementById("carritoVacio")
    const totalBox      = document.getElementById("carritoTotalBox")
    const badge         = document.getElementById("carritoBadge")

    contenedor.innerHTML = ""

    if (carrito.length === 0) {
        vacio.style.display    = "flex"
        totalBox.style.display = "none"
        badge.textContent      = "0"
        totalSpan.textContent  = "0.00"
        return
    }

    vacio.style.display    = "none"
    totalBox.style.display = "block"

    let total      = 0
    let totalItems = 0

    carrito.forEach(function(item) {
        const subtotal = parseFloat(item.precio) * item.cantidad
        total         += subtotal
        totalItems    += item.cantidad

        const div = document.createElement("div")
        div.className = "carrito-item"
        div.innerHTML =
            '<div class="carrito-item-info">' +
                '<p class="carrito-item-nombre">' + item.nombre + '</p>' +
                '<p class="carrito-item-precio">$' + parseFloat(item.precio).toFixed(2) + ' c/u</p>' +
            '</div>' +
            '<div class="carrito-item-controles">' +
                '<button onclick="cambiarCantidad(' + item.id + ', -1)">−</button>' +
                '<span>' + item.cantidad + '</span>' +
                '<button onclick="cambiarCantidad(' + item.id + ', 1)">+</button>' +
            '</div>' +
            '<div class="carrito-item-subtotal">$' + subtotal.toFixed(2) + '</div>'

        contenedor.appendChild(div)
    })

    badge.textContent     = totalItems
    totalSpan.textContent = total.toFixed(2)
}

// ── REGISTRAR VENTA ───────────────────────────────────────────
document.getElementById("registrarVenta").addEventListener("click", async function() {
    if (carrito.length === 0) { alert("Agrega al menos un producto"); return }

    for (var i = 0; i < carrito.length; i++) {
        var item = carrito[i]
        var prod = productos.find(function(p) { return p.id === item.id })
        if (prod && item.cantidad > prod.stock) {
            alert("Stock insuficiente para: " + item.nombre)
            return
        }
    }

    const metodo     = document.getElementById("metodoPago").value
    const itemsVenta = carrito.slice()
    const totalVenta = itemsVenta.reduce(function(acc, p) {
        return acc + parseFloat(p.precio) * p.cantidad
    }, 0)

    try {
        const res = await fetch(API + "/ventas", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                empresa_id:  EMPRESA_ID,
                usuario_id:  USUARIO_ID,
                metodo_pago: metodo,
                productos: carrito.map(function(p) {
                    return { producto_id: p.id, cantidad: p.cantidad, precio: p.precio }
                })
            })
        })

        const data = await res.json()

        if (data.venta_id) {
            carrito = []
            await cargarProductos()
            renderCarrito()

            // Preguntar si desea ticket
            if (confirm("✅ Venta registrada.\n\n¿Deseas imprimir el ticket?")) {
                generarTicketVenta(data.venta_id, metodo, itemsVenta, totalVenta)
            }
        }
    } catch (err) {
        alert("Error al conectar con el servidor")
        console.error(err)
    }
})

// ── CANCELAR VENTA ────────────────────────────────────────────
document.getElementById("cancelarVenta").addEventListener("click", function() {
    if (carrito.length === 0) return
    if (confirm("¿Cancelar la venta? Se vaciará el carrito.")) {
        carrito = []
        renderCarrito()
        renderCards(filtrarActual())
    }
})

// ── ESCÁNER CÓDIGO DE BARRAS ──────────────────────────────────
var escanerActivo   = false
var escanerCallback = null

function iniciarEscaner(callback) {
    escanerCallback = callback
    escanerActivo   = false
    document.getElementById("escanerStatus").textContent = "Iniciando cámara..."
    document.getElementById("modalEscaner").classList.add("active")

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.getElementById("escaner-viewport"),
            constraints: {
                facingMode: "environment",
                width:  { min: 300 },
                height: { min: 200 }
            }
        },
        decoder: {
            readers: [
                "ean_reader",
                "ean_8_reader",
                "code_128_reader",
                "code_39_reader",
                "upc_reader",
                "upc_e_reader"
            ]
        },
        locate: true
    }, function(err) {
        if (err) {
            document.getElementById("escanerStatus").textContent = "Error al acceder a la cámara"
            console.error(err)
            return
        }
        Quagga.start()
        document.getElementById("escanerStatus").textContent = "Listo — apunta al código"
    })

    Quagga.onDetected(function(result) {
        if (escanerActivo) return
        const codigo = result.codeResult.code
        if (!codigo) return
        escanerActivo = true

        if (navigator.vibrate) navigator.vibrate(100)
        detenerEscaner()
        if (escanerCallback) escanerCallback(codigo)
    })
}

function detenerEscaner() {
    try { Quagga.stop() } catch(e) {}
    document.getElementById("modalEscaner").classList.remove("active")
}

document.getElementById("cerrarEscaner").addEventListener("click", detenerEscaner)

document.getElementById("btnEscanerVentas").addEventListener("click", function() {
    iniciarEscaner(function(codigo) {
        // Buscar el producto por código
        const encontrado = productos.find(function(p) {
            return p.codigo && p.codigo.toLowerCase() === codigo.toLowerCase()
        })

        if (encontrado) {
            cambiarCantidad(encontrado.id, 1)
            document.getElementById("escanerStatus").textContent = "✅ " + encontrado.nombre + " agregado"
        } else {
            // Si no existe, poner el código en el buscador
            document.getElementById("buscarProducto").value = codigo
            buscarInput.dispatchEvent(new Event("input"))
            document.getElementById("escanerStatus").textContent = "⚠️ Código no encontrado: " + codigo
        }
    })
})

// ── INIT ──────────────────────────────────────────────────────
cargarProductos()
renderCarrito()