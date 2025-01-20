export const generateKeyFromPassword = async (password: string, salt: string): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
};

export const generateEncryptionKey = async (): Promise<CryptoKey> => {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
};

export const exportKey = async (key: CryptoKey): Promise<string> => {
  const rawKey = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(rawKey)));
};

export const importKey = async (base64Key: string): Promise<CryptoKey> => {
  const binaryKey = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', binaryKey, 'AES-GCM', true, ['encrypt', 'decrypt']);
};

interface EncryptedData {
  cipherText: string;
  iv: string;
}

export const encryptData = async (key: CryptoKey, data: string): Promise<EncryptedData> => {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedData
  );

  return {
    cipherText: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
};

export const decryptData = async (key: CryptoKey, cipherText: string, iv: string): Promise<string> => {
  const decoder = new TextDecoder();
  const binaryCipher = Uint8Array.from(atob(cipherText), (c) => c.charCodeAt(0));
  const binaryIv = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: binaryIv,
    },
    key,
    binaryCipher
  );

  return decoder.decode(decrypted);
};
