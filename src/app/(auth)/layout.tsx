export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 end-8 h-52 w-52 rounded-full bg-[#f8d84a]/20 blur-3xl" />
        <div className="absolute bottom-10 start-8 h-48 w-48 rounded-full bg-[#ff4fa3]/15 blur-3xl" />
        <div className="absolute top-1/2 end-1/4 h-40 w-40 rounded-full bg-[#2f80ff]/15 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
