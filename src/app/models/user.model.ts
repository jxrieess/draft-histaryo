export interface User {
  uid: string;
  email: string;
  role: 'visitor' | 'curator' | 'admin';
}