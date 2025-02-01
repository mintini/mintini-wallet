import {useState} from "react";
import {useTelegram} from "../context/Telegram.tsx";
import {useEffect} from "react";
import {Link} from "react-router-dom";
import {useParams} from "react-router";
import {useMintlayer} from "../context/Mintlayer.tsx";
import {JoinPool} from "../_components/staking/join.tsx";
import {DelegationStake} from "../_components/staking/stake.tsx";
import {DelegationWithdraw} from "../_components/staking/withdraw.tsx";

export const WalletPoolDetails = () => {
  // get pool_id from URL
  const { poolId } = useParams();
  const { telegram } = useTelegram();
  const { delegations, lastBlockTime } = useMintlayer();
  const [action, setAction] = useState('stake');

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

  const account_pools: any[] = delegations.map((delegation: any) => {
    return {
      pool_id: delegation.pool_id,
      pool_lablel: delegation.pool_id.slice(0, 6) + '...' +  delegation.pool_id.slice(-6),
      balance: delegation.balance.decimal,
      delegation_id: delegation.delegation_id,
      delegation_label: delegation.delegation_id.slice(0, 6) + '...' +  delegation.delegation_id.slice(-6),
      next_nonce: delegation.next_nonce,
      spend_destination: delegation.spend_destination,
    }
  });

  const my_delegations = account_pools.filter((pool) => pool.pool_id === poolId);

  return (
    <>
      <div className="fixed top-0 bottom-0 right-0 left-0  p-4 z-50">
        <div className="bg-mint h-full w-full flex flex-col justify-between">
          <div className="border-2 border-mint-light m-4 rounded p-4">
            <div>
              <div>Pool ID:</div>
              <div className="font-mono break-all pr-10">{poolId}</div>
            </div>
            {
              my_delegations.length > 0 ? (
                <>
                  <div className="text-center">
                    Your delegation balance on this pool:
                  </div>
                  <div className="text-center text-2xl">
                    {my_delegations.reduce((acc, pool) => {
                      return acc + parseFloat(pool.balance);
                    }, 0)} ML
                  </div>

                  <div className="flex flex-row items-center justify-center my-4 px-4">
                    <button className={`w-full  border-2 border-mint-light ${action==='stake'?'bg-mint-light':'bg-mint border-mint-light '} py-2 rounded-l-2xl`} onClick={()=>setAction('stake')}>stake</button>
                    <button className={`w-full  border-2 border-mint-light ${action==='withdraw'?'bg-mint-light':'bg-mint border-mint-light  '} py-2 rounded-r-2xl`} onClick={()=>setAction('withdraw')}>withdraw</button>
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
                  <div className="my-2">
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


