// @ts-nocheck
import {useEffect, useState} from "react";
import {useTelegram} from "../context/Telegram.tsx";
import {useMintlayer} from "../context/Mintlayer.tsx";
import {Link, useNavigate} from "react-router-dom";
import {getOutputs, mergeUint8Arrays, selectUTXOs, valid_recipient} from "../lib/mintlayer/helpers.ts";
import {
  Amount,
  encode_input_for_utxo,
  encode_outpoint_source_id,
  encode_signed_transaction,
  encode_transaction,
  encode_witness,
  estimate_transaction_size,
  SignatureHashType,
  SourceId
} from "../lib/mintlayer/wasm_wrappers";
import {TokenSelector} from "../_components/TokenSelector.tsx";
import {saveTransactions} from "../lib/storage/database.ts";
import {useDatabase} from "../context/Database.tsx";

export const WalletSend = () => {
  const { telegram } = useTelegram();
  const navigate = useNavigate();

  const [ sendToken, setSendToken ] = useState(null);

  const [ amountFocused, setAmountFocused ] = useState(false);

  const [ txPreviewDetails, setTxPreviewDetails ] = useState(false);

  const { tokens, utxos, network, addresses, addressesPrivateKeys, wallet, refreshAccount } = useMintlayer();
  const [ state, setState ] = useState('form');
  const [ recipient, setRecipient ] = useState('');
  const [ amountDecimal, setAmountDecimal ] = useState(0);

  const { db } = useDatabase();

  const tokenDecimals = sendToken ? sendToken.token_details.number_of_decimals : 11;
  const amount = BigInt(Math.trunc(amountDecimal * Math.pow(10, tokenDecimals)));

  const [ recipientError, setRecipientError ] = useState('');
  const [ amountError, setAmountError ] = useState('');

  const [ transactionBroadcastingStatus, setTransactionBroadcastingStatus ] = useState('');

  const [ fee, setFee ] = useState(0n);

  const [ transactionHEX, setTransactionHEX ] = useState('');

  const [ transactionJSONrepresentation, setTransactionJSONrepresentation ] = useState({inputs: [], outputs: []});
  const [ transactionBINrepresentation, setTransactionBINrepresentation ] = useState({inputs: [], outputs: []});

  const valid = recipientError === '' && recipient !== '' && amountError === '' && amount > 0;

  const toggleTxPreviewDetails = () => {
    setTxPreviewDetails(!txPreviewDetails);
  }

  useEffect(() => {
    // if only one token, select it
    if(tokens.length === 1) {
      setSendToken(tokens[0]);
    }
  }, []);

  const handleSelectToken = (token: any) => {
    setSendToken(token);
  }

  useEffect(() => {
    if (telegram) {
      telegram.BackButton.hide();
    }
  }, []);

  useEffect(() => {
    if(!valid_recipient(recipient, network) || amount <= 0) {
      setTransactionJSONrepresentation({
        inputs: [],
        outputs: [],
      })
      return;
    }

    let amountCoin = 0n;
    let amountToken = 0n;

    if (sendToken.type === 'Coin') {
      amountCoin = amount;
    } else {
      amountToken = amount
    }

    // start to prepare transaction by selecting UTXOs
    // step 1. Determine initial outputs
    const outputObj = [{
      type: 'Transfer',
      value: {
        type: sendToken.type,
        ...(sendToken.type === 'Coin' ? {} : { token_id: sendToken.token_id }),
        amount: {
          atoms: amount.toString(),
          decimal: amountDecimal.toString(),
        },
      },
      destination: recipient,
    }];
    // step 2. Determine inputs
    const inputObjCoin = selectUTXOs(utxos, amountCoin, 'Transfer', null);
    const inputObjToken = sendToken?.token_id ? selectUTXOs(utxos, amountToken, 'Transfer', sendToken?.token_id) : [];

    const inputObj = [...inputObjCoin, ...inputObjToken];

    // step 3. Calculate total input value
    const totalInputValueCoin: bigint = inputObjCoin.reduce((acc: bigint, item: any) => acc + BigInt(item.utxo.value.amount.atoms), 0n);
    const totalInputValueToken: bigint = inputObjToken.reduce((acc: bigint, item: any) => acc + BigInt(item.utxo.value.amount.atoms), 0n);

    const changeAmountCoin = totalInputValueCoin - amountCoin - fee;
    const changeAmountToken = totalInputValueToken - amountToken;

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

    if (changeAmountToken > 0) {
      const decimals = sendToken.token_details.number_of_decimals;

      outputObj.push({
        type: 'Transfer',
        value: {
          type: 'TokenV1',
          token_id: sendToken.token_id,
          amount: {
            atoms: changeAmountToken.toString(),
            decimal: (changeAmountToken.toString() / Math.pow(10, decimals)).toString(),
          },
        },
        destination: addresses[0], // change address
      });
    }

    setTransactionJSONrepresentation({
      inputs: inputObj,
      outputs: outputObj,
    });
  }, [recipient, amount, fee, sendToken]);

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
          ...(output?.value?.token_id ? { tokenId: output.value.token_id } : {}),
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

  const handleUpdateRecipient = (e: any) => {
    setRecipient(e.target.value);
  }

  const handleUpdateAmount = (e: any) => {
    // set only if it is a number or dot
    const value = e.target.value.replace(',','.');
    if (value.match(/^[0-9]*\.?[0-9]*$/)) {
      //if(e.target.value.toString().split('.')[1].length <= 11) {
      setAmountDecimal(value);
      //}
    }
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

  const handleBuildTransaction = () => {
    handleBlur();
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
          ...(input?.utxo?.value?.token_id ? { tokenId: input.utxo.value.token_id } : {}),
        })
      }
      if (input.utxo.type === 'LockThenTransfer') {
        return getOutputs({
          amount: BigInt(input.utxo.value.amount.atoms).toString(),
          address: input.utxo.destination,
          networkType: network,
          type: 'LockThenTransfer',
          lock: input.utxo.lock,
          ...(input?.utxo?.value?.token_id ? { tokenId: input.utxo.value.token_id } : {}),
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

  const handleCancelBroadcast = () => {
    setState('form');
  }

  const symbol = sendToken ? sendToken.symbol : 'ML';

  const available = tokens.find((token: any) => token.symbol === symbol)?.balance;

  const handleCancel = () => {
    navigate('/wallet');
  }

  const handlePaste = () => {
    navigator.clipboard.readText().then(text => {
      setRecipient(text);
    });
  }

  const handleFocus = () => {
    setAmountFocused(true);
  }

  const handleBlur = () => {
    setAmountFocused(false);
  }

  const handleSetSend = (percent: number) => () => {
    if(percent === 1){
      setAmountDecimal(available.toString() - fee.toString() / 1e11);
      return;
    }

    setAmountDecimal((available * percent).toString());
  }

  useEffect(() => {
    if(amountDecimal + fee.toString()/1e11 > tokens[0].balance){
      handleSetSend(1)();
    }
  }, [amountDecimal, fee, tokens]);

  return (
    <div className="relative">

      <TokenSelector open={tokens.length > 1 && sendToken===null} items={tokens} onSelect={handleSelectToken} onCancel={handleCancel} />

      <div className="px-4">
        <div className="text-xl mb-4">
          Send {symbol}
        </div>

        {
          state === 'form' && (
            <div className="flex flex-col gap-4">
              <div className="relative">
                <input onChange={handleUpdateRecipient} value={recipient} className="border border-mint-dark w-full rounded-xl px-4 py-4" placeholder="Recipient address" />
                <div onClick={handlePaste} className="absolute top-4 right-4 bg-mint w-16 h-8 rounded-full flex items-center justify-center">
                  paste
                </div>
                {/*<div>*/}
                {/*  Faucet: tmt1qycck7nrfglc0tp4nqju6jwp9fcqcactuyhn76h3*/}
                {/*</div>*/}
              </div>

              <div>
                <div className="relative">
                  <input type="text" inputmode="decimal" onFocus={handleFocus} onChange={handleUpdateAmount} value={amountDecimal || ''} className="border border-mint-dark w-full rounded-xl px-4 py-4" placeholder="Amount"/>
                  <div className="absolute right-0 top-0 text-xl py-4 px-4">{symbol}</div>
                </div>
                <div className="flex justify-between">
                  {
                    fee > 0n ? (
                      <div>
                        fee: {fee.toString() / 1e11} ML
                      </div>
                    ) : (
                      <div>
                        ~fee: 0.215 ML*
                      </div>
                    )
                  }
                  <div>
                    available: {available} {symbol}
                  </div>
                </div>
              </div>

              <div className="flex flex-row gap-2">
                <Link to="/wallet" className="bg-mint w-full py-4 rounded-2xl text-center">
                  Cancel
                </Link>
                <button onClick={handleBuildTransaction} disabled={!valid} className={`${valid ? 'bg-mint' : 'bg-gray-200'} w-full py-4 rounded-2xl`}>
                  Next
                </button>
              </div>
            </div>
          )
        }

        {
          state === 'confirm' && (
            <div className="h-auto top-0 left-0 right-0 bottom-0 bg-mint-light pb-32">
              <div className="text-xl mb-4">
                Confirm Transaction
              </div>

              <div className="flex flex-col gap-4 mb-4">
                <div>
                  <div className="text-xl">
                    Recipient
                  </div>
                  <div>
                    {recipient}
                  </div>
                </div>

                <div>
                  <div className="text-xl">
                    Amount
                  </div>
                  <div>
                    {amountDecimal} ML
                  </div>
                </div>

                <div>
                  <div className="text-xl">
                    Fee
                  </div>
                  <div>
                    {fee.toString()/1e11} ML
                  </div>
                </div>

                <div>
                  <div className="text-xl" onClick={toggleTxPreviewDetails}>
                    Transaction details {txPreviewDetails ? '▲' : '▼'}
                  </div>
                  {
                    txPreviewDetails && (
                      <>
                        <div>
                          <div className="text-sm">
                            Inputs
                          </div>
                          <div>
                            {
                              transactionJSONrepresentation.inputs.map((input: any, index: number) => (
                                <div key={index}>
                                  <div className="break-all">{input.outpoint.source_id}:{input.outpoint.index}</div>
                                  <div>{input.utxo.value.amount.decimal} ML</div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-sm">
                            Outputs
                          </div>
                          <div>
                            {
                              transactionJSONrepresentation.outputs.map((output: any, index: number) => (
                                <div key={index}>
                                  <div>{output.destination}</div>
                                  <div>{output.value.amount.decimal} ML</div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                        {/*<div>*/}
                        {/*  <div>*/}
                        {/*    HEX:*/}
                        {/*  </div>*/}
                        {/*  <div className="break-all">*/}
                        {/*    {transactionHEX}*/}
                        {/*  </div>*/}
                        {/*</div>*/}
                      </>
                    )}
                </div>
              </div>

              <div className="flex flex-row gap-2">
                <button onClick={handleCancelBroadcast} className="bg-mint w-full py-4 rounded-2xl">
                  Cancel
                </button>
                <button onClick={handleBroadcast} className="bg-mint w-full py-4 rounded-2xl">
                  Confirm
                </button>
              </div>
            </div>
          )
        }

        {
          state === 'broadcast' && (
            <div>
              <div className="text-xl">
                Transaction broadcasting
              </div>
              {
                transactionBroadcastingStatus === 'success' && (
                  <div>
                    <div>
                      Transaction was successfully broadcasted
                    </div>
                    <div className="mt-8">
                      <Link to="/wallet" className="bg-mint w-full py-4 px-4 rounded-2xl text-center">
                        Done
                      </Link>
                    </div>
                  </div>
                )
              }
              {
                transactionBroadcastingStatus === 'error' && (
                  <div>
                    Transaction broadcasting error
                  </div>
                )
              }
            </div>
          )
        }

        {/*<div className="font-mono whitespace-pre">*/}
        {/*{*/}
        {/*  JSON.stringify(transactionJSONrepresentation, null, 2)*/}
        {/*}*/}
        {/*</div>*/}

        {
          amountFocused && (
            <div
              className="fixed bottom-0 left-0 right-0 h-16 bg-mint-light z-50 flex flex-row justify-around items-center">
              <div className="bg-mint px-4 py-2 rounded-xl font-bold text-white " onClick={handleSetSend(0.25)}>25%</div>
              <div className="bg-mint px-4 py-2 rounded-xl font-bold text-white " onClick={handleSetSend(0.5)}>50%</div>
              <div className="bg-mint px-4 py-2 rounded-xl font-bold text-white " onClick={handleSetSend(1)}>Maximum</div>
              <div className="text-black font-black px-4" onClick={handleBlur}>Done</div>
            </div>
          )
        }
      </div>
    </div>
  )
}
