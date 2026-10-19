import Link from "next/link";

const NAV_LINKS = [
  { page: "today", href: "/today", label: "Today" },
  { page: "history", href: "/history", label: "History" },
  { page: "account", href: "/account", label: "Account" },
] as const;

type AppNavProps = {
  currentPage: (typeof NAV_LINKS)[number]["page"];
};

// Links between the signed-in pages. Shown at the top of each of them.
export function AppNav({ currentPage }: AppNavProps) {
  return (
    <nav aria-label="Main" className="flex gap-6 text-sm">
      {NAV_LINKS.map((link) => {
        const isCurrent = link.page === currentPage;
        return (
          <Link
            key={link.page}
            href={link.href}
            aria-current={isCurrent ? "page" : undefined}
            className={isCurrent ? "font-semibold" : "text-ink-secondary hover:text-ink"}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
