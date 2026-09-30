import './style.css';
import './layers.css';
import './liquid-glass.css';

const frameCount = 151;
const canvas = document.querySelector('#sequence-canvas');
const context = canvas.getContext('2d', { alpha: false });
const frames = Array.from({ length: frameCount }, (_, index) => {
  return { image: new Image(), requested: false };
});

let renderedFrame = -1;
let queued = false;

function resizeCanvas() {
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * scale);
  canvas.height = Math.round(window.innerHeight * scale);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  renderedFrame = -1;
  render();
}

function drawCover(image) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const viewportRatio = viewportWidth / viewportHeight;
  let width = viewportWidth;
  let height = viewportHeight;
  let x = 0;
  let y = 0;

  if (imageRatio > viewportRatio) {
    width = viewportHeight * imageRatio;
    x = (viewportWidth - width) / 2;
  } else {
    height = viewportWidth / imageRatio;
    y = (viewportHeight - height) / 2;
  }

  context.fillStyle = '#000';
  context.fillRect(0, 0, viewportWidth, viewportHeight);
  context.drawImage(image, x, y, width, height);
}

function render() {
  queued = false;
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  const progress = distance > 0 ? window.scrollY / distance : 0;
  const frame = Math.min(frameCount - 1, Math.max(0, Math.round(progress * (frameCount - 1))));
  // Load the current frame first, then nearby frames so scroll scrubbing stays
  // responsive without requesting the entire 150+ MB sequence at page startup.
  [0, 1, -1, 2, -2, 3, -3].forEach((offset) => {
    const index = frame + offset;
    const entry = frames[index];
    if (entry && !entry.requested) {
      entry.requested = true;
      const number = String(index + 1).padStart(6, '0');
      entry.image.addEventListener('load', requestRender, { once: true });
      entry.image.src = `${import.meta.env.BASE_URL}frames/frame_${number}.png`;
    }
  });

  const image = frames[frame].image;

  if (frame !== renderedFrame && image.complete && image.naturalWidth) {
    drawCover(image);
    renderedFrame = frame;
  }
}

function requestRender() {
  if (!queued) {
    queued = true;
    requestAnimationFrame(render);
  }
}

window.addEventListener('scroll', requestRender, { passive: true });
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) entry.target.classList.add('visible');
}), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('#site-nav');
menuButton?.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});
navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  navigation.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));
