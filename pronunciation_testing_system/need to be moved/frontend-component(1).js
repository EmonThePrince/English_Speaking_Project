// PronunciationTest.js
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const PronunciationTest = ({ userId, guestSessionId }) => {
  const [text, setText] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [difficulty, setDifficulty] = useState('beginner');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);
  
  // Fetch a random text when component mounts or difficulty changes
  useEffect(() => {
    fetchRandomText();
  }, [difficulty]);
  
  const fetchRandomText = async () => {
    try {
      const response = await axios.get(`/api/random-text/?difficulty=${difficulty}`);
      setText(response.data);
    } catch (err) {
      setError('Failed to fetch test text. Please try again.');
      console.error(err);
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        audioChunksRef.current = [];
        
        // Create URL for audio playback
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = URL.createObjectURL(audioBlob);
        }
      };
      
      // Start recording
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setError('Failed to access microphone. Please check your permissions.');
      console.error(err);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks on the stream
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };
  
  const submitRecording = async () => {
    if (!audioBlob) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('pronunciation_text_id', text.id);
      formData.append('audio_file', audioBlob, 'recording.wav');
      
      // Add user identification
      if (userId) {
        // User is logged in
      } else if (guestSessionId) {
        formData.append('guest_session_id', guestSessionId);
      }
      
      const response = await axios.post('/api/pronunciation-attempts/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      setResult(response.data);
    } catch (err) {
      setError('Failed to process your pronunciation. Please try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const renderFeedback = () => {
    if (!result) return null;
    
    const { correctness_score, fluency_score, clarity_score, overall_score, detailed_feedback } = result;
    const mispronounced = detailed_feedback?.mispronounced_words || [];
    
    return (
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-xl font-bold mb-2">Your Results</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="p-2 bg-white rounded shadow text-center">
            <div className="text-sm text-gray-600">Overall</div>
            <div className="text-2xl font-bold">{Math.round(overall_score)}%</div>
          </div>
          <div className="p-2 bg-white rounded shadow text-center">
            <div className="text-sm text-gray-600">Correctness</div>
            <div className="text-2xl font-bold">{Math.round(correctness_score)}%</div>
          </div>
          <div className="p-2 bg-white rounded shadow text-center">
            <div className="text-sm text-gray-600">Fluency</div>
            <div className="text-2xl font-bold">{Math.round(fluency_score)}%</div>
          </div>
          <div className="p-2 bg-white rounded shadow text-center">
            <div className="text-sm text-gray-600">Clarity</div>
            <div className="text-2xl font-bold">{Math.round(clarity_score)}%</div>
          </div>
        </div>
        
        {mispronounced.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Mispronounced Words:</h4>
            <ul className="list-disc pl-5">
              {mispronounced.map((word, index) => (
                <li key={index} className="mb-1">
                  <span className="font-medium text-red-600">{word.word}</span>
                  {word.actual_pronunciation && (
                    <span className="text-gray-600"> (you said: "{word.actual_pronunciation}")</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Your Recording:</h4>
          <audio ref={audioPlayerRef} controls className="w-full" />
        </div>
        
        <button 
          onClick={fetchRandomText}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
          Try Another Text
        </button>
      </div>
    );
  };
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Pronunciation Test</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Difficulty Level:
        </label>
        <select 
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="p-2 border rounded w-full"
          disabled={isRecording || isProcessing}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
      
      {text ? (
        <div className="mb-6 p-4 bg-white border rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Read the following text:</h3>
          <p className="text-xl leading-relaxed">{text.text}</p>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg text-center">
          Loading text...
        </div>
      )}
      
      <div className="flex items-center justify-center space-x-4 mb-6">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={!text || isProcessing}
            className="px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-gray-700 text-white rounded-full hover:bg-gray-800 transition flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            Stop Recording
          </button>
        )}
        
        {audioBlob && !isRecording && (
          <button
            onClick={submitRecording}
            disabled={isProcessing}
            className="px-6 py-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition flex items-center"
          >
            {isProcessing ? (
              <span>Processing...</span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
                Submit Recording
              </>
            )}
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {renderFeedback()}
    </div>
  );
};

export default PronunciationTest;
