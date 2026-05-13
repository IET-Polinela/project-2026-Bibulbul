# main_app/api_urls.py
from rest_framework.routers import DefaultRouter
from .api_views import ReportViewSet

router = DefaultRouter()
router.register(r'report', ReportViewSet, basename='report')

urlpatterns = router.urls