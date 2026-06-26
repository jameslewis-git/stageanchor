'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// Web Speech API types (not in default lib.dom.d.ts)
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const intentionalStopRef = useRef(false);
  const isListeningRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Build a rolling window of the last 5 speech results for better fuzzy matching.
      // Using only the latest fragment (event.resultIndex) is too short — the fuzzy
      // matcher needs a few words to find a match reliably.
      const numResults = event.results.length;
      const windowStart = Math.max(0, numResults - 5);
      let heard = '';
      for (let i = windowStart; i < numResults; i++) {
        heard += event.results[i][0].transcript + ' ';
      }
      const cleaned = heard.trim();
      if (cleaned) {
        setTranscript(cleaned);
        console.log('[StageAnchor] Heard:', cleaned);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('[StageAnchor] Speech error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError(
          'Microphone access denied. Tap the mic button again and allow access when prompted.'
        );
        setIsListening(false);
        isListeningRef.current = false;
        intentionalStopRef.current = true;
      } else if (event.error === 'no-speech') {
        // Normal — silence gap, will restart via onend
      } else if (event.error === 'network') {
        setError('Network error with speech service. Check your connection and try again.');
      }
      // Other errors: let onend handle restart
    };

    recognition.onend = () => {
      if (!intentionalStopRef.current && isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started
        }
      } else {
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognitionRef.current = recognition;
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return;
    setError(null);

    // Microphone requires HTTPS on mobile (except localhost)
    if (typeof window !== 'undefined') {
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      const isSecure = window.location.protocol === 'https:';
      if (!isSecure && !isLocalhost) {
        setError(
          'Microphone needs HTTPS. Open https://stageanchor.netlify.app on your phone instead of the local address.'
        );
        return;
      }
    }

    const doStart = async () => {
      // getUserMedia explicitly shows the browser permission dialog.
      // Without this, some mobile browsers (iOS Safari, Chrome Android)
      // silently deny SpeechRecognition without ever asking the user.
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Permission granted — stop the test stream; SpeechRecognition
          // manages its own mic stream internally.
          stream.getTracks().forEach((t) => t.stop());
        } catch (err) {
          const msg = err instanceof Error ? err.message.toLowerCase() : '';
          if (msg.includes('denied') || msg.includes('not allowed') || msg.includes('permission')) {
            setError(
              'Microphone access denied. Go to your browser settings → Site Permissions → allow the mic for this site, then try again.'
            );
          } else if (msg.includes('found') || msg.includes('device')) {
            setError('No microphone found. Please connect a microphone and try again.');
          } else {
            setError(`Microphone error: ${err instanceof Error ? err.message : String(err)}`);
          }
          return;
        }
      }
      // If mediaDevices is unavailable (older browser), fall through and
      // let SpeechRecognition handle permission itself.

      intentionalStopRef.current = false;
      isListeningRef.current = true;
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch {
        // Recognition already running — that's fine
      }
    };

    doStart().catch(console.error);
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    intentionalStopRef.current = true;
    isListeningRef.current = false;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  return { isListening, transcript, error, isSupported, start, stop };
}
