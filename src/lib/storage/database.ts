import {openDB, IDBPDatabase, deleteDB} from 'idb';
import { encryptData, decryptData, generateKeyFromPassword } from '../crypto';

interface Wallet {
  id: string;
  name: string;
  avatar?: string;
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

export const setupDatabase = async (): Promise<IDBPDatabase<DatabaseSchema>> => {
  return openDB<DatabaseSchema>('mintiniWalletDB', 4, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }
    },
  });
};

export const changeAccountName = async (db: IDBPDatabase<DatabaseSchema>, walletId: string, newName: string): Promise<void> => {
  const tx = db.transaction('accounts', 'readwrite');
  const account = await tx.store.get(walletId);
  if (account) {
    account.name = newName;
    await tx.store.put(account);
  }
  await tx.done;
}

export const changeAccountAvatar = async (db: IDBPDatabase<DatabaseSchema>, walletId: string, newAvatar: string): Promise<void> => {
  const tx = db.transaction('accounts', 'readwrite');
  const account = await tx.store.get(walletId);
  if (account) {
    account.avatar = newAvatar;
    await tx.store.put(account);
  }
  await tx.done;
}

export const deleteAccount = async (db: IDBPDatabase<DatabaseSchema>, walletId: string): Promise<void> => {
  const tx = db.transaction('accounts', 'readwrite');
  await tx.store.delete(walletId);
  await tx.done;
}

// Устанавливаем состояние
export const setState = async (db: IDBPDatabase<DatabaseSchema>, key: string, value: any): Promise<void> => {
  const tx = db.transaction('state', 'readwrite');
  await tx.store.put({ key, value });
  await tx.done;
};

// Получаем состояние
export const getState = async (db: IDBPDatabase<DatabaseSchema>, key: string): Promise<any> => {
  const tx = db.transaction('state', 'readonly');
  const result = await tx.store.get(key);
  return result ? result.value : null;
};

export const saveLastSyncTime = async (db: IDBPDatabase<DatabaseSchema>, time: string): Promise<void> => {
  await setState(db, 'lastSyncTime', time); // Ключ `lastSyncTime` для сохранения времени
};

export const getLastSyncTime = async (db: IDBPDatabase<DatabaseSchema>): Promise<string | null> => {
  return await getState(db, 'lastSyncTime'); // Ключ `lastSyncTime` для получения времени
};

export const saveLastOpenedWallet = async (db: IDBPDatabase<DatabaseSchema>, walletId: string): Promise<void> => {
  await setState(db, 'lastOpenedWallet', walletId);
};

export const getLastOpenedWallet = async (db: IDBPDatabase<DatabaseSchema>): Promise<string | null> => {
  return await getState(db, 'lastOpenedWallet');
};

export const saveNetwork = async (db: IDBPDatabase<DatabaseSchema>, network: string): Promise<void> => {
  await setState(db, 'network', network);
}

export const getNetwork = async (db: IDBPDatabase<DatabaseSchema>): Promise<string | null> => {
  return await getState(db, 'network');
}

export const getAllAccounts = async (db: IDBPDatabase<DatabaseSchema>): Promise<Wallet[]> => {
  const tx = db.transaction('accounts', 'readonly');
  const accounts = await tx.store.getAll();
  await tx.done;
  return accounts;
};

export const addAccount = async (db: IDBPDatabase<DatabaseSchema>, account: Wallet): Promise<void> => {
  const tx = db.transaction('accounts', 'readwrite');
  await tx.store.add(account);
  await tx.done;
};

export const saveWallet = async (db: IDBPDatabase<DatabaseSchema>, wallet: Wallet, password: string): Promise<void> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encryptionKey = await generateKeyFromPassword(password, btoa(String.fromCharCode(...salt)));
  const { cipherText, iv } = await encryptData(encryptionKey, wallet.seedPhrase);

  const walletData = {
    id: wallet.id, // Уникальный ID кошелька
    name: wallet.name, // Имя пользователя
    cipherText, // Зашифрованная сид-фраза
    iv, // Вектор инициализации
    salt: btoa(String.fromCharCode(...salt)), // Сохраняем соль в Base64
  };

  const tx = db.transaction('accounts', 'readwrite');
  await tx.store.put(walletData);
  await tx.done;
};

export const loadWallets = async (db: IDBPDatabase, password: string): Promise<Wallet[]> => {
  const tx = db.transaction('accounts', 'readonly');
  const wallets = await tx.store.getAll();

  const decryptedWallets: Wallet[] = [];

  for (const wallet of wallets) {
    try {
      const salt = wallet.salt!; // Восстанавливаем соль

      // Генерируем ключ из пароля
      const encryptionKey = await generateKeyFromPassword(password, salt);

      // Расшифровываем сид-фразу
      const seedPhrase = await decryptData(encryptionKey, wallet.cipherText!, wallet.iv!);

      decryptedWallets.push({
        id: wallet.id,
        name: wallet.name,
        avatar: wallet.avatar,
        seedPhrase,
      });
    } catch (e) {
      // Пропускаем кошельки, которые не удалось расшифровать
    }
  }

  return decryptedWallets;
};

export const saveTransactions = async (
  db: IDBPDatabase<any>,
  walletId: string,
  transactions: any[]
): Promise<void> => {
  const tx = db.transaction('transactions', 'readwrite');
  for (const txData of transactions) {
    await tx.store.put({ ...txData, walletId }); // Добавляем walletId
  }
  await tx.done;
};

export const getTransactionsByWallet = async (
  db: IDBPDatabase<any>,
  walletId: string
): Promise<any[]> => {
  const tx = db.transaction('transactions', 'readonly');
  const allTransactions = await tx.store.getAll();
  return allTransactions.filter((tx) => tx.walletId === walletId); // Фильтрация по walletId
};

export const removeTransactionsByWallet = async (
  db: IDBPDatabase<any>,
  walletId: string
): Promise<void> => {
  const tx = db.transaction('transactions', 'readwrite');
  const allTransactions = await tx.store.getAll();
  for (const txData of allTransactions) {
    if (txData.walletId === walletId) {
      await tx.store.delete(txData.id);
    }
  }
  await tx.done;
}

export const removeOneTransaction = async (
  db: IDBPDatabase<any>,
  txId: string
): Promise<void> => {
  const tx = db.transaction('transactions', 'readwrite');
  await tx.store.delete(txId);
  await tx.done;
}

export const deleteDatabase = async (): Promise<void> => {
  await deleteDB('mintiniWalletDB', {
    blocked() {
      // …
    },
  });
}
