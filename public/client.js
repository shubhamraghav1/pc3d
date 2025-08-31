const socket = io();
let role = null;

function selectRole(selected) {
  role = selected;
  document.getElementById('cameraSection').style.display = 'block';
  document.getElementById('roleLabel').innerText = 'Role: ' + role;

  if (role === 'left') {
    startCamera('leftVideo');
  } else if (role === 'right') {
    startCamera('rightVideo');
  } else if (role === 'host') {
    initHost();
  }
}

async function startCamera(videoElementId) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    const videoElement = document.getElementById(videoElementId);
    videoElement.srcObject = stream;

    // Send frames to host periodically
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    setInterval(() => {
      if (videoElement.videoWidth === 0) return;
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
      const frame = canvas.toDataURL('image/jpeg', 0.5);
      socket.emit('frame', { role, frame });
    }, 300);
  } catch (err) {
    console.error('Camera error:', err);
    alert('Could not access camera: ' + err.message);
  }
}

function initHost() {
  const leftVideo = document.getElementById('leftVideo');
  const rightVideo = document.getElementById('rightVideo');
  const canvas = document.getElementById('pointCloud');
  const ctx = canvas.getContext('2d');

  socket.on('frame', (data) => {
    const img = new Image();
    img.src = data.frame;
    img.onload = () => {
      if (data.role === 'left') {
        leftVideo.src = img.src;
      } else if (data.role === 'right') {
        rightVideo.src = img.src;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillText('Received frames from cameras. Point cloud processing goes here.', 10, 50);
    };
  });
}
