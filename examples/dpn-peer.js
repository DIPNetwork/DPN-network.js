const devp2p = require('../src')
const ms = require('ms')
const chalk = require('chalk')
const assert = require('assert')
const {randomBytes} = require('crypto')
const Buffer = require('safe-buffer').Buffer
const rlp = require('rlp-encoding')

const PRIVATE_KEY = randomBytes(32)
const CHAIN_ID = 1

const NODES = require('../src/dpn/Noods').filter((node) => {
  return node.chainId === CHAIN_ID
}).map((node) => {
  return {
    address: node.ip,
    udpPort: node.port,
    tcpPort: node.port
  }
})

const REMOTE_CLIENTID_FILTER = ['jsp']

const CHECK_BLOCK_NR = 4370000
const CHECK_BLOCK_HEADER = rlp.decode(Buffer.from('00020aa0a0890da724dd95c90a72614c3a906e402134d3859865f715f5dfb398ac00f955a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347942a65aca4d5fc5b5c859090a6c34d164135398226a074cccff74c5490fbffc0e6883ea15c0e1139e2652e671f31f25f2a36970d2f87a00e750bf284c2b3ed1785b178b6f49ff3690a3a91779d400de3b9a3333f699a80a0c68e3e82035e027ade5d966c36a1d49abaeec04b83d64976621c355e58724b8bb90100040019000040000000010000000000021000004020100688001a05000020816800000010a0000100201400000000080100020000000400080000800004c0200000201040000000018110400c00000020000100000028000000010000' +
  '1100010080000120010000050041004000018000204002200804000081000011800022002020020140000000020005080001800000000008102008140008600000000100000500000010080082002000102080000002040120008820400020100004a40801000002a0040c000010000114000000800000050008300020100000000008010000000100120000000040000000808448200000080a00000624013000000080870552416761fabf83475b02836652b383661a72845a25c530894477617266506f6f6ca0dc425fdb323c469c91efac1d2672dfdd3ebfde8fa25d68c1b3261582503c433788c35ca7100349f430', 'hex'))

const getPeerAddr = (peer) => `${peer._socket.remoteAddress}:${peer._socket.remotePort}`
const ports = 30303
const localIp = '192.168.1.192'
// const requestIp = '192.168.1.162'
// const requestPorts = 30303

const dpt = new devp2p.DPT(PRIVATE_KEY, {
  refreshInterval: 30000,
  endpoint: {
    address: localIp,
    udpPort: ports,
    tcpPort: ports
  }
})

const rlpx = new devp2p.RLPx(PRIVATE_KEY, {
  dpt: dpt,
  maxPeers: 25,
  capabilities: [
    devp2p.DPN.dpn
  ],
  remoteClientIdFilter: REMOTE_CLIENTID_FILTER,
  listenPort: null
})

rlpx.listen(ports, '0.0.0.0')// TCP Service listen
dpt.bind(ports, '0.0.0.0')// DUP Service listen
dpt.on('error', (err) => console.error(chalk.red(`DPT error: ${err}`)))

