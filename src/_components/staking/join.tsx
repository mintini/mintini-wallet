// @ts-nocheck
import {useEffect, useState} from "react";
import {useDatabase} from "../../context/Database.tsx";
import {useMintlayer} from "../../context/Mintlayer.tsx";
import {getOutputs, mergeUint8Arrays, selectUTXOs} from "../../lib/mintlayer/helpers.ts";
import {Buffer} from "buffer";
import {
  encode_input_for_utxo,
  encode_outpoint_source_id, encode_signed_transaction, encode_transaction, encode_witness,
  estimate_transaction_size, SignatureHashType,
  SourceId
} from "../../lib/mintlayer/wasm_wrappers";
import {saveTransactions} from "../../lib/storage/database.ts";

export const JoinPool = ({ poolId }) => {
  const [ fee, setFee ] = useState(0n);
  const [ state, setState ] = useState('form');
  const [ transactionBroadcastingStatus, setTransactionBroadcastingStatus ] = useState('');
  const { db } = useDatabase();
  const { utxos, network, addresses, addressesPrivateKeys, wallet, refreshAccount, tokens } = useMintlayer();

  const [ transactionHEX, setTransactionHEX ] = useState('');

  const [ transactionJSONrepresentation, setTransactionJSONrepresentation ] = useState({inputs: [], outputs: []});
  const [ transactionBINrepresentation, setTransactionBINrepresentation ] = useState({inputs: [], outputs: []});

  const [ transactionPreview, setTransactionPreview ] = useState(false);

  const toggleTransactionPreview = () => {
    setTransactionPreview(!transactionPreview);
  }

  useEffect(() => {
    if(!poolId) {
      setTransactionJSONrepresentation({
        inputs: [],
        outputs: [],
      })
      return;
    }

    const amountCoin = 0n + fee;

    // start to prepare transaction by selecting UTXOs
    // step 1. Determine initial outputs
    const outputObj = [{
      type: 'CreateDelegationId',
      pool_id: poolId,
      destination: addresses[0],
    }];
    // step 2. Determine inputs
    const inputObjCoin = selectUTXOs(utxos, amountCoin, 'Transfer', null);

    const inputObj = [...inputObjCoin];

    // step 3. Calculate total input value
    const totalInputValueCoin: bigint = inputObjCoin.reduce((acc: bigint, item: any) => acc + BigInt(item.utxo.value.amount.atoms), 0n);

    const changeAmountCoin = totalInputValueCoin - amountCoin - fee;

    // step 4. Add change if necessary
    if (changeAmountCoin > 0) {
      outputObj.push({
        type: 'Transfer',
        value: {
          type: 'Coin',
          amount: {
            atoms: changeAmountCoin.toString(),
            decimal: (changeAmountCoin.toString() / 1e11).toString(),
          },
        },
        destination: addresses[0], // change address
      });
    }

    setTransactionJSONrepresentation({
      inputs: inputObj,
      outputs: outputObj,
    });
  }, [poolId, fee]);

  useEffect(() => {
    if(transactionJSONrepresentation.outputs.length === 0) {
      setFee(0n);
      setTransactionBINrepresentation({
        inputs: [],
        outputs: [],
      });
      return;
    }

    // calculate fee and prepare as much transaction as possible
    const inputs = transactionJSONrepresentation.inputs;
    const transactionStrings = inputs.map((input: any) => ({
      transaction: input.outpoint.source_id,
      index: input.outpoint.index,
    }));
    const transactionBytes = transactionStrings.map((transaction: any) => ({
      bytes: Buffer.from(transaction.transaction, 'hex'),
      index: transaction.index,
    }));
    const outpointedSourceIds = transactionBytes.map((transaction: any) => ({
      source_id: encode_outpoint_source_id(transaction.bytes, SourceId.Transaction),
      index: transaction.index,
    }));
    const inputsIds = outpointedSourceIds.map((source: any) => (encode_input_for_utxo(source.source_id, source.index)));
    const inputsArray = inputsIds;

    const outputsArrayItems = transactionJSONrepresentation.outputs.map((output) => {
      if (output.type === 'Transfer') {
        return getOutputs({
          amount: BigInt(output.value.amount.atoms).toString(),
          address: output.destination,
          networkType: network,
        })
      }
      if (output.type === 'CreateDelegationId') {
        return getOutputs({
          address: output.destination,
          networkType: network,
          poolId: output.pool_id,
          type: 'CreateDelegationId',
        })
      }
    })
    const outputsArray = outputsArrayItems;

    const inputAddresses = transactionJSONrepresentation.inputs.map((input: any) => input.utxo.destination);

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
  }, [transactionJSONrepresentation]);

  const handleBuildTransaction = () => {
    setState('confirm');

    const inputsArray = transactionBINrepresentation.inputs;
    const outputsArray = transactionBINrepresentation.outputs;
    const transaction = encode_transaction(mergeUint8Arrays(inputsArray), mergeUint8Arrays(outputsArray), BigInt(0));

    const optUtxos_ = transactionJSONrepresentation.inputs.map((input: any) => {
      if (input.utxo.type === 'Transfer') {
        return getOutputs({
          amount: BigInt(input.utxo.value.amount.atoms).toString(),
          address: input.utxo.destination,
          networkType: network,
        })
      }
      if (input.utxo.type === 'LockThenTransfer') {
        return getOutputs({
          amount: BigInt(input.utxo.value.amount.atoms).toString(),
          address: input.utxo.destination,
          networkType: network,
          type: 'LockThenTransfer',
          lock: input.utxo.lock,
        })
      }
    });


    const optUtxos = []
    for (let i = 0; i < optUtxos_.length; i++) {
      optUtxos.push(1)
      optUtxos.push(...optUtxos_[i])
    }

    const encodedWitnesses = transactionJSONrepresentation.inputs.map((input: any, index: number) => {
      const address = input.utxo.destination;
      const addressPrivateKey = addressesPrivateKeys[address];
      const witness = encode_witness(
        SignatureHashType.ALL,
        addressPrivateKey,
        address,
        transaction,
        optUtxos,
        index,
        network,
      );
      return witness;
    });
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
        setTransactionBroadcastingStatus('error');
      }
    } catch (e) {
      setTransactionBroadcastingStatus('error');
    }
  }

  const disableJoinButton = tokens[0].balance < fee.toString() / 1e11;

  return (
    <div>
      {
        state === 'form' && (
          <>
            <div className="py-4">
              <div onClick={toggleTransactionPreview} className="text-black underline text-right">Toggle transaction preview</div>
              <div
                className={`${transactionPreview ? 'block' : 'hidden'} max-h-52 overflow-auto whitespace-pre font-mono`}>{JSON.stringify(transactionJSONrepresentation, null, 2)}</div>
            </div>

            <div>
              <button disabled={disableJoinButton} onClick={handleBuildTransaction} className={`${disableJoinButton?'opacity-20':''} bg-mint-light px-4 py-2 rounded-2xl`}>Join</button>

              <div
                className="inline-block px-2 py-1 font-normal italic">Fee: {fee === 0n ? '~0.229' : fee.toString() / 1e11} ML
              </div>
            </div>
            {
              disableJoinButton && (
                <div>Insufficient funds</div>
              )
            }
          </>
        )
      }

      {
        state === 'confirm' && (
          <>
            <div className="py-4">
              <div onClick={toggleTransactionPreview} className="text-black text-right">Toggle transaction hex</div>
              <div
                className={`${transactionPreview ? 'block' : 'hidden'} max-h-52 overflow-auto break-all font-mono`}>{transactionHEX}</div>
            </div>
            <div
              className="inline-block py-1 font-normal italic">Fee: {fee.toString() / 1e11} ML
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

      {
        state === 'broadcast' && transactionBroadcastingStatus === 'success' && (
          <div>
            <div>Now wait for 1 transaction confirmation on blockchain to top-up your delegation, usually it takes up to 2
              minutes
            </div>
          </div>
        )
      }
    </div>
  )
}
