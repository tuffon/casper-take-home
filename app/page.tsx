import Link from "next/link";
import { getSignedInUser } from "@/auth/current-user";

// The public home page: anyone can see it, signed in or not.
export default async function HomePage() {
  const user = await getSignedInUser();

  return (
    <section className="w-full max-w-2xl pt-8 text-center">
      <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.015em] sm:text-[56px]">
        Casper Take-Home
      </h1>

      {user ? (
        <>
          <p className="mt-4 text-[21px] text-ink-secondary">
            You’re signed in as {user.email}.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href="/today" className="button-primary">
              Open today’s page
            </Link>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
    </section>
  );
}
