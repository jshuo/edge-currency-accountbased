






const otherSettings = {
  rippledServers: ['wss://s2.ripple.com', 'wss://xrplcluster.com'],
  defaultFee: '10', // in drops
  baseReserve: '10000000'
}

const defaultSettings = {
  otherSettings,
  errorCodes: {
    UNIQUE_IDENTIFIER_EXCEEDS_LENGTH: 'UNIQUE_IDENTIFIER_EXCEEDS_LENGTH',
    UNIQUE_IDENTIFIER_EXCEEDS_LIMIT: 'UNIQUE_IDENTIFIER_EXCEEDS_LIMIT',
    UNIQUE_IDENTIFIER_FORMAT: 'UNIQUE_IDENTIFIER_FORMAT'
  }
}

export const currencyInfo = {
  // Basic currency information:
  currencyCode: 'XRP',
  displayName: 'XRP',
  pluginId: 'ripple',
  walletType: 'wallet:ripple',

  defaultSettings,

  memoMaxLength: 10,
  memoMaxValue: '4294967295',

  addressExplorer: 'https://bithomp.com/explorer/%s',
  transactionExplorer: 'https://bithomp.com/explorer/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'XRP',
      multiplier: '1000000',
      symbol: 'X'
    }
  ],
  metaTokens: []
}
