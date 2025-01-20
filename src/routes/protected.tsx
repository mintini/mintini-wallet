import { Navigate, Outlet } from 'react-router-dom';
import { useEncryptionKey } from '../context/EncryptionKey.tsx';

const ProtectedRoute = () => {
  const { encryptionKey } = useEncryptionKey();

  if (!encryptionKey) {
    return <Navigate to="/" replace />; // Перенаправляем на страницу логина
  }

  return <Outlet />; // Продолжаем рендерить защищённые маршруты
};

export default ProtectedRoute;
