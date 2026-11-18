const panel = document.querySelector('#assistant-panel');
const toggle = document.querySelector('.assistant-toggle');
const close = document.querySelector('.assistant-close');
const form = document.querySelector('#assistant-form');
const input = document.querySelector('#assistant-input');
const reply = document.querySelector('#assistant-reply');
const status = document.querySelector('#assistant-status');
const voiceButton = document.querySelector('.assistant-voice');

if (panel && toggle && form && input && reply && status && voiceButton) {
  let recognition;
  let listening = false;

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
    else window.speechSynthesis?.cancel();
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  close?.addEventListener('click', () => setOpen(false));

  function navigate(commandText) {
    const command = commandText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const projects = [...document.querySelectorAll('.project-card')];
    const project = projects.find((card) => {
      const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
      return title.split(/[^a-z0-9]+/).filter((word) => word.length > 2).some((word) => command.includes(word));
    });

    let target;
    let message;
    if (/(contact|email|hire|reach|message|start a project)/.test(command)) {
      target = document.querySelector('#contact');
      message = 'Here is the contact section. You can email Yeshey to discuss a project.';
    } else if (project && !/(all|every|recent|selected|portfolio|projects)/.test(command)) {
      target = project;
      message = `Here is the ${project.querySelector('h3').textContent.trim()} project.`;
    } else if (/(work|project|portfolio|case stud|design|photograph|photo|video)/.test(command)) {
      target = document.querySelector('#work');
      message = 'Here are the projects. You can ask for a project by name.';
    } else if (/(about|who are you|who is yeshey|experience|service|what do you do)/.test(command)) {
      target = document.querySelector('#about');
      message = 'Yeshey is a web developer and UI and UX designer. He also creates logos and marketing materials.';
    } else if (/(home|top|beginning|start)/.test(command)) {
      target = document.querySelector('#top');
      message = 'Taking you back to the top.';
    } else {
      message = 'Try “show work”, “about”, “contact”, or the name of a project.';
    }

    target?.scrollIntoView({ behavior: 'smooth', block: target === project ? 'center' : 'start' });
    reply.textContent = message;
    return message;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const command = input.value.trim();
    if (!command) {
      status.textContent = 'Type a request first, for example “show me your work”.';
      input.focus();
      return;
    }
    try {
      navigate(command);
      input.value = '';
      status.textContent = 'Request complete.';
    } catch (error) {
      console.error('Portfolio text assistant error:', error);
      status.textContent = 'That request could not be completed. Try “work”, “about”, or “contact”.';
    }
  });

  function stopListening() {
    if (recognition && listening) recognition.stop();
  }

  voiceButton.addEventListener('click', () => {
    if (listening) {
      status.textContent = 'Finishing…';
      stopListening();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      status.textContent = 'Voice input needs Chrome or Edge. Type your request here; text input works in this browser.';
      input.focus();
      return;
    }

    try {
      recognition = new SpeechRecognition();
      recognition.lang = document.documentElement.lang || 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      listening = true;
      voiceButton.textContent = '■';
      voiceButton.setAttribute('aria-label', 'Stop listening');
      status.textContent = 'Listening… say “work”, “about”, “contact”, or a project name.';
      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const transcript = result?.[0]?.transcript?.trim();
        if (!transcript) return;
        input.value = transcript;
        if (result.isFinal) {
          form.requestSubmit();
          status.textContent = `Heard: “${transcript}”`;
        } else {
          status.textContent = `Hearing: “${transcript}”…`;
        }
      };
      recognition.onerror = (event) => {
        const errors = {
          'not-allowed': 'Microphone permission is blocked. Allow it in browser settings and try again.',
          'service-not-allowed': 'This browser blocks speech recognition. Use Chrome or Edge, or type your request.',
          'no-speech': 'No speech detected. Tap the mic and try speaking again.',
          network: 'Browser speech recognition needs an internet connection. Type your request if offline.',
        };
        status.textContent = errors[event.error] || `Voice input failed (${event.error}). Type a request or try again.`;
      };
      recognition.onend = () => {
        listening = false;
        voiceButton.textContent = '🎙';
        voiceButton.setAttribute('aria-label', 'Start voice input');
      };
      recognition.start();
    } catch (error) {
      listening = false;
      voiceButton.textContent = '🎙';
      status.textContent = 'Could not start voice input. Allow microphone access and try again.';
      console.error('Could not start speech recognition:', error);
    }
  });
}
