let productos = []
let carrito = []

const buscarInput = document.getElementById("buscarProducto")
const sugerencias = document.getElementById("sugerencias")
const carritoList = document.getElementById("carritoList")
const totalSpan   = document.getElementById("total")

async function cargarProductos() {
    const res = await fetch(`${API}/productos?empresa_id=${EMPRESA_ID}`)
    productos = await res.json()
}

cargarProductos()

buscarInput.addEventListener("input", () => {
    const texto = buscarInput.value.toLowerCase()
    sugerencias.innerHTML = ""
    if (!texto) return

    const resultados = productos.filter(p =>
        p.nombre.toLowerCase().includes(texto) ||
        p.codigo.toLowerCase().includes(texto)
    )

    resultados.forEach(p => {
        const li = document.createElement("li")
        li.textContent = `${p.nombre} - $${p.precio} (${p.stock} en stock)`
        li.onclick = () => agregarAlCarrito(p)
        sugerencias.appendChild(li)
    })
})

function agregarAlCarrito(producto) {
    // 🚨 No permitir productos sin stock
    if (producto.stock <= 0) {
        alert("Este producto no tiene stock disponible")
        return
    }

    const existe = carrito.find(p => p.id === producto.id)

    if (existe) {
        // 🚨 No permitir exceder stock
        if (existe.cantidad >= producto.stock) {
            alert("No puedes agregar más, stock máximo alcanzado")
            return
        }
        existe.cantidad++
    } else {
        carrito.push({ ...producto, cantidad: 1 })
    }

    renderCarrito()
    buscarInput.value = ""
    sugerencias.innerHTML = ""
}

function renderCarrito() {
    carritoList.innerHTML = ""
    let total = 0

    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad
        total += subtotal

        const fila = document.createElement("tr")
        fila.innerHTML = `
            <td>${item.nombre}</td>
            <td>${item.cantidad}</td>
            <td>$${subtotal.toFixed(2)}</td>
            <td><button onclick="quitarDelCarrito(${item.id})">❌</button></td>
        `
        carritoList.appendChild(fila)
    })

    totalSpan.textContent = total.toFixed(2)
}

function quitarDelCarrito(id) {
    carrito = carrito.filter(p => p.id !== id)
    renderCarrito()
}

document.getElementById("registrarVenta").addEventListener("click", async () => {
    if (carrito.length === 0) {
        alert("Agrega al menos un producto")
        return
    }
    // 🚨 Validar stock antes de enviar
for (let item of carrito) {
    const productoActual = productos.find(p => p.id === item.id)

    if (!productoActual) continue

    if (item.cantidad > productoActual.stock) {
        alert(`Stock insuficiente para ${item.nombre}`)
        return
    }
}

    const metodo = document.getElementById("metodoPago").value

    try {
        const res = await fetch(`${API}/ventas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                empresa_id:  EMPRESA_ID,
                usuario_id:  USUARIO_ID,
                metodo_pago: metodo,
                productos: carrito.map(p => ({
                    producto_id: p.id,
                    cantidad:    p.cantidad,
                    precio:      p.precio
                }))
            })
        })

        const data = await res.json()

        if (data.venta_id) {
            alert("✅ Venta registrada")
            carrito = []
            renderCarrito()
            await cargarProductos()
        }
    } catch (err) {
        alert("Error al conectar con el servidor")
        console.error(err)
    }
})