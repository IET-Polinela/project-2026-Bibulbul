from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from main_app.models import Report

# ─────────────────────────────────────────────────────────────────────────────
# PENJELASAN: get_user_model()
# ─────────────────────────────────────────────────────────────────────────────
# Django mendukung custom user model melalui setting AUTH_USER_MODEL.
# Pada proyek ini, user model kustom didefinisikan di usermanagement.User.
# Menggunakan get_user_model() memastikan kita selalu mereferensikan model
# user yang benar, bukan django.contrib.auth.models.User bawaan.
# ─────────────────────────────────────────────────────────────────────────────
User = get_user_model()

# =============================================================================
# ADDITIONAL TESTS FOR 100% STATEMENT COVERAGE
# =============================================================================

class SerializerAndModelCoverageTests(APITestCase):
    """
    Kelas pengujian tambahan untuk menaikkan coverage model dan serializer.
    """
    def setUp(self):
        self.warga = User.objects.create_user(
            username='warga_str_test',
            password='Password123!',
            is_admin=False
        )

    def test_report_model_str(self):
        """
        Menguji str(report) agar memanggil __str__ dan mengembalikan judul laporan.
        """
        report = Report.objects.create(
            title='Laporan Str Uji',
            category='Lainnya',
            description='Deskripsi',
            location='Lokasi',
            status='REPORTED',
            reporter=self.warga
        )
        self.assertEqual(str(report), 'Laporan Str Uji')

    def test_report_serializer_no_request_context(self):
        """
        Menguji serializer tanpa menyertakan request dalam context,
        sehingga is_owner mengembalikan False.
        """
        from main_app.serializers import ReportSerializer
        report = Report.objects.create(
            title='Laporan Serializer Uji',
            category='Lainnya',
            description='Deskripsi',
            location='Lokasi',
            status='REPORTED',
            reporter=self.warga
        )
        serializer = ReportSerializer(report, context={})
        self.assertFalse(serializer.data['is_owner'])
        self.assertEqual(serializer.data['reporter_name'], 'Warga Anonim')


