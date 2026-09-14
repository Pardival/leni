import { createEmptyCard, fsrs, Rating, type Card as FsrsCard, type Grade } from "ts-fsrs";
import type { Card } from "@/db/schema";

const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: true });

export { Rating };
export type { Grade };

export function toFsrs(c: Card): FsrsCard {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: 0,
    scheduled_days: c.scheduledDays,
    learning_steps: c.learningSteps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.lastReview ? new Date(c.lastReview) : undefined,
  };
}

/** État FSRS initial d'une nouvelle carte (due maintenant). */
export function newCardState(now = new Date()): Pick<Card, "due" | "stability" | "difficulty" | "scheduledDays" | "learningSteps" | "reps" | "lapses" | "state" | "lastReview"> {
  const c = createEmptyCard(now);
  return { due: c.due.toISOString(), stability: c.stability, difficulty: c.difficulty, scheduledDays: c.scheduled_days, learningSteps: c.learning_steps, reps: c.reps, lapses: c.lapses, state: c.state, lastReview: null };
}

/** Applique une réponse et retourne les champs FSRS mis à jour. */
export function applyReview(c: Card, grade: Grade, now = new Date()) {
  const { card } = scheduler.next(toFsrs(c), now, grade);
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.toISOString() : now.toISOString(),
  };
}

/** Probabilité de rappel maintenant (0 pour une carte jamais vue). */
export function retrievability(c: Card, now = new Date()): number {
  if (c.reps === 0) return 0;
  const r = scheduler.get_retrievability(toFsrs(c), now, false);
  return Number.isFinite(r) ? r : 0;
}

/** Note FSRS déduite d'un score 0..1 (réponses libres corrigées par le modèle). */
export function gradeFromScore(score: number): Grade {
  if (score < 0.4) return Rating.Again;
  if (score < 0.7) return Rating.Hard;
  if (score < 0.9) return Rating.Good;
  return Rating.Easy;
}
