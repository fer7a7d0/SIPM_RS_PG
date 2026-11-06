import "../router.js";
import { ROUTES, STORAGE_KEYS } from "../config.js";
import { clearSession, getSession, logout, refreshSessionStatus } from "../services/authService.js";
import { getJson, setJson } from "../utils/storage.js";
import {
  clearCachedAvailableAreas,
  preloadAvailableAreas
} from "../services/supervisionService.js";

const SESSION_VALIDATION_INTERVAL_MS = 10 * 60 * 1000;
const dashboardMessage = document.getElementById("dashboardMessage");
const logoutButton = document.getElementById("logoutButton");
const birthdayGreeting = document.getElementById("birthdayGreeting");
const scanQrBtn = document.getElementById("scanQrBtn");
const historyBtn = document.getElementById("historyBtn");
const indicadoresBtn = document.getElementById("indicadoresBtn");
const checkListBtn = document.getElementById("checkListBtn");
let validationInProgress = false;
let sessionValidationTimer;

init();

async function init() {
  const session = getSession();
  if (!session) {
    window.location.replace(ROUTES.login);
    return;
  }

  sessionValidationTimer = window.setInterval(() => {
    void validateSessionAndBirthday();
  }, SESSION_VALIDATION_INTERVAL_MS);

  if (session.isBirthdayToday) {
    showBirthdayGreeting(session);
  }

  if (!(await validateSessionAndBirthday())) {
    return;
  }

  const areasPreload = preloadAvailableAreas(session.token, session.userId)
    .catch((error) => {
      console.error("No se pudieron precargar las áreas; se intentará cargarlas al abrir Check list.", error);
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

async function validateSessionAndBirthday() {
  if (validationInProgress) {
    return true;
  }

  validationInProgress = true;
  const session = getSession();
  const validationDate = getLocalDateKey();
  const refreshBirthday = session && !hasCheckedBirthdayToday(session, validationDate);

  try {
    const result = await refreshSessionStatus({ refreshBirthday });
    if (!result.isValid) {
      window.clearInterval(sessionValidationTimer);
      clearSession();
      sessionStorage.setItem(STORAGE_KEYS.sessionNotice, "Tu sesión expiró. Inicia sesión nuevamente.");
      window.location.replace(ROUTES.login);
      return false;
    }

    if (result.error) {
      console.error("No se pudo validar la sesión con el servidor.", result.error);
    }

    if (refreshBirthday && result.refreshed) {
      setJson(STORAGE_KEYS.birthdayCheck, {
        userId: session.userId,
        date: validationDate
      });
      if (result.session.isBirthdayToday) {
        showBirthdayGreeting(result.session);
      } else {
        birthdayGreeting.hidden = true;
      }
    }

    return true;
  } finally {
    validationInProgress = false;
  }
}

function hasCheckedBirthdayToday(session, date) {
  const check = getJson(STORAGE_KEYS.birthdayCheck);
  return check?.userId === session.userId && check.date === date;
}

function getLocalDateKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function showBirthdayGreeting(session) {
  const name = session.userName || session.userId || "";
  birthdayGreeting.textContent = `¡Feliz cumpleaños${name ? `, ${name}` : ""}!`;
  birthdayGreeting.hidden = false;
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
