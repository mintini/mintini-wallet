import { Navigate, Outlet } from 'react-router-dom';
import { useEncryptionKey } from '../context/EncryptionKey.tsx';

const ProtectedRoute = () => {
  const { encryptionKey } = useEncryptionKey();

  if (!encryptionKey) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
