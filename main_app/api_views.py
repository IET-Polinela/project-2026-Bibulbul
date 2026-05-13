# main_app/api_views.py
from rest_framework import viewsets, permissions
from .models import Report
from .serializers import ReportSerializer

class ReportViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Report.objects.all()
    serializer_class = ReportSerializer