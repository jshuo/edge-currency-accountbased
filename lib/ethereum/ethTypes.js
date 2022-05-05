/**
 * Created by paul on 8/26/17.
 */
// 

import WalletConnect from '@walletconnect/client'
import {
  asArray,
  asBoolean,
  asEither,
  asMap,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown,
  asValue
} from 'cleaners'















































export const asEthereumFeesGasLimit = asObject({
  regularTransaction: asString,
  tokenTransaction: asString
})



export const asEthereumFeesGasPrice = asObject({
  highFee: asString,
  lowFee: asString,

  // Represents the default "Optimized" standard fee option where
  // standardFeeLow is the fee for a transaction with a small
  // quantity and standardFeeHigh is the fee for a large transaction.
  standardFeeLow: asString,
  standardFeeHigh: asString,

  // Defines what is considered a "small" and "large" transaction
  // for the above two fee options.
  standardFeeLowAmount: asString,
  standardFeeHighAmount: asString
})



export const asEthereumBaseFeeMultiplier = asObject({
  lowFee: asString,
  standardFeeLow: asString,
  standardFeeHigh: asString,
  highFee: asString
})



export const asEthereumFee = asObject({
  baseFeeMultiplier: asOptional(asEthereumBaseFeeMultiplier),
  gasLimit: asEthereumFeesGasLimit,
  gasPrice: asOptional(asEthereumFeesGasPrice),
  minPriorityFee: asOptional(asString)
})



export const asEthereumFees = asObject(asEthereumFee)















export const asEvmScancanTokenTransaction = asObject({
  blockNumber: asString,
  timeStamp: asString,
  hash: asOptional(asString),
  transactionHash: asOptional(asString),
  to: asString,
  from: asString,
  value: asString,
  nonce: asString,
  gasPrice: asString,
  gas: asString,
  cumulativeGasUsed: asString,
  gasUsed: asString,
  confirmations: asString,
  contractAddress: asString,
  tokenName: asString,
  tokenSymbol: asString,
  tokenDecimal: asString
})



export const asEvmScanTransaction = asObject({
  hash: asOptional(asString),
  transactionHash: asOptional(asString),
  blockNumber: asString,
  timeStamp: asString,
  gasPrice: asString,
  gasUsed: asString,
  value: asString,
  nonce: asString,
  from: asString,
  to: asString,
  gas: asString,
  isError: asString,
  cumulativeGasUsed: asString,
  confirmations: asOptional(asString)
})



export const asEvmScanInternalTransaction = asObject({
  hash: asOptional(asString),
  transactionHash: asOptional(asString),
  blockNumber: asString,
  timeStamp: asString,
  gasUsed: asString,
  value: asString,
  from: asString,
  to: asString,
  gas: asString,
  isError: asString,
  contractAddress: asOptional(asString)
})





export const asEvmScanGasResponseResult = asObject({
  LastBlock: asString,
  SafeGasPrice: asString,
  ProposeGasPrice: asString,
  FastGasPrice: asString,

  // Etherscan
  suggestBaseFee: asMaybe(asString),
  gasUsedRatio: asMaybe(asArray(asString))
})

export const asEvmScanGasResponse = asObject({
  status: asString,
  message: asString,
  result: asEither(asString, asObject(asEvmScanGasResponseResult))
})

















































export const asBlockbookBlockHeight = asObject({
  blockbook: asObject({
    bestHeight: asNumber
  })
})



export const asBlockbookTokenTransfer = asObject({
  from: asString,
  to: asString,
  symbol: asString,
  value: asString,
  token: asString
})



export const asBlockbookTx = asObject({
  txid: asString,
  vin: asArray(asObject({ addresses: asArray(asString) })),
  vout: asArray(asObject({ addresses: asArray(asString) })),
  blockHeight: asNumber,
  value: asString,
  blockTime: asNumber,
  tokenTransfers: asOptional(asArray(asBlockbookTokenTransfer)),
  ethereumSpecific: asObject({
    status: asNumber,
    gasLimit: asNumber,
    gasUsed: asNumber,
    gasPrice: asString
  })
})



