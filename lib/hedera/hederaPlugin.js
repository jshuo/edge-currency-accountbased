 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// 

import * as hedera from '@hashgraph/sdk'
import { bns } from 'biggystring'
import { entropyToMnemonic, validateMnemonic } from 'bip39'












import { CurrencyPlugin } from '../common/plugin.js'
import { getDenomInfo } from './../common/utils.js'
import { HederaEngine } from './hederaEngine.js'
import { createChecksum, getOtherMethods, validAddress } from './hederaUtils.js'

// if users want to import their mnemonic phrase in e.g. MyHbarWallet.com
// they can just leave the passphrase field blank
const mnemonicPassphrase = ''
const Ed25519PrivateKeyPrefix = '302e020100300506032b657004220420'

export class HederaPlugin extends CurrencyPlugin {
  

  constructor(io, currencyInfo) {
    super(io, currencyInfo.pluginId, currencyInfo)
    this.pluginId = currencyInfo.pluginId
  }

  async createPrivateKey(walletType) {
    const type = walletType.replace('wallet:', '')

    if (type === this.pluginId) {
      const entropy = this.io.random(32)
      const mnemonic = entropyToMnemonic(entropy)
      return this.importPrivateKey(mnemonic)
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async importPrivateKey(userInput) {
    try {
      let privateMnemonic
      let privateKey
      if (
        /^(0x)?[0-9a-fA-F]{64}$/.test(
          userInput.replace(Ed25519PrivateKeyPrefix, '')
        )
      ) {
        const privateKeyString = userInput
          .replace(/^0x/, '')
          .replace(Ed25519PrivateKeyPrefix, '')

        privateKey =
          hedera.Ed25519PrivateKey.fromString(privateKeyString).toString()
      } else if (validateMnemonic(userInput)) {
        const mnemonic = hedera.Mnemonic.fromString(userInput)
        const sdkPrivateKey = await mnemonic.toPrivateKey(mnemonicPassphrase)
        privateMnemonic = userInput
        privateKey = sdkPrivateKey.toString()
      } else {
        throw new Error('InvalidPrivateKey')
      }

      return {
        [`${this.pluginId}Mnemonic`]: privateMnemonic,
        [`${this.pluginId}Key`]: privateKey
      }
    } catch (e) {
      throw new Error('InvalidPrivateKey')
    }
  }

  async derivePublicKey(walletInfo) {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === this.pluginId) {
      if (
        walletInfo.keys == null ||
        _optionalChain([walletInfo, 'access', _ => _.keys, 'optionalAccess', _2 => _2[`${this.pluginId}Key`]]) == null
      ) {
        throw new Error('Invalid private key')
      }

      const privateKey = hedera.Ed25519PrivateKey.fromString(
        walletInfo.keys[`${this.pluginId}Key`]
      )

      return {
        publicKey: privateKey.publicKey.toString()
      }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(uri) {
    const {
      edgeParsedUri,
      edgeParsedUri: { publicAddress }
    } = this.parseUriCommon(
      this.currencyInfo,
      uri,
      { [`${this.pluginId}`]: true },
      this.currencyInfo.currencyCode
    )

    if (publicAddress != null) {
      const { checksumNetworkId } =
        this.currencyInfo.defaultSettings.otherSettings
      const [address, checksum] = publicAddress.split('-')
      if (
        !validAddress(publicAddress) ||
        (checksum != null &&
          checksum !== createChecksum(address, checksumNetworkId))
      )
        throw new Error('InvalidPublicAddressError')
    }

    return edgeParsedUri
  }

  async encodeUri(obj) {
    const { publicAddress, nativeAmount } = obj
    if (!validAddress(publicAddress)) {
      throw new Error('InvalidPublicAddressError')
    }

    if (nativeAmount == null || typeof nativeAmount !== 'string') {
      // don't encode as a URI, just return the public address
      return publicAddress
    }

    const denom = getDenomInfo(
      this.currencyInfo,
      this.currencyInfo.currencyCode
    )
    if (denom == null) {
      throw new Error('InternalErrorInvalidCurrencyCode')
    }
    const amount = bns.div(nativeAmount, denom.multiplier, 8)

    return this.encodeUriCommon(obj, this.pluginId, amount)
  }
}

export function makeHederaPluginInner(
  opts,
  currencyInfo
) {
  const { io } = opts

  let toolsPromise

  function makeCurrencyTools() {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new HederaPlugin(io, currencyInfo))
    return toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo,
    opts
  ) {
    const tools = await makeCurrencyTools()

    const currencyEngine = new HederaEngine(
      tools,
      walletInfo,
      opts,
      io,
      currencyInfo
    )

    await currencyEngine.loadEngine(tools, walletInfo, opts)

    const out = currencyEngine
    return out
  }

  const otherMethods = getOtherMethods(opts, currencyInfo)

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools,
    otherMethods
  }
}
