// import { createContext, useContext, useEffect, useState } from 'react';
// import { getLastSyncTime, saveLastSyncTime } from '../lib/storage/database';
//
// const NetworkContext = createContext({});
//
// export const useNetworkStatus = () => useContext(NetworkContext);
//
// export const NetworkProvider = ({ db, syncInterval = 60000, children }) => {
//   const [isOnline, setIsOnline] = useState(navigator.onLine);
//   const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
//
//   useEffect(() => {
//     const fetchSyncTime = async () => {
//       const syncTime = await getLastSyncTime(db);
//       setLastSyncTime(syncTime);
//     };
//
//     fetchSyncTime();
//   }, [db]);
//
//   useEffect(() => {
//     const handleOnline = () => setIsOnline(true);
//     const handleOffline = () => setIsOnline(false);
//
//     window.addEventListener('online', handleOnline);
//     window.addEventListener('offline', handleOffline);
//
//     return () => {
//       window.removeEventListener('online', handleOnline);
//       window.removeEventListener('offline', handleOffline);
//     };
//   }, []);
//
//   useEffect(() => {
//     const syncData = async () => {
//       if (!isOnline) return;
//
//       try {
//         // Симуляция запроса данных с сервера
//         const now = new Date().toISOString();
//         console.log('Синхронизация данных...');
//         await saveLastSyncTime(db, now);
//         setLastSyncTime(now);
//       } catch (error) {
//         console.error('Ошибка синхронизации:', error);
//       }
//     };
//
//     const intervalId = setInterval(syncData, syncInterval);
//     syncData();
//
//     return () => clearInterval(intervalId);
//   }, [isOnline, db, syncInterval]);
//
//   return (
//     <NetworkContext.Provider value={{ isOnline, lastSyncTime }}>
//       {children}
//     </NetworkContext.Provider>
//   );
// };
