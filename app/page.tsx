import Link from "next/link";
import { redirect } from "next/navigation";
import { getSignedInUser } from "@/auth/current-user";

// The public home page. Signed-in writers skip it and go straight to today's
// prompt (/today sends anyone without a profile to the setup questions).
export default async function HomePage() {
  if (await getSignedInUser()) {
    redirect("/today");
  }

  return (
    <section className="w-full max-w-2xl pt-8 text-center">
      <p className="text-sm text-ink-secondary">Casper take-home project</p>
      <h1 className="mt-3 font-serif text-[44px] leading-[1.1] font-semibold tracking-[-0.015em] sm:text-[60px]">
        Writers Block
        <span className="caret" aria-hidden="true" />
      </h1>
      <p className="mt-4 text-[21px] text-ink-secondary">
        A daily writing practice. One prompt, one page, every day.
      </p>
      <div className="mt-10 flex justify-center gap-4">
        <Link href="/signup" className="button-primary">
          Create an account
        </Link>
        <Link href="/login" className="button-secondary">
          Sign in
        </Link>
      </div>
    </section>
  );
}
