import Link from "next/link";

const PAGE_LINKS = [
  { page: "today", href: "/today", label: "Today" },
  { page: "history", href: "/history", label: "History" },
] as const;

type AppNavProps = {
  currentPage: "today" | "history" | "account";
  userEmail: string; // its first letter is shown on the account button
};

// Navigation for signed-in pages: the main pages on the left, and the
// account button in the top-right corner, where people expect to find it.
export function AppNav({ currentPage, userEmail }: AppNavProps) {
  const isAccountPage = currentPage === "account";

  return (
    <nav aria-label="Main" className="flex items-center justify-between">
      <div className="flex gap-6 text-sm">
        {PAGE_LINKS.map((link) => {
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
      </div>

      <Link
        href="/account"
        aria-label="Your account"
        title={userEmail}
        aria-current={isAccountPage ? "page" : undefined}
        className="account-button"
      >
        {userEmail.charAt(0).toUpperCase()}
      </Link>
    </nav>
  );
}
