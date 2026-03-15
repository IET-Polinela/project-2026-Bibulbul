from django.urls import path
from . import views

urlpatterns = [
    path('', views.contacts_page, name='contacts'),
]