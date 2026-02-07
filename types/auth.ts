export type Role = 'OWNER' | 'DRIVER' | 'ADMIN';

export type AppUser = {
  id: string;
  email: string;
  role: Role;
  supabaseUserId: string;
};
