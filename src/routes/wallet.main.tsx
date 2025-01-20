import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {useTelegram} from "../context/Telegram.tsx";
import {useMintlayer} from "../context/Mintlayer.tsx";
import QRCode from "react-qr-code";

export const WalletMain = () => {
  const { telegram } = useTelegram();
  const {
    addresses,
    tokens: token_list,
    // tokensLoading,
    isTestnet
  } = useMintlayer();
  const [ showReceive, setShowReceive ] = useState(false);
  const [ tab, setTab ] = useState(0);
  const [ addressIndex, setAddressIndex ] = useState(0);

  const [ copySuccess, setCopySuccess ] = useState('');

  useEffect(() => {
    if (telegram) {
      telegram.BackButton.hide();
    }
  }, []);

  useEffect(() => {
    // TODO - update
  }, [addresses]);

  if(!addresses[0]) {
    return <div>Loading...</div>
  }

  const tokens = token_list.map((item: any) => {
    return {
      ticker: item.symbol,
      balance: item.balance,
      value: item.value,
    }
  });

  const handleShowReceive = () => {
    setShowReceive(true)
  }

  const handleHideReceive = () => {
    setShowReceive(false)
  }

  const handleGenerateNewAddress = () => {
    setAddressIndex(addressIndex + 1)
  }

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess('Copied!');
    setTimeout(() => {
      setCopySuccess('');
    }, 1000);
  };

  const total = tokens.reduce((acc: number, item: any) => acc + item.value, 0);

  return (
    <>
      <div className="mx-4 my-4">
        <div className="flex flex-col gap-4">
          {
            isTestnet ? (
              <div className="flex flex-col items-center justify-center">
                <div className="text-black text-xl font-light">Total Value</div>
                <div className="text-4xl font-medium">-</div>
                <div className="text-normal font-mono">testnet coins are worthless</div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="text-black text-xl font-light">Total Value</div>
                <div className="text-4xl font-medium">{total.toFixed(2)}$</div>
              </div>
            )
          }

          <div className="flex flex-row gap-4 justify-center">
            <Link to="/wallet/send" className="border border-mint-dark px-6 py-3 rounded-xl">
              Send
            </Link>
            <div className="border border-mint-dark px-6 py-3 rounded-xl" onClick={handleShowReceive}>
              Receive
            </div>
            <Link to="/wallet/dex" className="border border-mint-dark px-6 py-3 rounded-xl">
              Swap
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-row mt-4 justify-center">
        <div className="w-20 h-1 bg-mint-dark rounded"></div>
      </div>

      <div className="my-4">
        <div className="flex flex-row justify-center gap-3">
          {
            [
              'Tokens',
              // 'NFTs'
            ].map((item, index) => (
              <div key={index} onClick={() => setTab(index)} className={`font-bold transition-all border border-b-4 border-mint-dark px-2 py-3 rounded-xl ${tab===index?'text-black bg-mint border-t-4 border-b-0 border-t-mint-dark':'text-mint-dark '}`}>
                {item}
              </div>
            ))
          }
        </div>

        {/*{*/}
        {/*  tokensLoading && (*/}
        {/*    <div className="mt-4 mx-4">Fetching balance</div>*/}
        {/*  )*/}
        {/*}*/}
        <div className="flex flex-col py-4 mx-4 gap-1">
          {
            tokens.map((_: any, index: any) => (
              <div key={index} className="flex flex-row justify-between items-center border border-mint-dark px-2 py-1 rounded-xl">
                <div className="flex flex-row gap-2 items-center">
                  <div className="rounded-full w-10 h-10 bg-mint flex flex-col justify-center items-center">
                    {_.ticker[0]}
                  </div>
                  <div>
                    <div className="font-bold">
                      {_.ticker}
                    </div>
                    <div className="text-sm text-mint-dark">
                      {_.balance} {_.ticker}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="font-medium">
                    {
                      isTestnet ? '-' : _.value.toFixed(2) + '$'
                    }
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      <div className={`absolute top-0 bottom-0 left-0 right-0 z-50 ${showReceive ? 'visible' : 'invisible'}`}>
        <div className={`transition-all ease-out absolute px-4 py-4 top-3 right-3 left-3 rounded-xl bg-white ${showReceive ? 'visible scale-100 ease-in opacity-100' : 'invisible scale-75 opacity-0'}`}>
          <div onClick={handleHideReceive} className="absolute top-2 right-2 text-4xl">✖</div>
          <div className="text-center text-xl mb-2">
            Receive
          </div>
          <div className="w-full h-60 flex justify-center items-center">
            <div className="h-60 w-60">
              <QRCode value={addresses[addressIndex]} />
            </div>
          </div>
          <div className="text-center mt-8 mb-4">
            tap addess to copy
          </div>
          <div className="break-all font-mono text-2xl text-center relative"
               onClick={() => handleCopyToClipboard(addresses[addressIndex])}>
            {addresses[addressIndex]}
            <div className={`text-center text-xl absolute top-0 w-full rounded-2xl transition-all bg-mint-light px-3 py-5 ${copySuccess?"opacity-100":"opacity-0"}`}>
              Copied to clipboard
            </div>
          </div>
          <div className="bg-mint-light mt-6 rounded-[10px] text-xl font-light text-center py-2" onClick={handleGenerateNewAddress}>
            show next address
          </div>
        </div>
      </div>
    </>
  )
}
