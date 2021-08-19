const WebSocket = require('ws')

const rooms = new Map()

const server = new WebSocket.Server({
    port: process.env.PORT || 5000,
    perMessageDeflate: false
})

const qs = require('qs')

// On connection
server.on('connection', (socket, request) => {

    console.log('client connected')

    // Handle disconnection websockets. Close it if it doesn't work.
    socket.lastPing = Date.now()

    socket.isAlive = true

    console.log(request.url)
    const query = qs.parse(`${request.url.replace('/?', '')}`)
    console.log(query)

    const room = query.roomName
    // Get room name

    const maxPlayers = query.maxPlayers

    // Handle messages. peer2peer messaging.
    socket.on('message', (chunk) => {

        chunk = chunk.toString()

        const roomClients = rooms.get(room)['clients']

        if (chunk.length === 0) {

            console.log('Got a ping!')
            // If client gets message and returns it, say ok.
            socket.isAlive = true

            socket.lastPing = Date.now()
            // Set timestamp of last ping message.

        } else {
            // Send WebRTC offer/accept to all users
            for (let i = 0; i < roomClients.length; i++) {
                if (i + 1 !== socket.id) roomClients[i].send(chunk)
                // -- Only send it to other players.
            }
        }
    })

    if (rooms.has(room) && rooms.get(room)['clients'].length >= rooms.get(room)['limit']) {

        socket.send(JSON.stringify({
            error: 'Room is full.'
        }))

        socket.terminate()

        return

    }

    // Accept user.

    if (!rooms.has(room)) rooms.set(room, {
        name: room,
        clients: [],
        limit: maxPlayers
    })

    let thisRoom = rooms.get(room)

    for (let i = 0; i < thisRoom['clients'].length; i++) {
        // Let all players know that a new user is joining
        if (i + 1 !== socket.id) thisRoom['clients'][i].send(JSON.stringify({
            event: 'join'
        }))
    }

    // Add client to list
    thisRoom['clients'].push(socket)

    rooms.set(room, thisRoom)

    // Give user their id. (incremental)

    socket.id = thisRoom['clients'].length

    socket.send(JSON.stringify({
        event: 'ready',
        data: thisRoom['clients'].length
    }))

    console.log(`Client connected on channel ${socket.id} on room ${room}`)

    // Make sure client is connected. If not, kill connection, and kick from room.

    socket.aliveCheck = setInterval(() => {

        // Update thisRoom variable
        thisRoom = rooms.get(room)

        const durationBetween = Date.now() - socket.lastPing

        console.log(`Duration for client ${socket.id}. ${durationBetween}ms`)

        if (durationBetween > 5000) {

            // Clear the timeout!
            clearInterval(socket.aliveCheck)

            // Kick user if not responding for 5 seconds

            // Tell others in the room that their id is going to be changed.
            for (let i = 0; i < thisRoom['clients'].length; i++) {

                if (i >= socket.id) {
                    // ----------------------- ^ Only send to users who are affected.
                    const thisClient = thisRoom['clients'][i]

                    thisClient['id']--

                    thisClient.send(JSON.stringify({
                        event: 'ready',
                        data: i + 1
                    }))
                    // -- Update all affected user's ids. Keep everything operating smoothly.

                }

                // Remove client from room.

                if (socket.id === 1) {

                    thisRoom['clients'] = []

                    rooms.set(room, thisRoom)

                } else {

                    thisRoom['clients'].splice(socket.id - 1, 1)

                    rooms.set(room, thisRoom)

                }

            }

            console.log(`Client ${socket.id} disconnected from room ${room}`)
            // Of course, log it to the console.

            socket.terminate()

            delete socket
            // Kill them! Vaporize another garbage user! 😈

        }

    }, 15000);
    // Ping every 15 seconds

})