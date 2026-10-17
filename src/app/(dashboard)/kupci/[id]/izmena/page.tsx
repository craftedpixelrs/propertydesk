import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/** Edit lives in the off-canvas on the buyer page. */
export default async function EditBuyerPage({ params }: Props) {
  const { id } = await params;
  redirect(`/kupci/${id}`);
}
