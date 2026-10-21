/**
 * Per-day checklist persistence (ported from the web widget's
 * loadChecklistState/pruneChecklistState): a routine's ticks survive closing
 * the app, but belong to the day they were made, and old days are pruned.
 */

import React, { createContext, useContext } from 'react';

const STORE_KEY = 'mya_checklist_v1';
const KEEP_DAYS = 7;

export const MyaStorageContext = createContext(null);
export const MyaStorageProvider = MyaStorageContext.Provider;
export function useMyaStorage() {
  return useContext(MyaStorageContext);
}

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Stable key for a routine: its title plus its step labels, so a regenerated block still matches. */
export function checklistKey(title, stepLabels) {
  const raw = `${title || ''}|${(stepLabels || []).join('|')}`.toLowerCase();
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
  return `r${(h >>> 0).toString(36)}`;
}

export function prune(all, today = new Date()) {
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - KEEP_DAYS);
  const out = {};
  Object.keys(all || {}).forEach((k) => {
    const day = k.split('|')[1];
    const t = day ? new Date(`${day}T00:00:00`) : null;
    if (t && !Number.isNaN(t.getTime()) && t >= cutoff) out[k] = all[k];
  });
  return out;
}

async function readAll(storage) {
  try {
    const raw = await storage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export async function loadChecked(storage, routineKey, today = new Date()) {
  if (!storage) return [];
  const all = await readAll(storage);
  return Array.isArray(all[`${routineKey}|${dayKey(today)}`]) ? all[`${routineKey}|${dayKey(today)}`] : [];
}

export async function saveChecked(storage, routineKey, stepKeys, today = new Date()) {
  if (!storage) return;
  const all = prune(await readAll(storage), today);
  all[`${routineKey}|${dayKey(today)}`] = Array.from(stepKeys);
  try {
    await storage.setItem(STORE_KEY, JSON.stringify(all));
  } catch (e) {
    // Persistence is a nicety; never break the card over it.
  }
}
