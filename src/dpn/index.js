const { EventEmitter } = require('events')
const rlp = require('rlp-encoding')
const ms = require('ms')
const Buffer = require('safe-buffer').Buffer
const { int2buffer, buffer2int, assertEq } = require('../util')
const Peer = require('../rlpx/peer')

const MESSAGE_CODES = {
  // we may take these code immediatly
  // eth62
  STATUS: 0x00,
  NEW_BLOCK_HASHES: 0x01,
  TX: 0x02,
  GET_BLOCK_HEADERS: 0x03,
  BLOCK_HEADERS: 0x04,
  GET_BLOCK_BODIES: 0x05,
  BLOCK_BODIES: 0x06,
  NEW_BLOCK: 0x07,
  // eth63
  GET_NODE_DATA: 0x0d,
  NODE_DATA: 0x0e,
  GET_RECEIPTS: 0x0f,
  RECEIPTS: 0x10,
  TEST: 0x11
}

class DPN extends EventEmitter {
  constructor (version, peer, send) {
    super()
    this._version = version
    this._peer = peer
    this._send = send
    this._status = null
    this._peerStatus = null
    this._statusTimeoutId = setTimeout(() => {
      this._peer.disconnect(Peer.DISCONNECT_REASONS.TIMEOUT)
    }, ms('5s'))
  }

  static dpn = { name: 'dpn', version: 11, length: 18, constructor: DPN }
  static MESSAGE_CODES = MESSAGE_CODES

  sendMessage (code, payload) {
    console.log(`Sending messages to target: ${this.getMsgPrefix(code)} message to ${this._peer._socket.remoteAddress}:${this._peer._socket.remotePort}: ${rlp.encode(payload).toString('hex')}`)
    switch (code) {
      case MESSAGE_CODES.STATUS:
      case MESSAGE_CODES.NEW_BLOCK:
      case MESSAGE_CODES.RECEIPTS:
      case MESSAGE_CODES.BLOCK_HEADERS: break
      case MESSAGE_CODES.GET_BLOCK_HEADERS: break
      case MESSAGE_CODES.TEST:
        console.log('test send messages -------  ' + payload)
        break
      default:
        throw new Error(`Code is not ${code}`)
    }
    this._send(code, rlp.encode(payload))
  }

  _handleMessage (code, data) {
    const payload = rlp.decode(data)
    console.log(`[_handleMessage] Receive the message：code = ${code} ; data = ${payload}`)
    switch (code) {
      case MESSAGE_CODES.STATUS:
        assertEq(this._peerStatus, null, 'Uncontrolled status message')
        this._peerStatus = payload
        this._handleStatus()
        break
      case MESSAGE_CODES.GET_BLOCK_HEADERS:
      case MESSAGE_CODES.BLOCK_HEADERS:
      case MESSAGE_CODES.GET_BLOCK_BODIES:
      case MESSAGE_CODES.BLOCK_BODIES:
      case MESSAGE_CODES.NEW_BLOCK:
      case MESSAGE_CODES.RECEIPTS:
      case MESSAGE_CODES.TEST:
        console.log(`this is test message：${payload}`)
        break
      default:
        return
    }
    this.emit('message', code, payload)
  }

  _handleStatus () {
    if (this._status === null || this._peerStatus === null) return
    clearTimeout(this._statusTimeoutId)
    assertEq(this._status[0], this._peerStatus[0], 'Protocol version mismatch')
    assertEq(this._status[1], this._peerStatus[1], 'NetworkId mismatch')
    assertEq(this._status[4], this._peerStatus[4], 'Genesis block mismatch')
    this.emit('status', {
      networkId: this._peerStatus[1],
      td: Buffer.from(this._peerStatus[2]),
      bestHash: Buffer.from(this._peerStatus[3]),
      genesisHash: Buffer.from(this._peerStatus[4])
    })
  }

  getVersion () {
    return this._version
  }

  _getStatusString (status) {
    var sStr = `[V:${buffer2int(status[0])}, NID:${buffer2int(status[1])}, TD:${buffer2int(status[2])}`
    sStr += `, BestH:${status[3].toString('hex')}, GenH:${status[4].toString('hex')}]`
    return sStr
  }

  sendStatus (status) {
    if (this._status !== null) return
    this._status = [
      int2buffer(this._version),
      int2buffer(status.networkId),
      status.td,
      status.bestHash,
      status.genesisHash
    ]
    console.log(`sending status to ${this._peer._socket.remoteAddress}:${this._peer._socket.remotePort} (yfm = ${this._version}): ${this._getStatusString(this._status)}`)
    this._send(MESSAGE_CODES.STATUS, rlp.encode(this._status))
    this._handleStatus()
  }
  getMsgPrefix (msgCode) {
    return Object.keys(MESSAGE_CODES).find(key => MESSAGE_CODES[key] === msgCode)
  }
}

module.exports = DPN
