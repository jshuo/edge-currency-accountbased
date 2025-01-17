







import { makeHederaPluginInner } from './hederaPlugin.js'


const otherSettings = {
  creatorApiServers: ['https://creator.myhbarwallet.com'],
  mirrorNodes: ['https://mainnet-public.mirrornode.hedera.com'],
  client: 'Mainnet',
  checksumNetworkID: '0',
  maxFee: 900000
}

const defaultSettings = {
  otherSettings
}

const currencyInfo = {
  // Basic currency information:
  currencyCode: 'HBAR',
  displayName: 'Hedera',
  pluginId: 'hedera',
  walletType: 'wallet:hedera',

  defaultSettings,

  memoMaxLength: 100,

  addressExplorer: `https://explorer.kabuto.sh/mainnet/id/%s`,
  transactionExplorer: `https://explorer.kabuto.sh/mainnet/transaction/%s`,

  denominations: [
    // An array of Objects of the possible denominations for this currency
    // other denominations are specified but these are the most common
    {
      name: 'HBAR',
      multiplier: '100000000', // 100,000,000
      symbol: 'ℏ'
    },
    {
      name: 'tHBAR',
      multiplier: '1',
      symbol: 'tℏ'
    }
  ],
  metaTokens: []
}

export const makeHederaPlugin = (opts) => {
  return makeHederaPluginInner(opts, currencyInfo)
}
