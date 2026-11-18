import './style.css';
import './layers.css';
import './liquid-glass.css';

const frameCount = 151;
const canvas = document.querySelector('#sequence-canvas');
const context = canvas?.getContext('2d', { alpha: false });
const frames = Array.from({ length: frameCount }, (_, index) => {
  return { image: new Image(), requested: false };
});

let renderedFrame = -1;
let queued = false;
let previousScrollY = window.scrollY;

function resizeCanvas() {
  if (!canvas || !context) return;
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
  if (!canvas || !context) return;
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  const progress = distance > 0 ? window.scrollY / distance : 0;
  const frame = Math.min(frameCount - 1, Math.max(0, Math.round(progress * (frameCount - 1))));
  const direction = window.scrollY >= previousScrollY ? 1 : -1;
  previousScrollY = window.scrollY;
  // Prioritize the frames ahead of the current scroll direction, while keeping
  // a small buffer behind it. This avoids loading the whole image sequence.
  [0, direction, direction * 2, direction * 3, direction * 4, direction * 5,
    -direction, -direction * 2, -direction * 3].forEach((offset, position) => {
    const index = frame + offset;
    const entry = frames[index];
    if (entry && !entry.requested) {
      entry.requested = true;
      const number = String(index + 1).padStart(6, '0');
      entry.image.loading = 'eager';
      if (position === 0) entry.image.fetchPriority = 'high';
      entry.image.addEventListener('load', requestRender, { once: true });
      entry.image.src = `${import.meta.env.BASE_URL}frames/frame_${number}.png`;
    }
  });

  // If the exact frame is still downloading, draw the closest ready frame so
  // quick scrolls continue moving instead of leaving a stale image on screen.
  let displayFrame = frame;
  if (!frames[displayFrame].image.complete || !frames[displayFrame].image.naturalWidth) {
    for (let offset = 1; offset < frameCount; offset += 1) {
      const ahead = frame + direction * offset;
      const behind = frame - direction * offset;
      if (ahead < frameCount && ahead >= 0 && frames[ahead].image.complete && frames[ahead].image.naturalWidth) {
        displayFrame = ahead;
        break;
      }
      if (behind < frameCount && behind >= 0 && frames[behind].image.complete && frames[behind].image.naturalWidth) {
        displayFrame = behind;
        break;
      }
    }
  }

  if (displayFrame !== renderedFrame) {
    const image = frames[displayFrame].image;
    if (image.complete && image.naturalWidth) {
      drawCover(image);
      renderedFrame = displayFrame;
    }
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

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
} else {
  document.querySelectorAll('.reveal').forEach((element) => element.classList.add('visible'));
}

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
