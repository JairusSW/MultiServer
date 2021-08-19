class GameClient {
    constructor(options = {
        roomName: '',
        maxPlayers: 0,
        connectionUrl: ''
    }) {
        this.id = 'unknown'
        this.events = new Map()
        this.socket = new WebSocket(`${options.connectionUrl}?roomName=${options.roomName}&maxPlayers=${options.maxPlayers}`)
        this.signalData = ''
        this.acceptedSignals = new Set()
        

        this.socket.onopen = () => {
            setInterval(() => {
                this.socket.send('')
                console.log('Pinging...')
            }, 4500)
        }

        this.socket.onmessage = ({ data }) => {
            console.log(data)
            data = JSON.parse(data)
            if (data.event === 'join') {
                if (this.signalData.length !== 0) {
                    this.socket.send(JSON.stringify({
                        event: 'signal',
                        data: this.signalData
                    }))
                }
                if (this.events.has(data.event)) {
                    const callbacks = this.events.get(data.event)
                    let cbLength = callbacks.length
                    while (cbLength--) {
                        callbacks[cbLength](data)
                    }
                }
                console.log('New user joined!')
            } else if (data.event === 'signal') {
                // Connect to peer
                const signalData = JSON.stringify(data.data)
                if (this.acceptedSignals.has(signalData) === false) {
                    this.acceptedSignals.add(signalData)
                    console.log('Signalll', signalData)
                    this.peer.signal(signalData)
                    console.log('Connecting to: ', signalData)
                    console.log(typeof data.data)
                }
            } else if (data.event === 'ready') {
                if (isNaN(data.data * 1)) {
                    this.id = data.data.toString()
                    console.log(`Logged in as: ${this.id}`)
                } else {
                    this.id = `Guest_${data.data.toString()}`
                    console.log(`Logged in as: ${this.id}`)
                }
                console.log('Creating p2p connection...', (data.data * 1) === 1)
                // Create p2p connection
                this.peer = new SimplePeer({
                    initiator: (data.data * 1) === 1,
                    trickle: false
                })
                this.peer.on("connect", () => {
                    if (this.events.has('ready')) {
                        const callbacks = this.events.get('ready')
                        let cbLength = callbacks.length
                        while (cbLength--) {
                            callbacks[cbLength]()
                        }
                    }
                })

                this.peer.on("error", (err) => console.log("error", err))

                this.peer.on("data", (data) => {
                    data = JSON.parse(data)
                    if (this.events.has(data.event)) {
                        const callbacks = this.events.get(data.event)
                        let cbLength = callbacks.length
                        while (cbLength--) {
                            callbacks[cbLength](data)
                        }
                    }
                })

                this.peer.on("signal", (data) => {
                    this.signalData = JSON.stringify(data)
                    console.log("SIGNAL", JSON.stringify(data))
                    this.socket.send(JSON.stringify({
                        event: 'signal',
                        data: data
                    }))
                })
            }
        }
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, [callback])
        } else {
            this.events.get(event).push(callback)
        }
    }
    sendAll(data, options = {
        event: 'message',
        actions: []
    }) {
        this.peer.send(JSON.stringify({
            event: options.event || 'message',
            data: data || {},
            actions: options.actions || [],
            to: 'room',
            author: this.id
        }))
    }
}

const client = new GameClient({
    roomName: 'test',
    maxPlayers: 50,
    connectionUrl: 'ws://localhost:5000'
})

let i = 0

client.on('message', (data) => {
    i++
    console.log(data)
})

client.on('ready', () => {
    console.log('Connected!')
})

client.on('join', (data) => {
    console.log('Join!', data)
})