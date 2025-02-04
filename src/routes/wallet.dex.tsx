// @ts-nocheck
import {useEffect, useState} from "react";
import {useTelegram} from "../context/Telegram.tsx";
import {useMintlayer} from "../context/Mintlayer.tsx";
import {useDatabase} from "../context/Database.tsx";
import {
  Amount,
  encode_input_for_fill_order,
  encode_input_for_utxo,
  encode_outpoint_source_id, encode_signed_transaction, encode_transaction, encode_witness,
  estimate_transaction_size, SignatureHashType,
  SourceId
} from "../lib/mintlayer/wasm_wrappers";
import {getOutputs, mergeUint8Arrays, selectUTXOs} from "../lib/mintlayer/helpers.ts";
import {TokenSelector} from "../_components/TokenSelector.tsx";
import {saveTransactions} from "../lib/storage/database.ts";

export const WalletDex = () => {
  const { telegram } = useTelegram();
  const [ state, setState ] = useState('form');
  const { db } = useDatabase();
  const { tokens, addresses, utxos, network, addressesPrivateKeys, refreshAccount, wallet } = useMintlayer();

  const [sell, setSell] = useState(0);

  const [nonceAdjust, setNonceAdjust] = useState(0);

  const [txPreviewDetails, setTxPreviewDetails] = useState(false);

  const [sellError, setSellError] = useState('');

  const [fee, setFee] = useState(0n);

  const [sellToken, setSellToken] = useState('Coin');
  const [buyToken, setBuyToken] = useState('');

  const [order, setOrder] = useState({});

  const [pairs, setPairs] = useState([]);

  const [tokensList, setTokensList] = useState([]);

  const [ transactionJSONrepresentation, setTransactionJSONrepresentation ] = useState({inputs: [], outputs: []});
  const [ transactionBINrepresentation, setTransactionBINrepresentation ] = useState({inputs: [], outputs: []});

  const [ transactionBroadcastingStatus, setTransactionBroadcastingStatus ] = useState('');

  const [ transactionHEX, setTransactionHEX ] = useState('');

  const [ tokenSellSelectorOpened, setTokenSellSelectorOpened ] = useState(false);
  const [ tokenBuySelectorOpened, setTokenBuySelectorOpened ] = useState(false);

  const toggleTxPreviewDetails = () => {
    setTxPreviewDetails(!txPreviewDetails);
  }

  useEffect(() => {
    if(tokens[0]?.balance < sell) {
      setSellError('Not enough balance');
    } else {
      setSellError('');
    }
  }, [sell, tokens]);

  useEffect(() => {
    if(
      sell <= 0
    ) {
      setTransactionJSONrepresentation({
        inputs: [],
        outputs: [],
      });
      return;
    }

    if(!order || !order?.order_id) {
      setTransactionJSONrepresentation({
        inputs: [],
        outputs: [],
      });
      return;
    }


    const amountDecimal = sell;
    const amount = BigInt(Math.trunc(amountDecimal * 1e11));
    // start to prepare transaction by selecting UTXOs
    const outputObj = [];

    // step pre-2. Determine inputs. This mostly to pick up Coins to pay fees
    const inputObj = selectUTXOs(utxos, amount, 'Transfer');

    // step 2. add command input
    order && inputObj.push({
      input: {
        input_type: "AccountCommand",
        command: "FillOrder",
        order_id: order.order_id,
        fill_atoms: amount.toString(),
        destination: addresses[0],
      },
      utxo: null,
    });

    // step 3. Calculate total input value
    const totalInputValue: bigint = inputObj
      .filter(({utxo}) => utxo !== null) // key input is not a UTXO
      .reduce((acc: bigint, item: any) => acc + BigInt(item.utxo.value.amount.atoms), 0n);

    const changeAmount =
      totalInputValue
      - amount
      - fee; // update fee calculation to include command input

    // step 4. Add change in necessary
    if (changeAmount > 0) {
      outputObj.push({
        type: 'Transfer',
        value: {
          type: 'Coin',
          amount: {
            atoms: changeAmount.toString(),
            decimal: changeAmount.toString() / 1e11,
          },
        },
        destination: addresses[0], // change address
      });
    }

    const decimals = tokensList.find((item: any) => item.token_id === buyToken)?.number_of_decimals;

    // step 5. Add output token
    const buyAmount = BigInt(Math.trunc(buy * Math.pow(10, decimals)));
    outputObj.push({
      type: 'Transfer',
      value: {
        type: 'TokenV1',
        token_id: buyToken,
        amount: {
          atoms: buyAmount.toString(),
          decimal: (buyAmount.toString() / Math.pow(10, decimals)).toString(),
        },
      },
      destination: addresses[0], // change address
    });


    setTransactionJSONrepresentation({
      inputs: inputObj,
      outputs: outputObj,
    });
  }, [sell, order, fee]);

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
    const transactionStrings = inputs
      .filter(({utxo}) => utxo !== null) // key input is not a UTXO
      .map((input: any) => ({
        transaction: input.outpoint.source_id,
        index: input.outpoint.index,
      }));
    const transactionBytes = transactionStrings
      .filter(({utxo}) => utxo !== null) // key input is not a UTXO
      .map((transaction: any) => ({
        bytes: Buffer.from(transaction.transaction, 'hex'),
        index: transaction.index,
      }));
    const outpointedSourceIds = transactionBytes.map((transaction: any) => ({
      source_id: encode_outpoint_source_id(transaction.bytes, SourceId.Transaction),
      index: transaction.index,
    }));
    const inputsIds = outpointedSourceIds.map((source: any) => (encode_input_for_utxo(source.source_id, source.index)));

    const commandInput = transactionJSONrepresentation.inputs
      .filter(({utxo}) => utxo === null)
      .map((input: any) => {
        const command = input.input;
        const nonce = pairs.find((pair: any) => pair.order_id === command.order_id).nonce + nonceAdjust; // TODO change nonce is failed
        return encode_input_for_fill_order(
          command.order_id,
          Amount.from_atoms(command.fill_atoms),
          command.destination,
          BigInt(nonce),
          network
        );
      });

    const inputsArray = [
      ...inputsIds,
      ...commandInput
    ];

    const outputsArrayItems = transactionJSONrepresentation.outputs.map((output) => {
      if (output.type === 'Transfer') {
        return getOutputs({
          amount: BigInt(output.value.amount.atoms).toString(),
          address: output.destination,
          networkType: network,
          tokenId: output.value.type === 'TokenV1' ? output.value.token_id : null,
        })
      }
    })
    const outputsArray = outputsArrayItems;

    const inputAddresses = transactionJSONrepresentation.inputs
      .map((input: any) => {
        if (input.utxo) {
          return input.utxo.destination;
        } else {
          return input.input.destination;
        }
      });

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


  useEffect(() => {
    const fetchPairs = async () => {
      const response = await fetch(`https://api-server${network===1?'-lovelace':''}.mintlayer.org/api/v2/order`);
      if(!response.ok) {
        return;
      }
      const data = await response.json();
      setPairs(data);
    }
    fetchPairs();
  }, []);

  useEffect(() => {
    const fetchTokens = async () => {
      const response = await fetch('https://api.mintini.app/dex_tokens?network=' + network);
      const data = await response.json();
      setTokensList(data);
      setBuyToken(data[0].token_id);
    }
    fetchTokens();
  }, []);

  useEffect(() => {
    if (telegram) {
      telegram.BackButton.hide();
    }
  }, []);

  useEffect(()=>{
    if(
      sell === 0 && !buyToken
    ) {
      setOrder({});
      return;
    }

    if(!tokensToBuy[buyToken]){
      setOrder({});
      return;
    }

    const availableOrders = tokensToBuy[buyToken].filter((pair: any) => pair.ask_balance > sell);

    if(availableOrders.length === 0) {
      setOrder({});
      return;
    }

    const bestPrice = availableOrders?.reduce((acc: any, item: any) => {
      if (acc.price > item.price) {
        return acc;
      }
      return item;
    });

    setOrder(bestPrice);
  }, [sell, buyToken])

  const buy = order?.price && sell ? sell / order?.price : 0

  const tokensToBuy = pairs.map((pair: any) => {
    return {
      order_id: pair.order_id,
      ask_balance: pair.ask_balance.decimal,
      token_id: pair.give_currency.token_id,
      price: pair.initially_asked.decimal / pair.initially_given.decimal,
    }
  }).reduce((acc: any, item: any) => {
    if (!acc[item.token_id]) {
      acc[item.token_id] = [];
    }
    acc[item.token_id].push(item);
    return acc;
  } , {});

  const handleSetSell = (percent: number) => () => {
    setSell(percent * tokens[0]?.balance);
  }

  const handleSellChange = (e: any) => {
    // set only if it is a number or dot
    const value = e.target.value.replace(',','.');
    if (value.match(/^[0-9]*\.?[0-9]*$/)) {
      //if(e.target.value.toString().split('.')[1].length <= 11) {
      setSell(value);
      //}
    }
  }

  const buyTokenSymbol = tokensList.find((item: any) => item.token_id === buyToken)?.symbol;
  // const sellTokenSymbol = tokens.find((item: any) => item.ticker === sellToken)?.symbol;

  const handleBroadcast = async () => {
    setState('broadcast');
    const transactionBody = transactionHEX;
    try {
      const response = await fetch(`https://api-server${network===1?'-lovelace':''}.mintlayer.org/api/v2/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: transactionBody,
      });

      // TODO: setNonceAdjust from the error response. also might be UTXO

      if (response.status === 200) {
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

  const handleCancelBroadcast = () => {
    setState('form');
  }

  const handleBuildTransaction = () => {
    setState('confirm');

    const inputsArray = transactionBINrepresentation.inputs;
    const outputsArray = transactionBINrepresentation.outputs;

    const transaction = encode_transaction(mergeUint8Arrays(inputsArray), mergeUint8Arrays(outputsArray), BigInt(0));

    const optUtxos_ = transactionJSONrepresentation.inputs
      .map((input: any) => {
        if (!input.utxo) {
          return 0;
        }
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
      if(optUtxos_[i] === 0) {
        optUtxos.push(new Uint8Array([0]));
        continue;
      } else {
        optUtxos.push(new Uint8Array([1]))
        optUtxos.push(optUtxos_[i])
        continue;
      }
    }

    const encodedWitnesses = transactionJSONrepresentation.inputs
      .map((input: any, index: number) => {
        let address = '';
        if (input.utxo) {
          address = input.utxo.destination;
        } else {
          address = input.input.destination;
        }
        const addressPrivateKey = addressesPrivateKeys[address];
        const witness = encode_witness(
          SignatureHashType.ALL,
          addressPrivateKey,
          address,
          transaction,
          mergeUint8Arrays(optUtxos),
          index,
          network,
        );
        return witness;
      });

    const encodedSignedTransaction = encode_signed_transaction(transaction, mergeUint8Arrays(encodedWitnesses));
    const txHash = encodedSignedTransaction.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')
    setTransactionHEX(txHash);
  }

  const orderPreview = transactionJSONrepresentation.inputs.length > 0 && transactionJSONrepresentation.outputs.length > 0;

  const orderNotAvailable = sell > 0 && !order.order_id;

  const tokenListShow = !orderPreview || orderNotAvailable;

  const handleSellTokenChange = (token: any) => {
    setSellToken(token.token_id);
    setTokenSellSelectorOpened(false)
  }

  const handleBuyTokenChange = (token: any) => {
    setBuyToken(token.token_id);
    setTokenBuySelectorOpened(false)
  }

  const sellTokenSymbol = 'ML';

  return (
    <>
      <TokenSelector items={tokens} open={tokenSellSelectorOpened} onCancel={()=>setTokenSellSelectorOpened(false)} onSelect={handleSellTokenChange} />
      <TokenSelector items={tokensList} open={tokenBuySelectorOpened} onCancel={()=>setTokenBuySelectorOpened(false)} onSelect={handleBuyTokenChange} />

      <div className="px-4 flex flex-col gap-4 mt-4">
        <div className="bg-mint px-4 py-4 rounded-2xl">
          <div className="text-mint-light">You pay</div>
          <div className="flex flex-row justify-between items-center">
            <div>
              <input type="text" inputmode="decimal" onChange={handleSellChange} value={sell || ''} placeholder="0"
                     className="text-3xl bg-transparent w-full  placeholder:text-mint-light text-white"/>
            </div>
            <div>
              <div onClick={()=>setTokenSellSelectorOpened(true)} className="text-mint-light text-2xl bg-mint-dark rounded-full px-4 py-1 whitespace-nowrap">{sellTokenSymbol} ▼</div>
            </div>
          </div>
          <div className="flex flex-row justify-between">
            <div>
              {/* TODO: currency swap */}
            </div>
            <div className="flex flex-row justify-between gap-4 mt-1">
              <div>
                {tokens[0]?.balance}
              </div>
              <button className="rounded-full bg-mint-dark px-2 text-white" onClick={handleSetSell(0.5)}>
                50%
              </button>
              <button className="rounded-full bg-mint-dark px-2 text-white" onClick={handleSetSell(1)}>
                100%
              </button>
            </div>
          </div>
        </div>

        <div className="bg-mint px-4 py-4 rounded-2xl">
          <div className="text-mint-light">You get</div>
          <div className="flex flex-row justify-between items-center">
            <div>
              <input type="text" value={buy} placeholder="0"
                     className="w-full text-3xl bg-transparent placeholder:text-mint-light text-white"/>
            </div>
            <div>
              <div onClick={()=>setTokenBuySelectorOpened(true)} className="text-mint-light text-2xl bg-mint-dark rounded-full px-4 py-1 whitespace-nowrap">{buyTokenSymbol || '■■'} ▼</div>
            </div>
          </div>
          <div className="flex flex-row justify-between">
            <div>
              {/* TODO: currency swap */}
            </div>
            <div className="flex flex-row justify-between gap-4">
              <div>
                0
              </div>
            </div>
          </div>
        </div>
      </div>

      {
        orderPreview && order && (
          <div className="mx-4 my-2 overflow-hidden bg-mint-dark text-mint-light p-4 rounded-2xl">
            <div>Current order:</div>
            <div>
              {order?.price} ML per {buyTokenSymbol}
            </div>
            <div>
              <div>
                More orders: {tokensToBuy[buyToken]?.length - 1}
              </div>
              <div>
                {tokensToBuy[buyToken]?.length > 1 && (
                  <div>
                    OrderId: {tokensToBuy[buyToken][1].order_id} {tokensToBuy[buyToken][1]?.price} {buyTokenSymbol} per ML
                  </div>
                )}
              </div>
            </div>
            <div>
              Transaction fee: {fee.toString() / 1e11} ML
            </div>
          </div>
        )
      }

      {
        orderNotAvailable && (
          <div className="mt-4 mx-4 bg-yellow-100 p-4 rounded-2xl text-black">
            Swap is not available because pair is not supported or not enough liquidity. Try to change token or amount.
          </div>
        )
      }

      {
        orderPreview && order && !sellError && (
          <div className="px-4 py-2">
            <button onClick={handleBuildTransaction} className="bg-mint w-full py-4 rounded-2xl">Swap</button>
          </div>
        )
      }

      {
        orderPreview && order && sellError && (
          <div className="px-4 py-2">
            <button className="bg-red-300 w-full py-4 rounded-2xl">{sellError}</button>
          </div>
        )
      }

      {
        state === 'confirm' && (
          <div className="absolute h-full overflow-scroll top-0 left-0 right-0 bottom-0 bg-mint-light px-4 py-20">
          <div className="text-xl mb-4">
              Confirm swap
            </div>

            <div className="flex flex-col gap-4 mb-4">
              <div>
                <div className="text-xl">
                  You sell
                </div>
                <div>
                  {sell} ML
                </div>
              </div>

              <div>
              <div className="text-xl">
                  You get
                </div>
                <div>
                  {buy} {buyTokenSymbol}
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
                      <div className="whitespace-pre w-full overflow-scroll">
                        {JSON.stringify(transactionJSONrepresentation, null, 2)}
                      </div>
                      <div>
                        <div className="text-sm">
                          Inputs
                        </div>
                        <div>
                          {
                            transactionJSONrepresentation.inputs.map((input: any, index: number) => (
                              <>
                                {
                                  input.utxo ? (
                                    <div key={index}>
                                      <div className="break-all">{input.outpoint.source_id}:{input.outpoint.index}</div>
                                      <div>{input.utxo.value.amount.decimal} ML</div>
                                    </div>
                                  ) : (
                                    <div key={index}>
                                      <div className="break-all">Command</div>
                                      <div>{JSON.stringify(input)}</div>
                                    </div>
                                  )
                                }
                              </>
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
                      <div>
                        <div>
                          HEX:
                        </div>
                        <div className="break-all bg-amber-200 rounded-3xl p-2">
                          {transactionHEX}
                        </div>
                      </div>
                    </>
                  )
                }
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
          <div className="mx-4">
            <div className="text-xl">
              Transaction broadcasting
            </div>
            {
              transactionBroadcastingStatus === 'success' && (
                <div>
                  Transaction was successfully broadcasted
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


      {/*<div className="p-4 whitespace-pre-wrap">*/}
      {/*  {JSON.stringify(transaction_preview, null, 2)}*/}
      {/*</div>*/}

      {/*<div className="flex flex-row mt-4 justify-center">*/}
      {/*  <div className="w-20 h-1 bg-mint-dark rounded"></div>*/}
      {/*</div>*/}

      {/*<div className="flex flex-col gap-4 mt-8">*/}
      {/*  <div className="flex flex-col items-center justify-center">*/}
      {/*    <div className="text-black text-xl font-light">Tokens</div>*/}
      {/*  </div>*/}
      {/*</div>*/}

      {/*<div className="flex flex-row mt-4 justify-center">*/}
      {/*  <div className="w-20 h-1 bg-mint-dark rounded"></div>*/}
      {/*</div>*/}

      {/*<div className="flex flex-col gap-4 mt-8">*/}
      {/*  <div className="flex flex-col items-center justify-center">*/}
      {/*    <div className="text-black text-xl font-light">Pairs</div>*/}
      {/*  </div>*/}
      {/*</div>*/}

      {/*<div>*/}
      {/*  <div className="whitespace-pre">*/}
      {/*    {JSON.stringify(pairs, null, 2)}*/}
      {/*  </div>*/}
      {/*</div>*/}

      {/*<div>*/}
      {/*  <div className="whitespace-pre">*/}
      {/*    {JSON.stringify(tokensToBuy, null, 2)}*/}
      {/*  </div>*/}
      {/*</div>*/}

      {
        tokenListShow && (
          <div className="mx-4 mt-5">
            <div className="text-2xl mb-4">Tokens</div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-row justify-between">
                <div className="flex flex-row items-center gap-4">
                  Name
                </div>
                <div>Price</div>
              </div>
              {
                tokensList.map((token: any, index: number) => {
                  return (
                    <div key={index} className="flex flex-row justify-between">
                      <div className="flex flex-row items-center gap-4">
                        <div
                          className="rounded-full bg-mint w-10 h-10 flex justify-center items-center">{token.symbol.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div className="font-normal">{token.symbol}</div>
                          <div className="font-light">token</div>
                        </div>
                      </div>
                      <div>-</div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        )
      }


    </>
  )
}
