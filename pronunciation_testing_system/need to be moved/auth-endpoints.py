# users/views.py
from django.contrib.auth import authenticate, login, logout
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import CustomUser
from .serializers import UserSerializer

class UserRegistrationView(generics.CreateAPIView):
    """
    API endpoint for user registration
    """
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    
    def perform_create(self, serializer):
        user = serializer.save()
        
        # Hash the password
        user.set_password(self.request.data['password'])
        user.save()

class UserLoginView(APIView):
    """
    API endpoint for user login
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'detail': 'Please provide both username and password.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=username, password=password)
        
        if user:
            login(request, user)
            
            # Return user data
            serializer = UserSerializer(user)
            return Response({
                'user': serializer.data,
                'detail': 'Login successful.'
            })
        
        return Response(
            {'detail': 'Invalid credentials.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

class UserLogoutView(APIView):
    """
    API endpoint for user logout
    """
    def post(self, request):
        logout(request)
        return Response({'detail': 'Logout successful.'})

class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for retrieving and updating user profile
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user

class CurrentUserView(APIView):
    """
    API endpoint to get the current logged-in user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# users/urls.py
from django.urls import path
from .views import (
    UserRegistrationView, 
    UserLoginView, 
    UserLogoutView, 
    UserProfileView,
    CurrentUserView
)

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    path('login/', UserLoginView.as_view(), name='user-login'),
    path('logout/', UserLogoutView.as_view(), name='user-logout'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('current/', CurrentUserView.as_view(), name='current-user'),
]
