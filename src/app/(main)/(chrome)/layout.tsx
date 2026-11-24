import { ChromeShell } from '@/widgets/app-shell/ui/chrome-shell';

export default function ChromeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChromeShell>{children}</ChromeShell>;
}
