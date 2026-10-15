import { STORAGE_KEYS } from "../config.js";
import { getJson, removeItem, setJson } from "../utils/storage.js";
import { apiRequest } from "./apiClient.js";

const AVAILABLE_AREAS_CACHE_TTL_MS = 10 * 60 * 1000;

export async function startSupervision(payload) {
  const data = await apiRequest("supervision.start", payload);
  setJson(STORAGE_KEYS.activeSupervision, data.supervision);
  return data.supervision;
}

export async function listAvailableAreas(token) {
  const data = await apiRequest("areas.list", { token });
  return data.areas || [];
}

export async function preloadAvailableAreas(token, userId) {
  const areas = await listAvailableAreas(token);
  sessionStorage.setItem(STORAGE_KEYS.availableAreas, JSON.stringify({
    userId: String(userId || ""),
    fetchedAt: Date.now(),
    areas
  }));
  return areas;
}

export function getCachedAvailableAreas(userId) {
  const raw = sessionStorage.getItem(STORAGE_KEYS.availableAreas);
  if (!raw) {
    return null;
  }

  let cached;
  try {
    cached = JSON.parse(raw);
  } catch (error) {
    sessionStorage.removeItem(STORAGE_KEYS.availableAreas);
    return null;
  }

  const age = cached && Number.isFinite(cached.fetchedAt) ? Date.now() - cached.fetchedAt : NaN;
  const isFresh = age >= 0 && age < AVAILABLE_AREAS_CACHE_TTL_MS;
  const isSameUser = Boolean(cached && cached.userId === String(userId || ""));
  if (!isFresh || !isSameUser || !Array.isArray(cached.areas)) {
    sessionStorage.removeItem(STORAGE_KEYS.availableAreas);
    return null;
  }

  return cached.areas;
}

export function clearCachedAvailableAreas() {
  sessionStorage.removeItem(STORAGE_KEYS.availableAreas);
}

export async function listOperatorsByArea(payload) {
  const data = await apiRequest("operators.listByArea", payload);
  return data;
}

export async function getChecklist(payload) {
  const data = await apiRequest("supervision.getChecklist", payload);
  return data;
}

export async function saveSupervision(payload) {
  const data = await apiRequest("supervision.save", payload);
  return data;
}

export function getActiveSupervision() {
  return getJson(STORAGE_KEYS.activeSupervision);
}

export function updateActiveSupervision(patch) {
  const current = getActiveSupervision() || {};
  const merged = {
    ...current,
    ...patch
  };
  setJson(STORAGE_KEYS.activeSupervision, merged);
  return merged;
}

export function clearActiveSupervision() {
  removeItem(STORAGE_KEYS.activeSupervision);
}
