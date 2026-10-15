import "../router.js";
import { ROUTES } from "../config.js";
import { getSession } from "../services/authService.js";
import {
  clearActiveSupervision,
  getCachedAvailableAreas,
  listAvailableAreas,
  updateActiveSupervision
} from "../services/supervisionService.js";

const areaSelect = document.getElementById("areaSelect");
const checkListMessage = document.getElementById("checkListMessage");

init();

async function init() {
  const session = getSession();
  if (!session || !session.token) {
    window.location.replace(ROUTES.login);
    return;
  }

  areaSelect.addEventListener("change", () => onAreaChange(session));

  try {
    const areas = getCachedAvailableAreas(session.userId) || await listAvailableAreas(session.token);
    areaSelect.innerHTML = '<option value="">Selecciona un área...</option>';

    areas.forEach((area) => {
      const option = document.createElement("option");
      option.value = area.id;
      option.textContent = area.name;
      areaSelect.appendChild(option);
    });

    areaSelect.disabled = areas.length === 0;
    if (areas.length === 0) {
      setMessage("No hay áreas disponibles.", "error");
    } else {
      setMessage("", "");
    }
  } catch (error) {
    areaSelect.innerHTML = '<option value="">No se pudieron cargar las áreas</option>';
    setMessage(error.message || "No se pudieron cargar las áreas.", "error");
  }
}

async function onAreaChange(session) {
  const areaId = areaSelect.value;
  if (!areaId) {
    return;
  }

  const selectedArea = areaSelect.options[areaSelect.selectedIndex];
  areaSelect.disabled = true;
  setMessage(`Abriendo checklist para ${selectedArea.textContent}...`, "");

  try {
    clearActiveSupervision();
    updateActiveSupervision({
      areaId,
      areaName: selectedArea.textContent,
      qrCode: "",
      supervisorId: session.userId || "",
      gps: "",
      startMode: "area",
      startAt: new Date().toISOString()
    });
    window.location.href = ROUTES.supervision;
  } catch (error) {
    areaSelect.disabled = false;
    areaSelect.value = "";
    setMessage(error.message || "No se pudo abrir el checklist.", "error");
  }
}

function setMessage(message, type) {
  checkListMessage.textContent = message;
  checkListMessage.className = "status-slot mt-3";
  if (type) {
    checkListMessage.classList.add(type);
  }
}
