# tests/serializers.py
from rest_framework import serializers
from .models import PronunciationText, PronunciationAttempt, MispronunciationFeedback

class PronunciationTextSerializer(serializers.ModelSerializer):
    class Meta:
        model = PronunciationText
        fields = ['id', 'text', 'difficulty_level', 'category']

class MispronunciationFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = MispronunciationFeedback
        fields = [
            'id', 'word', 'expected_pronunciation', 'actual_pronunciation',
            'confidence_score', 'start_time', 'end_time'
        ]

class PronunciationAttemptSerializer(serializers.ModelSerializer):
    mispronunciation_feedback = MispronunciationFeedbackSerializer(many=True, read_only=True)
    
    class Meta:
        model = PronunciationAttempt
        fields = [
            'id', 'pronunciation_text', 'audio_file', 'transcribed_text',
            'correctness_score', 'fluency_score', 'clarity_score', 'overall_score',
            'detailed_feedback', 'created_at', 'mispronunciation_feedback'
        ]
        read_only_fields = [
            'transcribed_text', 'correctness_score', 'fluency_score', 
            'clarity_score', 'overall_score', 'detailed_feedback'
        ]

class PronunciationAttemptCreateSerializer(serializers.ModelSerializer):
    pronunciation_text_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = PronunciationAttempt
        fields = ['pronunciation_text_id', 'audio_file', 'guest_session_id']
        
    def create(self, validated_data):
        pronunciation_text_id = validated_data.pop('pronunciation_text_id')
        pronunciation_text = PronunciationText.objects.get(id=pronunciation_text_id)
        
        user = self.context['request'].user
        if user.is_authenticated:
            validated_data['user'] = user
        
        validated_data['pronunciation_text'] = pronunciation_text
        return super().create(validated_data)

class UserStatsSerializer(serializers.Serializer):
    total_attempts = serializers.IntegerField()
    average_score = serializers.FloatField()
    best_score = serializers.FloatField()
    recent_attempts = PronunciationAttemptSerializer(many=True)
    progress_over_time = serializers.DictField()
