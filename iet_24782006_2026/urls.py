from django.contrib import admin
from django.urls import path, include


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('main_app.urls')),
    path('', include('usermanagement_24782006.urls')),
    path('dashboard/', include('dashboard_24782006.urls')),
    path('about/', include('about.urls')),
    path('contacts/', include('contacts.urls')),
]