import {useState} from "react";
import {useEffect} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useMintlayer} from "../context/Mintlayer.tsx";
import {Outlet} from "react-router";

export const WalletPools = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { delegations, network } = useMintlayer();

  const [poolsData, setPools] = useState([]);

  const [hideLowBalance, setHideLowBalance] = useState(false);

  const handleToggleLowBalance = () => {
    setHideLowBalance(!hideLowBalance);
  }

  useEffect(() => {
    const fetchPools = async () => {
      const response = await fetch(`https://${network === 1 ? 'lovelace.' : ''}explorer.mintlayer.org/api/pool/list`);
      const data = await response.json();
      setPools(data);
    }
    fetchPools();
  }, []);

  const account_pools: any[] = delegations.map((delegation: any) => {
    return {
      pool_id: delegation.pool_id,
      pool_label: delegation.pool_id.slice(0, 6) + '...' +  delegation.pool_id.slice(-6),
      balance: delegation.balance.decimal,
      delegation_id: delegation.delegation_id.slice(0, 6) + '...' +  delegation.delegation_id.slice(-6),
    }
  });

  const total_balance = account_pools.reduce((acc, pool) => {
    return acc + parseFloat(pool.balance);
  }, 0);

  const pools = poolsData.map((pool: any) => {
    return {
      pool_id: pool.pool_id,
      pool_label: pool.pool_id.slice(0, 6) + '...' + pool.pool_id.slice(-6),
      pledge: Math.ceil(pool.balance) + ' ML',
    }
  });

  const lowBalance = (pool: any) => {
    return true;
    if (hideLowBalance) {
      return true
    }
    return parseFloat(pool.balance) > 0;
  }

  const handlePoolClick = (pool_id: string) => () => {
    navigate(`/wallet/pools/${pool_id}`);
  }

  const filterMyPools = (pool: any) => {
    return !account_pools.some((account_pool) => account_pool.pool_id === pool.pool_id);
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center justify-center">
          <div className="text-black text-xl font-light">Total Staked Value</div>
          <div className="text-4xl font-medium">0.00$</div>
          <div className="text-4xl font-medium">{total_balance} ML</div>
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

      <div className="px-4" onClick={handleToggleLowBalance}>{ hideLowBalance ? 'toggle low balance pools' : 'toggle low balance pools' }</div>

      {account_pools.filter(lowBalance).map((pool, index) => (
        <div key={index} onClick={handlePoolClick(pool.pool_id)} className="mx-4 bg-white rounded-xl p-4 mb-4">
          <div className="flex flex-row justify-between">
            <div>
              <div className="text-mint-dark font-bold">
                Pool ID
              </div>
              <div>
                {pool.pool_label}
              </div>
            </div>
            <div>
              <div className="text-mint-dark font-bold">
                Balance
              </div>
              <div>
                {pool.balance} ML
              </div>
            </div>
            <div>
              <div className="text-mint-dark font-bold">
                Delegation
              </div>
              <div>
                {pool.delegation_id}
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

      {pools.filter(filterMyPools).map((pool, index) => (
        <div key={index} onClick={handlePoolClick(pool.pool_id)} className="mx-4 bg-white rounded-xl p-4 mb-4">
          <div className="flex flex-row justify-between">
            <div>
              <div className="text-mint-dark font-bold">
                Pool ID
              </div>
              <div>
                {pool.pool_label}
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

      <Outlet key={location.pathname} />
    </>
  )
}
