import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {useTelegram} from "../context/Telegram.tsx";
import {useDatabase} from "../context/Database.tsx";
import {getNetwork, saveNetwork} from "../lib/storage/database.ts";
import {useMintlayer} from "../context/Mintlayer.tsx";

export const SettingsDeveloper = () => {
  const { telegram } = useTelegram();
  const { db } = useDatabase();
  const { changeNetwork } = useMintlayer();
  const navigate = useNavigate();

  const [testnetMode, setTestnetMode] = useState(false);

  useEffect(() => {
    if (telegram) {
      telegram.BackButton.show();
      telegram.BackButton.onClick(() => {
        navigate('/wallet');
      });
    }
  }, []);

  useEffect(() => {
    if (!db) {
      return;
    }
    getNetwork(db).then(r => {
      setTestnetMode(r === 'testnet');
    });
  }, []);

  const toggleTestnetMode = () => {
    if (!db) {
      return;
    }
    saveNetwork(db, !testnetMode ? 'testnet' : 'mainnet').then(r => {
      console.log('Network saved', r);
    });
    changeNetwork(!testnetMode ? 'testnet' : 'mainnet');
    setTestnetMode(!testnetMode);
  }

  return (
    <div className="bg-mint-light w-full h-full">
      <div className="bg-mint h-16 flex flex-row items-center justify-between px-4">
        <Link to="/settings" className="w-12 h-10 flex items-center justify-center rounded-2xl font-thin text-3xl">
          ←
        </Link>
        <div className="flex flex-row w-full text-center gap-2 justify-center text-2xl font-thin">
          <div>
            Settings - Developer
          </div>
        </div>
      </div>
      <div className="px-4 py-4 flex flex-col gap-4">
        <div>
          <div onClick={toggleTestnetMode} className="px-2 py-2 rounded-2xl border border-mint-dark flex flex-row justify-between">
            Testnet mode
            <span className={`transition-all border rounded-full border-mint flex items-center cursor-pointer w-12 justify-start ${testnetMode?'justify-end':'justify-start'} ${testnetMode?'bg-mint-dark':'bg-red-50'}`}>
              <span className="rounded-full border w-6 h-6 border-mint shadow-inner bg-mint shadow" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
