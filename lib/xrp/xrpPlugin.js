/**
 * Created by paul on 8/8/17.
 */
// 

import { bns } from 'biggystring'










import parse from 'url-parse'
import {
  Client,
  decodeSeed,
  isValidAddress,
  Wallet,
  xAddressToClassicAddress
} from 'xrpl'

import { CurrencyPlugin } from '../common/plugin.js'
import {
  asyncWaterfall,
  getDenomInfo,
  safeErrorMessage
} from '../common/utils.js'
import { XrpEngine } from './xrpEngine.js'
import { currencyInfo } from './xrpInfo.js'

export class XrpPlugin extends CurrencyPlugin {
  
  

  constructor(io) {
    super(io, 'ripple', currencyInfo)
    this.rippleApi = {}
    this.rippleApiSubscribers = {}
  }

  async connectApi(walletId) {
    if (this.rippleApi.serverName == null) {
      const funcs =
        this.currencyInfo.defaultSettings.otherSettings.rippledServers.map(
          server => async () => {
            const api = new Client(server)
            api.serverName = server
            await api.connect()
            const out = { server, api }
            return out
          }
        )
      const result = await asyncWaterfall(funcs)
      if (this.rippleApi.serverName == null) {
        this.rippleApi = result.api
      }
    }
    this.rippleApiSubscribers[walletId] = true
  }

  async disconnectApi(walletId) {
    delete this.rippleApiSubscribers[walletId]
    if (Object.keys(this.rippleApiSubscribers).length === 0) {
      await this.rippleApi.disconnect()
      this.rippleApi = {}
    }
  }

  async importPrivateKey(privateKey) {
    privateKey = privateKey.replace(/\s/g, '')
    try {
      // Try decoding seed
      decodeSeed(privateKey)

      // If that worked, return the key:
      return { rippleKey: privateKey }
    } catch (e) {
      throw new Error(`Invalid private key: ${safeErrorMessage(e)}`)
    }
  }

  async createPrivateKey(walletType) {
    const type = walletType.replace('wallet:', '')

    if (type === 'ripple' || type === 'ripple-secp256k1') {
      const algorithm =
        type === 'ripple-secp256k1' ? 'ecdsa-secp256k1' : 'ed25519'
      const entropy = Array.from(this.io.random(32))
      const keys = Wallet.fromEntropy(entropy, { algorithm })
      return { rippleKey: keys.seed }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo) {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'ripple' || type === 'ripple-secp256k1') {
      const wallet = Wallet.fromSeed(walletInfo.keys.rippleKey)
      return { publicKey: wallet.classicAddress }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(uri) {
    const networks = {
      ripple: true,
      'xrp-ledger': true
    }
    const RIPPLE_DOT_COM_URI_PREFIX = 'https://ripple.com//send'

    try {
      const { classicAddress, tag } = xAddressToClassicAddress(uri)
      uri = `ripple:${classicAddress}?to=${classicAddress}${
        tag !== false ? `&dt=${tag}` : ''
      }`
    } catch (e) {
      //
    }

    // Handle special case of https://ripple.com//send?to= URIs
    if (uri.includes(RIPPLE_DOT_COM_URI_PREFIX)) {
      const parsedUri = parse(uri, {}, true)
      const addr = parsedUri.query.to
      if (addr != null) {
        uri = uri.replace(RIPPLE_DOT_COM_URI_PREFIX, `ripple:${addr}`)
      }
    }

    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
      currencyInfo,
      uri,
      networks
    )
    const valid = isValidAddress(edgeParsedUri.publicAddress || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    edgeParsedUri.uniqueIdentifier = parsedUri.query.dt || undefined
    return edgeParsedUri
  }

  async encodeUri(obj) {
    const valid = isValidAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      const currencyCode = 'XRP'
      const nativeAmount = obj.nativeAmount
      const denom = getDenomInfo(currencyInfo, currencyCode)
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 6)
    }
    const encodedUri = this.encodeUriCommon(obj, 'ripple', amount)
    return encodedUri
  }
}

export function makeRipplePlugin(
  opts
) {
  const { io } = opts

  let toolsPromise
  function makeCurrencyTools() {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new XrpPlugin(io))
    return toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo,
    opts
  ) {
    const tools = await makeCurrencyTools()
    const currencyEngine = new XrpEngine(tools, walletInfo, opts)

    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow type checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData

    if (currencyEngine.otherData.recommendedFee == null) {
      currencyEngine.otherData.recommendedFee = '0'
    }

    const out = currencyEngine
    return out
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools
  }
}