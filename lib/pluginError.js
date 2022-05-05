 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }// 

export const pluginErrorCodes = [400, 403, 404]
export const pluginErrorName = {
  XRP_ERROR: 'XrpError'
}

export class PluginError extends Error {
  
  
  
  

  constructor(
    message,
    name,
    code,
    labelCode,
    json
  ) {
    super(message)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PluginError)
    }

    this.name = _nullishCoalesce(name, () => ( 'PluginError'))
    if (code) this.errorCode = code
    if (labelCode) this.labelCode = labelCode
    if (json) this.json = json
  }
}
