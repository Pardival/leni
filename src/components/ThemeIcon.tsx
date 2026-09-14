import { IconBook, IconBriefcase, IconCoins, IconFolder, IconHeart, IconHome, IconPaw, IconPeople, IconSprout, IconTag, IconUser } from "./icons";

const BY_SLUG: Record<string, (p: { size?: number }) => React.ReactNode> = {
  health: IconHeart,
  work: IconBriefcase,
  projects: IconFolder,
  relationships: IconPeople,
  home: IconHome,
  money: IconCoins,
  self: IconUser,
  culture: IconBook,
  potager: IconSprout,
  animaux: IconPaw,
  jardinage: IconSprout,
};

/** Icône d'un thème : dédiée pour les thèmes système et quelques usuels, générique sinon. */
export function ThemeIcon({ slug, size = 20 }: { slug: string; size?: number }) {
  const Icon = BY_SLUG[slug] ?? IconTag;
  return <Icon size={size} />;
}
