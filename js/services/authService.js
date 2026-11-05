import { STORAGE_KEYS } from "../config.js";
import { getJson, removeItem, setJson } from "../utils/storage.js";
import { apiRequest } from "./apiClient.js";

export async function login(userId) {
  const data = await apiRequest("auth.login", { userId });
  setJson(STORAGE_KEYS.session, data.session);
  return data.session;
}

export async function verifySession() {
  const session = getSession();
  if (!session || !session.token) {
    return null;
  }

  try {
    const data = await apiRequest("auth.session", { token: session.token });
    return data.session;
  } catch (error) {
    clearSession();
    return null;
  }
}

// Devuelve false solo si el servidor confirma que la sesión no es válida.
// Ante fallos de red se asume válida para no bloquear el uso sin conexión.
export async function isSessionStillValid() {
  const session = getSession();
  if (!session || !session.token) {
    return false;
  }

  try {
    const data = await apiRequest("auth.session", { token: session.token });
    return Boolean(data && data.session);
  } catch (error) {
    return !error.isBusinessError;
  }
}

export async function refreshBirthdayStatus() {
  const session = getSession();
  if (!session || !session.token) {
    return false;
  }

  const data = await apiRequest("auth.session", { token: session.token });
  const refreshedSession = data.session;
  if (!refreshedSession || refreshedSession.userId !== session.userId) {
    throw new Error("No se pudo verificar el usuario de la sesión.");
  }

  setJson(STORAGE_KEYS.session, refreshedSession);
  return Boolean(refreshedSession.isBirthdayToday);
}

export function getSession() {
  return getJson(STORAGE_KEYS.session);
}

export function clearSession() {
  removeItem(STORAGE_KEYS.session);
}

export async function logout() {
  const session = getSession();
  if (session && session.token) {
    try {
      await apiRequest("auth.logout", { token: session.token });
    } catch (error) {
      // No bloquea el cierre local de sesion.
    }
  }
  clearSession();
}
