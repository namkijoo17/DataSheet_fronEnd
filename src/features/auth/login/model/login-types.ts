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
  tokenType: string;
  expiresInMs: number;
  refreshExpiresInMs: number;
  user: AuthUser;
};