export const asBlockbookTokenBalance = asObject({
  symbol: asString,
  contract: asString,
  balance: asString
})



export const asBlockbookAddress = asObject({
  page: asNumber,
  totalPages: asNumber,
  itemsOnPage: asNumber,
  balance: asString,
  unconfirmedBalance: asString,
  unconfirmedTxs: asNumber,
  transactions: asMaybe(asArray(asBlockbookTx), []),
  nonce: asString,
  tokens: asMaybe(asArray(asBlockbookTokenBalance), [])
})



export const asAlethioAccountsTokenTransfer = asObject({
  type: asString,
  attributes: asObject({
    fee: asOptional(asString),
    value: asString,
    blockCreationTime: asNumber,
    symbol: asString,
    globalRank: asArray(asNumber)
  }),
  relationships: asObject({
    token: asObject({
      data: asObject({
        id: asString
      }),
      links: asObject({
        related: asString
      })
    }),
    from: asObject({
      data: asObject({
        id: asString
      }),
      links: asObject({
        related: asString
      })
    }),
    to: asObject({
      data: asObject({
        id: asString
      }),
      links: asObject({
        related: asString
      })
    }),
    transaction: asObject({
      data: asObject({
        id: asString
      }),
      links: asObject({
        related: asString
      })
    })
  }),
  links: asObject({
    next: asString
  }),
  meta: asObject({
    page: asObject({
      hasNext: asBoolean
    })
  })
})





export const asFetchGetAlethio = asObject({
  data: asArray(asAlethioAccountsTokenTransfer),
  links: asObject({
    next: asString
  }),
  meta: asObject({
    page: asObject({
      hasNext: asBoolean
    })
  })
})



export const asBlockChairAddress = asObject({
  balance: asString,
  token_address: asString,
  token_symbol: asString
})



export const asCheckTokenBalBlockchair = asObject({
  data: asMap(
    asObject({
      address: asObject({
        balance: asString
      }),
      layer_2: asObject({
        erc_20: asArray(asOptional(asString))
      })
    })
  )
})



export const asCheckBlockHeightBlockchair = asObject({
  data: asObject({
    blocks: asNumber
  })
})















export const asAmberdataAccountsTx = asObject({
  hash: asString,
  timestamp: asString,
  blockNumber: asString,
  value: asString,
  fee: asString,
  gasLimit: asString,
  gasPrice: asString,
  gasUsed: asString,
  cumulativeGasUsed: asString,
  from: asArray(
    asObject({
      address: asString
    })
  ),
  to: asArray(
    asObject({
      address: asString
    })
  )
})



export const asAmberdataAccountsFuncs = asObject({
  transactionHash: asString,
  timestamp: asString,
  blockNumber: asString,
  value: asString,
  initialGas: asString,
  leftOverGas: asString,
  from: asObject({ address: asString }),
  to: asArray(asObject({ address: asString }))
})



export const asFetchGetAmberdataApiResponse = asObject({
  payload: asObject({
    records: asArray(asEither(asAmberdataAccountsTx, asAmberdataAccountsFuncs))
  })
})
















export const asRpcResultString = asObject({
  result: asString
})





































export const asWcProps = asObject({
  uri: asString,
  language: asMaybe(asString),
  token: asMaybe(asString)
})



export const asWcRpcPayload = asObject({
  id: asEither(asString, asNumber),
  method: asValue(
    'personal_sign',
    'eth_sign',
    'eth_signTypedData',
    'eth_sendTransaction',
    'eth_signTransaction',
    'eth_sendRawTransaction'
  ),
  params: asArray(asUnknown)
})



const asWcDappDetails = asObject({
  peerId: asString,
  peerMeta: asObject({
    description: asString,
    url: asString,
    icons: asArray(asString),
    name: asString
  }),
  chainId: asOptional(asNumber, 1)
})

















export const asWcSessionRequestParams = asObject({
  params: asArray(asWcDappDetails)
})

























