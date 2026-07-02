from django.urls import reverse_lazy
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView, TemplateView
from django.views import View
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Q

from .models import Report
from .forms import ReportForm


def is_admin_user(user):
    return user.is_authenticated and getattr(user, 'is_admin', False)


def report_has_reporter_field():
    return any(field.name == 'reporter' for field in Report._meta.get_fields())


def can_view_report(user, report):
    """
    Aturan lihat laporan:
    - Laporan selain DRAFT boleh dilihat.
    - Admin tidak boleh melihat DRAFT.
    - Jika model punya field reporter, citizen hanya boleh melihat DRAFT miliknya sendiri.
    """
    if report.status != 'DRAFT':
        return True

    if not user.is_authenticated:
        return False

    if is_admin_user(user):
        return False

    if report_has_reporter_field():
        return getattr(report, 'reporter_id', None) == user.id

    return True


class AdminOnlyStatusMixin:
    """
    Admin hanya boleh masuk ke fitur ubah status.
    """
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.error(request, 'Silakan login terlebih dahulu.')
            return redirect('login')

        if not is_admin_user(request.user):
            messages.error(request, 'Akses ditolak: hanya admin yang dapat mengubah status laporan.')
            return redirect('report_list')

        return super().dispatch(request, *args, **kwargs)


class NonAdminReportModifyMixin:
    """
    Admin tidak boleh tambah/edit/hapus laporan.
    Admin hanya boleh mengubah status.
    Citizen hanya boleh edit/hapus laporan DRAFT.
    Jika ada field reporter, citizen hanya boleh edit/hapus laporan miliknya sendiri.
    """
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.error(request, 'Silakan login terlebih dahulu.')
            return redirect('login')

        if is_admin_user(request.user):
            messages.error(request, 'Admin hanya boleh mengubah status laporan.')
            return redirect('report_list')

        return super().dispatch(request, *args, **kwargs)


class DraftOwnerModifyMixin:
    """
    Proteksi untuk edit/hapus.
    Hanya laporan DRAFT yang boleh diedit/dihapus.
    Jika ada field reporter, hanya pemilik laporan yang boleh edit/hapus.
    """
    def dispatch(self, request, *args, **kwargs):
        report = self.get_object()

        if report.status != 'DRAFT':
            messages.error(request, 'Laporan yang sudah diajukan tidak dapat diedit atau dihapus.')
            return redirect('report_list')

        if report_has_reporter_field() and getattr(report, 'reporter_id', None) != request.user.id:
            messages.error(request, 'Anda hanya dapat mengedit atau menghapus laporan milik sendiri.')
            return redirect('report_list')

        return super().dispatch(request, *args, **kwargs)


class HomeView(TemplateView):
    template_name = 'main_app/home.html'


class AboutView(TemplateView):
    template_name = 'main_app/about.html'


class ContactsView(TemplateView):
    template_name = 'main_app/contacts.html'


class ReportListView(ListView):
    model = Report
    template_name = 'main_app/report_list.html'
    context_object_name = 'reports'

    def get_queryset(self):
        reports = Report.objects.all().order_by('-id')

        # Admin tidak boleh melihat laporan DRAFT
        if is_admin_user(self.request.user):
            return reports.exclude(status='DRAFT')

        # Guest juga tidak perlu melihat DRAFT
        if not self.request.user.is_authenticated:
            return reports.exclude(status='DRAFT')

        # Jika ada reporter, citizen melihat non-DRAFT + DRAFT miliknya sendiri
        if report_has_reporter_field():
            return reports.filter(
                Q(status__in=['REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED']) |
                Q(reporter=self.request.user)
            ).distinct()

        return reports


class ReportDetailView(DetailView):
    model = Report
    template_name = 'main_app/report_detail.html'
    context_object_name = 'report'

    def dispatch(self, request, *args, **kwargs):
        report = self.get_object()

        if not can_view_report(request.user, report):
            messages.error(request, 'Anda tidak memiliki akses untuk melihat laporan ini.')
            return redirect('report_list')

        return super().dispatch(request, *args, **kwargs)


class ReportCreateView(NonAdminReportModifyMixin, CreateView):
    model = Report
    form_class = ReportForm
    template_name = 'main_app/report_form.html'
    success_url = reverse_lazy('report_list')

    def form_valid(self, form):
        if report_has_reporter_field():
            form.instance.reporter = self.request.user

        messages.success(self.request, 'Laporan berhasil dibuat.')
        return super().form_valid(form)


