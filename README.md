# DIPNET network under DEV 
We build the basic DIPNET network with ethereum dev-p2p lib.
You may get more to visite ethereumjs-devp2p project.

This library bundles different components for lower-level peer-to-peer connection and message exchange:

- Distributed Peer Table (DPT) / Node Discovery
- RLPx Transport Protocol
- Dipnet Protocol (DPN)

The library is based on [ethereumjs/node-devp2p](https://github.com/ethereumjs/node-devp2p) as well
as other sub-libraries (``node-*`` named) (all outdated).

## Run/Build

This library has to be compiled with babel to a ``Node 6`` friendly source format.
For triggering a (first) build to create the ``lib/`` directory run:

```
npm run build
```

You can also use babel just-in-time compilation to run a script:

```
node -r babel-register [YOUR_SCRIPT_TO_RUN.js]
```

## Usage/Examples

All components of this library are implemented as Node ``EventEmitter`` objects
and make heavy use of the Node.js network stack.

You can react on events from the network like this:

```
dpt.on('peer:added', (peer) => {
  // Do something...
})
```

Basic example to connect to some bootstrap nodes and get basic peer info:

  - [simple](examples/simple.js)

Communicate with peers to read and send data, now it works only in our local test env:

  - [peer-communication](examples/dpn-peer.js)

Run an example with:

```
node -r babel-register ./examples/dpn-peer.js
```

## Distributed Peer Table (DPT) / Node Discovery

Maintain/manage a list of peers, see [./src/dpt/](./src/dpt/), also 
includes node discovery ([./src/dpt/server.js](./src/dpt/server.js))

### Usage

Create your peer table:

```
const dpt = new DPT(Buffer.from(PRIVATE_KEY, 'hex'), {
  endpoint: {
    address: '0.0.0.0',
    udpPort: null,
    tcpPort: null
  }
})
```

Add some bootstrap nodes (or some custom nodes with ``dpt.addPeer()``):

```
dpt.bootstrap(bootnode).catch((err) => console.error('Something went wrong!'))
```

### API


#### `DPT` (extends `EventEmitter`)
Distributed Peer Table. Manages a Kademlia DHT K-bucket (``Kbucket``) for storing peer information 
and a ``BanList`` for keeping a list of bad peers. ``Server`` implements the node discovery (``ping``,
``pong``, ``findNeighbours``).

##### `new DPT(privateKey, options)`
Creates new DPT object
- `privateKey` - Key for message encoding/signing.
- `options.refreshInterval` - Interval in ms for refreshing (calling ``findNeighbours``) the peer list (default: ``60s``).
- `options.createSocket` - A datagram (dgram) ``createSocket`` function, passed to ``Server`` (default: ``dgram.createSocket.bind(null, 'udp4')``).
- `options.timeout` - Timeout in ms for server ``ping``, passed to ``Server`` (default: ``10s``).
- `options.endpoint` - Endpoint information to send with the server ``ping``, passed to ``Server`` (default: ``{ address: '0.0.0.0', udpPort: null, tcpPort: null }``).

#### `dpt.bootstrap(peer)` (``async``)
Uses a peer as new bootstrap peer and calls ``findNeighbouts``.
- `peer` - Peer to be added, format ``{ address: [ADDRESS], udpPort: [UDPPORT], tcpPort: [TCPPORT] }``.

#### `dpt.addPeer(object)` (``async``)
Adds a new peer.
- `object` - Peer to be added, format ``{ address: [ADDRESS], udpPort: [UDPPORT], tcpPort: [TCPPORT] }``.

For other utility functions like ``getPeer``, ``getPeers`` see [./src/dpt/index.js](./src/dpt/index.js).

### Events

Events emitted:

| Event         | Description                              |
| ------------- |:----------------------------------------:|
| peer:added    | Peer added to DHT bucket                 |
| peer:removed  | Peer removed from DHT bucket             |
| peer:new      | New peer added                           |
| listening     | Forwarded from server                    |
| close         | Forwarded from server                    |
| error         | Forwarded from server                    |

### Reference

- [Node discovery protocol](https://github.com/ethereum/wiki/wiki/Node-discovery-protocol)
- [RLPx - Node Discovery Protocol](https://github.com/ethereum/devp2p/blob/master/rlpx.md#node-discovery)
- [Kademlia Peer Selection](https://github.com/ethereum/wiki/wiki/Kademlia-Peer-Selection)

## RLPx Transport Protocol

Connect to a peer, organize the communication, see [./src/rlpx/](./src/rlpx/)

### Usage

Create your ``RLPx`` object, e.g.:

```
const rlpx = new devp2p.RLPx(PRIVATE_KEY, {
  dpt: dpt,
  maxPeers: 25,
  capabilities: [
     devp2p.DPN.dpn
  ],
  listenPort: null
})
```

### API

#### `RLPx` (extends `EventEmitter`)
Manages the handshake (`ECIES`) and the handling of the peer communication (``Peer``).

##### `new RLPx(privateKey, options)`
Creates new RLPx object
- `privateKey` - Key for message encoding/signing.
- `options.timeout` - Peer `ping` timeout in ms (default: ``10s``).
- `options.maxPeers` - Max number of peer connections (default: ``10``).
- `options.clientId` - Client ID string.
- `options.remoteClientIdFilter` - Optional list of client ID filter strings (e.g. `['go1.5', 'quorum']`).
- `options.capabilities` - Upper layer protocol capabilities, e.g. `[devp2p.ETH.eth63, devp2p.ETH.eth62, devp2p.DPN.dpn]`.
- `options.listenPort` - The listening port for the server or ``null`` for default.
- `options.dpt` - `DPT` object for the peers to connect to (default: ``null``, no `DPT` peer management).

#### `rlpx.connect(peer)` (``async``)
Manually connect to peer without `DPT`.
- `peer` - Peer to connect to, format ``{ id: PEER_ID, address: PEER_ADDRESS, port: PEER_PORT }``.

For other connection/utility functions like ``listen``, ``getPeers`` see [./src/rlpx/index.js](./src/rlpx/index.js).

### Events

Events emitted:

| Event         | Description                              |
| ------------- |:----------------------------------------:|
| peer:added    | Handshake with peer successful           |
| peer:removed  | Disconnected from peer                   |
| peer:error    | Error connecting to peer                 |
| listening     | Forwarded from server                    |
| close         | Forwarded from server                    |
| error         | Forwarded from server                    |


### Reference

- [RLPx: Cryptographic Network & Transport Protocol](https://github.com/ethereum/devp2p/blob/master/rlpx.md)
- [devp2p wire protocol](https://github.com/ethereum/wiki/wiki/%C3%90%CE%9EVp2p-Wire-Protocol)

## Dipnet Protocol (DPN)

Upper layer protocol for exchanging DPN network data like block headers or transactions with a node, see [./src/dpn/](./src/dpn/).
It's now under development.

## General References

### Other Implementations

The following is a list of major implementations of the ``devp2p`` stack in other languages:

- [pydevp2p](https://github.com/ethereum/pydevp2p) (Python)
- [Go Ethereum](https://github.com/ethereum/go-ethereum/tree/master/p2p) (Go)
- [Exthereum](https://github.com/exthereum/exth_crypto) (Elixir)

### Links

- [Blog article series](https://ocalog.com/post/10/)  on implementing Ethereum protocol stack

## License

MIT
