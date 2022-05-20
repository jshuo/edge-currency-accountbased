




import { FIO_REQUESTS_TYPES } from './fioConst'

const defaultSettings = {
  apiUrls: [
    'http://testnet.fioprotocol.io/v1/',
    'https://api.testnet.fiosweden.org',
    'https://fiotestnet.blockpane.com'
  ],
  historyNodeUrls: [
    'https://fiotestnet.blockpane.com/v1/chain',
    'https://fio-testnet.eosphere.io'
  ],
  // fioRegApiUrl: 'https://reg.fioprotocol.io/public-api/',
  // fioDomainRegUrl: 'https://reg.fioprotocol.io/domain/',
  // fioAddressRegUrl: 'https://reg.fioprotocol.io/address/',
  fioRegApiUrl: 'https://reg-uat.fioprotocol.io/public-api/',
  fioDomainRegUrl: 'https://reg-uat.fioprotocol.io/domain/',
  fioAddressRegUrl: 'https://reg-uat.fioprotocol.io/address/',
  fioStakingApyUrl: 'https://fioprotocol.io/staking',
  defaultRef: 'secux',
  fallbackRef: 'secux',
  freeAddressRef: 'edgefree',
  errorCodes: {
    INVALID_FIO_ADDRESS: 'INVALID_FIO_ADDRESS',
    ALREADY_REGISTERED: 'ALREADY_REGISTERED',
    FIO_ADDRESS_IS_NOT_EXIST: 'FIO_ADDRESS_IS_NOT_EXIST',
    FIO_DOMAIN_IS_NOT_EXIST: 'FIO_DOMAIN_IS_NOT_EXIST',
    FIO_DOMAIN_IS_NOT_PUBLIC: 'FIO_DOMAIN_IS_NOT_PUBLIC',
    IS_DOMAIN_PUBLIC_ERROR: 'IS_DOMAIN_PUBLIC_ERROR',
    FIO_ADDRESS_IS_NOT_LINKED: 'FIO_ADDRESS_IS_NOT_LINKED',
    SERVER_ERROR: 'SERVER_ERROR'
  },
  fioRequestsTypes: FIO_REQUESTS_TYPES,
  balanceCurrencyCodes: {
    // TODO: Remove these currencyCodes in favor of adding a dedicated locked balances field to the API
    staked: 'FIO:STAKED',
    locked: 'FIO:LOCKED'
  }
}

export const currencyInfo = {
  // Basic currency information:
  currencyCode: 'FIO',
  displayName: 'FIO',
  pluginId: 'fio',
  walletType: 'wallet:fio',

  defaultSettings,

  addressExplorer: 'https://fio-test.bloks.io/key/%s',
  transactionExplorer: 'https://fio-test.bloks.io/transaction/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'FIO',
      multiplier: '1000000000',
      symbol: 'ᵮ'
    }
  ],
  metaTokens: []
}
