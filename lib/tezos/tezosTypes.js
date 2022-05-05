// 

import { asNumber, asObject, asString } from 'cleaners'




export const asXtzGetTransaction = asObject({
  level: asNumber,
  timestamp: asString,
  hash: asString,
  sender: asObject({
    address: asString
  }),
  bakerFee: asNumber,
  allocationFee: asNumber,
  target: asObject({
    address: asString
  }),
  amount: asNumber,
  status: asString
})
























































































