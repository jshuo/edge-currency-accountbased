






const otherSettings = {
  rpcNode: {
    networkName: 'mainnet',
    defaultHost: 'mainnet.lightwalletd.com',
    defaultPort: 9067
  },
  blockchairServers: ['https://api.blockchair.com'],
  defaultBirthday: 1310000,
  defaultNetworkFee: '1000', // hardcoded default ZEC fee
  transactionQueryLimit: 999
}

const defaultSettings = {
  otherSettings
}

export const currencyInfo = {
  // Basic currency information:
  currencyCode: 'ZEC',
  displayName: 'Zcash',
  pluginId: 'zcash',
  requiredConfirmations: 10,
  walletType: 'wallet:zcash',

  defaultSettings,

  addressExplorer: 'https://blockchair.com/zcash/address/%s?from=edgeapp',
  transactionExplorer:
    'https://blockchair.com/zcash/transaction/%s?from=edgeapp',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'ZEC',
      multiplier: '100000000',
      symbol: 'Z'
    }
  ],
  metaTokens: []
}
