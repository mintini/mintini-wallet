// @ts-nocheck
import {
  Amount,
  encode_lock_for_block_count,
  encode_lock_until_time,
  encode_output_create_delegation,
  encode_output_delegate_staking,
  encode_output_lock_then_transfer,
  encode_output_token_transfer,
  encode_output_transfer, staking_pool_spend_maturity_block_count
} from "./wasm_wrappers";

interface UTXO {
  outpoint: any;
  utxo: any;
}

export const selectUTXOs = (utxos: UTXO[], amount: bigint, outputType: string, token_id: string): UTXO[] => {
  if(outputType === 'Transfer') {
    return selectUTXOsForTransfer(utxos, amount, token_id);
  }
}

const selectUTXOsForTransfer = (utxos: UTXO[], amount: bigint, token_id: string): UTXO[] => {
  utxos = utxos.filter((utxo) => {
    if(token_id === null){
      return true;
    }
    return utxo.utxo.value.token_id === token_id;
  });

  let balance = BigInt(0)
  const utxosToSpend = []
  let lastIndex = 0

  // take biggest UTXOs first
  utxos.sort((a, b) => {
    return b.utxo.value.amount.atoms - a.utxo.value.amount.atoms
  })

  for (let i = 0; i < utxos.length; i++) {
    lastIndex = i
    const utxoBalance = BigInt(utxos[i].utxo.value.amount.atoms);
    if (balance < BigInt(amount)) {
      balance += utxoBalance
      utxosToSpend.push(utxos[i])
    } else {
      break
    }
  }

  if (balance === BigInt(amount)) {
    // pick up extra UTXO
    if (utxos[lastIndex + 1]) {
      utxosToSpend.push(utxos[lastIndex + 1])
    }
  }

  return utxosToSpend
}

const NETWORKS = {
  mainnet: 0,
  testnet: 1,
  regtest: 2,
  signet: 3,
}

export const getOutputs = ({
                             amount,
                             address,
                             networkType,
                             type = 'Transfer',
                             lock,
                             chainTip,
                             tokenId,
                             poolId,
                             delegation_id,
                           }) => {
  if (type === 'LockThenTransfer' && !lock) {
    throw new Error('LockThenTransfer requires a lock')
  }

  const networkIndex = networkType
  if (type === 'Transfer') {
    const amountInstace = Amount.from_atoms(amount);
    if (tokenId) {
      return encode_output_token_transfer(
        amountInstace,
        address,
        tokenId,
        networkIndex,
      )
    } else {
      return encode_output_transfer(amountInstace, address, networkIndex)
    }
  }
  if (type === 'LockThenTransfer') {
    const amountInstance = Amount.from_atoms(amount);
    if (lock.type === 'UntilTime') {
      const lockEncoded = encode_lock_until_time(BigInt(lock.content.timestamp))
      return encode_output_lock_then_transfer(
        amountInstance,
        address,
        lockEncoded,
        networkIndex,
      )
    }
    if (lock.type === 'ForBlockCount' && !chainTip) {
      const lockEncoded = encode_lock_for_block_count(BigInt(lock.content))
      return encode_output_lock_then_transfer(
        amountInstance,
        address,
        lockEncoded,
        networkIndex,
      )
    }
    if (lock.type === 'ForBlockCount' && chainTip) {
      const stakingMaturity = staking_pool_spend_maturity_block_count(chainTip.toString(), networkIndex);
      const lockEncoded = encode_lock_for_block_count(stakingMaturity);
      return encode_output_lock_then_transfer(
        amountInstance,
        address,
        lockEncoded,
        networkIndex,
      )
    }
  }
  if(type === 'CreateDelegationId') {
    return encode_output_create_delegation(poolId, address, networkIndex)
  }
  if(type === 'DelegateStaking') {
    const amountInstace = Amount.from_atoms(amount);
    return encode_output_delegate_staking(amountInstace, delegation_id, networkIndex)
  }
  // if (type === 'spendFromDelegation') {
  //   const stakingMaturity = getStakingMaturity(chainTip, networkType)
  //   const encodedLockForBlock = encode_lock_for_block_count(stakingMaturity)
  //   return encode_output_lock_then_transfer(
  //     amountInstace,
  //     address,
  //     encodedLockForBlock,
  //     networkIndex,
  //   )
  // }
}

export const valid_recipient = (recipient: string, network: number): boolean => {
  if (network === 1 && recipient.startsWith('tmt1') && recipient.length === 44){
    return true
  }
  if (network === 0 && recipient.startsWith('mtc1') && recipient.length === 44){
    return true
  }
  return false;
}

export function mergeUint8Arrays(arrays) {
  // Вычисляем общую длину всех массивов
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);

  // Создаем новый Uint8Array для результата
  const result = new Uint8Array(totalLength);

  // Копируем данные из каждого массива в результат
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

export const txToActivity = (txs: any[], addresses: any[]) => {
  const activities = [];

  txs.forEach(tx => {
    const activity = analysisTransaction({tx, addresses});
    activities.push(activity);
  });

  return activities;
}

