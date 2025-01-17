// 

import { bns } from 'biggystring'

import {















  InsufficientFundsError,
  SpendToSelfError
} from 'edge-core-js/types'

import { CurrencyPlugin } from './plugin.js'
import {
  asCurrencyCodeOptions,
  checkCustomToken,
  checkEdgeSpendInfo
} from './schema.js'
import {

  DATA_STORE_FILE,
  TRANSACTION_STORE_FILE,
  TXID_LIST_FILE,
  TXID_MAP_FILE,
  WalletLocalData
} from './types.js'
import {
  cleanTxLogs,
  getDenomInfo,
  normalizeAddress,
  safeErrorMessage
} from './utils.js'

const SAVE_DATASTORE_MILLISECONDS = 10000
const MAX_TRANSACTIONS = 1000
const DROPPED_TX_TIME_GAP = 3600 * 24 // 1 Day

export class CurrencyEngine {
  
  
  
  
  
  
   // Each currency code can be a 0-1 value
   // Each currency code can be a 0-1 value
  
  
  
  
  
   // Maps txid to index of tx in
   // Map of array of txids in chronological order
   // Transactions that have changed and need to be added
  
  
  
  
  
  
  
  
  
  
  

  constructor(
    currencyPlugin,
    walletInfo,
    opts
  ) {
    const currencyCode = currencyPlugin.currencyInfo.currencyCode
    const { walletLocalDisklet, callbacks } = opts

    this.currencyPlugin = currencyPlugin
    this.io = currencyPlugin.io
    this.log = opts.log
    this.warn = (message, e) => this.log.warn(message + safeErrorMessage(e))
    this.error = (message, e) => this.log.error(message + safeErrorMessage(e))
    this.engineOn = false
    this.addressesChecked = false
    this.tokenCheckBalanceStatus = {}
    this.tokenCheckTransactionsStatus = {}
    this.walletLocalDataDirty = false
    this.transactionsChangedArray = []
    this.transactionList = {}
    this.transactionListDirty = false
    this.transactionsLoaded = false
    this.txIdMap = {}
    this.txIdList = {}
    this.walletInfo = walletInfo
    this.walletId = walletInfo.id ? `${walletInfo.id} - ` : ''
    this.currencyInfo = currencyPlugin.currencyInfo
    this.allTokens = currencyPlugin.currencyInfo.metaTokens.slice(0)
    this.customTokens = []
    this.timers = {}

    this.transactionList[currencyCode] = []
    this.txIdMap[currencyCode] = {}
    this.txIdList[currencyCode] = []

    if (opts.userSettings != null) {
      this.currentSettings = opts.userSettings
    } else {
      this.currentSettings = this.currencyInfo.defaultSettings
    }

    this.currencyEngineCallbacks = callbacks
    this.walletLocalDisklet = walletLocalDisklet

    if (typeof this.walletInfo.keys.publicKey !== 'string') {
      this.walletInfo.keys.publicKey = walletInfo.keys.publicKey
    }
    this.log(
      `Created Wallet Type ${this.walletInfo.type} for Currency Plugin ${this.currencyInfo.pluginId}`
    )
  }

  isSpendTx(edgeTransaction) {
    if (edgeTransaction.nativeAmount) {
      if (edgeTransaction.nativeAmount.slice(0, 1) === '-') {
        return true
      }
      if (bns.gt(edgeTransaction.nativeAmount, '0')) {
        return false
      }
    }
    let out = true
    if (
      edgeTransaction.ourReceiveAddresses &&
      edgeTransaction.ourReceiveAddresses.length
    ) {
      for (const addr of edgeTransaction.ourReceiveAddresses) {
        if (addr === this.walletLocalData.publicKey) {
          out = false
        }
      }
    }
    return out
  }

