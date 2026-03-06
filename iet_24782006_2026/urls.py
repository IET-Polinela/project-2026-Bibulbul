from django.contrib import admin
from django.urls import path
from django.http import HttpResponse

def welcome(request):
    return HttpResponse("Selamat Datang")

urlpatterns = [
    path('admin/', admin.site.urls),
]