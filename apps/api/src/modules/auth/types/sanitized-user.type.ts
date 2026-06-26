export interface SanitizedUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  role: {
    id: string;
    name: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
}
