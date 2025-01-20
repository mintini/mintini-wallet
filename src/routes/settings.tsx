import {Link, useNavigate} from "react-router-dom";
import {useTelegram} from "../context/Telegram.tsx";
import {useEffect} from "react";
import {useEncryptionKey} from "../context/EncryptionKey.tsx";

export const Settings = () => {
  const { telegram } = useTelegram();
  const navigate = useNavigate();
  const { setEncryptionKey } = useEncryptionKey();

  useEffect(() => {
    if (telegram) {
      telegram.BackButton.show();
      telegram.BackButton.onClick(() => {
        navigate('/wallet');
      });
    }
  }, []);

  const handleLogout = () => {
    setEncryptionKey(null);
  }

  return (
    <div className="bg-mint-light w-full h-full">
      <div className="bg-mint h-16 flex flex-row items-center justify-between px-4">
        <Link to="/wallet" className="w-10 h-10 flex items-center justify-center rounded-2xl font-thin text-3xl">
          ←
        </Link>
        <div className="flex flex-row w-full text-center gap-2 justify-center text-2xl font-thin">
          <div>
            Settings
          </div>
        </div>
      </div>
      <div className="px-4 py-4 flex flex-col gap-4">
        <div>
          <Link to="/settings/account" className="border-mint border-2 w-full block py-3 rounded-2xl px-2 text-xl">Account settings</Link>
        </div>
        <div>
          <Link to="/settings/security" className="border-mint border-2 w-full block py-3 rounded-2xl px-2 text-xl">Privacy and security</Link>
        </div>
        <div>
          <Link to="/settings/developer" className="border-mint border-2 w-full block py-3 rounded-2xl px-2 text-xl">Developer</Link>
        </div>
        <div>
          <button className="w-full bg-mint py-3 rounded-2xl" onClick={handleLogout}>Lock wallet</button>
        </div>
      </div>
    </div>
  )
}
