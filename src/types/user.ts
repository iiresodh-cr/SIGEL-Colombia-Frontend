export type UserRole = 'SuperAdmin' | 'Administrador' | 'Abogado' | 'Invitado';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
}