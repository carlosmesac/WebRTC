//librerias requeridas
const express = require('express');
const app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

//host estatico con express
app.use(express.static('public'));

// Provide access to node_modules folder from the client-side
app.use('/scripts', express.static(`${__dirname}/node_modules/`));

// Redirect all traffic to index.html
app.use((req, res) => res.sendFile(`${__dirname}/public/index.html`));


//manejadores de señaliazcion
io.on('connection', function(socket) {
    console.log('a user connected');

    //cuando el usuario emite 'create' o 'join'
    socket.on('create or join', function(room) {
        console.log('create or join room', room);
        //cuenta el numero de usuarios en una sala
        var myRoom = io.sockets.adapter.rooms[room] || { length: 0 };
        var numClients = myRoom.length;
        console.log(room, ' has ', numClients, ' clients');
        if (numClients == 0) { //no hay usuarios en la sala
            socket.join(room);
            socket.emit('created', room);
        } else if (numClients == 1) { //hay un usuario en la sal
            socket.join(room);
            socket.emit('joined', room);
        } else { //la sala está llena
            socket.emit('full', room);
        }
    });
    socket.on('ready', function(room) {
        socket.broadcast.to(room).emit('ready');
    });
    socket.on('candidate', function(event) {
        socket.broadcast.to(event.room).emit('candidate', event);
    });
    socket.on('offer', function(event) {
        socket.broadcast.to(event.room).emit('offer', event.sdp);
    });
    socket.on('answer', function(event) {
        socket.broadcast.to(event.room).emit('answer', event.sdp)
    });
});

//listener
http.listen(3000, function() {
    console.log('listening on :3000')
})