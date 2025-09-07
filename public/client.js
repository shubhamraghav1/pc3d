(() => {
  let role = null;
  let ws;

  const logEl = document.getElementById("log");
  const leftVideo  = document.getElementById("leftVideo");
  const rightVideo = document.getElementById("rightVideo");
  const localVideo = document.getElementById("localVideo");

  // Host keeps two peer connections; camera keeps one.
  const peers = { left: null, right: null };
  let camPc = null;

  const log = (m) => { console.log(m); logEl.textContent += m + "\n"; };

  // Build WSS URL for Replit or local automatically
  const wsUrl = () => {
    const scheme = (location.protocol === "https:") ? "wss" : "ws";
    return `${scheme}://${location.host}/?role=${role}`;
  };

  function ensureWs() {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    ws = new WebSocket(wsUrl());
    ws.onopen    = () => log(`WS connected as ${role}`);
    ws.onclose   = () => log("WS closed");
    ws.onerror   = (e) => log("WS error");
    ws.onmessage = onWsMessage;
  }

  async function onWsMessage(evt) {
    let data;
    try { data = JSON.parse(evt.data); } catch { return; }

    if (role === "host") {
      const from = data.from; // 'left' | 'right'
      if (!["left","right"].includes(from)) return;

      if (!peers[from]) peers[from] = createHostPeer(from);
      const pc = peers[from];

      if (data.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (data.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ to: from, sdp: pc.localDescription }));
        }
      } else if (data.candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
        catch (err) { log(`ICE add error (${from}): ${err}`); }
      }
    } else {
      // camera receives messages from host
      if (!camPc) return;
      if (data.sdp) {
        await camPc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.candidate) {
        try { await camPc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
        catch (err) { log("ICE add error: " + err); }
      }
    }
  }

  function createHostPeer(label) {
    const pc = new RTCPeerConnection();
    pc.onicecandidate = (e) => {
      if (e.candidate) ws.send(JSON.stringify({ to: label, candidate: e.candidate }));
    };
    pc.ontrack = (e) => {
      log(`Remote track received (${label})`);
      const v = (label === "left") ? leftVideo : rightVideo;
      v.srcObject = e.streams[0];
      v.muted = true; // no audio needed; avoids autoplay issues
    };
    return pc;
  }

  async function startCamera(which) {
    role = which;            // 'left' or 'right'
    ensureWs();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }, audio: false
    });

    localVideo.style.display = "block";
    leftVideo.srcObject = rightVideo.srcObject = null; // cameras show only local
    localVideo.srcObject = stream;

    camPc = new RTCPeerConnection();
    stream.getTracks().forEach(t => camPc.addTrack(t, stream));

    camPc.onicecandidate = (e) => {
      if (e.candidate) ws.send(JSON.stringify({ candidate: e.candidate }));
    };

    const offer = await camPc.createOffer();
    await camPc.setLocalDescription(offer);
    ws.send(JSON.stringify({ sdp: camPc.localDescription }));
  }

  function becomeHost() {
    role = "host";
    ensureWs();
    localVideo.style.display = "none";
    localVideo.srcObject = null;
    leftVideo.srcObject = null;
    rightVideo.srcObject = null;
    peers.left = peers.right = null;
  }

  // UI
  document.getElementById("btnHost").onclick = becomeHost;
  document.getElementById("btnLeft").onclick = () => startCamera("left");
  document.getElementById("btnRight").onclick = () => startCamera("right");
})();
