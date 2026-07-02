from django.views.generic import TemplateView, View
from django.http import JsonResponse
from django.db.models import Count
from django.shortcuts import redirect
from django.contrib import messages
from main_app.models import Report


class AdminDashboardAccessMixin:
    """
    Hanya admin (is_admin=True) yang boleh mengakses Dashboard.
    Warga biasa atau pengguna yang belum login akan di-redirect.
    """
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.error(request, 'Silakan login terlebih dahulu.')
            return redirect('login')

        if not getattr(request.user, 'is_admin', False):
            messages.error(request, 'Akses ditolak: hanya admin yang dapat mengakses dashboard.')
            return redirect('home')

        return super().dispatch(request, *args, **kwargs)


class DashboardView(AdminDashboardAccessMixin, TemplateView):
    template_name = 'dashboard_24782006/dashboard.html'


class DashboardDataView(AdminDashboardAccessMixin, View):
    def get(self, request, *args, **kwargs):
        status_data = (
            Report.objects
            .values('status')
            .annotate(total=Count('id'))
            .order_by('status')
        )

        category_data = (
            Report.objects
            .values('category')
            .annotate(total=Count('id'))
            .order_by('category')
        )

        latest_reported = (
            Report.objects
            .filter(status='REPORTED')
            .order_by('-id')[:5]
        )

        latest_resolved = (
            Report.objects
            .filter(status='RESOLVED')
            .order_by('-id')[:5]
        )

        data = {
            'status_labels': [item['status'] for item in status_data],
            'status_values': [item['total'] for item in status_data],

            'category_labels': [item['category'] for item in category_data],
            'category_values': [item['total'] for item in category_data],

            'latest_reported': [
                {
                    'id': report.id,
                    'title': report.title,
                    'category': report.category,
                    'location': report.location,
                    'status': report.status,
                }
                for report in latest_reported
            ],

            'latest_resolved': [
                {
                    'id': report.id,
                    'title': report.title,
                    'category': report.category,
                    'location': report.location,
                    'status': report.status,
                }
                for report in latest_resolved
            ],
        }

        return JsonResponse(data)
