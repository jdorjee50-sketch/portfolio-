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

const assistantPanel = document.querySelector('#assistant-panel');
const assistantToggle = document.querySelector('.assistant-toggle');
const assistantInput = document.querySelector('#assistant-input');
const assistantForm = document.querySelector('#assistant-form');
const assistantReply = document.querySelector('#assistant-reply');
const assistantStatus = document.querySelector('#assistant-status');
const assistantVoice = document.querySelector('.assistant-voice');
let speakReply = false;

function setAssistantOpen(isOpen) {
  assistantPanel.hidden = !isOpen;
  assistantToggle.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) assistantInput.focus();
  else window.speechSynthesis?.cancel();
}

assistantToggle.addEventListener('click', () => setAssistantOpen(assistantPanel.hidden));
document.querySelector('.assistant-close').addEventListener('click', () => setAssistantOpen(false));

function answerCommand(rawCommand) {
  const command = rawCommand.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const projects = [...document.querySelectorAll('.project-card')];
  const project = projects.find((card) => {
    const title = card.querySelector('h3')?.textContent.toLowerCase() ?? '';
    return title.split(/[^a-z0-9]+/).filter((word) => word.length > 2).some((word) => command.includes(word));
  });

  if (/(contact|email|hire|reach|message|start a project)/.test(command)) {
    document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
    return 'Here is the contact section. You can email Yeshey to discuss a project.';
  }
  if (project && !/(all|every|recent|selected|portfolio|projects)/.test(command)) {
    project.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return `Here is the ${project.querySelector('h3').textContent.trim()} project.`;
  }
  if (/(work|project|portfolio|case stud|design|photograph|photo|video)/.test(command)) {
    document.querySelector('#work').scrollIntoView({ behavior: 'smooth' });
    return 'Here are the projects. You can ask for a project by name to jump to it.';
  }
  if (/(about|who are you|who is yeshey|experience|service|what do you do)/.test(command)) {
    document.querySelector('#about').scrollIntoView({ behavior: 'smooth' });
    return 'Yeshey is a web developer and UI and UX designer. He also creates logos and marketing materials.';
  }
  if (/(home|top|beginning|start)/.test(command)) {
    document.querySelector('#top').scrollIntoView({ behavior: 'smooth' });
    return 'Taking you back to the top.';
  }
  return 'Try asking to see the work, learn about Yeshey, open a project, or find contact details.';
}

assistantForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const command = assistantInput.value.trim();
  if (!command) return;
  const reply = answerCommand(command);
  assistantReply.textContent = reply;
  assistantInput.value = '';
  if (speakReply && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(reply);
    utterance.lang = document.documentElement.lang || 'en';
    window.speechSynthesis.speak(utterance);
  }
  speakReply = false;
});

let mediaRecorder;
let microphoneStream;
let audioChunks = [];
let transcriberPromise;
let recordingTimer;

async function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = import('@huggingface/transformers')
      .then(({ pipeline, env }) => {
        env.allowRemoteModels = true;
        env.useBrowserCache = true;
        return pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', {
          device: 'wasm',
          dtype: 'q8',
          progress_callback: ({ status, progress }) => {
            if (status === 'progress' && Number.isFinite(progress)) {
              assistantStatus.textContent = `Downloading voice model: ${Math.round(progress)}%`;
            } else if (status === 'done') {
              assistantStatus.textContent = 'Voice model ready.';
            }
          },
        });
      })
      .catch((error) => {
        transcriberPromise = undefined;
        throw error;
      });
  }
  return transcriberPromise;
}

async function transcribeRecording(blob) {
  assistantStatus.textContent = 'Loading the voice model on first use…';
  const transcriber = await getTranscriber();
  assistantStatus.textContent = 'Transcribing on this device…';

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Audio decoding is not supported in this browser.');
  const audioContext = new AudioContextClass();
  try {
    const decodedAudio = await audioContext.decodeAudioData(await blob.arrayBuffer());
    const targetRate = 16000;
    const outputLength = Math.ceil(decodedAudio.duration * targetRate);
    const samples = new Float32Array(outputLength);
    const sourceRate = decodedAudio.sampleRate;
    const channelCount = decodedAudio.numberOfChannels;
    const channels = Array.from({ length: channelCount }, (_, channel) => decodedAudio.getChannelData(channel));

    for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
      const sourceStart = Math.floor((outputIndex * sourceRate) / targetRate);
      const sourceEnd = Math.min(
        decodedAudio.length,
        Math.ceil(((outputIndex + 1) * sourceRate) / targetRate),
      );
      let sum = 0;
      let count = 0;
      for (let sourceIndex = sourceStart; sourceIndex < sourceEnd; sourceIndex += 1) {
        for (const channel of channels) {
          sum += channel[sourceIndex];
          count += 1;
        }
      }
      samples[outputIndex] = count ? sum / count : 0;
    }

    const result = await transcriber(samples, { sampling_rate: targetRate, task: 'transcribe' });
    const transcript = result.text?.trim();
    if (!transcript) throw new Error('No words were recognized. Try speaking a little louder and closer to the mic.');
    assistantInput.value = transcript;
    speakReply = true;
    assistantForm.requestSubmit();
  } finally {
    await audioContext.close();
  }
}

function stopRecording() {
  window.clearTimeout(recordingTimer);
  if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
}

assistantVoice.addEventListener('click', async () => {
  if (mediaRecorder?.state === 'recording') {
    assistantStatus.textContent = 'Finishing your recording…';
    assistantVoice.disabled = true;
    stopRecording();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    assistantStatus.textContent = 'This browser cannot record audio. Open the site in a current browser or type your request.';
    return;
  }

  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(microphoneStream);
    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) audioChunks.push(event.data);
    });
    mediaRecorder.addEventListener('stop', async () => {
      microphoneStream?.getTracks().forEach((track) => track.stop());
      microphoneStream = undefined;
      assistantVoice.disabled = false;
      assistantVoice.textContent = '🎙';
      assistantVoice.setAttribute('aria-label', 'Start recording a voice command');
      try {
        const recording = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        await transcribeRecording(recording);
      } catch (error) {
        console.error('Local voice transcription failed:', error);
        assistantStatus.textContent = error.message || 'Voice transcription failed. Check your connection to download the speech model, then try again.';
      }
    }, { once: true });
    mediaRecorder.start();
    assistantVoice.textContent = '■';
    assistantVoice.setAttribute('aria-label', 'Stop recording and transcribe');
    assistantStatus.textContent = 'Recording… speak now, then tap stop. Max 12 seconds.';
    recordingTimer = window.setTimeout(stopRecording, 12000);
  } catch (error) {
    microphoneStream?.getTracks().forEach((track) => track.stop());
    microphoneStream = undefined;
    const denied = error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError';
    assistantStatus.textContent = denied
      ? 'Microphone access is blocked. Allow microphone access for this site in your browser settings, then try again.'
      : 'Could not open the microphone. Connect or select a microphone, then try again.';
  }
});
