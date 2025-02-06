import {useState} from "react";
import {useTelegram} from "../context/Telegram.tsx";
import {useEffect} from "react";
import {Link, useOutletContext} from "react-router-dom";
import {useParams} from "react-router";
import {useMintlayer} from "../context/Mintlayer.tsx";
import {JoinPool} from "../_components/staking/join.tsx";
import {DelegationStake} from "../_components/staking/stake.tsx";
import {DelegationWithdraw} from "../_components/staking/withdraw.tsx";

type AccountPool = {
  pool_id: string;
  pool_label: string;
  balance: number;
  delegation_id: string;
  delegation_label: string;
  next_nonce: number;
  spend_destination: string;
}

type Delegation = {
  pool_id: string;
  delegation_id: string;
  balance: {
    atoms: number;
    decimal: number;
  };
  next_nonce: number;
  spend_destination: string;
}

export const WalletPoolDetails = () => {
  const { pools } = useOutletContext<any>();

  const { poolId } = useParams();
  const { telegram } = useTelegram();
  const { delegations } = useMintlayer();
  const [action, setAction] = useState('stake');
  const poolData = pools.find((pool: any) => pool.pool_id === poolId);


  useEffect(() => {
    if (telegram) {
      telegram.BackButton.hide();
    }
  }, []);

  const account_pools: AccountPool[] = delegations.map((delegation: Delegation) => {
    return {
      pool_id: delegation.pool_id,
      pool_label: delegation.pool_id.slice(0, 6) + '...' +  delegation.pool_id.slice(-6),
      balance: delegation.balance.decimal,
      delegation_id: delegation.delegation_id,
      delegation_label: delegation.delegation_id.slice(0, 6) + '...' +  delegation.delegation_id.slice(-6),
      next_nonce: delegation.next_nonce,
      spend_destination: delegation.spend_destination,
    }
  });

  const my_delegations = account_pools.filter((pool) => pool.pool_id === poolId);

  const my_delegations_balance = my_delegations.reduce((acc, pool: AccountPool) => {
    return acc + parseFloat(pool.balance.toString());
  }, 0);

  const no_profit = poolData.cost_per_block > 150 || poolData.margin_ratio > 0.9;

  return (
    <>
      <div className="fixed top-0 right-0 left-0  p-4 z-50">
        <div className="bg-mint h-full w-full flex flex-col justify-between">
          <div className="border-2 border-mint-light m-4 rounded p-4">
            <div className="flex flex-row gap-3 mb-2">
              <div>Pool ID:</div>
              <div className="font-mono break-all pr-10">{poolData.pool_label}</div>
            </div>

            <div className={`${no_profit ? 'bg-red-100':'bg-mint-light'} rounded-2xl px-3 py-2 flex flex-row justify-between mb-2`}>
              <div>
                <div>Pool Balance:</div>
                <div>{poolData.pledge}</div>
              </div>
              <div>
                <div>
                  <div>Pool Commission</div>
                  <div>
                    <span className={poolData.cost_per_block > 150 ? 'text-red-500' : poolData.cost_per_block > 100 ? 'text-amber-500' : 'text-mint-dark'}>{poolData.cost_per_block} ML</span>
                    {' '}+{' '}
                    <span className={poolData.margin_ratio > 0.9 ? 'text-red-500' : poolData.margin_ratio > 0.5 ? 'text-amber-500' : 'text-mint-dark'}>{poolData.margin_ratio_per_thousand}</span></div>
                </div>
              </div>
            </div>

            {
              no_profit && (
                <div className="bg-red-300 text-black rounded-2xl px-2 py-2">
                  This pool is not profitable for delegators
                </div>
              )
            }

            {
              my_delegations.length > 0 ? (
                <>
                  <div className="text-center">
                    Your delegation balance on this pool:
                  </div>
                  <div className="text-center text-2xl">
                    {my_delegations_balance} ML
                  </div>

                  <div className="flex flex-row items-center justify-center my-4 px-4">
                    <button className={`w-full  border-2 border-mint-light ${action==='stake'?'bg-mint-light':'bg-mint border-mint-light '} py-2 rounded-l-2xl`} onClick={()=>setAction('stake')}>stake</button>
                    <button className={`w-full  border-2 border-mint-light ${action==='withdraw'?'bg-mint-light':'bg-mint border-mint-light  '} py-2 rounded-r-2xl ${my_delegations_balance < 1 ? 'opacity-25':''}`} onClick={()=>my_delegations_balance > 0 && setAction('withdraw')}>withdraw</button>
                  </div>

                  {
                    action === 'stake' && (
                      <div>
                        <DelegationStake delegationId={my_delegations[0].delegation_id} />
                      </div>
                    )
                  }

                  {
                    action === 'withdraw' && (
                      <div>
                        <DelegationWithdraw delegations={my_delegations} />
                      </div>
                    )
                  }
                </>
              ) : (
                <div>
                  <div className="my-2 text-black">
                    You don't have any delegation on this pool, need to join first
                  </div>
                  <JoinPool poolId={poolId} />
                </div>
              )
            }
          </div>
          <div className="p-4">
            <Link to="/wallet/pools" className="bg-mint-light w-full py-2 px-4 rounded block text-center">
              Close
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}


