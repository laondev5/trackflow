import { CheckSquare } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10 pt-safe">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <CheckSquare className="size-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TaskFlow</h1>
          <p className="text-sm text-muted-foreground">Plan your day. Never miss a deadline.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