  async loadTransactions() {
    if (this.transactionsLoaded) {
      this.log('Transactions already loaded')
      return
    }
    this.transactionsLoaded = true

    const disklet = this.walletLocalDisklet
    let txIdList
    let txIdMap
    let transactionList
    try {
      const result = await disklet.getText(TXID_LIST_FILE)
      txIdList = JSON.parse(result)
    } catch (e) {
      this.log('Could not load txidList file. Failure is ok on new device')
      await disklet.setText(TXID_LIST_FILE, JSON.stringify(this.txIdList))
    }
    try {
      const result = await disklet.getText(TXID_MAP_FILE)
      txIdMap = JSON.parse(result)
    } catch (e) {
      this.log('Could not load txidMap file. Failure is ok on new device')
      await disklet.setText(TXID_MAP_FILE, JSON.stringify(this.txIdMap))
    }

    try {
      const result = await disklet.getText(TRANSACTION_STORE_FILE)
      transactionList = JSON.parse(result)
    } catch (e) {
      if (e.code === 'ENOENT') {
        this.log(
          'Could not load transactionList file. Failure is ok on new device'
        )
        await disklet.setText(
          TRANSACTION_STORE_FILE,
          JSON.stringify(this.transactionList)
        )
      } else {
        this.log.crash(e, this.walletLocalData)
      }
    }

    let isEmptyTransactions = true
    for (const cc of Object.keys(this.transactionList)) {
      if (this.transactionList[cc] && this.transactionList[cc].length > 0) {
        isEmptyTransactions = false
        break
      }
    }

    for (const cc of Object.keys(this.transactionList)) {
      if (
        this.transactionList[cc] !== undefined &&
        this.transactionList[cc].length > 0
      ) {
        if (
          transactionList !== undefined &&
          transactionList[cc] !== undefined &&
          transactionList[cc].length < this.transactionList[cc].length
        ) {
          this.log.crash(
            new Error(
              `Transaction list length mismatch for ${cc}: on disk ${transactionList[cc].length} txs < in memory ${this.transactionList[cc].length} txs`
            ),
            {
              ...transactionList,
              ...this.transactionList,
              ...this.walletLocalData
            }
          )
        }
      }
    }

    if (isEmptyTransactions) {
      // Easy, just copy everything over
      this.transactionList = transactionList || this.transactionList
      this.txIdList = txIdList || this.txIdList
      this.txIdMap = txIdMap || this.txIdMap
    } else if (transactionList != null) {
      // Manually add transactions via addTransaction()
      for (const cc of Object.keys(transactionList)) {
        for (const edgeTransaction of transactionList[cc]) {
          this.addTransaction(cc, edgeTransaction)
        }
      }
    }
    for (const currencyCode in this.transactionList) {
      this.walletLocalData.numTransactions[currencyCode] =
        this.transactionList[currencyCode].length
    }
  }

  async loadEngine(
    plugin,
    walletInfo,
    opts
  ) {
    if (!this.walletInfo.keys.publicKey) {
      const pubKeys = await this.currencyPlugin.derivePublicKey(this.walletInfo)
      this.walletInfo.keys.publicKey = pubKeys.publicKey
    }

    const disklet = this.walletLocalDisklet
    try {
      const result = await disklet.getText(DATA_STORE_FILE)
      this.walletLocalData = new WalletLocalData(
        result,
        this.currencyInfo.currencyCode
      )
      this.walletLocalData.publicKey = this.walletInfo.keys.publicKey
    } catch (err) {
      try {
        this.log('No walletLocalData setup yet: Failure is ok')
        this.walletLocalData = new WalletLocalData(
          null,
          this.currencyInfo.currencyCode
        )
        this.walletLocalData.publicKey = this.walletInfo.keys.publicKey
        await disklet.setText(
          DATA_STORE_FILE,
          JSON.stringify(this.walletLocalData)
        )
      } catch (e) {
        this.error('Error writing to localDataStore. Engine not started: ', e)
        throw e
      }
    }

    for (const token of this.walletLocalData.enabledTokens) {
      this.tokenCheckBalanceStatus[token] = 0
      this.tokenCheckTransactionsStatus[token] = 0
    }

    // Initialize walletLocalData.lastTransactionQueryHeight for
    //  backwards-compatibility
    if (!this.walletLocalData.lastTransactionQueryHeight) {
      for (const token of this.walletLocalData.enabledTokens) {
        this.walletLocalData.lastTransactionQueryHeight[token] =
          this.walletLocalData.lastAddressQueryHeight || 0
      }
    }
    this.doInitialBalanceCallback()
  }

