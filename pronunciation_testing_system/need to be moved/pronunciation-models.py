# tests/models.py
from django.db import models
from django.conf import settings

class PronunciationText(models.Model):
    """Model to store text prompts for pronunciation tests"""
    text = models.TextField()
    difficulty_level = models.CharField(max_length=20, choices=[
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced')
    ])
    category = models.CharField(max_length=50, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.text[:30]}... ({self.difficulty_level})"

class PronunciationAttempt(models.Model):
    """Model to store user's pronunciation attempts"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='pronunciation_attempts',
        null=True, blank=True  # Allow for guest users
    )
    pronunciation_text = models.ForeignKey(
        PronunciationText, 
        on_delete=models.CASCADE,
        related_name='attempts'
    )
    audio_file = models.FileField(upload_to='pronunciation_attempts/')
    transcribed_text = models.TextField(blank=True)
    correctness_score = models.FloatField(null=True, blank=True)
    fluency_score = models.FloatField(null=True, blank=True)
    clarity_score = models.FloatField(null=True, blank=True)
    overall_score = models.FloatField(null=True, blank=True)
    detailed_feedback = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    guest_session_id = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        user_str = self.user.username if self.user else f"Guest ({self.guest_session_id})"
        return f"Attempt by {user_str} - Score: {self.overall_score or 'N/A'}"

    class Meta:
        ordering = ['-created_at']

class MispronunciationFeedback(models.Model):
    """Model to store detailed feedback for mispronounced words"""
    attempt = models.ForeignKey(
        PronunciationAttempt,
        on_delete=models.CASCADE,
        related_name='mispronunciation_feedback'
    )
    word = models.CharField(max_length=100)
    expected_pronunciation = models.CharField(max_length=100)
    actual_pronunciation = models.CharField(max_length=100, blank=True)
    confidence_score = models.FloatField()
    start_time = models.FloatField(null=True, blank=True)  # in seconds
    end_time = models.FloatField(null=True, blank=True)    # in seconds
    
    def __str__(self):
        return f"Feedback for '{self.word}' in attempt {self.attempt.id}"
