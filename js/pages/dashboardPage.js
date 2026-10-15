import "../router.js";
import { ROUTES } from "../config.js";
import { getSession, logout } from "../services/authService.js";
import {
  clearCachedAvailableAreas,
  preloadAvailableAreas
} from "../services/supervisionService.js";

const dashboardMessage = document.getElementById("dashboardMessage");
const logoutButton = document.getElementById("logoutButton");
const scanQrBtn = document.getElementById("scanQrBtn");
const historyBtn = document.getElementById("historyBtn");
const indicadoresBtn = document.getElementById("indicadoresBtn");
const checkListBtn = document.getElementById("checkListBtn");

init();

async function init() {
  const session = getSession();
  if (!session) {
    window.location.replace(ROUTES.login);
    return;
  }

  const areasPreload = preloadAvailableAreas(session.token, session.userId)
    .catch((error) => {
      const reason = error && error.message ? ` (${error.message})` : "";
      setMessage(`No se pudieron precargar las áreas${reason}; se intentará cargarlas al abrir Check list.`, "error");
      return null;
    });

  logoutButton.addEventListener("click", onLogout);
  scanQrBtn.addEventListener("click", () => {
    window.location.href = ROUTES.scanQr;
  });
  historyBtn.addEventListener("click", () => {
    window.location.href = ROUTES.historial;
  });
  indicadoresBtn.addEventListener("click", () => {
    window.location.href = ROUTES.indicadores;
  });
  checkListBtn.addEventListener("click", () => {
    window.location.href = ROUTES.checkList;
  });
}

async function onLogout() {
  clearCachedAvailableAreas();
  await logout();
  window.location.replace(ROUTES.login);
}

function setMessage(message, type) {
  dashboardMessage.textContent = message;
  dashboardMessage.className = "status-slot mt-3";
  if (type) {
    dashboardMessage.classList.add(type);
  }
}
