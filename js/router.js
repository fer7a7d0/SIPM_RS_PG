import { ROUTES, STORAGE_KEYS } from "./config.js";
import { clearSession, getSession, isSessionStillValid } from "./services/authService.js";

const protectedPages = new Set(["dashboard.html", "indicadores.html", "escaner.html", "supervision.html", "resumen.html", "historial.html", "check-list.html"]);

(function guardRoute() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  const session = getSession();

  if (protectedPages.has(current) && !session) {
    window.location.replace(ROUTES.login);
    return;
  }

  if (current === "login.html" && session) {
    window.location.replace(ROUTES.dashboard);
  }
})();

// Al entrar a una página protegida se valida la sesión con el servidor antes
// de que la página cargue datos (los módulos de página importan este archivo primero).
const currentPage = window.location.pathname.split("/").pop() || "index.html";
if (protectedPages.has(currentPage) && getSession()) {
  const valid = await isSessionStillValid();
  if (!valid) {
    clearSession();
    sessionStorage.setItem(STORAGE_KEYS.sessionNotice, "Tu sesión expiró. Inicia sesión nuevamente.");
    window.location.replace(ROUTES.login);
    await new Promise(() => {});
  }
}