  findTransaction(currencyCode, txid) {
    if (this.txIdMap[currencyCode]) {
      const index = this.txIdMap[currencyCode][txid]
      if (typeof index === 'number') {
        return index
      }
    }
    return -1
  }

  sortTxByDate(a, b) {
    return b.date - a.date
  }

  // Add or update tx in transactionList
  addTransaction(
    currencyCode,
    edgeTransaction,
    lastSeenTime
  ) {
    this.log('executing addTransaction: ', edgeTransaction.txid)
    // set otherParams if not already set
    if (!edgeTransaction.otherParams) {
      edgeTransaction.otherParams = {}
    }

    if (edgeTransaction.blockHeight < 1) {
      edgeTransaction.otherParams.lastSeenTime =
        lastSeenTime || Math.round(Date.now() / 1000)
    }
    const txid = normalizeAddress(edgeTransaction.txid)
    const idx = this.findTransaction(currencyCode, txid)
    // if blockHeight of transaction is higher than known blockHeight
    // then set transaction's blockHeight as the highest known blockHeight
    if (edgeTransaction.blockHeight > this.currencyPlugin.highestTxHeight) {
      this.currencyPlugin.highestTxHeight = edgeTransaction.blockHeight
    }

    let needsReSort = false
    // if transaction doesn't exist in database
    if (idx === -1) {
      if (
        // if unconfirmed spend then increment # unconfirmed spend TX's
        this.isSpendTx(edgeTransaction) &&
        edgeTransaction.blockHeight === 0
      ) {
        this.walletLocalData.numUnconfirmedSpendTxs++
        this.walletLocalDataDirty = true
      }

      needsReSort = true
      // if currency's transactionList is uninitialized then initialize
      if (typeof this.transactionList[currencyCode] === 'undefined') {
        this.transactionList[currencyCode] = []
      } else if (
        this.transactionList[currencyCode].length >= MAX_TRANSACTIONS
      ) {
        return
      }
      // add transaction to list of tx's, and array of changed transactions
      this.transactionList[currencyCode].push(edgeTransaction)
      this.walletLocalData.numTransactions[currencyCode] =
        this.transactionList[currencyCode].length
      this.walletLocalDataDirty = true

      this.transactionListDirty = true
      this.transactionsChangedArray.push(edgeTransaction)
      this.warn(`addTransaction new tx: ${edgeTransaction.txid}`)
    } else {
      // Already have this tx in the database. See if anything changed
      const transactionsArray = this.transactionList[currencyCode]
      const edgeTx = transactionsArray[idx]

      const { otherParams: otherParamsOld = {} } = edgeTx
      const { otherParams: otherParamsNew = {} } = edgeTransaction
      if (
        // if something in the transaction has changed?
        edgeTx.blockHeight < edgeTransaction.blockHeight ||
        (edgeTx.blockHeight === 0 && edgeTransaction.blockHeight < 0) ||
        (edgeTx.blockHeight === edgeTransaction.blockHeight &&
          (edgeTx.networkFee !== edgeTransaction.networkFee ||
            edgeTx.nativeAmount !== edgeTransaction.nativeAmount ||
            otherParamsOld.lastSeenTime !== otherParamsNew.lastSeenTime ||
            edgeTx.date !== edgeTransaction.date))
      ) {
        // If a spend transaction goes from unconfirmed to dropped or confirmed,
        // decrement numUnconfirmedSpendTxs
        if (
          this.isSpendTx(edgeTransaction) &&
          edgeTransaction.blockHeight !== 0 &&
          edgeTx.blockHeight === 0
        ) {
          this.walletLocalData.numUnconfirmedSpendTxs--
        }
        if (edgeTx.date !== edgeTransaction.date) {
          needsReSort = true
        }
        this.warn(
          `addTransaction: update ${edgeTransaction.txid} height:${edgeTransaction.blockHeight}`
        )
        this.walletLocalDataDirty = true
        this.updateTransaction(currencyCode, edgeTransaction, idx)
      } else {
        // this.log(sprintf('Old transaction. No Update: %s', tx.hash))
      }
    }
    if (needsReSort) {
      this.sortTransactions(currencyCode)
    }
  }

