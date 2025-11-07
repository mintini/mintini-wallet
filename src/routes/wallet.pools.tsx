import {useState} from "react";
import {useEffect} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {useMintlayer} from "../context/Mintlayer.tsx";
import {Outlet} from "react-router";
import {getStakingPoolRating} from "../helpers/pools.ts";

export const WalletPools = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { delegations, network } = useMintlayer();

  const [poolsData, setPools] = useState([]);

  const [tab, setTab] = useState(0);

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
      pool_data: poolsData.find((_: any) => _.pool_id === delegation.pool_id),
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
      cost_per_block: pool.cost_per_block,
      delegations_count: pool.delegations_count,
      delegations_amount: pool.delegations_amount,
      margin_ratio_per_thousand: pool.margin_ratio_per_thousand,
      margin_ratio: pool.margin_ratio,
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

  const additionalFilters = () => {
    return true;
  }

  return (
    <>
      <div className="flex flex-col gap-4 mt-3">
        <div className="flex flex-col items-center justify-center">
          <div className="text-black text-xl font-light">Total Staked Value</div>
          <div className="text-4xl font-medium">0.00$</div>
          <div className="text-xl">{total_balance} ML</div>
        </div>
      </div>

      <div className="my-4">
        <div className="flex flex-row mx-4 justify-center border-mint border-2 rounded-xl overflow-hidden">
          <div className={`text-center w-full font-bold border-mint border-r-2 py-2 ${tab === 0 ? 'bg-mint text-white' : ''}`} onClick={()=>setTab(0)}>
            Your delegations
          </div>
          <div className={`text-center w-full font-bold py-2 ${tab === 1 ? 'bg-mint text-white' : ''}`} onClick={()=>setTab(1)}>
            Join pool
          </div>
        </div>
      </div>

      <div className="px-4 py-2 hidden">
        <button className="px-4 py-2 bg-mint text-white rounded-2xl" onClick={handleToggleLowBalance}>
          { hideLowBalance ? 'toggle low balance pools' : 'toggle low balance pools' }
        </button>
      </div>

      {
        tab === 0 && (
          <>
            {account_pools.filter(lowBalance).map((pool, index) => (
              <div key={index} onClick={handlePoolClick(pool.pool_id)} className={`mx-4 bg-white rounded-xl p-4 mb-4 relative`}>
                {
                  !pool.pool_data && (
                    <div className="absolute top-0 left-0 text-amber-800 bg-amber-200 px-4 py-2 rounded-xl">Decommissioned</div>
                  )
                }

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
                </div>
              </div>
            ))}

            {account_pools.length === 0 && (
              <div className="mx-4 bg-white rounded-xl p-4 mb-4">
                <div className="text-center">
                  You don't have any delegations. Join a pool to start staking.
                </div>
              </div>
            )}
          </>
        )
      }

      {
        tab === 1 && (
          <>
            {pools.filter(filterMyPools).filter(additionalFilters).map((pool, index) => (
              <div key={index} onClick={handlePoolClick(pool.pool_id)} className="mx-4 bg-white rounded-xl p-4 mb-4">
                <div className="flex flex-col gap-4 justify-between">
                  <div className="flex flex-row justify-between">
                    <div>
                      <div className="text-mint-dark font-bold">
                        Pool ID
                      </div>
                      <div>
                        {pool.pool_label}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-mint-dark font-bold">
                        Pledge
                      </div>
                      <div>
                        {pool.pledge}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row justify-between">
                    <div>
                      <div className="text-mint-dark font-bold">
                        Commission
                      </div>
                      <div>
                        {pool.cost_per_block} ML + {pool.margin_ratio_per_thousand}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-mint-dark font-bold">
                        Reward
                      </div>
                      <div>
                        {getStakingPoolRating(pool)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )
      }

      <Outlet context={{pools}} key={location.pathname} />
    </>
  )
}
