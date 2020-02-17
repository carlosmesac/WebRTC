//Referencia a los elementos de la página web
var divSelectRoom = document.getElementById("selectRoom");
var divConsultingRoom = document.getElementById("consultingRoom");
var inputRoomNumber = document.getElementById("roomNumber");
var btnGoRoom = document.getElementById("goRoom");
var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");

//Variables globales
var roomNumber;
var localStream;
var remoteStream;
var rtcPeerConnection;
//Servidor STUN
var iceServers = {
    'iceServers': [
        { 'urls': 'stun:stun.service.mozilla.com' },
        { 'urls': 'stun:stun.l.google.com:19302' }
    ]
}
var streamConstraints = { audio: true, video: true };
var isCaller;

//Nos conectamos con el servidor socket.io
var socket = io();

//Creamos el evento al pulsar el botón
btnGoRoom.onclick = function() {
    if (inputRoomNumber.value === '') {
        alert('Introduzca un número de sala')
    } else {
        roomNumber = inputRoomNumber.value; //obtenemos el valor del elemento
        socket.emit('create or join', roomNumber); //enviamos el mensaje al servidor
        divSelectRoom.style = "display:none"; //ocultamos el input de la sala
        divConsultingRoom = "display:block"; //mostramos la conferencia
    }
}

//cuando el servidor emite un 'created'

socket.on('created', function(room) {
    //se obtienen los dispositivos multimedia definidos en los contraints
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function(stream) {
        localStream = stream; //define la transmision local como una variable
        localVideo.src = URL.createObjectURL(stream); //muestra la transmision al usuario
        isCaller = true; // define al usuario como Caller

    }).catch(function(err) {
        console.log('An error ocurred when accessing media devices');
    });
});

//cuando el servidor emite un 'joined'
socket.on('joined', function(room) {
    //se obtienen los dispositivos multimedia definidos en los contraints
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function(stream) {
        localStream = stream; //define la transmision local como una variable
        localVideo.src = URL.createObjectURL(stream); //muestra la transmision al usuario
        socket.emit('ready', roomNumber); //envía un mensaje al servidor
    }).catch(function(err) {
        console.log('An error ocurred when accessing media devices');
    });
});

//cuando el servidor emite un 'ready'
socket.on('ready', function() {
    if (isCaller) {
        //crea una RTCPeerConnection
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        //añade los listeners a los objetos creados
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.onaddstream = onAddStream;
        //añade la transmisión local al objeto
        rtcPeerConnection.addStream(localStream);
        //prepara el Offer
        rtcPeerConnection.createOffer(setLocalAndOffer, function(e) { console.log(e) });
    }
});

//cuando el servidor emite un 'Offer'
socket.on('offer', function(event) {
    if (!isCaller) {
        //crea el objeto RTCPeerConnection
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        //añade los listeners a los objetos creados
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.onaddstream = onAddStream;
        //añade la transmisión local al objeto
        rtcPeerConnection.addStream(localStream);
        //almacena el 'Offer' como descripcion remota
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
        //prepara el 'Answer'
        rtcPeerConnection.createAnswer(setLocalAndAnswer, function(e) { console.log(e) });
    }
});

//cuando el servidor emite una 'Answer'
socket.on('answer', function(event) {
    //la almacena como descripción remota
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});

//cuando el servidor emite un candidate
socket.on('candidate', function(event) {
    //crea el objeto candidate
    var candidate = RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    //almacena le candidate
    rtcPeerConnection.addIceCandidate(candidate);
});

//Cuando un usuario recibe el audio o vídeo del otro usuario
function onAddStream(event) {
    remoteVideo.src = URLcreateObjectURL(event.stream);
    remoteStream = event.stream;

}
//enviar candidate al servidor
function onIceCandidate(event) {
    if (event.candidate) {
        console.log('sending ice Candidate');
        socket.emit('candidate', {
            type: 'candidate',
            lable: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomNumber
        })
    }
}

//almacena el 'Offer' y envia mensaje al servidor
function setLocalAndOffer(sessionDescription) {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('offer', {
        type: 'offer',
        sdp: sessionDescription,
        room: roomNumber
    });
}

//almacena el 'Answer' y envia mensaje al servidor
function setLocalAndAnswer(sessionDescription) {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('answer', {
        type: 'answer',
        sdp: sessionDescription,
        room: roomNumber
    });
}