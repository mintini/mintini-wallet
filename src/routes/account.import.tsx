import {useEffect, useState} from "react";
import {useTelegram} from "../context/Telegram.tsx";
import {useNavigate} from "react-router-dom";
import {saveWallet} from "../lib/storage/database.ts";
import {useDatabase} from "../context/Database.tsx";
import {useEncryptionKey} from "../context/EncryptionKey.tsx";
import {useMintlayer} from "../context/Mintlayer.tsx";

interface Wallet {
  id: string;
  name: string;
  seedPhrase: string;
  cipherText?: string;
  iv?: string;
  salt?: string;
}

export function AccountImport () {
  const { db } = useDatabase();
  const { telegram } = useTelegram();
  const [ seed, setSeed ] = useState('');
  const [ error, setError ] = useState('');
  const { encryptionKey: password } = useEncryptionKey();
  const navigate = useNavigate();
  const { getWallets } = useMintlayer();

  useEffect(() => {
    if (telegram) {
      telegram.BackButton.show();
      telegram.BackButton.onClick(() => {
        navigate('/start');
      });
    }
  }, []);

  const seedValid = seed.length > 0 && (seed.split(' ').length === 12 || seed.split(' ').length === 24);

  const handleImport = async () => {
    try {
      const wallet: Wallet = {
        id: Date.now().toString(),
        name: 'Imported Wallet',
        seedPhrase: seed,
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

      navigate('/wallet');
    } catch (error) {
      console.log(error);
      setError('Ошибка импорта кошелька');
    }
  }

  const handleChange = (e: any) => {
    setSeed(e.target.value);
  }

  return (
    <div className="bg-mint-light w-full h-full">
      <div className="p-4 flex flex-col gap-4">
        <div className="text-black text-xl font-bold">
          Import existing account
        </div>
        <div>
          You can use 12- or 24- words seed phrase
        </div>
        <div className="relative border border-2 border-b-4 border-l-4 border-mint-dark rounded-xl bg-mint-light h-36 pl-5 py-6 pr-32">
          <textarea onChange={handleChange} className={`transition-all absolute top-0 left-0 w-full h-36 pl-5 py-6 pr-32 bg-transparent outline-0`}>
            {seed}
          </textarea>
        </div>
        <button onClick={handleImport} className={`text-mint-light text-center px-4 py-4 rounded-xl ${seedValid?'bg-mint-dark':'bg-mint'}`}>
          {seedValid?'I\'m done, take me to the wallet':'Enter seed phrase to continue'}
        </button>
        {error && <div className="text-red-500">{error}</div>}
      </div>
    </div>
  )
}
