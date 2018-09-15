// node.js does not work well on es6, label-register translate es6 to es5
// require('babel-register')
const chalk = require('chalk')
const { DPT } = require('../src')
const Buffer = require('safe-buffer').Buffer

const PRIVATE_KEY = 'd772e3d6a001a38064dd23964dd2836239fa0e6cec8b28972a87460a17210fe9'
// get bootstrapp nodes, there is a set of node infos Ethereum predefined in 'ethereum-common'
const BOOTNODES = require('ethereum-common').bootstrapNodes.map((node) => {
  return {
    address: node.ip,
    udpPort: node.port,
    tcpPort: node.port
  }
})

// create dpn object
const dpt = new DPT(Buffer.from(PRIVATE_KEY, 'hex'), {// Buffer.from hex data
  endpoint: {
    address: '0.0.0.0',
    udpPort: null,
    tcpPort: null
  }
})

dpt.on('error', (err) => console.error(chalk.red(err.stack || err)))

dpt.on('peer:added', (peer) => {
  const info = `(${peer.id.toString('hex')},${peer.address},${peer.udpPort},${peer.tcpPort})`
  console.log(chalk.green(`New peer: ${info} (total: ${dpt.getPeers().length})`))
})

dpt.on('peer:removed', (peer) => {
  console.log(chalk.yellow(`Remove peer: ${peer.id.toString('hex')} (total: ${dpt.getPeers().length})`))
})

// for accept incoming connections uncomment next line
// dpt.bind(30303, '0.0.0.0')

for (let bootnode of BOOTNODES) {
  dpt.bootstrap(bootnode).catch((err) => console.error(chalk.bold.red(err.stack || err)))
}
