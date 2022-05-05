/**
 * Created by paul on 8/26/17.
 */
// 

import { asArray, asNumber, asObject, asString } from 'cleaners'


















export const asFee = asObject({
  result: asObject({
    drops: asObject({
      minimum_fee: asString
    })
  })
})

export const asServerInfo = asObject({
  result: asObject({
    info: asObject({
      validated_ledger: asObject({
        seq: asNumber
      })
    })
  })
})

export const asXrpTransaction = asObject({
  Account: asString,
  Amount: asString,
  Destination: asString,
  Fee: asString,
  date: asNumber,
  hash: asString,
  ledger_index: asNumber
})



export const asGetTransactionsResponse = asObject({
  result: asObject({
    transactions: asArray(
      asObject({
        tx: asXrpTransaction
      })
    )
  })
})

export const asBalance = asObject({ currency: asString, value: asString })
