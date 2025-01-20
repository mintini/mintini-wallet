import {useEffect, useState} from "react";
import * as bip39 from 'bip39';
import {useTelegram} from "../context/Telegram.tsx";
import {useNavigate} from "react-router-dom";

import {useEncryptionKey} from "../context/EncryptionKey.tsx";
import {saveWallet} from "../lib/storage/database.ts";
import {useDatabase} from "../context/Database.tsx";
import {useMintlayer} from "../context/Mintlayer.tsx";

interface Wallet {
  id: string;
  name: string;
  seedPhrase: string;
  cipherText?: string;
  iv?: string;
  salt?: string;
}

export function AccountCreate () {
  const { db } = useDatabase();
  const [seed, setSeed] = useState('');
  const [seedRevealed, setSeedRevealed] = useState(false);
  const [error, setError] = useState('');
  const { encryptionKey: password } = useEncryptionKey();
  const { getWallets, wallets } = useMintlayer();

  const { telegram } = useTelegram();
  const navigate = useNavigate();

  useEffect(() => {
    if (telegram) {
      telegram.BackButton.show();
      telegram.BackButton.onClick(() => {
        navigate('/start');
      });
    }
  }, []);

  const toggleSeedReveal = () => {
    setSeedRevealed(!seedRevealed);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(seed);
  }

  useEffect(() => {
    const seedPhrase = bip39.generateMnemonic();
    setSeed(seedPhrase)
  }, []);

  const handleCreate = async () => {
    try {
      const walletIndex = wallets.length + 1;
      // Сохраняем новый кошелек
      const wallet: Wallet = {
        id: Date.now().toString(),
        name: 'Account ' + walletIndex,
        seedPhrase: seed, // Сид-фраза или автогенерация
      };
      if(!db) {
        setError('База данных недоступна');
        return;
      }
      if(!password) {
        setError('Пароль не установлен');
        return;
      }
      await saveWallet(db, wallet, password);
      await getWallets();

      navigate('/wallet'); // Переходим к списку кошельков
    } catch (error) {
      console.log(error);
      setError('Ошибка создания кошелька');
    }
  }

  return (
    <div className="bg-mint-light w-full h-full">
      <div className="p-4 flex flex-col gap-4">
        <div className="text-black text-xl font-bold">
          Create new account
        </div>
        <div>
          You can find seed phrase. Store it safely
        </div>
        <div className="relative border border-2 border-b-4 border-l-4 border-mint-dark rounded-xl bg-mint-light pl-5 py-6 pr-32">
          <div className={`transition-all h-18 ${seedRevealed? '' : 'blur'}`}>
            {seed}
          </div>
          <div onClick={toggleSeedReveal} className={`absolute transition-all px-3 py-3 backdrop-blur backdrop-brightness-50 bg-mint-light rounded font-bold top-6 left-28 ${seedRevealed ? 'opacity-0' : ''}`}>
            reveal
          </div>
          <div onClick={handleCopy} className="text-mint-dark font-bold absolute transition-all right-0 top-0 rounded-xl active:top-0.5 active:right-0.5 active:border-b-2 active:border-l-2 border-b-4 border-l-4 border-mint-dark px-2 py-3">
            copy
          </div>
        </div>
        <button onClick={handleCreate} className="bg-mint-dark text-mint-light text-center px-4 py-4 rounded-xl">
          I'm done, take me to the wallet
        </button>
        {error && <div className="text-red-500">{error}</div>}
      </div>
    </div>
  )
}
