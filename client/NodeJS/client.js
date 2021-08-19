const WebSocket = require('ws')
class GameClient {
    constructor(options = {
        roomName: '',
        maxPlayers: 0,
        connectionUrl: ''
    }) {
        this.id = 'unknown'
        this.events = new Map()
        this.socket = new WebSocket(`${options.connectionUrl}?roomName=${options.roomName}&maxPlayers=${options.maxPlayers}`)

        this.socket.on('open', () => {
            setInterval(() => {
                this.socket.send('')
                console.log('Pinging...')
            }, 4500)
        })

        this.socket.onmessage = ({ data }) => {
            data = JSON.parse(data)
            if (data.event === 'ready') {
                if (isNaN(data.data * 1)) {
                    this.id = data.data.toString()
                    console.log(`Logged in as: ${this.id}`)
                } else {
                    this.id = `Guest_${data.data.toString()}`
                    console.log(`Logged in as: ${this.id}`)
                }
            } else {
                if (this.events.has(data.event)) {
                    const callbacks = this.events.get(data.event)
                    let cbLength = callbacks.length
                    while (cbLength--) {
                        callbacks[cbLength](data)
                    }
                }
            }
        }

    }

    sendAll(data, options = {
        event: 'message',
        actions: []
    }) {
        this.socket.send(JSON.stringify({
            event: options.event || 'message',
            data: data || {},
            actions: options.actions || [],
            to: 'room',
            author: this.id
        }))
    }

    sendDM(data, options = {
        event: 'message',
        actions: [],
        to: ''
    }) {
        this.socket.send(JSON.stringify({
            event: options.event || 'message',
            data: data || {},
            actions: options.actions || [],
            to: options.to,
            author: this.id
        }))
    }
    chatAll(data, options = {
        event: 'chat',
        actions: [],
        to: 'room'
    }) {
        this.socket.send(JSON.stringify({
            event: options.event || 'chat',
            data: data || {},
            actions: options.actions || [],
            to: options.to,
            author: this.id
        }))
    }

    chatDM(data, options = {
        event: 'chat',
        actions: [],
        to: ''
    }) {
        this.socket.send(JSON.stringify({
            event: options.event || 'chat',
            data: data || {},
            actions: options.actions || [],
            to: options.to,
            author: this.id
        }))
    }

    sendAudio() {

    }
    recieveAudio() {

    }
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, [callback])
        } else {
            this.events.get(event).push(callback)
        }
    }
    leave(reason) {
        this.sendAll(reason || 'Internet Connectivity', {
            event: 'leave'
        })
        this.socket.close()
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
    //console.log(data)
})
client.socket.onopen = () => {
    setInterval(() => {
        client.sendAll({
            x: 1.2,
            y: 0.3
        })
    }, 0);
}

setInterval(() => {

    console.log(`${i} msg/s`)
    i = 0

}, 1000);

client.on('leave', (data) => {
    console.log(`${data.author} left because of ${data.data}`)
})