class MainAppMonolithicViewsCoverageTests(TestCase):
    """
    Menguji view monolitik di main_app/views.py untuk mencakup semua alur
    dispatch, GET, POST, validasi form, dan API detail/pencarian non-DRF.

    CATATAN PENTING (disesuaikan dengan desain proyek ini):
    Berbeda dari template awal, pada proyek ini:
      - Citizen (warga) yang boleh membuat & mengedit/menghapus laporan DRAFT
        miliknya sendiri (lihat NonAdminReportModifyMixin & DraftOwnerModifyMixin).
      - Admin TIDAK boleh create/update/delete laporan biasa — admin hanya
        boleh mengubah status melalui ReportUpdateStatusView.
    """
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_mono',
            password='Password123!',
            is_admin=True,
            is_staff=True
        )
        self.citizen = User.objects.create_user(
            username='citizen_mono',
            password='Password123!',
            is_admin=False,
            is_staff=False
        )
        self.report = Report.objects.create(
            title='Laporan Monolitik Uji',
            category='Infrastruktur',
            description='Ada kerusakan infrastruktur.',
            location='Bandung',
            status='REPORTED',
            reporter=self.citizen
        )
        # Laporan DRAFT milik citizen, dipakai untuk uji edit/hapus
        self.report_draft = Report.objects.create(
            title='Draf Laporan Uji',
            category='Infrastruktur',
            description='Draf belum diajukan.',
            location='Bandung',
            status='DRAFT',
            reporter=self.citizen
        )

    def test_report_search_unauthenticated(self):
        # Guest tetap boleh search, tapi hasil otomatis tidak menyertakan DRAFT
        response = self.client.get(reverse('report_search_json') + '?q=Lampu')
        self.assertEqual(response.status_code, 200)

    def test_report_search_citizen(self):
        self.client.login(username='citizen_mono', password='Password123!')
        response = self.client.get(reverse('report_search_json') + '?q=Monolitik')
        self.assertEqual(response.status_code, 200)

    def test_report_search_admin(self):
        self.client.login(username='admin_mono', password='Password123!')
        response = self.client.get(reverse('report_search_json') + '?q=Monolitik')
        self.assertEqual(response.status_code, 200)

    def test_home_view(self):
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'main_app/home.html')

    def test_report_list_view_unauthenticated(self):
        # ReportListView tidak menggunakan login_required, guest tetap bisa
        # melihat daftar laporan non-DRAFT.
        response = self.client.get(reverse('report_list'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'main_app/report_list.html')

    def test_report_list_view_citizen(self):
        self.client.login(username='citizen_mono', password='Password123!')
        response = self.client.get(reverse('report_list'))
        self.assertEqual(response.status_code, 200)

    def test_report_list_view_admin(self):
        self.client.login(username='admin_mono', password='Password123!')
        response = self.client.get(reverse('report_list'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'main_app/report_list.html')

    def test_report_create_view_unauthenticated(self):
        response = self.client.get(reverse('report_create'))
        self.assertEqual(response.status_code, 302)

    def test_report_create_view_citizen_get(self):
        self.client.login(username='citizen_mono', password='Password123!')
        response = self.client.get(reverse('report_create'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'main_app/report_form.html')

    def test_report_create_view_admin(self):
        # Admin DILARANG membuat laporan baru -> di-redirect
        self.client.login(username='admin_mono', password='Password123!')
        response = self.client.get(reverse('report_create'))
        self.assertEqual(response.status_code, 302)

    def test_report_create_view_citizen_post_valid(self):
        self.client.login(username='citizen_mono', password='Password123!')
        payload = {
            'title': 'Laporan Form Baru',
            'category': 'Infrastruktur',
            'description': 'Deskripsi baru.',
            'location': 'Jakarta',
        }
        response = self.client.post(reverse('report_create'), payload)
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))
        laporan = Report.objects.get(title='Laporan Form Baru')
        self.assertEqual(laporan.reporter, self.citizen)

    def test_report_detail_view_unauthenticated(self):
        # Laporan non-DRAFT boleh dilihat siapa saja (can_view_report)
        response = self.client.get(reverse('report_detail', kwargs={'pk': self.report.id}))
        self.assertEqual(response.status_code, 200)

    def test_report_detail_view_citizen(self):
        self.client.login(username='citizen_mono', password='Password123!')
        response = self.client.get(reverse('report_detail', kwargs={'pk': self.report.id}))
        self.assertEqual(response.status_code, 200)

    def test_report_detail_view_admin_draft_blocked(self):
        # Admin TIDAK boleh melihat laporan DRAFT orang lain
        self.client.login(username='admin_mono', password='Password123!')
        response = self.client.get(reverse('report_detail', kwargs={'pk': self.report_draft.id}))
        self.assertEqual(response.status_code, 302)

    def test_report_update_view_unauthenticated(self):
        response = self.client.get(reverse('report_update', kwargs={'pk': self.report_draft.id}))
        self.assertEqual(response.status_code, 302)

    def test_report_update_view_citizen_draft_owner(self):
        # Citizen boleh edit draft miliknya sendiri
        self.client.login(username='citizen_mono', password='Password123!')
        response = self.client.get(reverse('report_update', kwargs={'pk': self.report_draft.id}))
        self.assertEqual(response.status_code, 200)

    def test_report_update_view_citizen_non_draft_blocked(self):
        # Citizen TIDAK boleh edit laporan yang sudah REPORTED
        self.client.login(username='citizen_mono', password='Password123!')
        response = self.client.get(reverse('report_update', kwargs={'pk': self.report.id}))
        self.assertEqual(response.status_code, 302)

    def test_report_update_view_admin_blocked(self):
        # Admin TIDAK boleh edit laporan sama sekali
        self.client.login(username='admin_mono', password='Password123!')
        response = self.client.get(reverse('report_update', kwargs={'pk': self.report_draft.id}))
        self.assertEqual(response.status_code, 302)

    def test_report_update_view_citizen_post_valid(self):
        self.client.login(username='citizen_mono', password='Password123!')
        payload = {
            'title': 'Draf Sudah Diupdate',
            'category': 'Infrastruktur',
            'description': 'Deskripsi terupdate.',
            'location': 'Jakarta',
        }
        response = self.client.post(reverse('report_update', kwargs={'pk': self.report_draft.id}), payload)
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))
        self.report_draft.refresh_from_db()
        self.assertEqual(self.report_draft.title, 'Draf Sudah Diupdate')

    def test_report_delete_view_unauthenticated(self):
        response = self.client.get(reverse('report_delete', kwargs={'pk': self.report_draft.id}))
        self.assertEqual(response.status_code, 302)

    def test_report_delete_view_citizen_draft_owner(self):
        self.client.login(username='citizen_mono', password='Password123!')
        response = self.client.get(reverse('report_delete', kwargs={'pk': self.report_draft.id}))
        self.assertEqual(response.status_code, 200)

    def test_report_delete_view_admin_blocked(self):
        self.client.login(username='admin_mono', password='Password123!')
        response = self.client.get(reverse('report_delete', kwargs={'pk': self.report_draft.id}))
        self.assertEqual(response.status_code, 302)

    def test_report_delete_view_citizen_post(self):
        self.client.login(username='citizen_mono', password='Password123!')
        response = self.client.post(reverse('report_delete', kwargs={'pk': self.report_draft.id}))
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))
        self.assertFalse(Report.objects.filter(id=self.report_draft.id).exists())

    def test_report_delete_view_direct_delete_method(self):
        from main_app.views import ReportDeleteView
        from django.test import RequestFactory
        from django.contrib.messages.storage.fallback import FallbackStorage

        factory = RequestFactory()
        request = factory.post(reverse('report_delete', kwargs={'pk': self.report_draft.id}))
        request.user = self.citizen

        # Setup session & messages middleware mocks
        setattr(request, 'session', {})
        messages_storage = FallbackStorage(request)
        setattr(request, '_messages', messages_storage)

        view = ReportDeleteView()
        view.setup(request, pk=self.report_draft.id)
        view.object = view.get_object()

        response = view.delete(request)
        self.assertEqual(response.status_code, 302)

    def test_report_update_status_view_unauthenticated(self):
        response = self.client.post(reverse('report_update_status', kwargs={'pk': self.report.id}), {'status': 'VERIFIED'})
        self.assertEqual(response.status_code, 302)

    def test_report_update_status_view_citizen_blocked(self):
        # Citizen tidak boleh mengubah status — hanya admin
        self.client.login(username='citizen_mono', password='Password123!')
        response = self.client.post(reverse('report_update_status', kwargs={'pk': self.report.id}), {'status': 'VERIFIED'})
        self.assertEqual(response.status_code, 302)
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, 'REPORTED')
