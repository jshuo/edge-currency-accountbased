






const otherSettings = {
  stellarServers: ['https://horizon.stellar.org']
}

const defaultSettings = {
  otherSettings
}

export const currencyInfo = {
  // Basic currency information:
  currencyCode: 'XLM',
  displayName: 'Stellar',
  pluginId: 'stellar',
  walletType: 'wallet:stellar',

  defaultSettings,

  memoMaxLength: 19,

  addressExplorer: 'https://stellarchain.io/address/%s',
  transactionExplorer: 'https://stellarchain.io/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'XLM',
      multiplier: '10000000',
      symbol: '*'
    }
  ],
  metaTokens: []
}
