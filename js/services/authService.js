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

// Los fallos de red conservan la sesión local; los errores de negocio la invalidan.
export async function refreshSessionStatus({ refreshBirthday = false } = {}) {
  const session = getSession();
  if (!session || !session.token) {
    return { isValid: false, session: null };
  }

  try {
    const data = await apiRequest("auth.session", { token: session.token });
    const refreshedSession = data && data.session;
    if (!refreshedSession || refreshedSession.userId !== session.userId) {
      return { isValid: false, session: null };
    }

    const updatedSession = {
      ...refreshedSession,
      isBirthdayToday: refreshBirthday
        ? Boolean(refreshedSession.isBirthdayToday)
        : Boolean(session.isBirthdayToday)
    };
    setJson(STORAGE_KEYS.session, updatedSession);
    return { isValid: true, session: updatedSession, refreshed: true };
  } catch (error) {
    if (error.isBusinessError) {
      return { isValid: false, session: null };
    }
    return { isValid: true, session, error, refreshed: false };
  }
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
