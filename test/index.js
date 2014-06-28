var test = require('tape')
var concat = require('concat-stream')
var level = require('level-test')()

var Patch = require('../')

var db = level('patch-test', {valueEncoding: 'json'})
var patch = Patch(db)

test('adds patch', function (t) {
  patch.add('doc1', {a: 'b'}, function (err, commit) {
    t.error(err, 'no err')

    t.same(commit.patch, {a: 'b'}, 'correct patch')
    t.ok(/^doc1\xff/.test(commit.key), 'has key')
    t.ok(commit.ts, 'has timestamp')
    t.end()
  })
})

test('reads patches', function (t) {
  patch.readStream('doc1').pipe(concat(function (body) {
    t.same(body.length, 1, 'correct number of patches')
    t.same(body[0].patch, {a: 'b'}, 'correct patches')
    t.ok(/^doc1\xff/.test(body[0].key), 'has key')
    t.ok(body[0].ts, 'has timestamp')
    t.end()
  }))
})

test('accepts meta', function (t) {
  patch.add('doc1', {a: 'c'}, {user: 'lee'}, function (err) {
    t.error(err, 'no err')
    t.end()
  })
})

test('includes meta', function (t) {
  patch.readStream('doc1').pipe(concat(function (body) {
    t.same(body.length, 2, 'correct number of patches')
    t.same(body[0].patch, {a: 'b'}, 'correct patches')
    t.ok(/^doc1\xff/.test(body[0].key), 'has key')
    t.notOk(body[0].user, 'no user')

    t.same(body[1].patch, {a: 'c'}, 'correct patches')
    t.equal(body[1].user, 'lee', 'with user')
    t.ok(/^doc1\xff/.test(body[1].key), 'has key')
    t.ok(body[1].ts, 'has timestamp')
    t.end()
  }))
})

test('multiple docs do not clash', function (t) {
  t.plan(14)

  patch.add('doc2', {a: 'd'}, {user: 'kara'}, function (err) {
    t.error(err, 'no err')

    patch.readStream('doc1').pipe(concat(function (body) {
      t.same(body.length, 2, 'correct number of patches')
      t.same(body[0].patch, {a: 'b'}, 'correct patches')
      t.ok(/^doc1\xff/.test(body[0].key), 'has key')
      t.notOk(body[0].user, 'no user')

      t.same(body[1].patch, {a: 'c'}, 'correct patches')
      t.equal(body[1].user, 'lee', 'with user')
      t.ok(/^doc1\xff/.test(body[1].key), 'has key')
      t.ok(body[1].ts, 'has timestamp')
    }))

    patch.readStream('doc2').pipe(concat(function (body) {
      t.same(body.length, 1, 'correct number of patches')
      t.same(body[0].patch, {a: 'd'}, 'correct patches')
      t.equal(body[0].user, 'kara', 'with user')
      t.ok(/^doc2\xff/.test(body[0].key), 'has key')
      t.ok(body[0].ts, 'has timestamp')
    }))
  })
})

test('custom key', function (t) {
  patch = Patch(db, {key: function (meta, namespace, opts) {
    return [
      namespace,
      meta[opts.timestampField],
      meta.user || ''
    ].join(opts.separator)
  }})

  patch.add('doc3', {a: 'e'}, {user: 'd'}, function (err) {
    t.error(err, 'no err')

    patch.readStream('doc3').pipe(concat(function (body) {
      t.same(body.length, 1, 'correct number of patches')
      t.ok(/^doc3\xff/.test(body[0].key), 'has key')
      t.ok(/\xffd$/.test(body[0].key), 'has key')
      t.same(body[0].patch, {a: 'e'}, 'correct patches')
      t.equal(body[0].user, 'd', 'has user')
      t.end()
    }))
  })
})