  sortTransactions(currencyCode) {
    // Sort
    this.transactionList[currencyCode].sort(this.sortTxByDate)
    // Add to txidMap
    const txIdList = []
    let i = 0
    for (const tx of this.transactionList[currencyCode]) {
      if (!this.txIdMap[currencyCode]) {
        this.txIdMap[currencyCode] = {}
      }
      this.txIdMap[currencyCode][normalizeAddress(tx.txid)] = i
      txIdList.push(normalizeAddress(tx.txid))
      i++
    }
    this.txIdList[currencyCode] = txIdList
  }

  checkDroppedTransactionsThrottled() {
    const now = Date.now() / 1000
    if (
      now - this.walletLocalData.lastCheckedTxsDropped >
      DROPPED_TX_TIME_GAP
    ) {
      this.checkDroppedTransactions(now)
      this.walletLocalData.lastCheckedTxsDropped = now
      this.walletLocalDataDirty = true
      if (this.transactionsChangedArray.length > 0) {
        this.currencyEngineCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      }
    }
  }

  checkDroppedTransactions(dateNow) {
    let numUnconfirmedSpendTxs = 0
    for (const currencyCode in this.transactionList) {
      // const droppedTxIndices: Array<number> = []
      for (let i = 0; i < this.transactionList[currencyCode].length; i++) {
        const tx = this.transactionList[currencyCode][i]
        if (tx.blockHeight === 0) {
          const { otherParams = {} } = tx
          const lastSeen = otherParams.lastSeenTime
          if (dateNow - lastSeen > DROPPED_TX_TIME_GAP) {
            // droppedTxIndices.push(i)
            tx.blockHeight = -1
            tx.nativeAmount = '0'
            this.transactionsChangedArray.push(tx)
            // delete this.txIdMap[currencyCode][tx.txid]
          } else if (this.isSpendTx(tx)) {
            // Still have a pending spend transaction in the tx list
            numUnconfirmedSpendTxs++
          }
        }
      }
      // Delete transactions in reverse order
      // for (let i = droppedTxIndices.length - 1; i >= 0; i--) {
      //   const droppedIndex = droppedTxIndices[i]
      //   this.transactionList[currencyCode].splice(droppedIndex, 1)
      // }
      // if (droppedTxIndices.length) {
      //   this.sortTransactions(currencyCode)
      // }
    }
    this.walletLocalData.numUnconfirmedSpendTxs = numUnconfirmedSpendTxs
    this.walletLocalDataDirty = true
  }

  updateTransaction(
    currencyCode,
    edgeTransaction,
    idx
  ) {
    // Update the transaction
    this.transactionList[currencyCode][idx] = edgeTransaction
    this.transactionListDirty = true
    this.transactionsChangedArray.push(edgeTransaction)
    this.warn(`updateTransaction: ${edgeTransaction.txid}`)
  }

  // *************************************
  // Save the wallet data store
  // *************************************
  async saveWalletLoop() {
    const disklet = this.walletLocalDisklet
    const promises = []
    if (this.transactionListDirty) {
      await this.loadTransactions()
      this.log('transactionListDirty. Saving...')
      let jsonString = JSON.stringify(this.transactionList)
      promises.push(
        disklet.setText(TRANSACTION_STORE_FILE, jsonString).catch(e => {
          this.error('Error saving transactionList ', e)
        })
      )
      jsonString = JSON.stringify(this.txIdList)
      promises.push(
        disklet.setText(TXID_LIST_FILE, jsonString).catch(e => {
          this.error('Error saving txIdList ', e)
        })
      )
      jsonString = JSON.stringify(this.txIdMap)
      promises.push(
        disklet.setText(TXID_MAP_FILE, jsonString).catch(e => {
          this.error('Error saving txIdMap ', e)
        })
      )
      await Promise.all(promises)
      this.transactionListDirty = false
    }
    if (this.walletLocalDataDirty) {
      this.log('walletLocalDataDirty. Saving...')
      const jsonString = JSON.stringify(this.walletLocalData)
      await disklet
        .setText(DATA_STORE_FILE, jsonString)
        .then(() => {
          this.walletLocalDataDirty = false
        })
        .catch(e => {
          this.error('Error saving walletLocalData ', e)
        })
    }
  }

