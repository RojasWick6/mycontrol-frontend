// theme.js — cargar en todos los HTML antes de dashboard.js
(function() {
    const primario   = localStorage.getItem("colorPrimario")   || "#FF8500"
    const secundario = localStorage.getItem("colorSecundario") || "#ff9800"
    document.documentElement.style.setProperty("--primary", primario)
    document.body.style.background = `linear-gradient(135deg, ${secundario}, ${primario})`
})()