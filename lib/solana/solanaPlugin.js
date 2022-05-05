// 

import * as solanaWeb3 from '@solana/web3.js'
import { bns } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import * as ed25519 from 'ed25519-hd-key'














import { CurrencyPlugin } from '../common/plugin.js'
import { getDenomInfo, getFetchCors } from '../common/utils.js'
import { SolanaEngine } from './solanaEngine.js'

const { Keypair, PublicKey } = solanaWeb3

const createKeyPair = async (
  mnemonic,
  path
) => {
  const buffer = await mnemonicToSeed(mnemonic)
  const deriveSeed = ed25519.derivePath(path, buffer.toString('hex')).key
  return Keypair.fromSeed(Uint8Array.from(Buffer.from(deriveSeed, 'hex')))
}

export class SolanaPlugin extends CurrencyPlugin {
  

  constructor(io, currencyInfo) {
    super(io, currencyInfo.pluginId, currencyInfo)
    this.pluginId = currencyInfo.pluginId
  }

  async importPrivateKey(mnemonic) {
    const isValid = validateMnemonic(mnemonic)
    if (!isValid) throw new Error('Invalid mnemonic')

    const keypair = await createKeyPair(
      mnemonic,
      this.currencyInfo.defaultSettings.otherSettings.derivationPath
    )

    return {
      [`${this.pluginId}Mnemonic`]: mnemonic,
      [`${this.pluginId}Key`]: Buffer.from(keypair.secretKey).toString('hex'),
      publicKey: keypair.publicKey.toBase58()
    }
  }

  async createPrivateKey(walletType) {
    const type = walletType.replace('wallet:', '')

    if (type === this.pluginId) {
      const entropy = Buffer.from(this.io.random(32))
      const mnemonic = entropyToMnemonic(entropy)
      return this.importPrivateKey(mnemonic)
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo) {
    const type = walletInfo.type.replace('wallet:', '')
    if (
      type === this.pluginId &&
      walletInfo.keys[`${this.pluginId}Mnemonic`] != null
    ) {
      const keys = await this.importPrivateKey(
        walletInfo.keys[`${this.pluginId}Mnemonic`]
      )
      return { publicKey: keys.publicKey.toString() }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(
    uri,
    currencyCode,
    customTokens
  ) {
    const networks = { [this.pluginId]: true }

    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
      this.currencyInfo,
      uri,
      networks,
      currencyCode || this.currencyInfo.currencyCode,
      customTokens
    )
    let address = ''
    if (edgeParsedUri.publicAddress) {
      address = edgeParsedUri.publicAddress
    }

    if (!PublicKey.isOnCurve(new PublicKey(address).toBytes()))
      throw new Error('InvalidPublicAddressError')

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo || undefined
    return edgeParsedUri
  }

  async encodeUri(
    obj,
    customTokens
  ) {
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!PublicKey.isOnCurve(new PublicKey(publicAddress).toBytes()))
      throw new Error('InvalidPublicAddressError')

    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getDenomInfo(
        this.currencyInfo,
        currencyCode || this.currencyInfo.currencyCode,
        customTokens
      )
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 18)
    }
    const encodedUri = this.encodeUriCommon(obj, this.pluginId, amount)
    return encodedUri
  }
}

export function makeSolanaPluginInner(
  opts,
  currencyInfo
) {
  const { io } = opts
  const fetchCors = getFetchCors(opts)

  let toolsPromise
  function makeCurrencyTools() {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new SolanaPlugin(io, currencyInfo))
    return toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo,
    opts
  ) {
    const tools = await makeCurrencyTools()
    const currencyEngine = new SolanaEngine(tools, walletInfo, opts, fetchCors)

    // Do any async initialization necessary for the engine
    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow type checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData

    const out = currencyEngine

    return out
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools
  }
}
