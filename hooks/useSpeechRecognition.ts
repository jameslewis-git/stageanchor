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
  // Flag to distinguish intentional stop from the API auto-stopping
  const intentionalStopRef = useRef(false);
  const isListeningRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let heard = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        heard += event.results[i][0].transcript;
      }
      const cleaned = heard.trim();
      if (cleaned) {
        setTranscript(cleaned);
        console.log('[StageAnchor] Heard:', cleaned);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access denied. Please allow mic access in your browser and reload.');
        setIsListening(false);
        isListeningRef.current = false;
        intentionalStopRef.current = true;
      } else if (event.error === 'no-speech') {
        // Normal — silence detected, will auto-restart via onend
      } else {
        console.warn('[StageAnchor] Speech error:', event.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart unless user intentionally stopped
      if (!intentionalStopRef.current && isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started — ignore
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
    intentionalStopRef.current = false;
    isListeningRef.current = true;
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch {
      // Already running
    }
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
