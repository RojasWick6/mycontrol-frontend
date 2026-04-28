function getSession() {
    const data = sessionStorage.getItem("usuario")
    if (!data) {
        window.location.href = "login.html"
        return null
    }
    return JSON.parse(data)
}

function cerrarSesion() {
    sessionStorage.removeItem("usuario")
    window.location.href = "login.html"
}

const SESSION        = getSession()
const EMPRESA_ID     = SESSION ? SESSION.empresa_id  : null
const USUARIO_ID     = SESSION ? SESSION.id          : null
const USUARIO_ROL    = SESSION ? SESSION.rol         : null
const USUARIO_NOMBRE = SESSION ? SESSION.nombre      : null