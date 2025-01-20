import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

// Define the type for the context value
interface EncryptionKeyContextType {
  encryptionKey: string | null;
  setEncryptionKey: Dispatch<SetStateAction<string | null>>;
}

// Create the context with the defined type
const EncryptionKeyContext = createContext<EncryptionKeyContextType | null>(null);

// Hook to access the encryption key
export const useEncryptionKey = (): EncryptionKeyContextType => {
  const context = useContext(EncryptionKeyContext);
  if (!context) {
    throw new Error('useEncryptionKey must be used within an EncryptionKeyProvider');
  }
  return context;
};

// Define the type for the provider props
interface EncryptionKeyProviderProps {
  children: ReactNode;
}

// Context provider
export const EncryptionKeyProvider: React.FC<EncryptionKeyProviderProps> = ({ children }) => {
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  return (
    <EncryptionKeyContext.Provider value={{ encryptionKey, setEncryptionKey }}>
      {children}
    </EncryptionKeyContext.Provider>
  );
};
