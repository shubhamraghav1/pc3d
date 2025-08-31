let pc, ws, role;
let leftStream, rightStream;
let leftVideo, rightVideo;
let scene, camera, renderer, points;

function start(r) {
  role = r;
  document.getElementById('roleSelect').style.display = 'none';
  ws = new WebSocket(`ws://${location.host}`);
  ws.onmessage = async (msg) => {
    let data = JSON.parse(msg.data);
    if (data.type === 'signal' && data.from) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.data));
      if (data.data.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'signal', to: data.from, data: answer }));
      }
    }
  };

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'register', role }));
    setupPeer();
  };
}

function setupPeer() {
  pc = new RTCPeerConnection();
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      ws.send(JSON.stringify({ type: 'signal', to: role === 'host' ? null : 'host', data: e.candidate }));
    }
  };

  if (role === 'left' || role === 'right') {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(stream => {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: 'signal', to: 'host', data: offer }));
      });
    });
  }

  if (role === 'host') {
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        if (!leftStream) { leftStream = event.streams[0]; createVideo('left', leftStream); }
        else if (!rightStream) { rightStream = event.streams[0]; createVideo('right', rightStream); }
      }
    };
    init3D();
  }
}

function createVideo(id, stream) {
  let v = document.createElement('video');
  v.autoplay = true;
  v.srcObject = stream;
  v.width = 320; v.height = 240;
  document.body.appendChild(v);
  if (id === 'left') leftVideo = v;
  if (id === 'right') rightVideo = v;
}

function init3D() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(320*240*3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ size: 0.05, color: 0x00ff00 });
  points = new THREE.Points(geometry, material);
  scene.add(points);

  camera.position.z = 5;
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (leftVideo && rightVideo) processStereo();
  renderer.render(scene, camera);
}

function processStereo() {
  let lMat = cv.imread(leftVideo);
  let rMat = cv.imread(rightVideo);
  cv.cvtColor(lMat, lMat, cv.COLOR_RGBA2GRAY);
  cv.cvtColor(rMat, rMat, cv.COLOR_RGBA2GRAY);

  let disp = new cv.Mat();
  let sgbm = new cv.StereoSGBM(0, 16, 3);
  sgbm.compute(lMat, rMat, disp);

  let positions = points.geometry.attributes.position.array;
  let i = 0;
  for (let y = 0; y < disp.rows; y += 4) {
    for (let x = 0; x < disp.cols; x += 4) {
      let d = disp.ucharPtr(y, x)[0];
      if (d > 0) {
        positions[i++] = (x - disp.cols/2) / 50;
        positions[i++] = (y - disp.rows/2) / 50;
        positions[i++] = -d/20;
      }
    }
  }
  points.geometry.setDrawRange(0, i/3);
  points.geometry.attributes.position.needsUpdate = true;

  lMat.delete(); rMat.delete(); disp.delete(); sgbm.delete();
}