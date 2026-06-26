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

    // Explicitly request mic via getUserMedia FIRST.
    // This triggers the browser permission dialog on mobile (iOS Safari, Android Chrome)
    // — SpeechRecognition alone often doesn't show the dialog on first use.
    const doStart = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Permission granted — immediately stop the test stream.
        // SpeechRecognition manages its own mic stream internally.
        stream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('not allowed')) {
          setError(
            'Microphone access denied. Please go to your browser settings, allow mic access for this site, then try again.'
          );
        } else if (msg.toLowerCase().includes('found') || msg.toLowerCase().includes('device')) {
          setError('No microphone found. Please connect a mic and try again.');
        } else {
          setError(`Could not access microphone: ${msg}`);
        }
        return;
      }

      // Mic permission granted — start recognition
      intentionalStopRef.current = false;
      isListeningRef.current = true;
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch {
        // Already running — fine
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