  doInitialBalanceCallback() {
    for (const currencyCode of this.walletLocalData.enabledTokens) {
      try {
        this.currencyEngineCallbacks.onBalanceChanged(
          currencyCode,
          this.walletLocalData.totalBalances[currencyCode]
        )
      } catch (e) {
        this.error(
          `doInitialBalanceCallback Error for currencyCode ${currencyCode}`,
          e
        )
      }
    }
  }

  doInitialTransactionsCallback() {
    for (const currencyCode of this.walletLocalData.enabledTokens) {
      try {
        this.currencyEngineCallbacks.onTransactionsChanged(
          this.transactionList[currencyCode]
        )
      } catch (e) {
        this.error(
          `doInitialTransactionsCallback Error for currencyCode ${currencyCode}`,
          e
        )
      }
    }
  }

  async addToLoop(func, timer) {
    try {
      // $FlowFixMe
      await this[func]()
    } catch (e) {
      this.error(`Error in Loop: ${func} `, e)
    }
    if (this.engineOn) {
      this.timers[func] = setTimeout(() => {
        if (this.engineOn) {
          this.addToLoop(func, timer)
        }
      }, timer)
    }
    return true
  }

  getTokenInfo(token) {
    return this.allTokens.find(element => {
      return element.currencyCode === token
    })
  }

  updateOnAddressesChecked() {
    if (this.addressesChecked) {
      return
    }

    const activeTokens = this.walletLocalData.enabledTokens
    const perTokenSlice = 1 / activeTokens.length
    let totalStatus = 0
    let numComplete = 0
    for (const token of activeTokens) {
      const balanceStatus = this.tokenCheckBalanceStatus[token] || 0
      const txStatus = this.tokenCheckTransactionsStatus[token] || 0
      totalStatus += ((balanceStatus + txStatus) / 2) * perTokenSlice
      if (balanceStatus === 1 && txStatus === 1) {
        numComplete++
      }
    }
    if (numComplete === activeTokens.length) {
      totalStatus = 1
      this.addressesChecked = true
    }
    this.log(`${this.walletInfo.id} syncRatio of: ${totalStatus}`)
    // note that sometimes callback does not get triggered on Android debug
    this.currencyEngineCallbacks.onAddressesChecked(totalStatus)
  }

  async startEngine() {
    this.addToLoop('saveWalletLoop', SAVE_DATASTORE_MILLISECONDS)
  }

  // *************************************
  // Public methods
  // *************************************

  async killEngine() {
    // Set status flag to false
    this.engineOn = false
    // Clear Inner loops timers
    for (const timer in this.timers) {
      clearTimeout(this.timers[timer])
    }
    this.timers = {}
  }

  async changeUserSettings(userSettings) {
    this.currentSettings = userSettings
  }

  async clearBlockchainCache() {
    const temp = JSON.stringify({
      enabledTokens: this.walletLocalData.enabledTokens,
      publicKey: this.walletLocalData.publicKey
    })
    this.walletLocalData = new WalletLocalData(
      temp,
      this.currencyInfo.currencyCode
    )
    this.walletLocalDataDirty = true
    this.addressesChecked = false
    this.tokenCheckBalanceStatus = {}
    this.tokenCheckTransactionsStatus = {}
    this.transactionList = {}
    this.txIdList = {}
    this.txIdMap = {}
    this.transactionListDirty = true
    this.otherData = this.walletLocalData.otherData
    await this.saveWalletLoop()
  }

