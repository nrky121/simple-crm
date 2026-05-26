import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  console.log("[layout] user.id:", user.id, "type:", typeof user.id);
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { fullName: true, avatarUrl: true },
  }).catch((e: unknown) => {
    const err = e as Record<string, unknown>;
    console.error("[layout:profile] code:", err?.code, "msg:", err?.message, "meta:", JSON.stringify(err?.meta));
    return null;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav
          userFullName={profile?.fullName}
          userEmail={user.email}
          userAvatarUrl={profile?.avatarUrl}
        />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
