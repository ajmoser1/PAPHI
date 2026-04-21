import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="relative isolate min-h-screen min-h-[100dvh] overflow-x-hidden bg-gradient-to-b from-background via-background to-muted/30">
      <div
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <Image
          src="/images/logos/sae-crest-bg.png"
          alt=""
          width={1400}
          height={1400}
          className="max-h-none w-[min(100vw,42rem)] h-auto max-w-[100vw] scale-[0.65] object-contain opacity-[0.22] blur-sm sm:scale-100 sm:opacity-[0.4] sm:w-[46rem] sm:max-w-none"
          priority
          sizes="100vw"
        />
      </div>
      {/* Hero */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16 md:py-20">
        <section className="flex w-full max-w-4xl flex-col items-center gap-8 text-center sm:gap-10">
          <div className="flex flex-col items-center space-y-6">
            
            <h1 className="max-w-3xl text-3xl text-purple-900 font-bold tracking-tight sm:text-5xl lg:text-6xl">
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
            <div className="mt-4 flex w-full max-w-sm flex-col items-center justify-center gap-5 sm:max-w-none sm:flex-row sm:gap-6 md:gap-8">
              <Image
                src="/images/logos/sae-greek-logo.svg"
                alt="Sigma Alpha Epsilon fraternity logo"
                width={160}
                height={160}
                className="h-24 w-24 shrink-0 object-contain sm:h-32 sm:w-32 sm:-translate-y-11"
                priority
                sizes="(max-width: 640px) 96px, 128px"
              />
              <Image
                src="/images/logos/cmu-wordmark.svg"
                alt="Carnegie Mellon University wordmark"
                width={260}
                height={46}
                className="h-9 w-auto max-w-[min(100%,260px)] object-contain sm:h-11 sm:-translate-y-10"
                priority
                sizes="(max-width: 640px) 200px, 260px"
              />
            </div>
          </div>
          </section>
        </main>
      
    </div>
  );
}
