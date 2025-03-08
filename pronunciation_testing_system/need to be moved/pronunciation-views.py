# tests/views.py
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Max, Count
from rest_framework import viewsets, generics, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import PronunciationText, PronunciationAttempt, MispronunciationFeedback
from .serializers import (
    PronunciationTextSerializer, 
    PronunciationAttemptSerializer,
    PronunciationAttemptCreateSerializer,
    UserStatsSerializer
)
from .services.speech_processing import process_pronunciation_attempt

class IsAuthenticatedOrGuest(permissions.BasePermission):
    """
    Custom permission to allow authenticated users or guests with a session ID
    """
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated or
            request.data.get('guest_session_id')
        )

class PronunciationTextViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for accessing pronunciation test texts
    """
    queryset = PronunciationText.objects.filter(active=True)
    serializer_class = PronunciationTextSerializer
    filterset_fields = ['difficulty_level', 'category']

class PronunciationAttemptViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing pronunciation attempts
    """
    permission_classes = [IsAuthenticatedOrGuest]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return PronunciationAttempt.objects.filter(user=user)
        
        guest_session_id = self.request.query_params.get('guest_session_id')
        if guest_session_id:
            return PronunciationAttempt.objects.filter(guest_session_id=guest_session_id)
        
        return PronunciationAttempt.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PronunciationAttemptCreateSerializer
        return PronunciationAttemptSerializer
    
    def perform_create(self, serializer):
        attempt = serializer.save()
        # Process the pronunciation attempt using ElevenLabs API
        process_pronunciation_attempt(attempt)
        
    @action(detail=False, methods=['get'])
    def user_stats(self, request):
        """
        Endpoint to get user's pronunciation statistics
        """
        queryset = self.get_queryset()
        
        # Calculate stats
        stats = {
            'total_attempts': queryset.count(),
            'average_score': queryset.aggregate(Avg('overall_score'))['overall_score__avg'] or 0,
            'best_score': queryset.aggregate(Max('overall_score'))['overall_score__max'] or 0,
            'recent_attempts': queryset.order_by('-created_at')[:5],
            'progress_over_time': self._get_progress_over_time(queryset)
        }
        
        serializer = UserStatsSerializer(stats)
        return Response(serializer.data)
    
    def _get_progress_over_time(self, queryset):
        """
        Calculate progress over time for visualization
        """
        # Group by date and calculate average scores
        from django.db.models.functions import TruncDate
        
        progress_data = (
            queryset
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(
                avg_score=Avg('overall_score'),
                attempts_count=Count('id')
            )
            .order_by('date')
        )
        
        return {
            str(item['date']): {
                'avg_score': item['avg_score'],
                'attempts_count': item['attempts_count']
            }
            for item in progress_data
        }


class RandomPronunciationTextView(generics.RetrieveAPIView):
    """
    API endpoint to get a random pronunciation text based on difficulty level
    """
    serializer_class = PronunciationTextSerializer
    
    def get_object(self):
        difficulty = self.request.query_params.get('difficulty', 'beginner')
        category = self.request.query_params.get('category')
        
        queryset = PronunciationText.objects.filter(
            active=True, 
            difficulty_level=difficulty
        )
        
        if category:
            queryset = queryset.filter(category=category)
            
        # Get a random text
        return queryset.order_by('?').first()
