// client.js

let localStream;
let peerConnection;
let socket;

const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

async function start() {
  // Select video element
  const video = document.getElementById("localVideo");

  try {
    // Get local media stream
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = localStream;
  } catch (err) {
    console.error("Error accessing media devices.", err);
    return;
  }

  // ✅ Fix: use secure WebSocket if site is HTTPS
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${window.location.host}`);

  socket.onopen = () => {
    console.log("Connected to signaling server");
    initPeer();
  };

  socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);

    if (message.offer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.send(JSON.stringify({ answer }));
    } else if (message.answer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
    } else if (message.iceCandidate) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.iceCandidate));
      } catch (err) {
        console.error("Error adding received ICE candidate", err);
      }
    }
  };

  socket.onerror = (err) => {
    console.error("WebSocket error:", err);
  };

  socket.onclose = () => {
    console.log("Disconnected from signaling server");
  };
}

function initPeer() {
  peerConnection = new RTCPeerConnection(servers);

  // Add local tracks
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Handle remote stream
  peerConnection.ontrack = (event) => {
    const remoteVideo = document.getElementById("remoteVideo");
    if (remoteVideo.srcObject !== event.streams[0]) {
      remoteVideo.srcObject = event.streams[0];
    }
  };

  // ICE candidate handling
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.send(JSON.stringify({ iceCandidate: event.candidate }));
    }
  };

  // Create an offer
  createOffer();
}

async function createOffer() {
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.send(JSON.stringify({ offer }));
  } catch (err) {
    console.error("Error creating offer:", err);
  }
}

// Expose start() to button
window.start = start;
