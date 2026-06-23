export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-sm uppercase tracking-[0.3em] text-gold">Código 21</p>
        {children}
      </div>
    </main>
  );
}
