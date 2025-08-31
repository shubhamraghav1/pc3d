// public/client.js

const socket = io();

document.getElementById("leftBtn").onclick = () => initCamera("left");
document.getElementById("rightBtn").onclick = () => initCamera("right");
document.getElementById("hostBtn").onclick = () => initHost();

async function initCamera(role) {
  console.log("Starting camera for:", role);
  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  document.body.innerHTML = `<h2>Role: ${role}</h2>`;
  document.body.appendChild(video);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });
    video.srcObject = stream;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    setInterval(() => {
      if (video.videoWidth === 0) return; // wait until video is ready
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      socket.emit("video-frame", {
        role,
        frame: canvas.toDataURL("image/jpeg", 0.5)
      });
    }, 200);
  } catch (err) {
    console.error("Camera error:", err);
    alert("Could not access camera: " + err.message);
  }
}

function initHost() {
  console.log("Starting host view");
  document.body.innerHTML = `<h2>Host</h2>
    <div style="display:flex; gap:20px;">
      <img id="leftView" width="320"/>
      <img id="rightView" width="320"/>
    </div>`;

  const leftView = document.getElementById("leftView");
  const rightView = document.getElementById("rightView");

  socket.on("video-frame", (data) => {
    if (data.role === "left") {
      leftView.src = data.frame;
    } else if (data.role === "right") {
      rightView.src = data.frame;
    }
  });
}
