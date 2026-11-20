import { z } from 'zod';

export const loginSchema = z.object({
  employeeId: z.string().min(1, '사번 / 아이디를 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const MAX_LOGIN_ATTEMPTS = 5;
