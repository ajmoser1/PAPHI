import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-lg tracking-tight">
          PA PHI
        </span>
        <div className="flex gap-3">
          <Link href="/auth/login" className={cn(buttonVariants({ variant: "ghost" }))}>
            Sign in
          </Link>
          <Link href="/auth/register" className={cn(buttonVariants())}>
            Join
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 py-24">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl max-w-2xl">
          Connect with your brotherhood
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl">
          Search alumni by company or industry, view profiles, and send direct
          messages — all in one place.
        </p>
        <div className="flex gap-4 mt-2">
          <Link href="/auth/register" className={cn(buttonVariants({ size: "lg" }))}>
            Get started
          </Link>
          <Link href="/auth/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
