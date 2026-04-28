const openModalBtn    = document.getElementById("openModal")
const modal           = document.getElementById("proveedorModal")
const cerrarModalBtn  = document.getElementById("cerrarModal")
const saveBtn         = document.getElementById("saveProveedor")
const proveedoresList = document.getElementById("proveedoresList")
const modalTitulo     = document.getElementById("modalTitulo")
const nombreInput     = document.getElementById("provNombre")
const telefonoInput   = document.getElementById("provTelefono")
const emailInput      = document.getElementById("provEmail")

let proveedores  = []
let editandoId   = null

async function cargarProveedores() {
    try {
        const res = await fetch(`${API}/proveedores?empresa_id=${EMPRESA_ID}`)
        proveedores = await res.json()
        renderProveedores()
    } catch (err) {
        console.error("Error al cargar proveedores:", err)
    }
}

function renderProveedores() {
    proveedoresList.innerHTML = ""
    if (proveedores.length === 0) {
        proveedoresList.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:30px;color:#aaa">
                    No hay proveedores registrados
                </td>
            </tr>`
        return
    }
    proveedores.forEach(p => {
        const fecha = new Date(p.fecha_registro).toLocaleDateString("es-MX")
        const fila  = document.createElement("tr")
        fila.innerHTML = `
            <td>${p.nombre}</td>
            <td>${p.telefono || "—"}</td>
            <td>${p.email || "—"}</td>
            <td>${fecha}</td>
            <td>
                <button onclick="editarProveedor(${p.id})">✏️</button>
                <button onclick="eliminarProveedor(${p.id})"
                    style="background:#e74c3c;margin-left:6px">❌</button>
            </td>
        `
        proveedoresList.appendChild(fila)
    })
}

openModalBtn.addEventListener("click", () => {
    editandoId = null
    modalTitulo.textContent = "Nuevo proveedor"
    limpiarForm()
    modal.style.display = "flex"
})

cerrarModalBtn.addEventListener("click", () => {
    modal.style.display = "none"
    limpiarForm()
})

saveBtn.addEventListener("click", async () => {
    const nombre   = nombreInput.value.trim()
    const telefono = telefonoInput.value.trim()
    const email    = emailInput.value.trim()

    if (!nombre) { alert("El nombre es obligatorio"); return }

    try {
        if (editandoId) {
            await fetch(`${API}/proveedores/${editandoId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, telefono, email })
            })
        } else {
            await fetch(`${API}/proveedores`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ empresa_id: EMPRESA_ID, nombre, telefono, email })
            })
        }
        modal.style.display = "none"
        limpiarForm()
        await cargarProveedores()
    } catch (err) {
        alert("Error al guardar proveedor")
    }
})

function editarProveedor(id) {
    const p = proveedores.find(p => p.id === id)
    if (!p) return
    editandoId          = id
    modalTitulo.textContent = "Editar proveedor"
    nombreInput.value   = p.nombre
    telefonoInput.value = p.telefono || ""
    emailInput.value    = p.email    || ""
    modal.style.display = "flex"
}

async function eliminarProveedor(id) {
    if (!confirm("¿Eliminar este proveedor?")) return
    try {
        await fetch(`${API}/proveedores/${id}`, { method: "DELETE" })
        await cargarProveedores()
    } catch (err) {
        alert("Error al eliminar proveedor")
    }
}

function limpiarForm() {
    nombreInput.value   = ""
    telefonoInput.value = ""
    emailInput.value    = ""
    editandoId = null
}

cargarProveedores()