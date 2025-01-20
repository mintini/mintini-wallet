import {Link, useNavigate} from "react-router-dom";
import {useTelegram} from "../context/Telegram.tsx";
import {useEffect} from "react";

export const Notifications = () => {
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

  return (
    <div className="bg-mint-light w-full h-full">
      <div className="bg-mint h-16 flex flex-row items-center justify-between px-4">
        <Link to="/wallet" className="w-10 h-10 flex items-center justify-center rounded-2xl text-3xl font-thin">
          ←
        </Link>
        <div className="flex flex-row w-full text-center gap-2 justify-center text-2xl font-thin">
          <div>
            Notifications
          </div>
        </div>
      </div>
      <div className="px-4 py-4 flex flex-col gap-4">
        <div>
          ...
        </div>
      </div>
    </div>
  )
}
