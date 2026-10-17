import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/** Edit lives in the off-canvas on the unit page. */
export default async function EditUnitPage({ params }: Props) {
  const { id } = await params;
  redirect(`/jedinice/${id}`);
}
