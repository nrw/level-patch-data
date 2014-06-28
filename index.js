var extend = require('xtend')

module.exports = function (db, opts) {
  opts = opts || {}
  opts.separator = opts.separator || '\xff'
  opts.timestampField = opts.timestampField || 'ts'
  opts.keyField = opts.keyField || 'key'
  opts.patchField = opts.patchField || 'patch'
  opts.key = opts.key || function (meta, namespace, opts) {
    return [namespace, meta[opts.timestampField]].join(opts.separator)
  }

  return {
    addPatch: addPatch,
    add: addPatch,
    patchStream: patchStream,
    readStream: patchStream,
    createReadStream: patchStream
  }

  function addPatch (namespace, patch, meta, cb) {
    if (!cb) {
      cb = meta
      meta = {}
    }
    var meta = ts(meta, opts.timestampField)
    var key = opts.key(meta, namespace, opts)

    var props = {}
    props[opts.keyField] = key
    props[opts.patchField] = patch

    var value = extend(meta, props)

    db.put(key, value, function (err) {
      if (err) return cb(err)
      cb(null, value)
    })
  }

  function patchStream (namespace) {
    var range = {
      start: namespace+opts.separator+'\x00',
      end:   namespace+opts.separator+'\xff'
    }
    return db.valueStream(range)
  }
}

function ts (meta, field) {
  var obj = {}
  obj[field] = new Date().toISOString()
  return extend(meta, obj)
}
