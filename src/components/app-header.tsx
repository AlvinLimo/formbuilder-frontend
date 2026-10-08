import Image from "next/image";
import Link from "next/link";
import { InboxLink } from "@/components/inbox-link";
import { UserMenu } from "@/components/user-menu";
import { BRAND } from "@/lib/brand";

export function AppHeader({ actions }: { actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Image src={BRAND.logo} alt={BRAND.name} width={96} height={32} priority />
          <span className="hidden h-6 w-px bg-border sm:block" />
          <span className="hidden text-sm font-semibold text-foreground sm:block">{BRAND.product}</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Forms
          </Link>
          <InboxLink />
          {actions}
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
