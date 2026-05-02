from django.urls import path
from .views import DashboardView, DashboardDataView

app_name = 'dashboard_24782006'

urlpatterns = [
    path('', DashboardView.as_view(), name='dashboard'),
    path('data/', DashboardDataView.as_view(), name='dashboard_data'),
]