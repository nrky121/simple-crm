"use client";

import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatInitials } from "@/lib/format";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface TopNavProps {
  userFullName?: string | null;
  userEmail?: string;
  userAvatarUrl?: string | null;
}

export function TopNav({ userFullName, userEmail, userAvatarUrl }: TopNavProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName = userFullName ?? userEmail ?? "User";

  return (
    <header className="h-14 border-b bg-background flex items-center gap-4 px-4 shrink-0">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts, companies…"
          className="pl-9 h-9"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications (placeholder) */}
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userAvatarUrl ?? undefined} />
                <AvatarFallback className="text-xs">
                  {formatInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                {userEmail && (
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile">Profile settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={handleSignOut}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
