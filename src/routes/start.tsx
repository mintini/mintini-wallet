import {Link, useNavigate} from "react-router-dom";
import {useTelegram} from "../context/Telegram.tsx";
import {useEffect} from "react";
import {useEncryptionKey} from "../context/EncryptionKey.tsx";

export function Start () {
  const { telegram } = useTelegram();
  const navigate = useNavigate();
  const { encryptionKey } = useEncryptionKey();

  useEffect(() => {
    if(!encryptionKey) {
      navigate('/');
    }

    if (telegram) {
      telegram.BackButton.hide();
    }
  }, []);

  return (
    <div className="flex h-full w-full bg-mint-light">
      <div className="p-12 flex flex-col justify-between">
        <div className="h-96 rounded-xl">
          <img className="mix-blend-multiply" src="/images/add-wallet.jpg" />
        </div>
        <div>
          <div className="font-bold text-xl text-black">
            Mintini Wallet
          </div>
          <div className="text-mint-dark">
            First telegram bot wallet for Mintlayer blockchain
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <Link to="/account/create" className="bg-mint-dark text-mint-light font-bold rounded-xl px-4 py-4 text-center">
            Create new account
          </Link>
          <Link to="/account/import" className="border border-mint-dark font-bold text-mint-dark rounded-xl px-4 py-4 text-center">
            Import account
          </Link>
        </div>
      </div>
    </div>
  )
}
