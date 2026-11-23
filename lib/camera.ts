// The kiosk camera: the front camera at the best resolution it offers, or a moving test pattern
// ("demo camera") for trying the booth on a machine without one.

export async function openCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser can't use the camera (it needs HTTPS or localhost).");
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
  });
}

/** A 1280 × 720 stream of a drifting gradient with a smiley, drawn on a canvas. */
export function openDemoCamera(): MediaStream {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d")!;
  const start = performance.now();
  let raf = 0;
  const draw = () => {
    const t = (performance.now() - start) / 1000;
    const g = ctx.createLinearGradient(0, 0, 1280, 720);
    g.addColorStop(0, `hsl(${(t * 20) % 360} 60% 70%)`);
    g.addColorStop(1, `hsl(${(t * 20 + 120) % 360} 60% 55%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1280, 720);
    const x = 640 + Math.sin(t) * 160;
    ctx.fillStyle = "#FCE7CB";
    ctx.beginPath();
    ctx.arc(x, 360, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#013237";
    ctx.beginPath();
    ctx.arc(x - 50, 320, 16, 0, Math.PI * 2);
    ctx.arc(x + 50, 320, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#013237";
    ctx.beginPath();
    ctx.arc(x, 380, 70, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.font = "800 40px system-ui";
    ctx.fillText("DEMO CAMERA", 40, 680);
    raf = requestAnimationFrame(draw);
  };
  draw();
  const stream = canvas.captureStream(30);
  // Stop drawing when the track is stopped.
  stream.getVideoTracks()[0].addEventListener("ended", () => cancelAnimationFrame(raf));
  const stop = stream.getVideoTracks()[0].stop.bind(stream.getVideoTracks()[0]);
  stream.getVideoTracks()[0].stop = () => {
    cancelAnimationFrame(raf);
    stop();
  };
  return stream;
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Grabs the current frame, mirrored like the preview (people expect to see themselves as in a mirror). */
export function captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}
