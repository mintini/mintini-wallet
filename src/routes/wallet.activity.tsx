// @ts-nocheck
import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {useTelegram} from "../context/Telegram.tsx";
import {useMintlayer} from "../context/Mintlayer.tsx";
import QRCode from "react-qr-code";
import {getTransactionsByWallet} from "../lib/storage/database.ts";
import {useDatabase} from "../context/Database.tsx";
import {txToActivity} from "../lib/mintlayer/helpers.ts";

export const WalletActivity = () => {
  const { telegram } = useTelegram();
  const { db } = useDatabase();
  const { addresses, tokens: token_list, tokensLoading, network } = useMintlayer();
  const [ showReceive, setShowReceive ] = useState(false);
  const { wallet, isTestnet } = useMintlayer();
  const [ tab, setTab ] = useState(0);
  const [ addressIndex, setAddressIndex ] = useState(0)
  const [ confirmedActivity, setActivity ] = useState<any>([]);
  const [ pendingTransactions, setPendingTransactions ] = useState<any>([]);
  const [ selectedTx, setSelectedTx ] = useState<any>(null);

  useEffect(() => {
    if (telegram) {
      telegram.BackButton.hide();
    }
  }, []);

  useEffect(() => {
    // TODO - update
  }, [addresses]);

  useEffect(() => {
    const getPendingTransactions = async () => {
      const data = await getTransactionsByWallet(db, wallet.id);
      setPendingTransactions(data);
    }
    getPendingTransactions();
  }, [])

  const TOKEN_LABELS = {
    'Coin': 'ML',
  };

  useEffect(() => {
    // fetch activity from endpoint
    const fetchActivity = async () => {
      const response = await fetch('https://api.mintini.app/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addresses: addresses,
          network,
        }),
      });
      const data = await response.json();
      setActivity(data);
    }
    fetchActivity();
  }, []);

  if(!addresses[0]) {
    return <div>Loading...</div>
  }

  const COLOR_MAP = {
    send: 'bg-red-400',
    receive: 'bg-green-400',
    swap: 'bg-yellow-400',
    send_self: 'bg-blue-400',
  }

  const ICON_MAP = {
    send: '↑',
    receive: '↓',
    swap: '⇆',
    send_self: '↶',
    unsupported: '❓',
    delegation_withdrawal: '🔓',
    delegation_staking: '🔒',
    delegation_create: '🔒+',
  }

  const LABEL_MAP = {
    send: 'Sent',
    receive: 'Received',
    swap: 'Swap',
    send_self: 'Self',
    unsupported: 'Unsupported',
    delegation_withdrawal: 'Delegation Withdrawal',
    delegation_staking: 'Delegation Staking',
    delegation_create: 'Delegation Create',
  }

  const pendingActivity = txToActivity(pendingTransactions, addresses);

  const activity = [...pendingActivity, ...confirmedActivity];

  return (
    <div className="mx-4">
      <div className="mt-4 flex flex-col gap-4 ">
        {activity.map((item: any, index: number)=>{
          const date = new Date(item.timestamp*1000);
          // only if date is different from previous date, show date
          return (
            <>
              {index === 0 && (
                <div className="text-center text-mint-dark">
                  {date.toDateString()}
                </div>
              )}
              {index > 0 && new Date(activity[index-1].timestamp*1000).getDate().toString() !== date.getDate().toString() && (
                <div className="text-center text-mint-dark">
                  {date.toDateString()}
                </div>
              )}
              <div onClick={()=>setSelectedTx(item)} className="flex flex-row justify-between gap-2 bg-mint rounded-2xl px-4 py-3" key={index.txid}>
                <div>
                  <div className={`w-12 h-12 rounded-full items-center justify-center flex text-2xl ${COLOR_MAP[item.type]}`}>{ICON_MAP[item.type]}</div>
                </div>
                <div className="w-full flex flex-row justify-between">
                  <div>
                    <div>{LABEL_MAP[item.type]}</div>
                    <div>
                      {
                        item.type === 'receive' && (
                          <div>
                            From: {item.interact.addresses[0].slice(0, 6) + '...' + item.interact.addresses[0].slice(-6)
                            + (item.interact.addresses.length > 1 ? ' and ' + (item.interact.addresses.length - 1) + ' more' : '')}
                          </div>
                        )
                      }
                      {
                        item.type === 'send' && (
                          <div>
                            To: {item.interact.addresses[0].slice(0, 6) + '...' + item.interact.addresses[0].slice(-6)
                            + (item.interact.addresses.length > 1 ? ' and ' + (item.interact.addresses.length - 1) + ' more' : '')}
                          </div>
                        )
                      }
                      {
                        item.type === 'swap' && (
                          <div>
                            Order ID: {item.interact.order_id.slice(0, 6) + '...' + item.interact.order_id.slice(-6)}
                          </div>
                        )
                      }
                    </div>
                  </div>
                  <div className="text-right">
                    {
                      item.amount.inflow.total > 0 && (
                        <div className="whitespace-nowrap flex flex-nowrap justify-end"><div>+{item.amount?.inflow?.total}</div> <div className="inline-block w-10 overflow-hidden">{TOKEN_LABELS[item.amount?.inflow?.token.token_id] || item.amount?.inflow?.token.token_id}</div></div>
                      )
                    }
                    {
                      item.amount.outflow.total > 0 && (
                        <div className="whitespace-nowrap flex flex-nowrap justify-end"><div>-{item.amount?.outflow?.total}</div> <div className="inline-block w-10 overflow-hidden">{TOKEN_LABELS[item.amount?.outflow?.token.token_id] || item.amount?.outflow?.token.token_id}</div></div>
                      )
                    }
                  </div>
                </div>
              </div>
            </>
          );
        })}
      </div>

      <div className={`fixed max-h-full p-4 flex flex-col justify-between top-4 bottom-4 left-4 right-4 bg-mint z-50 transition-all rounded-3xl ${selectedTx?'visible opacity-100':'invisible opacity-0'}`}>
        <div className="flex flex-col items-center">
          {selectedTx?.type}
        </div>
        <div className="h-full">
          <div className="whitespace-pre w-auto overflow-scroll">
            Details of tx: {JSON.stringify(selectedTx)}
          </div>
          <div className="text-center mt-6">
            <a href={`https://${isTestnet?'lovelace.':''}explorer.mintlayer.org/tx/${selectedTx?.txid}`} target="_blank">
              View in explorer
            </a>
          </div>
        </div>
        <div className="w-auto">
          <button className="bg-mint-light rounded-xl w-full py-3 px-4" onClick={()=>setSelectedTx(null)}>Close</button>
        </div>
      </div>


    </div>
  )
}
