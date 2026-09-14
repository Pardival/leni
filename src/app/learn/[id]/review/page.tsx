import { notFound } from "next/navigation";
import { ReviewSession } from "@/components/ReviewSession";
import { getSource } from "@/lib/learn/sources";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = await getSource(id);
  if (!source) notFound();
  return <ReviewSession sourceId={id} title={source.title} />;
}
