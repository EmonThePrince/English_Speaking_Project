# tests/services/speech_processing.py
import os
import requests
import json
import logging
from django.conf import settings
from ..models import PronunciationAttempt, MispronunciationFeedback

logger = logging.getLogger(__name__)

class ElevenLabsClient:
    """
    Client for interacting with the ElevenLabs API
    """
    BASE_URL = "https://api.elevenlabs.io/v1"
    
    def __init__(self, api_key=None):
        self.api_key = api_key or settings.ELEVENLABS_API_KEY
        self.headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json"
        }
    
    def transcribe_audio(self, audio_file_path):
        """
        Send audio file to ElevenLabs for transcription
        """
        url = f"{self.BASE_URL}/speech-to-text"
        
        with open(audio_file_path, 'rb') as audio_file:
            files = {'audio': audio_file}
            headers = {"xi-api-key": self.api_key}
            
            response = requests.post(url, headers=headers, files=files)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"ElevenLabs API error: {response.status_code} - {response.text}")
                raise Exception(f"ElevenLabs API error: {response.status_code}")
    
    def generate_pronunciation(self, text, voice_id="21m00Tcm4TlvDq8ikWAM"):
        """
        Generate correct pronunciation of text using ElevenLabs text-to-speech
        """
        url = f"{self.BASE_URL}/text-to-speech/{voice_id}"
        
        payload = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.75,
                "similarity_boost": 0.75
            }
        }
        
        response = requests.post(url, json=payload, headers=self.headers)
        
        if response.status_code == 200:
            return response.content  # Return audio bytes
        else:
            logger.error(f"ElevenLabs TTS API error: {response.status_code} - {response.text}")
            raise Exception(f"ElevenLabs TTS API error: {response.status_code}")


def analyze_pronunciation(expected_text, transcribed_text):
    """
    Compare expected text with transcribed text to analyze pronunciation
    
    Returns:
    - correctness_score: How well the words match (0-100)
    - fluency_score: Estimate of speech fluency (0-100)
    - clarity_score: Estimate of pronunciation clarity (0-100)
    - overall_score: Combined score (0-100)
    - mispronounced_words: List of mispronounced words with details
    """
    # Preprocess texts
    expected_words = expected_text.lower().split()
    transcribed_words = transcribed_text.lower().split()
    
    # Calculate word match accuracy (Correctness)
    from difflib import SequenceMatcher
    
    def similar(a, b):
        return SequenceMatcher(None, a, b).ratio()
    
    word_scores = []
    mispronounced_words = []
    
    # For each expected word, find the best match in transcribed words
    for i, expected in enumerate(expected_words):
        best_match = None
        best_score = 0
        best_index = -1
        
        # Look for the word in a window around the expected position
        window_size = 3
        start = max(0, i - window_size)
        end = min(len(transcribed_words), i + window_size + 1)
        
        for j in range(start, end):
            if j < len(transcribed_words):
                transcribed = transcribed_words[j]
                score = similar(expected, transcribed)
                
                if score > best_score:
                    best_score = score
                    best_match = transcribed
                    best_index = j
        
        word_scores.append(best_score)
        
        # Identify mispronounced words (similarity below threshold)
        if best_score < 0.8:  # 80% similarity threshold
            mispronounced_words.append({
                'word': expected,
                'expected_pronunciation': expected,
                'actual_pronunciation': best_match if best_match else '',
                'confidence_score': best_score,
                'position': i
            })
    
    # Calculate scores
    correctness_score = sum(word_scores) / len(word_scores) * 100 if word_scores else 0
    
    # Fluency calculation (based on length difference)
    len_ratio = min(len(transcribed_words), len(expected_words)) / max(len(transcribed_words), len(expected_words))
    fluency_score = len_ratio * 100
    
    # Clarity score (inverse of mispronounced word percentage)
    clarity_score = (1 - (len(mispronounced_words) / len(expected_words))) * 100
    
    # Overall score (weighted average)
    overall_score = (correctness_score * 0.5) + (fluency_score * 0.25) + (clarity_score * 0.25)
    
    return {
        'correctness_score': correctness_score,
        'fluency_score': fluency_score,
        'clarity_score': clarity_score,
        'overall_score': overall_score,
        'mispronounced_words': mispronounced_words,
        'detailed_analysis': {
            'expected_words': len(expected_words),
            'transcribed_words': len(transcribed_words),
            'word_scores': word_scores
        }
    }

def process_pronunciation_attempt(attempt):
    """
    Process a pronunciation attempt using ElevenLabs API
    """
    try:
        client = ElevenLabsClient()
        
        # Get the file path from the FileField
        audio_path = attempt.audio_file.path
        
        # Step 1: Transcribe the audio
        transcription_result = client.transcribe_audio(audio_path)
        transcribed_text = transcription_result.get('text', '')
        
        # Step 2: Compare with expected text
        expected_text = attempt.pronunciation_text.text
        analysis_result = analyze_pronunciation(expected_text, transcribed_text)
        
        # Step 3: Update the attempt with results
        attempt.transcribed_text = transcribed_text
        attempt.correctness_score = analysis_result['correctness_score']
        attempt.fluency_score = analysis_result['fluency_score']
        attempt.clarity_score = analysis_result['clarity_score']
        attempt.overall_score = analysis_result['overall_score']
        attempt.detailed_feedback = analysis_result
        attempt.save()
        
        # Step 4: Create feedback entries for mispronounced words
        for word_data in analysis_result['mispronounced_words']:
            MispronunciationFeedback.objects.create(
                attempt=attempt,
                word=word_data['word'],
                expected_pronunciation=word_data['expected_pronunciation'],
                actual_pronunciation=word_data['actual_pronunciation'],
                confidence_score=word_data['confidence_score']
            )
        
        return True
    
    except Exception as e:
        logger.error(f"Error processing pronunciation attempt: {str(e)}")
        # Update attempt with error
        attempt.detailed_feedback = {"error": str(e)}
        attempt.save()
        return False
