import { AppHeader, BottomNav } from '@/widgets/app-shell';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-[#f5f6f7]">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-24 pt-6 md:px-6 md:pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
