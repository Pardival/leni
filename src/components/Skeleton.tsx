/** Bloc de chargement neutre (même rayon que les cartes). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`rounded-2xl bg-surface-2 animate-pulse ${className}`} aria-hidden />;
}
