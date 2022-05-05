






export const DATA_STORE_FILE = 'txEngineFolder/walletLocalData.json'
export const TXID_MAP_FILE = 'txEngineFolder/txidMap.json'
export const TXID_LIST_FILE = 'txEngineFolder/txidList.json'
export const TRANSACTION_STORE_FILE = 'txEngineFolder/transactionList.json'












export class WalletLocalData {
  
  
  
  
  
  
  
  
  
  
  

  constructor(jsonString, primaryCurrency) {
    this.blockHeight = 0
    const totalBalances = {}
    this.totalBalances = totalBalances
    this.lastAddressQueryHeight = 0
    this.lastTransactionQueryHeight = {}
    this.lastTransactionDate = {}
    this.lastCheckedTxsDropped = 0
    this.numUnconfirmedSpendTxs = 0
    this.numTransactions = {}
    this.otherData = {}
    this.publicKey = ''
    this.enabledTokens = [primaryCurrency]
    if (jsonString !== null) {
      const data = JSON.parse(jsonString)

      if (typeof data.blockHeight === 'number') {
        this.blockHeight = data.blockHeight
      }
      if (typeof data.lastCheckedTxsDropped === 'number') {
        this.lastCheckedTxsDropped = data.lastCheckedTxsDropped
      }
      if (typeof data.numUnconfirmedSpendTxs === 'number') {
        this.numUnconfirmedSpendTxs = data.numUnconfirmedSpendTxs
      }
      if (typeof data.numTransactions === 'object') {
        this.numTransactions = data.numTransactions
      }
      if (typeof data.lastAddressQueryHeight === 'number') {
        this.lastAddressQueryHeight = data.lastAddressQueryHeight
      }
      if (typeof data.publicKey === 'string') this.publicKey = data.publicKey
      if (typeof data.totalBalances !== 'undefined') {
        this.totalBalances = data.totalBalances
      }
      if (typeof data.enabledTokens !== 'undefined') {
        this.enabledTokens = data.enabledTokens
        if (!this.enabledTokens.includes(primaryCurrency)) {
          this.enabledTokens.push(primaryCurrency)
        }
      }
      if (typeof data.otherData !== 'undefined') this.otherData = data.otherData
      if (typeof data.lastTransactionQueryHeight === 'object')
        this.lastTransactionQueryHeight = data.lastTransactionQueryHeight
      if (typeof data.lastTransactionDate === 'object')
        this.lastTransactionDate = data.lastTransactionDate
    }
  }
}
