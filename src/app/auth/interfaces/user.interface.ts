
import { Permission } from '../permissions/permissions'

export interface User {
  email:    string;
  name:     string;
  isActive: boolean;
  roles:    string[];
  _id:      string;
  permissions?: Permission[];
  profile?: {
    gender?: 'male' | 'female' | 'unspecified';
    phone?: string;
    identification?: string;
    department?: string;
    position?: string;
    theme?: 'light' | 'dark';
    avatarDataUrl?: string;
  };
}
