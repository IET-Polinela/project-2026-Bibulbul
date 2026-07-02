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
# MODUL 2: PENGUJIAN VISIBILITAS DATA & PRIVASI PELAPOR
# =============================================================================
# Fokus: Memastikan identitas pelapor disamarkan (anonimitas) di feed publik,
# namun tetap terlihat oleh pemilik laporan. Juga memastikan draf milik
# pengguna lain tidak bisa diakses atau dimodifikasi.
#
# KONSEP KUNCI:
#   - Serializer DRF menggunakan SerializerMethodField untuk menentukan
#     apakah nama pelapor ditampilkan atau disamarkan.
#   - Field `reporter` selalu mengembalikan "Warga Anonim" (hardcoded).
#   - Field `reporter_name` mengembalikan username asli HANYA jika request
#     user adalah pemilik laporan tersebut.
# =============================================================================

class PrivacyAndDataHidingTests(APITestCase):
    """
    Kelas pengujian untuk modul Visibilitas Data & Privasi Pelapor.

    Menguji mekanisme penyamaran identitas (anonimisasi) dan isolasi data
    draf antar pengguna yang berbeda.
    """

    def setUp(self):
        """
        Persiapan data uji: Buat 2 warga dan beberapa laporan dengan
        status berbeda untuk mensimulasikan skenario privasi.
        """
        # Buat dua warga yang berbeda untuk menguji isolasi data
        self.warga_a = User.objects.create_user(
            username='warga_a', password='TestPass123!', is_admin=False
        )
        self.warga_b = User.objects.create_user(
            username='warga_b', password='TestPass123!', is_admin=False
        )

        # Laporan berstatus DRAFT milik Warga B
        # DRAFT seharusnya TIDAK terlihat oleh Warga A di feed publik
        self.draft_milik_b = Report.objects.create(
            title='Draf Rahasia Warga B',
            category='Infrastruktur',
            description='Ini adalah draf yang belum diajukan.',
            location='Lokasi Rahasia',
            status='DRAFT',
            reporter=self.warga_b,
        )

        # Laporan berstatus REPORTED milik Warga A (sudah masuk feed publik)
        self.laporan_publik_a = Report.objects.create(
            title='Jalan Berlubang di Depan Kampus',
            category='Infrastruktur',
            description='Ada lubang besar yang membahayakan pengendara.',
            location='Jl. Soekarno Hatta',
            status='REPORTED',
            reporter=self.warga_a,
        )

        # Laporan berstatus REPORTED milik Warga B (sudah masuk feed publik)
        self.laporan_publik_b = Report.objects.create(
            title='Sampah Menumpuk di Trotoar',
            category='Kebersihan',
            description='Sampah tidak diangkut selama seminggu.',
            location='Jl. Gatot Subroto',
            status='REPORTED',
            reporter=self.warga_b,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # PRIV-01: Feed Kota Menyembunyikan Identitas Pelapor
    # ─────────────────────────────────────────────────────────────────────────
    def test_PRIV_01_feed_kota_menyembunyikan_identitas_reporter(self):
        """
        [PRIV-01] Mengakses endpoint Feed Kota (GET /api/report/?tab=feed).

        SKENARIO:
            Warga A mengakses feed publik yang berisi laporan dari semua warga.

        HASIL YANG DIHARAPKAN:
            Serializer DRF menyembunyikan identitas asli reporter dan mengubah
            nilainya menjadi string "Warga Anonim".

        PENJELASAN TEKNIS:
            Pada serializers.py, method get_reporter() mengembalikan string
            "Warga Anonim" secara hardcoded untuk SEMUA laporan, demi menjaga
            privasi identitas pelapor di ruang publik.
        """
        # Autentikasi sebagai Warga A
        self.client.force_authenticate(user=self.warga_a)

        # Akses endpoint feed kota
        response = self.client.get('/api/report/?tab=feed')

        # Verifikasi status 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verifikasi: SEMUA laporan di feed harus memiliki reporter = "Warga Anonim"
        # Iterasi setiap hasil dan pastikan field 'reporter' berisi "Warga Anonim"
        results = response.data.get('results', [])
        self.assertTrue(
            len(results) > 0,
            "Feed kota seharusnya memiliki minimal 1 laporan"
        )

        for laporan in results:
            self.assertEqual(
                laporan['reporter'],
                'Warga Anonim',
                f"Laporan '{laporan['title']}' seharusnya menampilkan reporter "
                f"sebagai 'Warga Anonim', tetapi menampilkan '{laporan['reporter']}'"
            )

    # ─────────────────────────────────────────────────────────────────────────
    # PRIV-02: Laporan Saya Menampilkan Nama Asli Pelapor
    # ─────────────────────────────────────────────────────────────────────────
    def test_PRIV_02_laporan_saya_menampilkan_nama_asli(self):
        """
        [PRIV-02] Mengakses endpoint Laporan Saya (GET /api/report/?tab=my_reports).

        SKENARIO:
            Warga A mengakses daftar laporan miliknya sendiri.

        HASIL YANG DIHARAPKAN:
            Serializer DRF menampilkan data nama pelapor asli (reporter_name)
            secara utuh tanpa disensor untuk laporan milik sendiri.

        PENJELASAN TEKNIS:
            Method get_reporter_name() mengecek apakah obj.reporter == request.user.
            Jika YA, nama asli (username) dikembalikan. Jika TIDAK, tetap
            mengembalikan "Warga Anonim".
        """
        self.client.force_authenticate(user=self.warga_a)

        response = self.client.get('/api/report/?tab=my_reports')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', [])
        self.assertTrue(len(results) > 0, "Harus ada laporan milik Warga A")

        # Verifikasi: reporter_name untuk laporan sendiri BUKAN "Warga Anonim"
        for laporan in results:
            self.assertEqual(
                laporan['reporter_name'],
                'warga_a',
                f"Pada tab 'my_reports', reporter_name seharusnya menampilkan "
                f"username asli 'warga_a', bukan '{laporan['reporter_name']}'"
            )

    # ─────────────────────────────────────────────────────────────────────────
    # PRIV-03: Warga A Tidak Bisa Membaca Draf Milik Warga B
    # ─────────────────────────────────────────────────────────────────────────
    def test_PRIV_03_tidak_bisa_baca_draf_orang_lain(self):
        """
        [PRIV-03] Warga A mencoba membaca detail data laporan berstatus DRAFT
        milik Warga B melalui parameter ID API.

        SKENARIO:
            Warga A mengakses endpoint detail laporan (/api/report/<id>/) untuk
            laporan berstatus DRAFT milik Warga B.

        HASIL YANG DIHARAPKAN:
            Sistem menyembunyikan keberadaan draf tersebut dan mengembalikan
            status HTTP 404 Not Found demi keamanan.

        PENJELASAN TEKNIS:
            Pada get_queryset(), ketika tidak ada parameter tab yang spesifik,
            queryset difilter sehingga DRAFT milik orang lain tidak masuk ke
            dalam hasil query. Sehingga get_object() akan melempar Http404.
            Ini merupakan teknik keamanan "security through obscurity" — sistem
            berpura-pura data tidak ada, bukan mengatakan "akses ditolak".
        """
        self.client.force_authenticate(user=self.warga_a)

        url = f'/api/report/{self.draft_milik_b.pk}/'
        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
            "Warga A seharusnya mendapat 404 saat mencoba membaca draf milik Warga B"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # PRIV-04: Warga A Tidak Bisa Memodifikasi Draf Milik Warga B
    # ─────────────────────────────────────────────────────────────────────────
    def test_PRIV_04_tidak_bisa_modifikasi_draf_orang_lain(self):
        """
        [PRIV-04] Warga A mencoba memanipulasi data draf milik Warga B
        menggunakan metode HTTP PUT via API.

        SKENARIO:
            Warga A mengirim request PUT ke endpoint detail laporan draf milik
            Warga B dengan data baru (misalnya judul yang sudah diubah).

        HASIL YANG DIHARAPKAN:
            Sistem menolak modifikasi data dan mengembalikan respons HTTP 404.

        PENJELASAN TEKNIS:
            Sama seperti PRIV-03, queryset memfilter draf milik orang lain.
            Jadi bahkan operasi PUT pun tidak bisa menemukan objek tersebut
            dalam queryset, menghasilkan 404.
        """
        self.client.force_authenticate(user=self.warga_a)

        url = f'/api/report/{self.draft_milik_b.pk}/'
        payload = {
            'title': 'Draf Sudah Diretas',
            'category': self.draft_milik_b.category,
            'description': self.draft_milik_b.description,
            'location': self.draft_milik_b.location,
            'status': 'DRAFT',
        }
        response = self.client.put(url, payload, format='json')

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
            "Warga A seharusnya mendapat 404 saat mencoba mengubah draf milik Warga B"
        )

        # Pastikan data asli di database tidak berubah
        self.draft_milik_b.refresh_from_db()
        self.assertEqual(self.draft_milik_b.title, 'Draf Rahasia Warga B')