import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/** Edit lives in the off-canvas on the project page. */
export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/projekti/${id}`);
}
