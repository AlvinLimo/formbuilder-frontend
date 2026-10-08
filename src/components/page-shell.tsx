import { AppHeader } from "@/components/app-header";

const WIDTHS = {
  default: "max-w-6xl",
  narrow: "max-w-3xl",
} as const;

export function PageShell({
  children,
  headerActions,
  width = "default",
}: {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  width?: keyof typeof WIDTHS;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader actions={headerActions} />
      <main className={`mx-auto flex w-full ${WIDTHS[width]} flex-col gap-6 px-4 py-8`}>{children}</main>
    </div>
  );
}
