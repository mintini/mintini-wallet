// @ts-nocheck
import {useEffect, useState} from "react";
import {useDatabase} from "../../context/Database.tsx";
import {useMintlayer} from "../../context/Mintlayer.tsx";
import {
  Amount,
  encode_input_for_withdraw_from_delegation, encode_signed_transaction, encode_transaction, encode_witness,
  estimate_transaction_size, SignatureHashType
} from "../../lib/mintlayer/wasm_wrappers";
import {getOutputs, mergeUint8Arrays} from "../../lib/mintlayer/helpers.ts";
import {saveTransactions} from "../../lib/storage/database.ts";

export const DelegationWithdraw = ({delegations}) => {
  const [ fee, setFee ] = useState(0n);
  const [ state, setState ] = useState('form');
  const [ amountDecimal, setAmountDecimal ] = useState(0);
  const [ transactionBroadcastingStatus, setTransactionBroadcastingStatus ] = useState('');
  const { db } = useDatabase();
  const tokenDecimals = 11;
  const withdrawAmount = BigInt(Math.trunc(amountDecimal * Math.pow(10, tokenDecimals)))
  const { tokens, utxos, network, addresses, addressesPrivateKeys, wallet, refreshAccount, chainHeight } = useMintlayer();

  const total_balance = delegations.reduce((acc, pool) => {
    return acc + parseFloat(pool.balance);
  }, 0);

  const [ transactionHEX, setTransactionHEX ] = useState('');

  const [ transactionJSONrepresentation, setTransactionJSONrepresentation ] = useState({inputs: [], outputs: []});
  const [ transactionBINrepresentation, setTransactionBINrepresentation ] = useState({inputs: [], outputs: []});

  const [ transactionPreview, setTransactionPreview ] = useState(false);

  const toggleTransactionPreview = () => {
    setTransactionPreview(!transactionPreview);
  }

  const handleUpdateAmount = (e: any) => {
    // set only if it is a number or dot
    const value = e.target.value.replace(',','.');

    if(value === ',' || value === '.') {
      setAmountDecimal('0.');
      return;
    }

    if (value.match(/^[0-9]*\.?[0-9]*$/)) {
      //if(e.target.value.toString().split('.')[1].length <= 11) {
      setAmountDecimal(value);
      //}
    }
  }

  // pick selectedDelegations based on amount and balances of the delegations. if amount is bigger than balance, then pick the next delegation
  const selectedDelegations = [];
  let amount = amountDecimal;
  for (let i = 0; i < delegations.length; i++) {
    if (amount === 0) {
      break;
    }
    if (delegations[i].balance.decimal >= amount) {
      selectedDelegations.push(delegations[i]);
      break;
    }
    selectedDelegations.push(delegations[i]);
    amount -= delegations[i].balance.decimal;
  }

  useEffect(() => {
    if(!selectedDelegations || withdrawAmount === 0n) {
      setTransactionJSONrepresentation({
        inputs: [],
        outputs: [],
      })
      return;
    }

    const delegation = selectedDelegations[0];

    const amountCoin = withdrawAmount - fee;

    // start to prepare transaction by selecting UTXOs
    // step 1. Determine initial outputs
    const outputObj = [{
      type: 'LockThenTransfer',
      destination: delegation.spend_destination,
      value: {
        amount: {
          atoms: amountCoin.toString(),
          decimal: (amountCoin.toString() / 1e11).toString(),
        },
        type: 'Coin',
      },
      lock: {
        type: 'ForBlockCount',
        content: 7200,
      }
    }];
    // step 2. Determine inputs
    const inputObj = []

    inputObj.push({
      input: {
        account_type: "DelegationBalance",
        amount: {
          atoms: withdrawAmount.toString(),
          decimal: (withdrawAmount.toString() / 1e11).toString(),
        },
        delegation_id: delegation.delegation_id,
        input_type: "Account",
        nonce: delegation.next_nonce.toString(),
      },
      utxo: null,
    });

    setTransactionJSONrepresentation({
      inputs: inputObj,
      outputs: outputObj,
    });
  }, [selectedDelegations.length, fee, withdrawAmount]);

  useEffect(() => {
    if(transactionJSONrepresentation.inputs.length === 0 || transactionJSONrepresentation.outputs.length === 0) {
      setFee(0n);
      setTransactionBINrepresentation({
        inputs: [],
        outputs: [],
      });
      return;
    }

    // calculate fee and prepare as much transaction as possible
    const inputs = transactionJSONrepresentation.inputs;
    const inputsCommand = encode_input_for_withdraw_from_delegation(inputs[0].input.delegation_id, Amount.from_atoms(inputs[0].input.amount.atoms), inputs[0].input.nonce, network);
    const inputsArray = [inputsCommand];

    const outputsArrayItems = transactionJSONrepresentation.outputs.map((output) => {
      if (output.type === 'LockThenTransfer') {
        return getOutputs({
          amount: BigInt(output.value.amount.atoms).toString(),
          address: output.destination,
          chainTip: chainHeight,
          networkType: network,
          type: 'LockThenTransfer',
          lock: output.lock,
        })
      }
    })
    const outputsArray = outputsArrayItems;

    const inputAddresses = [transactionJSONrepresentation.outputs[0].destination];

    const transactionsize = estimate_transaction_size(
      mergeUint8Arrays(inputsArray),
      inputAddresses,
      mergeUint8Arrays(outputsArray),
      network,
    );

    const feeRate = BigInt(Math.ceil(100000000000 / 1000));
    setFee(BigInt(transactionsize)*feeRate);

    setTransactionBINrepresentation({
      inputs: inputsArray,
      outputs: outputsArray,
    })
  }, [transactionJSONrepresentation, chainHeight]);

  const handleBuildTransaction = () => {
    setState('confirm');

    const inputsArray = transactionBINrepresentation.inputs;
    const outputsArray = transactionBINrepresentation.outputs;
    const transaction = encode_transaction(mergeUint8Arrays(inputsArray), mergeUint8Arrays(outputsArray), BigInt(0));

    const optUtxos_ = transactionJSONrepresentation.inputs.map((input: any) => {
      if (!input.utxo) {
        return 0;
      }
    });

    const optUtxos = optUtxos_;
    // for (let i = 0; i < optUtxos_.length; i++) {
    //   optUtxos.push(1)
    //   optUtxos.push(...optUtxos_[i])
    // }

    const address = transactionJSONrepresentation.outputs[0].destination;
    const addressPrivateKey = addressesPrivateKeys[address];
    const encodedWitnesses = [encode_witness(
      SignatureHashType.ALL,
      addressPrivateKey,
      address,
      transaction,
      optUtxos,
      0,
      { pool_info: {}, order_info: {}, },
      BigInt(chainHeight),
      network,
    )];
    const encodedSignedTransaction = encode_signed_transaction(transaction, mergeUint8Arrays(encodedWitnesses));
    const txHash = encodedSignedTransaction.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')
    setTransactionHEX(txHash);
  }

  const handleCancel = () => {
    setState('form');
  }

  const handleBroadcast = async () => {
    setState('broadcast');
    const transactionBody = transactionHEX;
    try {
      const response = await fetch(`https://api.mintini.app/transaction?${network===1?'network=1':'network=0'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'plain/text',
        },
        body: transactionBody,
      });
      if (response.status === 200) {
        // need to store this transaction in the database
        const { tx_id } = await response.json();
        const transactionEntry = {
          id: tx_id,
          inputs: transactionJSONrepresentation.inputs,
          outputs: transactionJSONrepresentation.outputs,
          fee: {
            atoms: fee.toString(),
            decimal: (fee.toString() / 1e11).toString(),
          },
          timestamp: Math.floor(Date.now() / 1000),
          confirmations: '0',
        }
        // store transaction in the database
        await saveTransactions(db, wallet.id, [transactionEntry]);
        refreshAccount();
        setTransactionBroadcastingStatus('success');
      } else {
        console.error('Transaction broadcast failed:', response.status, await response.text());
        setTransactionBroadcastingStatus('error');
      }
    } catch (e) {
      setTransactionBroadcastingStatus('error');
    }
  }

  const handleSetAmount = (percent: number) => () => {
    const total = total_balance;
    const amount = total * percent;
    setAmountDecimal(amount);
  }

  const submitDisabled = selectedDelegations.length === 0 || withdrawAmount === 0n || amountDecimal > total_balance;

  return (
    <div>
      {/*<div>{delegations.map((d) => (d.delegation_label)).join(',')}</div>*/}
      {/*<div>Selected: {selectedDelegations.map((d) => (d.delegation_label)).join(',')}</div>*/}

      <div>
        <div className="bg-mint-light py-4 px-4 rounded-2xl">
          <input type="text" inputMode="decimal" onChange={handleUpdateAmount} value={amountDecimal || ''}
                 placeholder="0"
                 className="text-3xl bg-transparent w-full  placeholder:text-mint outline-0 text-black"/>
        </div>
        <div className="flex flex-row justify-between">
          <div>
            {/* TODO: currency swap */}
          </div>
          <div className="flex flex-row justify-between gap-4 mt-1">
            <div>
              {Math.trunc(total_balance) !== total_balance ? '~' : ''} {Math.trunc(total_balance)} ML
            </div>
            <button className="rounded-full bg-mint-dark px-2 text-white" onClick={handleSetAmount(0.25)}>
              25%
            </button>
            <button className="rounded-full bg-mint-dark px-2 text-white" onClick={handleSetAmount(0.5)}>
              50%
            </button>
            <button className="rounded-full bg-mint-dark px-2 text-white" onClick={handleSetAmount(1)}>
              100%
            </button>
          </div>
        </div>
      </div>

      {
        state === 'form' && (
          <>
            <div className="py-4">
              <div onClick={toggleTransactionPreview} className="text-black text-right">Toggle transaction preview</div>
              <div
                className={`${transactionPreview ? 'block' : 'hidden'} max-h-52 overflow-auto whitespace-pre font-mono`}>{JSON.stringify(transactionJSONrepresentation, null, 2)}</div>
            </div>
            <div className="items-center flex flex-row gap-2">
              <button disabled={submitDisabled} onClick={handleBuildTransaction} className={`bg-mint-light ${submitDisabled ? 'opacity-20' : ''} px-4 py-2 rounded-2xl`}>Withdraw</button>
              <div>
                Fee: {fee.toString() / 1e11} ML
              </div>
            </div>
          </>
        )
      }

      {
        state === 'confirm' && (
          <>
            <div className="py-4">
              <div onClick={toggleTransactionPreview} className="text-black">Toggle transaction hex</div>
              <div
                className={`${transactionPreview ? 'block' : 'hidden'} max-h-52 overflow-auto break-all font-mono`}>{transactionHEX}</div>
            </div>
            <div className="flex flex-row gap-4 w-full">
              <button onClick={handleBroadcast} className="bg-mint-light px-4 py-2 rounded-2xl w-full">Confirm</button>
              <button onClick={handleCancel} className="bg-mint-light px-4 py-2 rounded-2xl w-full">Cancel</button>
            </div>
          </>
        )
      }

      {
        state === 'broadcast' && (
          <div>
            <div>Transaction broadcasting status: {transactionBroadcastingStatus}</div>
          </div>
        )
      }
    </div>
  );
}
