"use client";

import { SESSION_CONTEXT_STORAGE_KEY } from "@/lib/constants";
import type { ClientSessionContext } from "@/types/session";

function readStorage(): ClientSessionContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_CONTEXT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ClientSessionContext) : null;
  } catch {
    return null;
  }
}

function writeStorage(context: ClientSessionContext) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_CONTEXT_STORAGE_KEY, JSON.stringify(context));
}

export function getSessionContext(sessionToken: string): ClientSessionContext {
  const existing = readStorage();
  if (existing && existing.sessionToken === sessionToken) return existing;

  const fresh: ClientSessionContext = {
    sessionToken,
    firstVisitAt: new Date().toISOString(),
    visitedPaths: [],
  };
  writeStorage(fresh);
  return fresh;
}

export function updateSessionContext(
  sessionToken: string,
  patch: Partial<ClientSessionContext>
): ClientSessionContext {
  const current = getSessionContext(sessionToken);
  const next: ClientSessionContext = { ...current, ...patch };
  writeStorage(next);
  return next;
}

export function recordVisitedPath(sessionToken: string, path: string) {
  const current = getSessionContext(sessionToken);
  if (current.visitedPaths[current.visitedPaths.length - 1] === path) return current;
  const visitedPaths = [...current.visitedPaths, path].slice(-25);
  return updateSessionContext(sessionToken, { visitedPaths });
}
