let usuarios = []
let editandoUsuarioId = null

// ── EMPRESA ───────────────────────────────────────────────────

async function cargarEmpresa() {
    try {
        const res = await fetch(`${API}/empresa?empresa_id=${EMPRESA_ID}`)
        const emp = await res.json()
        if (!emp) return
        document.getElementById("empNombre").value   = emp.nombre_empresa || ""
        document.getElementById("empTelefono").value = emp.telefono       || ""
        document.getElementById("empEmail").value    = emp.email          || ""
    } catch (err) {
        console.error("Error empresa:", err)
    }
}

document.getElementById("btnGuardarEmpresa").addEventListener("click", async () => {
    const nombre_empresa = document.getElementById("empNombre").value.trim()
    const telefono       = document.getElementById("empTelefono").value.trim()
    const email          = document.getElementById("empEmail").value.trim()

    if (!nombre_empresa) { alert("El nombre es obligatorio"); return }

    try {
        await fetch(`${API}/empresa`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ empresa_id: EMPRESA_ID, nombre_empresa, telefono, email })
        })
        alert("✅ Datos de empresa guardados")
    } catch (err) {
        alert("Error al guardar empresa")
    }
})

// ── APARIENCIA ────────────────────────────────────────────────

const colorPrimarioInput   = document.getElementById("colorPrimario")
const colorSecundarioInput = document.getElementById("colorSecundario")
const umbralInput          = document.getElementById("umbralStock")

function aplicarColores(primario, secundario) {
    document.documentElement.style.setProperty("--primary", primario)
    document.body.style.background = `linear-gradient(135deg, ${secundario}, ${primario})`
}

function cargarApariencia() {
    const primario   = localStorage.getItem("colorPrimario")   || "#FF8500"
    const secundario = localStorage.getItem("colorSecundario") || "#ff9800"
    const umbral     = localStorage.getItem("umbralStock")     || "5"

    colorPrimarioInput.value   = primario
    colorSecundarioInput.value = secundario
    umbralInput.value          = umbral

    document.getElementById("colorPrimarioHex").textContent   = primario
    document.getElementById("colorSecundarioHex").textContent = secundario

    aplicarColores(primario, secundario)
}

colorPrimarioInput.addEventListener("input", () => {
    document.getElementById("colorPrimarioHex").textContent = colorPrimarioInput.value
    aplicarColores(colorPrimarioInput.value, colorSecundarioInput.value)
})

colorSecundarioInput.addEventListener("input", () => {
    document.getElementById("colorSecundarioHex").textContent = colorSecundarioInput.value
    aplicarColores(colorPrimarioInput.value, colorSecundarioInput.value)
})

document.getElementById("btnGuardarApariencia").addEventListener("click", () => {
    localStorage.setItem("colorPrimario",   colorPrimarioInput.value)
    localStorage.setItem("colorSecundario", colorSecundarioInput.value)
    localStorage.setItem("umbralStock",     umbralInput.value)
    alert("✅ Apariencia guardada")
})

document.getElementById("btnResetApariencia").addEventListener("click", () => {
    localStorage.removeItem("colorPrimario")
    localStorage.removeItem("colorSecundario")
    localStorage.removeItem("umbralStock")
    cargarApariencia()
    alert("Apariencia restablecida")
})

// ── USUARIOS ──────────────────────────────────────────────────

async function cargarUsuarios() {
    try {
        const res = await fetch(`${API}/usuarios?empresa_id=${EMPRESA_ID}`)
        usuarios  = await res.json()
        renderUsuarios()
    } catch (err) {
        console.error("Error usuarios:", err)
    }
}

function renderUsuarios() {
    const tbody = document.getElementById("usuariosList")
    tbody.innerHTML = ""

    if (usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px">Sin usuarios</td></tr>`
        return
    }

    usuarios.forEach(u => {
        const fecha = new Date(u.fecha_creacion).toLocaleDateString("es-MX")
        const fila  = document.createElement("tr")
        fila.innerHTML = `
            <td>${u.nombre}</td>
            <td>${u.email}</td>
            <td><span class="badge-rol ${u.rol}">${u.rol}</span></td>
            <td>${fecha}</td>
            <td>
                <button onclick="editarUsuario(${u.id})">✏️</button>
                <button onclick="eliminarUsuario(${u.id})"
                    style="background:#e74c3c;margin-left:6px">❌</button>
            </td>
        `
        tbody.appendChild(fila)
    })
}

const modal         = document.getElementById("usuarioModal")
const modalTitulo   = document.getElementById("modalUsuarioTitulo")
const passwordInput = document.getElementById("uPassword")

document.getElementById("btnNuevoUsuario").addEventListener("click", () => {
    editandoUsuarioId = null
    modalTitulo.textContent    = "Nuevo usuario"
    passwordInput.style.display = "block"
    limpiarFormUsuario()
    modal.style.display = "flex"
})

document.getElementById("btnCerrarUsuario").addEventListener("click", () => {
    modal.style.display = "none"
    limpiarFormUsuario()
})

document.getElementById("btnGuardarUsuario").addEventListener("click", async () => {
    const nombre   = document.getElementById("uNombre").value.trim()
    const email    = document.getElementById("uEmail").value.trim()
    const password = document.getElementById("uPassword").value.trim()
    const rol      = document.getElementById("uRol").value

    if (!nombre || !email) { alert("Nombre y email son obligatorios"); return }

    try {
        if (editandoUsuarioId) {
            await fetch(`${API}/usuarios/${editandoUsuarioId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, email, rol })
            })
        } else {
            if (!password) { alert("La contraseña es obligatoria"); return }
            await fetch(`${API}/usuarios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ empresa_id: EMPRESA_ID, nombre, email, password, rol })
            })
        }
        modal.style.display = "none"
        limpiarFormUsuario()
        await cargarUsuarios()
    } catch (err) {
        alert("Error al guardar usuario")
    }
})

function editarUsuario(id) {
    const u = usuarios.find(u => u.id === id)
    if (!u) return
    editandoUsuarioId = id
    modalTitulo.textContent     = "Editar usuario"
    document.getElementById("uNombre").value = u.nombre
    document.getElementById("uEmail").value  = u.email
    document.getElementById("uRol").value    = u.rol
    passwordInput.style.display = "none"
    modal.style.display = "flex"
}

async function eliminarUsuario(id) {
    if (!confirm("¿Eliminar este usuario?")) return
    try {
        await fetch(`${API}/usuarios/${id}`, { method: "DELETE" })
        await cargarUsuarios()
    } catch (err) {
        alert("Error al eliminar usuario")
    }
}

function limpiarFormUsuario() {
    document.getElementById("uNombre").value   = ""
    document.getElementById("uEmail").value    = ""
    document.getElementById("uPassword").value = ""
    document.getElementById("uRol").value      = "admin"
    editandoUsuarioId = null
}

cargarEmpresa()
cargarApariencia()
cargarUsuarios()