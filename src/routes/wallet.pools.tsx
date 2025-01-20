import {useState} from "react";
import {useTelegram} from "../context/Telegram.tsx";
import {useEffect} from "react";
import {Link} from "react-router-dom";

export const WalletPools = () => {
  const { telegram } = useTelegram();

  const [poolsData, setPools] = useState([]);

  useEffect(() => {
    const fetchPools = async () => {
      const response = await fetch('https://explorer.mintlayer.org/api/pool/list');
      const data = await response.json();
      setPools(data);
    }
    fetchPools();
  }, []);

  useEffect(() => {
    if (telegram) {
      telegram.BackButton.hide();
    }
  }, []);

  const account_pools: any[] = [
  ];

  const pools = poolsData.map((pool: any) => {
    return {
      pool_id: pool.pool_id.slice(0, 6) + '...' + pool.pool_id.slice(-6),
      pledge: Math.ceil(pool.balance) + ' ML',
    }
  });

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center justify-center">
          <div className="text-black text-xl font-light">Total Staked Value</div>
          <div className="text-4xl font-medium">0.00$</div>
        </div>

        <div className="flex flex-row gap-4 mx-4 justify-center">
          <Link to="/wallet/send" className="border border-mint-dark px-6 py-3 rounded-xl">
            Stake
          </Link>
          <div className="border border-mint-dark px-6 py-3 rounded-xl">
            Widthdraw
          </div>
        </div>
      </div>

      <div className="my-4">
        <div className="text-center font-bold">
          Your delegations
        </div>
      </div>

      {account_pools.map((pool, index) => (
        <div key={index} className="mx-4 bg-white rounded-xl p-4 mb-4">
          <div className="flex flex-row justify-between">
            <div>
              <div className="text-mint-dark font-bold">
                Pool ID
              </div>
              <div>
                {pool.pool_id}
              </div>
            </div>
            <div>
              <div className="text-mint-dark font-bold">
                Pledge
              </div>
              <div>
                {pool.pledge}
              </div>
            </div>
            <div>
              <div className="text-mint-dark font-bold">
                Delegation
              </div>
              <div>
                {pool.delegation}
              </div>
            </div>
          </div>
        </div>
      ))}


      <div className="flex flex-row mt-4 justify-center">
        <div className="w-20 h-1 bg-mint-dark rounded"></div>
      </div>

      <div className="my-4">
        <div className="text-center font-bold">
          Join new pool
        </div>
      </div>

      {pools.map((pool, index) => (
        <div key={index} className="mx-4 bg-white rounded-xl p-4 mb-4">
          <div className="flex flex-row justify-between">
            <div>
              <div className="text-mint-dark font-bold">
                Pool ID
              </div>
              <div>
                {pool.pool_id}
              </div>
            </div>
            <div>
              <div className="text-mint-dark font-bold">
                Pledge
              </div>
              <div>
                {pool.pledge}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-row mt-4 justify-center">
        <div className="w-20 h-1 bg-mint-dark rounded"></div>
      </div>
    </>
  )
}
