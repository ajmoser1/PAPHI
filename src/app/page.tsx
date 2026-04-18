import Link from "next/link";
import Image from "next/image";
import {
  BriefcaseBusiness,
  Handshake,
  MessageSquareHeart,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const benefits = [
  {
    title: "Warm Referrals",
    description:
      "Find brothers at target companies and request thoughtful, warm introductions.",
    icon: Handshake,
  },
  {
    title: "1:1 Mentorship",
    description:
      "Connect with alumni mentors for resume feedback, interviews, and career strategy.",
    icon: MessageSquareHeart,
  },
  {
    title: "Career Opportunities",
    description:
      "Discover internships and full-time roles posted directly by trusted alumni.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Stronger Network",
    description:
      "Keep your chapter connected across classes, cities, and industries over time.",
    icon: Users,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b bg-background/80 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
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
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16 sm:py-20">
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              Private network for SAE brothers
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Turn your fraternity network into real career momentum
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Search alumni by role or industry, build meaningful connections, and
              get support for referrals, mentorship, and opportunities.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/auth/register" className={cn(buttonVariants({ size: "lg" }))}>
                Get started
              </Link>
              <Link href="/auth/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Sign in
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border bg-card/80 p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Built for SAE at Carnegie Mellon
            </p>
            <div className="mt-4 flex items-center gap-6">
              <Image
                src="/images/logos/sae-greek-logo.svg"
                alt="Sigma Alpha Epsilon fraternity logo"
                width={72}
                height={72}
                className="h-16 w-16 rounded-md object-contain"
                priority
              />
              <Image
                src="/images/logos/cmu-wordmark.svg"
                alt="Carnegie Mellon University wordmark"
                width={260}
                height={46}
                className="h-10 w-auto object-contain"
                priority
              />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xl font-semibold text-foreground">500+</p>
                <p>Potential alumni connections</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xl font-semibold text-foreground">24/7</p>
                <p>Access to your brotherhood</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Why members use this platform
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Everything is designed to help brothers support each other with faster,
              higher-quality career outcomes.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-xl border bg-card/70 p-5 shadow-sm transition hover:shadow-md"
              >
                <benefit.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-base font-semibold">{benefit.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{benefit.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
