import {NavLink, Link} from "react-router-dom";
import {useTelegram} from "../context/Telegram.tsx";
import {useEffect, useState} from "react";
import {Outlet} from "react-router";
import {useMintlayer} from "../context/Mintlayer.tsx";
import {useNavigate} from "react-router-dom";

export const WalletLayout = () => {
  const { telegram } = useTelegram();
  const navigate = useNavigate();
  const { wallets, selectWallet, wallet, isTestnet } = useMintlayer();

  const [sidebar, setSidebar] = useState(false);

  useEffect(() => {
    if (telegram) {
      telegram.BackButton.hide();
    }
  }, []);

  return (
    <div className="bg-mint-light w-full min-h-full pb-20 pt-20">
      <div className="bg-mint h-16 flex flex-row items-center justify-between px-4 fixed top-0 left-0 w-full z-50">
        <div className="flex flex-row items-center gap-2">
          <div onClick={() => setSidebar(true)}
               className="rounded-full bg-white w-10 h-10 flex items-center justify-center font-bold">
            {wallet?.name[0]}
          </div>
          <div className="text-xl font-light">
            {wallet?.name}
          </div>
        </div>
        <div className="flex flex-row gap-6 items-center justify-center">
          {/*<div className="flex items-center">*/}
          {/*  <Link className="text-3xl rounded-2xl relative w-8 h-8" to="/notifications">*/}
          {/*    /!*<span className="absolute block -top-1 -right-1 w-3 h-3 rounded-full z-10 bg-red-400"></span>*!/*/}
          {/*    <img className={"w-8 h-8 mix-blend-multiply"} src="/icons/ring.png" alt="Notifications"/>*/}
          {/*  </Link>*/}
          {/*</div>*/}
          <div className="flex items-center">
            <Link className="text-3xl  rounded-2xl relative" to="/settings">
              <img className={"w-8 h-8 mix-blend-multiply"} src="/icons/settings.png" alt="Notifications"/>
            </Link>
          </div>
        </div>
      </div>

      <div
        className={`fixed left-0 top-0 bottom-0 bg-gray-200 w-20 z-50 flex flex-col justify-between transform-gpu transition-all ${sidebar ? '' : '-ml-20'}`}>
        <div className="flex flex-col justify-center items-center">
          <div className="w-10 h-10 mt-3 mb-3 bg-white flex items-center justify-center rounded-full"
               onClick={() => setSidebar(false)}>
            ✖
          </div>
          {
            wallets?.map((_: any, index: number) => (
              <div onClick={() => {
                selectWallet(index);
                setSidebar(false);
                navigate('/wallet');
              }} key={index} className="flex flex-col items-center justify-center h-20 w-20">
                <div className="rounded-full bg-mint w-10 h-10 flex items-center justify-center font-bold">
                  {_.name[0]}
                </div>
                <div className="text-xs text-center">
                  {_.name}
                </div>
              </div>
            ))
          }
        </div>
        <div className="flex flex-col justify-center items-center mb-4 gap-4 mx-3 border-t-4 border-t-mint-dark pt-6">
          {/*<Link to="/manage" className="rounded-2xl bg-white flex flex-col items-center justify-center h-10 w-10">✎</Link>*/}
          <Link to="/start"
                className="rounded-2xl bg-white flex flex-col items-center justify-center h-10 w-10">➕</Link>
        </div>
      </div>

      {
        isTestnet && (
          <div className="-mt-4 mb-4 text-center font-mono fixed left-0 right-0 top-20 z-40">
            <div className="bg-amber-200 h-2"></div>
            <div className="text-black bg-amber-200 relative -top-2 px-2 rounded-b-xl w-auto inline-block">testnet mode
            </div>
          </div>
        )
      }

      <div className="before:content-[var(--tg-content-safe-area-inset-bottom)] text-white bg-black text-lg">
      </div>

      <Outlet/>

      <div className="fixed left-0 bottom-0 w-full bg-mint justify-around flex items-center pt-1 pb-5">
        <div className="my-2 justify-around flex items-center w-full">
          <NavLink end className={({isActive}) => `${isActive ? 'bg-mint-light' : 'bg-mint'} rounded-xl px-2 py-2`}
                   to="/wallet">
            <img src='/icons/house.svg' className="w-8 h-8" alt="qr-code-scanner"/>
          </NavLink>
          <NavLink className={({isActive}) => `${isActive ? 'bg-mint-light' : 'bg-mint'} rounded-xl px-2 py-2`}
                   to="/wallet/dex">
            <img src='/icons/swap.svg' className="w-8 h-8" alt="qr-code-scanner"/>
          </NavLink>
          <NavLink className={({isActive}) => `${isActive ? 'bg-mint-light' : 'bg-mint'} rounded-xl px-2 py-2`}
                   to="/wallet/pools">
            <img src='/icons/grow.svg' className="w-8 h-8" alt="qr-code-scanner"/>
          </NavLink>
          <NavLink className={({isActive}) => `${isActive ? 'bg-mint-light' : 'bg-mint'} rounded-xl px-2 py-2`}
                   to="/wallet/activity">
            <img src='/icons/history.svg' className="w-8 h-8" alt="qr-code-scanner"/>
          </NavLink>
        </div>
      </div>
    </div>
  )
}
