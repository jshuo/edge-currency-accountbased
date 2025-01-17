






const otherSettings = {
  binanceApiServers: [
    'https://dex.binance.org',
    'https://dex-atlantic.binance.org',
    'https://dex-asiapacific.binance.org',
    'https://dex-european.binance.org'
  ]
}

const defaultSettings = {
  otherSettings
}

export const currencyInfo = {
  // Basic currency information:
  currencyCode: 'BNB',
  displayName: 'BNB Beacon Chain',
  pluginId: 'binance',
  walletType: 'wallet:binance',

  defaultSettings,

  memoMaxLength: 128,

  addressExplorer: 'https://explorer.binance.org/address/%s',
  transactionExplorer: 'https://explorer.binance.org/tx/%s',
  blockExplorer: 'https://explorer.binance.org/block/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'BNB',
      multiplier: '100000000',
      symbol: 'B'
    }
  ],
  metaTokens: []
}