  getBlockHeight() {
    return parseInt(this.walletLocalData.blockHeight)
  }

  enableTokensSync(tokens) {
    for (const token of tokens) {
      if (this.walletLocalData.enabledTokens.indexOf(token) === -1) {
        this.walletLocalData.enabledTokens.push(token)
        // Initialize balance
        this.walletLocalData.totalBalances[token] = '0'
        this.currencyEngineCallbacks.onBalanceChanged(
          token,
          this.walletLocalData.totalBalances[token]
        )
        this.walletLocalDataDirty = true
      }
    }
    if (this.walletLocalDataDirty) {
      this.saveWalletLoop()
    }
  }

  async enableTokens(tokens) {
    this.enableTokensSync(tokens)
  }

  disableTokensSync(tokens) {
    for (const token of tokens) {
      if (token === this.currencyInfo.currencyCode) {
        continue
      }
      const index = this.walletLocalData.enabledTokens.indexOf(token)
      if (index !== -1) {
        this.walletLocalData.enabledTokens.splice(index, 1)
        this.walletLocalDataDirty = true
      }
    }
    if (this.walletLocalDataDirty) {
      this.saveWalletLoop()
    }
  }

  async disableTokens(tokens) {
    this.disableTokensSync(tokens)
  }

  async getEnabledTokens() {
    return this.walletLocalData.enabledTokens
  }

  async addCustomToken(obj, contractAddress) {
    checkCustomToken(obj)

    const tokenObj = obj
    // If token is already in currencyInfo, error as it cannot be changed
    for (const tk of this.currencyInfo.metaTokens) {
      if (
        tk.currencyCode.toLowerCase() === tokenObj.currencyCode.toLowerCase() ||
        tk.currencyName.toLowerCase() === tokenObj.currencyName.toLowerCase()
      ) {
        throw new Error('ErrorCannotModifyToken')
      }
    }

    // Validate the token object
    if (tokenObj.currencyCode.toUpperCase() !== tokenObj.currencyCode) {
      throw new Error('ErrorInvalidCurrencyCode')
    }
    if (tokenObj.currencyCode.length < 2 || tokenObj.currencyCode.length > 7) {
      throw new Error('ErrorInvalidCurrencyCodeLength')
    }
    if (tokenObj.currencyName.length < 3 || tokenObj.currencyName.length > 20) {
      throw new Error('ErrorInvalidCurrencyNameLength')
    }
    if (
      bns.lt(tokenObj.multiplier, '1') ||
      bns.gt(tokenObj.multiplier, '100000000000000000000000000000000')
    ) {
      throw new Error('ErrorInvalidMultiplier')
    }

    for (const tk of this.customTokens) {
      if (
        tk.currencyCode.toLowerCase() === tokenObj.currencyCode.toLowerCase() ||
        tk.currencyName.toLowerCase() === tokenObj.currencyName.toLowerCase()
      ) {
        // Remove old token first then re-add it to incorporate any modifications
        const idx = this.customTokens.findIndex(
          element => element.currencyCode === tokenObj.currencyCode
        )
        if (idx !== -1) {
          this.customTokens.splice(idx, 1)
        }
      }
    }

    // Create a token object for inclusion in customTokens
    const denom = {
      name: tokenObj.currencyCode,
      multiplier: tokenObj.multiplier
    }
    const edgeMetaToken = {
      currencyCode: tokenObj.currencyCode,
      currencyName: tokenObj.currencyName,
      denominations: [denom],
      contractAddress: contractAddress || tokenObj.contractAddress
    }

    this.customTokens.push(edgeMetaToken)
    this.allTokens = this.currencyInfo.metaTokens.concat(this.customTokens)
    this.enableTokensSync([edgeMetaToken.currencyCode])
  }

  getTokenStatus(token) {
    return this.walletLocalData.enabledTokens.indexOf(token) !== -1
  }