rlpx.on('error', (err) => console.error(chalk.red(`RLPx error: ${err.stack || err}`)))
rlpx.on('peer:added', (peer) => {
  const addr = getPeerAddr(peer)
  const DPN = peer.getProtocols()[0]
  const requests = {headers: [], bodies: [], msgTypes: {}}
  const clientId = peer.getHelloMessage().clientId
  console.log(chalk.green(`Add peer: ${addr} ${clientId} (yfm${yfm.getVersion()}) (total: ${rlpx.getPeers().length})`))

  DPN.sendStatus({
    networkId: CHAIN_ID,
    td: devp2p._util.int2buffer(3),
    bestHash: Buffer.from('000', 'hex'),
    genesisHash: Buffer.from('000', 'hex')
  })

  // check CHECK_BLOCK
  let forkDrop = null
  DPN.once('status', () => {
    // DPN.sendMessage(devp2p.DPN.MESSAGE_CODES.GET_BLOCK_HEADERS, [CHECK_BLOCK_NR, 1, 0, 0])
    forkDrop = setTimeout(() => {
      peer.disconnect(devp2p.RLPx.DISCONNECT_REASONS.USELESS_PEER)
    }, ms('15s'))
    peer.once('close', () => clearTimeout(forkDrop))
  })

  DPN.sendMessage(devp2p.DPN.MESSAGE_CODES.TEST, '==> 测试YFM协议的P2P通信')
  DPN.on('message', async (code, payload) => {
    if (code in requests.msgTypes) {
      requests.msgTypes[code] += 1
    } else {
      requests.msgTypes[code] = 1
    }
    switch (code) {
      case devp2p.DPN.MESSAGE_CODES.STATUS: break
      case devp2p.DPN.MESSAGE_CODES.GET_BLOCK_HEADERS:
        // const headers = []
        // // hack
        // if (devp2p._util.buffer2int(payload[0]) === CHECK_BLOCK_NR) {
        //   headers.push(CHECK_BLOCK_HEADER)
        // }
        // if (requests.headers.length === 0 && requests.msgTypes[code] >= 8) {
        //   peer.disconnect(devp2p.RLPx.DISCONNECT_REASONS.USELESS_PEER)
        // } else {
        //   DPN.sendMessage(devp2p.ETH.MESSAGE_CODES.BLOCK_HEADERS, headers)
        // }
        break
      case devp2p.DPN.MESSAGE_CODES.GET_BLOCK_BODIES:
        // if (requests.headers.length === 0 && requests.msgTypes[code] >= 8) {
        //   peer.disconnect(devp2p.RLPx.DISCONNECT_REASONS.USELESS_PEER)
        // } else {
        //   DPN.sendMessage(devp2p.DPN.MESSAGE_CODES.BLOCK_BODIES, [])
        // }
        break
      case devp2p.DPN.MESSAGE_CODES.TEST:
        console.log(`yfm-peer  = message  测试消息：${payload}`)
        peer.disconnect(devp2p.RLPx.DISCONNECT_REASONS.USELESS_PEER)
        break
      default:
        console.log('Code is miss:  code = ' + code)
        break
    }
  })
}) // peer:added end

rlpx.on('peer:removed', (peer, reasonCode, disconnectWe) => {
  const who = disconnectWe ? 'we disconnect' : 'peer disconnect'
  const total = rlpx.getPeers().length
  console.log(chalk.yellow(`Remove peer: ${getPeerAddr(peer)} - ${who}, reason: ${peer.getDisconnectPrefix(reasonCode)} (${String(reasonCode)}) (total: ${total})`))
})
rlpx.on('peer:error', (peer, err) => {
  if (err.code === 'ECONNRESET') return
  if (err instanceof assert.AssertionError) {
    const peerId = peer.getId()
    if (peerId !== null) dpt.banPeer(peerId, ms('5m'))
    console.error(chalk.red(`Peer error (${getPeerAddr(peer)}): ${err.message}`))
    return
  }
  console.error(chalk.red(`Peer error (${getPeerAddr(peer)}): ${err.stack || err}`))
})

for (let node of NODES) {
  dpt.bootstrap(node).catch((err) => {
    console.error(chalk.bold.red(`DPT bootstrap error: ${err.stack || err}`))
  })
}

setInterval(() => {
  const peersCount = dpt.getPeers().length
  const openSlots = rlpx._getOpenSlots()
  const queueLength = rlpx._peersQueue.length
  const queueLength2 = rlpx._peersQueue.filter((o) => o.ts <= Date.now()).length
  console.log(chalk.yellow(`Total nodes in DPT: ${peersCount}, open slots: ${openSlots}, queue: ${queueLength} / ${queueLength2}`))
}, ms('30s'))

setInterval(() => {
  let peers = dpt.getPeers()
  for (let peer of peers) {
    rlpx._connectToPeer(peer)
  }
  // peers = rlpx.getPeers()
  // for (let peerRlpx of peers) {
  //   const yfm = peerRlpx.getProtocols()[0]
  //   yfm.sendMessage(devp2p.YFM.MESSAGE_CODES.TEST, '协议信息测试 demo test')
  // }
}, ms('10s'))