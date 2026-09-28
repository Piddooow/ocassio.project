/**
 * Tiny pub/sub so any UI affordance (navigation links, the theme toggle)
 * can play the shared page transition. Listeners live in the same client
 * bundle, so no DOM events or globals leak into the app.
 */
export interface TransitionRequest {
  /** Resolves when the caller's work is done (e.g. a view transition). */
  waitFor?: Promise<unknown>;
}

type TransitionListener = (request: TransitionRequest) => void;

const listeners = new Set<TransitionListener>();

export function onTransitionRequest(
  listener: TransitionListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function requestTransition(request: TransitionRequest = {}): void {
  for (const listener of listeners) listener(request);
}
