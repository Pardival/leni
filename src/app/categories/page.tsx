import { CategoryManager } from "@/components/CategoryManager";
import { SuggestedThemes } from "@/components/SuggestedThemes";
import { getI18n } from "@/i18n/server";
import { countNotesByCategory, listCategories, listSuggestedThemes, THEME_EMERGENCE_THRESHOLD } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const { m } = await getI18n();
  const [cats, counts, suggested] = await Promise.all([listCategories(), countNotesByCategory(), listSuggestedThemes()]);
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight">{m.categoriesPage.title}</h1>
        <p className="text-muted mt-1">{m.categoriesPage.intro}</p>
      </div>
      {suggested.length > 0 && (
        <SuggestedThemes key={suggested.map((s) => s.name + s.count).join("|")} suggestions={suggested} categories={cats} threshold={THEME_EMERGENCE_THRESHOLD} />
      )}
      <CategoryManager key={cats.map((c) => c.slug + c.name).join("|")} categories={cats} counts={counts} />
    </div>
  );
}
