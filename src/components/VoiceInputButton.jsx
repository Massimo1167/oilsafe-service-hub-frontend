import React, { useState } from 'react';

function VoiceInputButton({ onTranscript }) {
    const [recording, setRecording] = useState(false);

    const handleClick = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Speech recognition not supported');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'it-IT';
        recognition.interimResults = false;

        recognition.onstart = () => setRecording(true);
        recognition.onerror = () => setRecording(false);
        recognition.onend = () => setRecording(false);
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map((r) => r[0].transcript)
                .join('');
            if (transcript && typeof onTranscript === 'function') {
                onTranscript(transcript);
            }
        };

        recognition.start();
    };

    return (
        <button type="button" onClick={handleClick} className="voice-input-button">
            {recording ? '🎤…' : '🎤'}
        </button>
    );
}

export default VoiceInputButton;
