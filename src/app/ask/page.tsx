import { AskLeni } from "@/components/AskLeni";
import { getI18n } from "@/i18n/server";
import { hasOpenAI } from "@/lib/config";

export default async function AskPage() {
  const { m } = await getI18n();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight">{m.ask.title}</h1>
        <p className="text-muted mt-1">{m.ask.intro}</p>
      </div>
      <AskLeni canAsk={hasOpenAI()} />
    </div>
  );
}
