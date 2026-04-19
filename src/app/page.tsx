import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center" aria-hidden="true">
        <Image
          src="/images/logos/sae-crest-bg.png"
          alt=""
          width={1400}
          height={1400}
          className="h-[46rem] w-[46rem] max-w-none object-contain opacity-[0.4] blur-sm"
          priority
        />
      </div>
      {/* Hero */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 py-16 sm:py-20">
        <section className="flex w-full max-w-4xl flex-col items-center gap-10 text-center">
          <div className="flex flex-col items-center space-y-6">
            
            <h1 className="max-w-3xl text-4xl text-purple-900 font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Sigma Alpha Epsilon PA PHI
            </h1>
            <p className="max-w-2xl text-lg text-foreground sm:text-xl">
              Find alumni by role or industry for referrals, mentorship, and opportunities.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <Link href="/auth/register" className={cn(buttonVariants({ size: "lg" }))}>
                Get started
              </Link>
              <Link href="/auth/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Sign in
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground">
              Built for SAE at Carnegie Mellon
            </p>
            <div className="mt-4 flex items-center justify-center gap-8">
              <Image
                src="/images/logos/sae-greek-logo.svg"
                alt="Sigma Alpha Epsilon fraternity logo"
                width={160}
                height={160}
                className="h-32 w-32 self-center object-contain -translate-y-11"
                priority
              />
              <Image
                src="/images/logos/cmu-wordmark.svg"
                alt="Carnegie Mellon University wordmark"
                width={260}
                height={46}
                className="h-11 w-auto self-center object-contain -translate-y-10"
                priority
              />
            </div>
          </div>
          </section>
        </main>
      
    </div>
  );
}
