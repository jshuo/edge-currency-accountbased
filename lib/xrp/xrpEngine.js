 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Created by paul on 7/7/17.
 */
// 

import { bns } from 'biggystring'
import {




  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { rippleTimeToUnixTime, Wallet } from 'xrpl'

import { CurrencyEngine } from '../common/engine.js'
import {
  cleanTxLogs,
  getOtherParams,
  safeErrorMessage
} from '../common/utils.js'
import {
  PluginError,
  pluginErrorCodes,
  pluginErrorName
} from '../pluginError.js'
import { XrpPlugin } from './xrpPlugin.js'
import {



  asBalance,
  asFee,
  asGetTransactionsResponse,
  asServerInfo
} from './xrpTypes.js'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKHEIGHT_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 30 * 60 // ~ one minute
























export class XrpEngine extends CurrencyEngine {
  
  
  

  constructor(
    currencyPlugin,
    walletInfo,
    opts
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.xrpPlugin = currencyPlugin
    this.xrpSettings = currencyPlugin.currencyInfo.defaultSettings.otherSettings
  }

  async multicastServers(func, ...params) {
    let method = 'request'
    // Request is most commonly used SDK method for funcs but some are special
    switch (func) {
      case 'getBalances':
      case 'disconnect':
      case 'submit':
        method = func
        break
      case 'preparePayment':
        method = 'autofill'
        break
    }
    const out = {
      result: await this.xrpPlugin.rippleApi[method](...params),
      server: this.xrpPlugin.rippleApi.serverName
    }
    this.log(`multicastServers ${func} ${out.server} won`)
    return out.result
  }

  // Poll on the blockheight
  async checkServerInfoInnerLoop() {
    try {
      const options = { command: 'fee' }
      const response = await this.multicastServers('getFee', options)
      const fee = asFee(response).result.drops.minimum_fee
      this.otherData.recommendedFee = fee
      this.walletLocalDataDirty = true
    } catch (e) {
      this.error(
        `Error fetching recommended fee: ${safeErrorMessage(
          e
        )}. Using default fee.`
      )
      if (this.otherData.recommendedFee !== this.xrpSettings.defaultFee) {
        this.otherData.recommendedFee = this.xrpSettings.defaultFee
        this.walletLocalDataDirty = true
      }
    }
    try {
      const options = { command: 'server_info' }
      const response = await this.multicastServers('getServerInfo', options)
      const blockHeight =
        asServerInfo(response).result.info.validated_ledger.seq
      this.log(`Got block height ${blockHeight}`)
      if (this.walletLocalData.blockHeight !== blockHeight) {
        this.checkDroppedTransactionsThrottled()
        this.walletLocalData.blockHeight = blockHeight // Convert to decimal
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e) {
      this.error(`Error fetching height: `, e)
    }
  }

  processRippleTransaction(tx) {
    const ourReceiveAddresses = []
    let nativeAmount = tx.Amount
    if (tx.Destination === this.walletLocalData.publicKey) {
      ourReceiveAddresses.push(this.walletLocalData.publicKey)
    } else {
      nativeAmount = `-${bns.add(nativeAmount, tx.Fee)}`
    }

    const edgeTransaction = {
      txid: tx.hash.toLowerCase(),
      date: rippleTimeToUnixTime(tx.date) / 1000, // Returned date is in "ripple time" which is unix time if it had started on Jan 1 2000
      currencyCode: this.xrpPlugin.currencyInfo.currencyCode,
      blockHeight: tx.ledger_index,
      nativeAmount,
      networkFee: tx.Fee,
      ourReceiveAddresses,
      signedTx: '',
      otherParams: {}
    }
    this.addTransaction(
      this.xrpPlugin.currencyInfo.currencyCode,
      edgeTransaction
    )
  }

  async checkTransactionsInnerLoop() {
    const blockHeight = this.walletLocalData.blockHeight
    const address = this.walletLocalData.publicKey
    let startBlock = -1 // A value of -1 instructs the server to use the earliest validated ledger version available
    if (
      this.walletLocalData.lastAddressQueryHeight >
      ADDRESS_QUERY_LOOKBACK_BLOCKS
    ) {
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
      startBlock =
        this.walletLocalData.lastAddressQueryHeight -
        ADDRESS_QUERY_LOOKBACK_BLOCKS
    }

    try {
      const options = {
        command: 'account_tx',
        account: address,
        forward: true, // returns oldest to newest
        ledger_index_min: startBlock
      }
      const response = await this.multicastServers('getTransactions', options)
      const transactions =
        asGetTransactionsResponse(response).result.transactions
      this.log(
        `Fetched transactions count: ${transactions.length} startBlock:${startBlock}`
      )
      // Get transactions
      // Iterate over transactions in address
      for (const transaction of transactions) {
        this.processRippleTransaction(transaction.tx)
      }
      if (this.transactionsChangedArray.length > 0) {
        this.currencyEngineCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      }
      this.walletLocalData.lastAddressQueryHeight = blockHeight
      this.tokenCheckTransactionsStatus.XRP = 1
      this.updateOnAddressesChecked()
    } catch (e) {
      this.error(`Error fetching transactions: `, e)
    }
  }

  async checkUnconfirmedTransactionsFetch() {}

  // Check all account balance and other relevant info
  async checkAccountInnerLoop() {
    const address = this.walletLocalData.publicKey
    try {
      const jsonObj = await this.multicastServers('getBalances', address)
      if (Array.isArray(jsonObj)) {
        for (const bal of jsonObj) {
          const { currency, value } = asBalance(bal)
          const currencyCode = currency
          const exchangeAmount = value
          const nativeAmount = bns.mul(exchangeAmount, '1000000')

          if (this.walletLocalData.totalBalances[currencyCode] == null) {
            this.walletLocalData.totalBalances[currencyCode] = '0'
          }

          if (
            this.walletLocalData.totalBalances[currencyCode] !== nativeAmount
          ) {
            this.walletLocalData.totalBalances[currencyCode] = nativeAmount
            this.warn(`Updated ${currencyCode} balance ${nativeAmount}`)
            this.currencyEngineCallbacks.onBalanceChanged(
              currencyCode,
              nativeAmount
            )
          }
        }
        this.tokenCheckBalanceStatus.XRP = 1
        this.updateOnAddressesChecked()
      }
    } catch (e) {
      if (_optionalChain([e, 'optionalAccess', _ => _.data, 'optionalAccess', _2 => _2.error]) === 'actNotFound' || _optionalChain([e, 'optionalAccess', _3 => _3.data, 'optionalAccess', _4 => _4.error_code]) === 19) {
        this.warn('Account not found. Probably not activated w/minimum XRP')
        this.tokenCheckBalanceStatus.XRP = 1
        this.updateOnAddressesChecked()
        return
      }
      this.error(`Error fetching address info: `, e)
    }
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  async startEngine() {
    this.engineOn = true
    try {
      await this.xrpPlugin.connectApi(this.walletId)
    } catch (e) {
      this.error(`Error connecting to server `, e)
      setTimeout(() => {
        if (this.engineOn) {
          this.startEngine()
        }
      }, 10000)
      return
    }
    this.addToLoop('checkServerInfoInnerLoop', BLOCKHEIGHT_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    super.startEngine()
  }

  async killEngine() {
    await super.killEngine()
    await this.xrpPlugin.disconnectApi(this.walletId)
  }

  async resyncBlockchain() {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getMaxSpendable(spendInfo) {
    const { currencyCode } = spendInfo
    let spendableBalance = this.getBalance({
      currencyCode
    })
    if (currencyCode === this.xrpPlugin.currencyInfo.currencyCode) {
      spendableBalance = bns.sub(spendableBalance, this.xrpSettings.baseReserve)
    }
    if (bns.lte(spendableBalance, '0')) throw new InsufficientFundsError()

    return spendableBalance
  }

  async makeSpend(edgeSpendInfoIn) {
    const { edgeSpendInfo, currencyCode, nativeBalance } = super.makeSpend(
      edgeSpendInfoIn
    )

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const publicAddress = edgeSpendInfo.spendTargets[0].publicAddress

    let nativeAmount = '0'
    if (typeof edgeSpendInfo.spendTargets[0].nativeAmount === 'string') {
      nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
    } else {
      throw new Error('Error: no amount specified')
    }

    if (bns.eq(nativeAmount, '0')) {
      throw new NoAmountSpecifiedError()
    }

    const nativeNetworkFee = this.otherData.recommendedFee

    // Make sure amount doesn't drop the balance below the reserve amount otherwise the
    // transaction is invalid. It is not necessary to consider the fee in this
    // calculation because the transaction fee can be taken out of the reserve balance.
    if (
      bns.gt(bns.add(nativeAmount, this.xrpSettings.baseReserve), nativeBalance)
    )
      throw new InsufficientFundsError()

    const uniqueIdentifier =
      _nullishCoalesce(_optionalChain([edgeSpendInfo, 'access', _5 => _5.spendTargets, 'access', _6 => _6[0], 'access', _7 => _7.otherParams, 'optionalAccess', _8 => _8.uniqueIdentifier]), () => ( ''))

    if (uniqueIdentifier !== '') {
      // Destination Tag Checks
      const {
        memoMaxLength = Infinity,
        memoMaxValue,
        defaultSettings: { errorCodes }
      } = this.xrpPlugin.currencyInfo

      if (Number.isNaN(parseInt(uniqueIdentifier))) {
        throw new PluginError(
          'Please enter a valid Destination Tag',
          pluginErrorName.XRP_ERROR,
          pluginErrorCodes[0],
          errorCodes.UNIQUE_IDENTIFIER_FORMAT
        )
      }

      if (uniqueIdentifier.length > memoMaxLength) {
        throw new PluginError(
          `Destination Tag must be ${memoMaxLength} characters or less`,
          pluginErrorName.XRP_ERROR,
          pluginErrorCodes[0],
          errorCodes.UNIQUE_IDENTIFIER_EXCEEDS_LENGTH
        )
      }

      if (memoMaxValue != null && bns.gt(uniqueIdentifier, memoMaxValue)) {
        throw new PluginError(
          'XRP Destination Tag is above its maximum limit',
          pluginErrorName.XRP_ERROR,
          pluginErrorCodes[0],
          errorCodes.UNIQUE_IDENTIFIER_EXCEEDS_LIMIT
        )
      }
    }

    const payment = {
      Amount: nativeAmount,
      TransactionType: 'Payment',
      Account: this.walletLocalData.publicKey,
      Destination: publicAddress,
      Fee: nativeNetworkFee
    }

    if (uniqueIdentifier !== '') {
      payment.DestinationTag = parseInt(uniqueIdentifier)
    }

    let preparedTx = {}
    let i = 6
    while (true) {
      i--
      try {
        preparedTx = await this.multicastServers('preparePayment', payment)
        break
      } catch (e) {
        if (
          safeErrorMessage(e).includes('has too many decimal places') &&
          i > 0
        ) {
          // HACK: ripple-js seems to have a bug where this error is intermittently thrown for no reason.
          // Just retrying seems to resolve it. -paulvp
          this.warn(
            `Got "too many decimal places" error. Retrying... ${i.toString()}`
          )
          continue
        }
        this.error(`makeSpend Error `, e)
        throw new Error('Error in preparePayment')
      }
    }

    const otherParams = {
      preparedTx
    }
    nativeAmount = `-${bns.add(nativeAmount, nativeNetworkFee)}`

    const edgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee: nativeNetworkFee, // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams
    }

    this.warn('Payment transaction prepared...')
    return edgeTransaction
  }

  async signTx(edgeTransaction) {
    const otherParams = getOtherParams(edgeTransaction)

    // Do signing
    const txJson = otherParams.preparedTx
    const privateKey = this.walletInfo.keys.rippleKey

    const wallet = Wallet.fromSeed(privateKey)
    const { tx_blob: signedTransaction, hash: id } = wallet.sign(txJson)

    this.warn('Payment transaction signed...')

    edgeTransaction.signedTx = signedTransaction
    edgeTransaction.txid = id.toLowerCase()
    edgeTransaction.date = Date.now() / 1000

    this.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction
  ) {
    await this.multicastServers('submit', edgeTransaction.signedTx)
    this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  getDisplayPrivateSeed() {
    return _nullishCoalesce(_optionalChain([this, 'access', _9 => _9.walletInfo, 'access', _10 => _10.keys, 'optionalAccess', _11 => _11.rippleKey]), () => ( ''))
  }

  getDisplayPublicSeed() {
    return _nullishCoalesce(_optionalChain([this, 'access', _12 => _12.walletInfo, 'access', _13 => _13.keys, 'optionalAccess', _14 => _14.publicKey]), () => ( ''))
  }
}

export { CurrencyEngine }
