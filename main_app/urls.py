from django.urls import path
from .views import (
    ReportListView,
    ReportDetailView,
    ReportCreateView,
    ReportUpdateView,
    ReportDeleteView,
    ReportUpdateStatusView,
)

urlpatterns = [
    path('', ReportListView.as_view(), name='report_list'),
    path('create/', ReportCreateView.as_view(), name='report_create'),
    path('<int:pk>/', ReportDetailView.as_view(), name='report_detail'),
    path('<int:pk>/edit/', ReportUpdateView.as_view(), name='report_update'),
    path('<int:pk>/delete/', ReportDeleteView.as_view(), name='report_delete'),
    path('<int:pk>/update-status/', ReportUpdateStatusView.as_view(), name='report_update_status'),
]