import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { IDBPDatabase } from 'idb';
import { setupDatabase } from '../lib/storage/database';

interface Wallet {
  id: string;
  name: string;
  seedPhrase: string;
  cipherText?: string;
  iv?: string;
  salt?: string;
}

interface DatabaseSchema {
  state: {
    key: string;
    value: any;
  };
  accounts: Wallet;
}

interface DatabaseContextType {
  db: IDBPDatabase<DatabaseSchema> | null;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [db, setDb] = useState<IDBPDatabase<DatabaseSchema> | null>(null);

  useEffect(() => {
    const initDB = async () => {
      const database = await setupDatabase();
      setDb(database);
    };
    initDB();
  }, []);

  return <DatabaseContext.Provider value={{db}}>{children}</DatabaseContext.Provider>;
};