function analysisTransaction({tx, addresses}) {
  const {
    inputs,
    outputs,
  } = tx;

  const activity = {
    txid: null,
    type: null,
    timestamp: null,
    fee: 0,
    amount: {
      inflow: {
        total: 0,
        token: { token_id: '' },
      },
      outflow: {
        total: 0,
        token: { token_id: '' },
      }
    },
  };

  activity.confirmations = tx.confirmations;

  activity.txid = tx.id;
  activity.fee = tx.fee;
  activity.timestamp = tx.timestamp;

  // filter out unsupported transactions
  const unsupportedInput = inputs.filter(input => input?.utxo?.type === 'IssueNft' || input?.utxo?.type === 'IssueFungibleToken');
  const unsupportedOutput = outputs.filter(output => output.type === 'IssueNft' || output.type === 'IssueFungibleToken');
  if(unsupportedInput.length > 0 || unsupportedOutput.length > 0) {
    activity.type = 'unsupported';
    return activity;
  }

  // check for delegation widthdrawals
  const delegationWithdrawals = inputs.filter(input => input?.input?.account_type === 'DelegationBalance');
  if(delegationWithdrawals.length > 0) {
    activity.type = 'delegation_withdrawal';
    return activity;
  }

  // check for delegation staking
  const delegationStaking = outputs.filter(output => output?.type === 'DelegateStaking');
  if(delegationStaking.length > 0) {
    activity.type = 'delegation_staking';
    return activity;
  }

  // check for delegation creation staking
  const delegationCreate = outputs.filter(output => output?.type === 'CreateDelegationId');
  if(delegationCreate.length > 0) {
    activity.type = 'delegation_create';
    return activity;
  }

  // lookup for utxo = null and input.command === 'FillOrder' in inputs
  const myFillOrders = inputs.filter(input => !input.utxo && input.input.command === 'FillOrder' && addresses.includes(input.input.destination));

  if(myFillOrders.length > 0) {
    const myInputs = inputs.filter(input => input.utxo && addresses.includes(input.utxo.destination));
    const myOutputs = outputs.filter(output => addresses.includes(output.destination));
    if(myInputs.length > 0 && myOutputs.length > 0) {
      activity.type = 'swap';
      let token = '';
      // let's calculate the amount. in this case need to compare the inputs.input.utxo.value.token and outputs.utxo.value.token. equal means that is source token. different means that is destination token

      // get order id
      const order_id = myFillOrders[0].input.order_id;
      activity.interact = { order_id };

      // lets calculate outflow amount from my addresses
      const outputAmount = myOutputs.reduce((acc, output) => {
        if(
          output.value.type === 'TokenV1'
        ) {
          acc += Number(output.value.amount.decimal);
          token = output.value.token_id;
        }
        return acc;
      }, 0);
      activity.amount.inflow.total = outputAmount;
      activity.amount.inflow.token = { token_id: token };

      // lets calculate inflow amount from my addresses
      const inputAmount = myInputs.reduce((acc, input) => {
        acc += Number(input.utxo.value.amount.decimal);
        token = input.utxo.value.token_id || 'Coin';
        return acc;
      }, 0);
      activity.amount.outflow.total = inputAmount;
      activity.amount.outflow.token = { token_id: token };

    }
    return activity;
  }

  // lookup my addresses in inputs and outputs. if so, that trasanction is sending to someone else
  const myInputs = inputs.filter(input => input.utxo && addresses.includes(input.utxo.destination));
  const myOutputs = outputs.filter(output => addresses.includes(output.destination));

  const otherInputs = inputs.filter(input => input.utxo && !addresses.includes(input.utxo.destination));
  const otherOutputs = outputs.filter(output => !addresses.includes(output.destination));

  if(myInputs.length > 0 && myOutputs.length >= 0) {
    if(otherInputs.length === 0 && otherOutputs.length === 0) {
      activity.type = 'send_self';
      let token = '';

      // let's calculate the amount
      const inputAmount = myInputs.reduce((acc, input) => {
        acc += Number(input.utxo.value.amount.decimal);
        token = input.utxo.value.type === 'TokenV1' ? input.utxo.value.token_id : 'Coin';
        return acc;
      }, 0);
      activity.amount.outflow.total = inputAmount;
      activity.amount.outflow.token = { token_id: token };


      const outputAmount = myOutputs.reduce((acc, output) => {
        acc += Number(output.value.amount.decimal);
        token = output.value.type === 'TokenV1' ? output.value.token_id : 'Coin';
        return acc;
      }, 0);
      activity.amount.inflow.total = outputAmount;
      activity.amount.inflow.token = { token_id: token };

      return activity;
    }
  }

  if(myInputs.length > 0 && myOutputs.length >= 0) {
    activity.type = 'send';
    let token = '';

    // let's calculate the amount
    const inputAmount = myInputs.reduce((acc, input) => {
      acc += Number(input.utxo.value.amount.decimal);
      token = input.utxo.value.type === 'TokenV1' ? input.utxo.value.token_id : 'Coin';
      return acc;
    }, 0);

    // let's calculate the amount send to other
    const outputAmount = otherOutputs.reduce((acc, output) => {
      acc += Number(output.value.amount.decimal);
      token = output.value.type === 'TokenV1' ? output.value.token_id : 'Coin';
      return acc;
    }, 0);

    const outputAddresses = otherOutputs.map(output => output.destination);

    activity.amount.outflow.total = outputAmount;
    activity.amount.outflow.token = { token_id: token };
    activity.interact = { addresses: outputAddresses };
    return activity;
  }

  if(myInputs.length === 0 && myOutputs.length > 0) {
    activity.type = 'receive';
    let token = '';

    // let's calculate the amount
    const outputAmount = myOutputs.reduce((acc, output) => {
      acc += Number(output.value.amount.decimal);
      token = output.value.type === 'TokenV1' ? output.value.token_id : 'Coin';
      return acc;
    }, 0);

    const inputAddresses = inputs.map(input => input.utxo.destination);

    activity.amount.inflow.total = outputAmount;
    activity.amount.inflow.token = { token_id: token };
    activity.interact = { addresses: inputAddresses };
    return activity;
  }

  return activity;
}
