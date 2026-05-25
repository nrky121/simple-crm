import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/tags", label: "Tags" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and workspace settings.</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Side nav */}
        <nav className="flex shrink-0 flex-row gap-1 lg:w-48 lg:flex-col">
          {NAV_ITEMS.map((item) => (
            <SettingsNavLink key={item.href} href={item.href}>
              {item.label}
            </SettingsNavLink>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function SettingsNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  // We use a plain <a> here so it works without client hooks in a server component.
  // Active styling is handled via CSS :where selector for current page.
  return (
    <a
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </a>
  );
}
