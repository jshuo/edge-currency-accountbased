










import { makeEosBasedPluginInner } from './eosPlugin'


// ----TELOS MAIN NET----
export const eosJsConfig = {
  chainId: '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11', // Telos main net
  keyProvider: [],
  httpEndpoint: '', // main net
  fetch: fetch,
  verbose: false // verbose logging such as API activity
}

const denominations = [
  {
    name: 'TLOS',
    multiplier: '10000',
    symbol: 'T'
  }
]

const otherSettings = {
  eosActivationServers: [
    'https://eospay.edge.app',
    'https://account.teloscrew.com'
  ],
  // used for the following routines, is Hyperion v2:

  // getIncomingTransactions
  // `/v2/history/get_transfers?to=${acct}&symbol=${currencyCode}&skip=${skip}&limit=${limit}&sort=desc`

  // getOutgoingTransactions
  // `/v2/history/get_actions?transfer.from=${acct}&transfer.symbol=${currencyCode}&skip=${skip}&limit=${limit}&sort=desc`

  // getKeyAccounts
  // `${server}/v2/state/get_key_accounts?public_key=${params[0]}`

  eosHyperionNodes: ['https://telos.caleos.io'],

  // used for eosjs fetch routines
  // getCurrencyBalance
  // getInfo
  // transaction
  eosNodes: ['https://telos.caleos.io'],
  eosFuelServers: [], // this will need to be fixed
  eosDfuseServers: [],
  uriProtocol: 'telos'
}

const defaultSettings = {
  otherSettings
}

export const telosCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'TLOS',
  displayName: 'Telos',
  pluginId: 'telos',
  pluginName: 'telos',
  // do we need plugin name?
  walletType: 'wallet:telos',

  defaultSettings,

  memoMaxLength: 256,

  addressExplorer: 'https://telos.bloks.io/account/%s',
  transactionExplorer: 'https://telos.bloks.io/transaction/%s',

  denominations,
  metaTokens: []
}

export const makeTelosPlugin = (opts) => {
  return makeEosBasedPluginInner(opts, telosCurrencyInfo, eosJsConfig)
}
