import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/constants';

export const usePermissions = () => {
  const { user } = useAuth();
  return PERMISSIONS[user?.role] || {};
};
