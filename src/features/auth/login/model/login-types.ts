export type AuthUser = {
  id: number;
  employeeId: string;
  name: string;
  role: string;
};

export type LoginRequest = {
  employeeId: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresInMs: number;
  user: AuthUser;
};
