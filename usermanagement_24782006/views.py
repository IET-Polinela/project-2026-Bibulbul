from django.contrib import messages
from django.contrib.auth.views import LoginView, LogoutView
from django.urls import reverse_lazy
from django.views.generic import CreateView
from .forms import CustomUserCreationForm, CustomAuthenticationForm

class CustomLoginView(LoginView):
    template_name = 'usermanagement_24782006/login.html'
    authentication_form = CustomAuthenticationForm

    def form_valid(self, form):
        messages.success(self.request, 'Berhasil login.')
        return super().form_valid(form)


class CustomLogoutView(LogoutView):
    next_page = reverse_lazy('home')

    def dispatch(self, request, *args, **kwargs):
        messages.success(request, 'Berhasil logout.')
        return super().dispatch(request, *args, **kwargs)


class RegisterView(CreateView):
    form_class = CustomUserCreationForm
    template_name = 'usermanagement_24782006/register.html'
    success_url = reverse_lazy('login')

    def form_valid(self, form):
        messages.success(self.request, 'Registrasi berhasil. Silakan login.')
        return super().form_valid(form)