class ReportUpdateView(NonAdminReportModifyMixin, DraftOwnerModifyMixin, UpdateView):
    model = Report
    form_class = ReportForm
    template_name = 'main_app/report_form.html'
    success_url = reverse_lazy('report_list')

    def form_valid(self, form):
        messages.success(self.request, 'Laporan berhasil diperbarui.')
        return super().form_valid(form)


class ReportDeleteView(NonAdminReportModifyMixin, DraftOwnerModifyMixin, DeleteView):
    model = Report
    template_name = 'main_app/report_confirm_delete.html'
    success_url = reverse_lazy('report_list')

    def form_valid(self, form):
        messages.success(self.request, 'Laporan berhasil dihapus.')
        return super().form_valid(form)


class ReportUpdateStatusView(AdminOnlyStatusMixin, View):
    def get(self, request, pk):
        report = get_object_or_404(Report, pk=pk)

        if report.status == 'DRAFT':
            messages.error(request, 'Admin tidak boleh melihat atau mengubah laporan DRAFT.')
            return redirect('report_list')

        new_status = request.GET.get('status')

        allowed_transitions = {
            'REPORTED': 'VERIFIED',
            'VERIFIED': 'IN_PROGRESS',
            'IN_PROGRESS': 'RESOLVED',
        }

        if report.status not in allowed_transitions or allowed_transitions[report.status] != new_status:
            messages.error(request, 'Perubahan status tidak valid.')
            return redirect('report_list')

        context = {
            'report': report,
            'new_status': new_status,
        }

        return render(request, 'main_app/report_confirm_status.html', context)

    def post(self, request, pk):
        report = get_object_or_404(Report, pk=pk)

        if report.status == 'DRAFT':
            messages.error(request, 'Admin tidak boleh mengubah laporan DRAFT.')
            return redirect('report_list')

        new_status = request.POST.get('status')

        allowed_transitions = {
            'REPORTED': 'VERIFIED',
            'VERIFIED': 'IN_PROGRESS',
            'IN_PROGRESS': 'RESOLVED',
        }

        if report.status in allowed_transitions and allowed_transitions[report.status] == new_status:
            report.status = new_status
            report.save()
            messages.success(request, f'Status laporan berhasil diubah ke {new_status}.')
        else:
            messages.error(request, 'Perubahan status tidak valid.')

        return redirect('report_list')


class ReportSearchJsonView(View):
    def get(self, request, *args, **kwargs):
        keyword = request.GET.get('q', '')

        reports = Report.objects.all()

        # Admin tidak boleh melihat DRAFT, termasuk lewat search JSON
        if is_admin_user(request.user):
            reports = reports.exclude(status='DRAFT')

        # Guest tidak melihat DRAFT
        elif not request.user.is_authenticated:
            reports = reports.exclude(status='DRAFT')

        # Citizen melihat non-DRAFT + DRAFT miliknya sendiri jika ada field reporter
        elif report_has_reporter_field():
            reports = reports.filter(
                Q(status__in=['REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED']) |
                Q(reporter=request.user)
            ).distinct()

        if keyword:
            reports = reports.filter(
                Q(title__icontains=keyword) |
                Q(category__icontains=keyword) |
                Q(location__icontains=keyword) |
                Q(status__icontains=keyword)
            )

        reports = reports.order_by('-id')[:50]

        data = {
            'reports': [
                {
                    'id': report.id,
                    'title': report.title,
                    'category': report.category,
                    'location': report.location,
                    'status': report.status,
                }
                for report in reports
            ]
        }

        return JsonResponse(data)


class ReportDetailJsonView(View):
    def get(self, request, pk, *args, **kwargs):
        report = get_object_or_404(Report, pk=pk)

        # Admin tidak boleh melihat detail laporan DRAFT
        if not can_view_report(request.user, report):
            return JsonResponse(
                {'error': 'Anda tidak memiliki akses untuk melihat laporan ini.'},
                status=403
            )

        data = {
            'id': report.id,
            'title': report.title,
            'category': report.category,
            'description': report.description,
            'location': report.location,
            'status': report.status,
        }

        return JsonResponse(data)
