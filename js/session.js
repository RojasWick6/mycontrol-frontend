const DURACION_SESION_MS = 2 * 60 * 60 * 1000   // 2 horas

function getSession() {
    const data = sessionStorage.getItem("usuario")
    const ts   = sessionStorage.getItem("sesion_inicio")

    if (!data || !ts) {
        forzarLogin()
        return null
    }

    // Verificar expiración por tiempo
    const tiempoTranscurrido = Date.now() - parseInt(ts)
    if (tiempoTranscurrido > DURACION_SESION_MS) {
        sessionStorage.clear()
        forzarLogin()
        return null
    }

    return JSON.parse(data)
}

function forzarLogin() {
    window.location.replace("login.html")
}

function cerrarSesion() {
    sessionStorage.clear()
    window.location.replace("login.html")
}

// ── FIX BOTÓN ATRÁS / CACHÉ DEL NAVEGADOR ──────────────────────
// Cuando el navegador muestra una página desde el caché (bfcache),
// revalidamos si la sesión sigue siendo válida.
window.addEventListener("pageshow", function(event) {
    if (event.persisted) {
        const data = sessionStorage.getItem("usuario")
        const ts   = sessionStorage.getItem("sesion_inicio")

        if (!data || !ts) {
            forzarLogin()
            return
        }

        const tiempoTranscurrido = Date.now() - parseInt(ts)
        if (tiempoTranscurrido > DURACION_SESION_MS) {
            sessionStorage.clear()
            forzarLogin()
        }
    }
})

const SESSION        = getSession()
const EMPRESA_ID     = SESSION ? SESSION.empresa_id  : null
const USUARIO_ID     = SESSION ? SESSION.id          : null
const USUARIO_ROL    = SESSION ? SESSION.rol         : null
const USUARIO_NOMBRE = SESSION ? SESSION.nombre      : null
const ES_ADMIN       = USUARIO_ROL === "admin"

// Proteger páginas según rol
function protegerPorRol(soloAdmin) {
    if (soloAdmin && !ES_ADMIN) {
        window.location.replace("ventas.html")
    }
}