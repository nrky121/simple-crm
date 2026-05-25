import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TagsManager } from "@/components/settings/TagsManager";

export default async function TagsSettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!profile) redirect("/login");

  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });

  return <TagsManager initialTags={tags} isAdmin={profile.role === "ADMIN"} />;
}
