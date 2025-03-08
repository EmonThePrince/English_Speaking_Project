from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    # Additional fields for tracking user progress
    pronunciation_score = models.FloatField(default=0.0)
    attempts = models.IntegerField(default=0)

    def __str__(self):
        return self.username
