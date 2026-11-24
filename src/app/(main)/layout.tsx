import { AuthSessionManager } from '@/features/auth/session/auth-session-manager';
import { APP_SHELL_MAX_WIDTH_CLASS } from '@/widgets/app-shell/model/layout';
import { cn } from '@/shared/lib/utils';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-[#e8eaed]">
      <div
        className={cn(
          'mx-auto flex min-h-svh w-full flex-col bg-[#f5f6f7]',
          APP_SHELL_MAX_WIDTH_CLASS,
        )}
      >
        <AuthSessionManager />
        {children}
      </div>
    </div>
  );
}
