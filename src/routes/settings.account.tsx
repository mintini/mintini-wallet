// @ts-nocheck
import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {useTelegram} from "../context/Telegram.tsx";
import {useDatabase} from "../context/Database.tsx";
import {useMintlayer} from "../context/Mintlayer.tsx";

export const SettingsAccount = () => {
  const { telegram } = useTelegram();
  const { db } = useDatabase();
  const navigate = useNavigate();
  const [ revealConfirm, setRevealConfirm ] = useState(false);
  const [ seedPhrase, setSeedPhrase ] = useState('');
  const { wallet } = useMintlayer();

  const handleRevealSeedPhrase = () => {
    if(revealConfirm) {
      setSeedPhrase(wallet.seedPhrase);
    } else {
      setRevealConfirm(true);
    }
  }


  useEffect(() => {
    if (telegram) {
      telegram.BackButton.show();
      telegram.BackButton.onClick(() => {
        navigate('/wallet');
      });
    }
  }, []);

  return (
    <div className="bg-mint-light w-full h-full">
      <div className="bg-mint h-16 flex flex-row items-center justify-between px-4">
        <Link to="/settings" className="w-12 h-10 flex items-center justify-center rounded-2xl font-thin text-3xl">
          ←
        </Link>
        <div className="flex flex-row w-full text-center gap-2 justify-center text-2xl font-thin">
          <div>
            Settings - Account
          </div>
        </div>
      </div>
      <div className="px-4 py-4 flex flex-col gap-4">
        {
          !seedPhrase && (
            <div>
              <div onClick={handleRevealSeedPhrase} className="border-mint border-2 px-4 py-2 rounded-2xl">
                {
                  revealConfirm ? 'I understand that nobody should see this except me. Reveal seed phrase.' : 'Reveal seed phrase'
                }
              </div>
            </div>
          )
        }
        {seedPhrase && revealConfirm && (
          <ul className="grid grid-cols-3 gap-2">
            {seedPhrase.split(' ').map((word: string, index: number) => (
              <li key={index} className="border-mint border-2 px-4 py-2 rounded-2xl list-decimal list-inside">{word}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
