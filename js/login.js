const form     = document.getElementById("loginForm")
const errorMsg = document.getElementById("errorMsg")
const btnLogin = document.getElementById("btnLogin")

function mostrarError(msg) {
    errorMsg.textContent   = msg
    errorMsg.style.display = "block"
}

form.addEventListener("submit", async (e) => {
    e.preventDefault()

    const email    = document.getElementById("email").value.trim()
    const password = document.getElementById("password").value.trim()

    if (!email || !password) {
        mostrarError("Completa todos los campos")
        return
    }

    btnLogin.textContent = "Ingresando..."
    btnLogin.disabled    = true
    errorMsg.style.display = "none"

    try {
        const res  = await fetch(`${API}/login`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ email, password })
        })

        const data = await res.json()

        if (!res.ok) {
            mostrarError(data.error || "Credenciales incorrectas")
            btnLogin.textContent = "Ingresar"
            btnLogin.disabled    = false
            return
        }

        sessionStorage.setItem("usuario", JSON.stringify(data.usuario))
        window.location.href = "dashboard.html"

    } catch (err) {
        mostrarError("No se pudo conectar con el servidor")
        btnLogin.textContent = "Ingresar"
        btnLogin.disabled    = false
    }
})