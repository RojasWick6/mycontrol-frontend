const ventasList = document.getElementById("ventasList")
const filtro     = document.getElementById("filtroHistorial")

let todasLasVentas = []

async function cargarVentas() {
    try {
        const res    = await fetch(`${API}/ventas?empresa_id=${EMPRESA_ID}`)
        todasLasVentas = await res.json()
        renderVentas(todasLasVentas)
    } catch (err) {
        console.error("Error al cargar ventas:", err)
    }
}

function renderVentas(ventas) {
    ventasList.innerHTML = ""

    if (ventas.length === 0) {
        ventasList.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;color:#aaa;padding:30px">
                    No hay ventas registradas
                </td>
            </tr>`
        return
    }

    ventas.forEach(venta => {
        const fecha = new Date(venta.fecha).toLocaleDateString("es-MX", {
            day:    "2-digit",
            month:  "short",
            year:   "numeric",
            hour:   "2-digit",
            minute: "2-digit"
        })
        const fila = document.createElement("tr")
        fila.innerHTML = `
            <td>#${venta.id}</td>
            <td>${fecha}</td>
            <td>${venta.metodo_pago || "—"}</td>
            <td style="text-align:right;font-weight:600">
                $${parseFloat(venta.total).toFixed(2)}
            </td>
            <td>—</td>
        `
        ventasList.appendChild(fila)
    })
}

if (filtro) {
    filtro.addEventListener("input", () => {
        const texto = filtro.value.toLowerCase()
        const filtradas = todasLasVentas.filter(v =>
            String(v.id).includes(texto) ||
            v.fecha.toLowerCase().includes(texto) ||
            (v.metodo_pago && v.metodo_pago.toLowerCase().includes(texto))
        )
        renderVentas(filtradas)
    })
}

cargarVentas()