  getBalance(options) {
    const cleanOptions = asCurrencyCodeOptions(options)
    const { currencyCode = this.currencyInfo.currencyCode } = cleanOptions

    if (this.walletLocalData.totalBalances[currencyCode] == null) {
      return '0'
    }
    const nativeBalance = this.walletLocalData.totalBalances[currencyCode]
    return nativeBalance
  }

  getNumTransactions(options) {
    const cleanOptions = asCurrencyCodeOptions(options)
    const { currencyCode = this.currencyInfo.currencyCode } = cleanOptions

    if (this.walletLocalData.numTransactions[currencyCode] == null) {
      return 0
    } else {
      return this.walletLocalData.numTransactions[currencyCode]
    }
  }

  async getTransactions(
    options
  ) {
    const cleanOptions = asCurrencyCodeOptions(options)
    const { currencyCode = this.currencyInfo.currencyCode } = cleanOptions

    await this.loadTransactions()

    if (this.transactionList[currencyCode] == null) {
      return []
    }

    let startIndex = 0
    let startEntries = 0
    if (options === null) {
      return this.transactionList[currencyCode].slice(0)
    }
    if (options.startIndex && options.startIndex > 0) {
      startIndex = options.startIndex
      if (startIndex >= this.transactionList[currencyCode].length) {
        startIndex = this.transactionList[currencyCode].length - 1
      }
    }
    if (options.startEntries && options.startEntries > 0) {
      startEntries = options.startEntries
      if (
        startEntries + startIndex >
        this.transactionList[currencyCode].length
      ) {
        // Don't read past the end of the transactionList
        startEntries = this.transactionList[currencyCode].length - startIndex
      }
    }

    // Copy the appropriate entries from the arrayTransactions
    let returnArray = []

    if (startEntries) {
      returnArray = this.transactionList[currencyCode].slice(
        startIndex,
        startEntries + startIndex
      )
    } else {
      returnArray = this.transactionList[currencyCode].slice(startIndex)
    }
    return returnArray
  }

  async getFreshAddress(options) {
    return { publicAddress: this.walletLocalData.publicKey }
  }

  async addGapLimitAddresses(addresses, options) {}

  async isAddressUsed(address, options) {
    return false
  }

  async dumpData() {
    const dataDump = {
      walletId: this.walletId.split(' - ')[0],
      walletType: this.walletInfo.type,
      pluginType: this.currencyInfo.pluginId,
      data: {
        walletLocalData: this.walletLocalData
      }
    }
    return dataDump
  }

  makeSpend(edgeSpendInfo) {
    checkEdgeSpendInfo(edgeSpendInfo)

    for (const st of edgeSpendInfo.spendTargets) {
      if (st.publicAddress === this.walletLocalData.publicKey) {
        throw new SpendToSelfError()
      }
    }

    let currencyCode = ''
    if (typeof edgeSpendInfo.currencyCode === 'string') {
      currencyCode = edgeSpendInfo.currencyCode
      if (currencyCode !== this.currencyInfo.currencyCode) {
        if (!this.getTokenStatus(currencyCode)) {
          throw new Error('Error: Token not supported or enabled')
        }
      }
    } else {
      currencyCode = this.currencyInfo.currencyCode
    }

    const nativeBalance = this.walletLocalData.totalBalances[currencyCode]
    if (!nativeBalance || bns.eq(nativeBalance, '0')) {
      throw new InsufficientFundsError()
    }

    edgeSpendInfo.currencyCode = currencyCode
    const denom = getDenomInfo(
      this.currencyInfo,
      currencyCode,
      this.customTokens
    )
    if (!denom) {
      throw new Error('InternalErrorInvalidCurrencyCode')
    }

    return { edgeSpendInfo, nativeBalance, currencyCode, denom }
  }

  // called by GUI after sliding to confirm
  async saveTx(edgeTransaction) {
    // add the transaction to disk and fire off callback (alert in GUI)
    this.addTransaction(edgeTransaction.currencyCode, edgeTransaction)
    this.transactionsChangedArray.forEach(tx =>
      this.warn(
        `executing back in saveTx and this.transactionsChangedArray is: ${cleanTxLogs(
          tx
        )}`
      )
    )

    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
    }
  }
}
