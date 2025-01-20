import {Link, useNavigate} from "react-router-dom";
import {useTelegram} from "../context/Telegram.tsx";
import {useEffect} from "react";
import {deleteDatabase} from "../lib/storage/database.ts";

export const SettingsSecurity = () => {
  const { telegram } = useTelegram();
  const navigate = useNavigate();

  useEffect(() => {
    if (telegram) {
      telegram.BackButton.show();
      telegram.BackButton.onClick(() => {
        navigate('/wallet');
      });
    }
  }, []);

  const resetToFactoryDefaults = () => {
    deleteDatabase();
    navigate('/');
  }

  return (
    <div className="bg-mint-light w-full h-full">
      <div className="bg-mint h-16 flex flex-row items-center justify-between px-4">
        <Link to="/settings" className="w-10 h-10 flex items-center justify-center rounded-2xl font-thin text-3xl">
          ←
        </Link>
        <div className="flex flex-row w-full text-center gap-2 justify-center text-2xl font-thin">
          <div>
            Settings - Security
          </div>
        </div>
      </div>
      <div className="px-4 py-4 flex flex-col gap-4">
        <div>
          <button onClick={resetToFactoryDefaults} className="border-mint text-red-400 border-2 w-full block py-3 rounded-2xl px-2 text-xl">Reset to factory defaults</button>
        </div>
      </div>
    </div>
  )
}
