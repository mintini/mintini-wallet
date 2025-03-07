import {useState} from "react";
import {useEffect} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useMintlayer} from "../context/Mintlayer.tsx";
import {Outlet} from "react-router";

interface Pool {
  pool_id: string;
  pool_label: string;
  pledge: string;
  cost_per_block: string;
  delegations_count: number;
  delegations_amount: number;
  margin_ratio_per_thousand: string;
  margin_ratio: string;
}

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

  const poolToOpen = account_pools[0] || pools[0];

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

        <div className="flex flex-row gap-4 mx-4 justify-center">
          <Link to={`/wallet/pools/` + poolToOpen?.pool_id} className="border border-mint-dark px-6 py-3 rounded-xl">
            Stake
          </Link>
          {/*<div className="border border-mint-dark px-6 py-3 rounded-xl">*/}
          {/*  Widthdraw*/}
          {/*</div>*/}
        </div>
      </div>

      <div className="my-4">
        <div className="text-center font-bold">
          Your delegations
        </div>
      </div>

      <div className="px-4 py-2 hidden">
        <button className="px-4 py-2 bg-mint text-white rounded-2xl" onClick={handleToggleLowBalance}>
          { hideLowBalance ? 'toggle low balance pools' : 'toggle low balance pools' }
        </button>
      </div>

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


      <div className="flex flex-row mt-4 justify-center">
        <div className="w-20 h-1 bg-mint-dark rounded"></div>
      </div>

      <div className="my-4">
        <div className="text-center font-bold">
          Join new pool
        </div>
      </div>

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

      <div className="flex flex-row mt-4 justify-center">
        <div className="w-20 h-1 bg-mint-dark rounded"></div>
      </div>

      <Outlet context={{pools}} key={location.pathname} />
    </>
  )
}


function getStakingPoolRating(pool: Pool) {
  const costPerBlock = parseFloat(pool.cost_per_block);
  const marginRatioPerThousand = parseFloat(pool.margin_ratio_per_thousand);

  // Проверка входных данных
  if (costPerBlock < 0 || costPerBlock > 150 ||
    marginRatioPerThousand < 0 || marginRatioPerThousand > 100) {
    return "Invalid input parameters";
  }

  // Рассчитываем общий скор
  let score = 0;

  // Влияние costPerBlock (меньше - лучше)
  if (costPerBlock <= 30) score += 50;
  else if (costPerBlock <= 60) score += 40;
  else if (costPerBlock <= 90) score += 30;
  else if (costPerBlock <= 120) score += 20;
  else score += 10;

  // Влияние marginRatioPerThousand (меньше - лучше)
  if (marginRatioPerThousand <= 20) score += 50;
  else if (marginRatioPerThousand <= 40) score += 40;
  else if (marginRatioPerThousand <= 60) score += 30;
  else if (marginRatioPerThousand <= 80) score += 20;
  else score += 10;

  // Определяем рейтинг на основе итогового скора
  if (score >= 90) return "Excellent";
  else if (score >= 70) return "Good";
  else if (score >= 50) return "Fair";
  else if (score >= 30) return "Poor";
  else return "No reward";
}
