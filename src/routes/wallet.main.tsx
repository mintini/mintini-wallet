import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {useTelegram} from "../context/Telegram.tsx";
import {useMintlayer} from "../context/Mintlayer.tsx";
import QRCode from "react-qr-code";

const COINS: any = {
  'ML': {
    icon: '/coins/ml.svg',
  }
};

export const WalletMain = () => {
  const { telegram } = useTelegram();
  const {
    addresses,
    tokens: token_list,
    // tokensLoading,
    isTestnet,
    unconfirmedTokens,
  } = useMintlayer();
  const [ showReceive, setShowReceive ] = useState(false);
  // const [ tab, setTab ] = useState(0);
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

  const formatBalance = (value: string, fraction = 2) => {
    const number = parseFloat(value);

    if (number < 1000) {
      return value;
    }

    const roundedNumber = Math.round(number * 100) / 100;
    const [integerPart, fractionalPart] = roundedNumber.toFixed(fraction).split(".");
    const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return formattedIntegerPart + (fractionalPart ? "." + fractionalPart : "");
  };

  const tokens = token_list.map((item: any) => {
    return {
      ticker: item.symbol,
      balance: item.balance,
      balance_formatted: formatBalance(item.balance),
      value: item.value,
      value_change_percent: item.value_change_percent,
      value_change: item.value * item.value_change_percent / 100,
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

  const total_change = tokens.reduce((acc: number, item: any) => acc + item.value * item.value_change_percent / 100, 0);

  const change_percent = tokens.reduce((acc: number, item: any) => acc + item.value_change_percent, 0);

  return (
    <>
      <div className="mx-4 my-4">
        <div className="flex flex-col gap-4">
          {
            isTestnet ? (
              <div className="flex flex-col items-center justify-center">
                <div className="text-4xl font-medium">-</div>
                <div className="text-normal font-mono">testnet coins are worthless</div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className={`text-5xl font-bold text-black`}>${total.toFixed(2)}</div>
                {
                  total_change !== 0 ? (
                    <div className="flex flex-row gap-2 mt-2 text-xl">
                      <div className={`${total_change < 0 ? 'text-red-700' : 'text-green-700'}`}>{total_change < 0 ? '-' : '+'}${Math.abs(total_change.toFixed(2))}</div>
                      <div className={`${total_change < 0 ? 'bg-red-200' : 'bg-green-200'} ${total_change < 0 ? 'text-red-600' : 'text-green-600'} rounded-xl px-2`}>{total_change < 0 ? '' : '+'}{change_percent.toFixed(2)}%</div>
                    </div>
                  ) : <></>
                }
              </div>
            )
          }

          {JSON.stringify(unconfirmedTokens)}

          <div className="grid grid-cols-4 gap-4 mt-4 justify-center ">
            <div className="bg-mint border-mint-dark px-6 pt-5 pb-3 rounded-xl flex items-center flex-col"
                 onClick={handleShowReceive}>
              <img src='/icons/qr-code-scanner.svg' className="w-8 h-8" alt="qr-code-scanner"/>
              Receive
            </div>
            <Link to="/wallet/send" className="bg-mint border-mint-dark px-6 pt-5 pb-3 rounded-xl flex items-center flex-col">
              <img src='/icons/send.svg' className="w-8 h-8" alt="qr-code-scanner"/>
              Send
            </Link>
            <Link to="/wallet/dex" className="bg-mint border-mint-dark px-6 pt-5 pb-3 rounded-xl flex items-center flex-col">
              <img src='/icons/swap.svg' className="w-8 h-8" alt="qr-code-scanner"/>
              Swap
            </Link>
            <Link to="/wallet/pools" className="bg-mint border-mint-dark px-6 pt-5 pb-3 rounded-xl flex items-center flex-col">
              <img src='/icons/grow.svg' className="w-8 h-8" alt="qr-code-scanner"/>
              Stake
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-row mt-8 justify-center">
        <div className="w-20 h-1 bg-mint-dark rounded"></div>
      </div>

      <div className="my-4">
        {/*<div className="flex flex-row justify-center gap-3">*/}
        {/*  {*/}
        {/*    [*/}
        {/*      'Tokens',*/}
        {/*      // 'NFTs'*/}
        {/*    ].map((item, index) => (*/}
        {/*      <div key={index} onClick={() => setTab(index)} className={`font-bold transition-all border border-b-4 border-mint-dark px-2 py-3 rounded-xl ${tab===index?'text-black bg-mint border-t-4 border-b-0 border-t-mint-dark':'text-mint-dark '}`}>*/}
        {/*        {item}*/}
        {/*      </div>*/}
        {/*    ))*/}
        {/*  }*/}
        {/*</div>*/}

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
                  {
                    COINS[_.ticker] ? (
                      <div className="rounded-full w-14 h-14 bg-white flex flex-col justify-center items-center">
                        <img src={COINS[_.ticker].icon} alt={_.ticker} className="w-8 h-8"/>
                      </div>
                    ) : (
                      <div className="rounded-full w-14 h-14 bg-mint flex flex-col justify-center items-center">
                        {_.ticker[0]}
                      </div>
                    )
                  }
                  <div>
                    <div className="font-bold text-2xl">
                      {_.ticker}
                    </div>
                    <div className="text-sm text-mint-dark text-xl">
                      {_.balance_formatted} {_.ticker}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="font-medium text-2xl">
                    {
                      isTestnet ? '-' : '$' + _.value.toFixed(2)
                    }
                  </div>
                  {_.value_change !== 0 ? (
                    <div className={`font-normal text-xl ${_.value_change < 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {
                        isTestnet ? '-' : (_.value_change < 0 ? '-' : '+') + '$' + Math.abs(_.value_change.toFixed(2))
                      }
                    </div>
                  ) : <></>}
                </div>
              </div>
            ))
          }
        </div>
      </div>

      <div className={`absolute top-0 bottom-32 left-0 right-0 z-50 ${showReceive ? 'visible' : 'invisible'}`}>
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
