import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/settings/ProfileForm";

export default async function ProfileSettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      team: true,
      role: true,
    },
  });

  if (!profile) redirect("/login");

  return <ProfileForm profile={profile} />;
}
