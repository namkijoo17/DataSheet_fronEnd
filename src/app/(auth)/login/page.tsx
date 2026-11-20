import type { Metadata } from 'next';

import { LoginForm } from '@/features/auth/login';

export const metadata: Metadata = {
  title: '로그인 | 데이터시트 전자입력 시스템',
  description: 'ECOTRONIX CORP. 데이터시트 전자입력 시스템 로그인',
};

export default function LoginPage() {
  return <LoginForm />;
}
