// 
import { AddressTool, KeyTool, makeSynchronizer } from 'react-native-zcash'
import { bridgifyObject, emit, onMethod } from 'yaob'








// TODO: Remove this entire file in the next breaking change.
export default function makePluginIo() {
  bridgifyObject(KeyTool)
  bridgifyObject(AddressTool)

  return {
    fetchText(uri, opts) {
      return window.fetch(uri, opts).then(reply =>
        reply.text().then(text => ({
          ok: reply.ok,
          status: reply.status,
          statusText: reply.statusText,
          url: reply.url,
          text
        }))
      )
    },
    KeyTool,
    AddressTool,
    async makeSynchronizer(config) {
      const realSynchronizer = await makeSynchronizer(config)

      realSynchronizer.subscribe({
        onStatusChanged(status) {
          emit(out, 'statusChanged', status)
        },
        onUpdate(event) {
          emit(out, 'update', event)
        }
      })

      const out = bridgifyObject({
        on: onMethod,
        start: () => {
          return realSynchronizer.start()
        },
        getTransactions: blockRange => {
          return realSynchronizer.getTransactions(blockRange)
        },
        rescan: height => {
          return realSynchronizer.rescan(height)
        },
        sendToAddress: spendInfo => {
          return realSynchronizer.sendToAddress(spendInfo)
        },
        getShieldedBalance: () => {
          return realSynchronizer.getShieldedBalance()
        },
        stop: () => {
          return realSynchronizer.stop()
        }
      })
      return out
    }
  }
}
