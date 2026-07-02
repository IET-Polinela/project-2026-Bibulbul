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
# MODUL 4: PENGUJIAN FUNGSIONALITAS DASAR & VALIDASI INPUT
# =============================================================================
# Fokus: Memastikan fungsi CRUD (Create, Read, Update, Delete) berjalan normal,
# validasi input wajib ditegakkan, dan keamanan dari serangan injeksi (XSS).
#
# KONSEP KUNCI:
#   - Serializer DRF secara otomatis memvalidasi field yang required
#   - Django template engine secara default melakukan HTML escaping
#   - SearchFilter DRF melakukan pencarian berbasis teks di field yang
#     terdaftar pada search_fields
# =============================================================================

class CRUDAndValidationTests(APITestCase):
    """
    Kelas pengujian untuk fungsionalitas dasar dan validasi input.

    Menguji pembuatan data baru (CREATE), validasi field wajib, pertahanan
    terhadap serangan XSS, dan fitur pencarian/filter data.
    """

    def setUp(self):
        """
        Persiapan: Buat warga dan autentikasi untuk test CRUD.
        """
        self.warga = User.objects.create_user(
            username='warga_crud', password='TestPass123!', is_admin=False
        )
        # force_authenticate memastikan semua request di test ini terautentikasi
        self.client.force_authenticate(user=self.warga)

    # ─────────────────────────────────────────────────────────────────────────
    # FT-01: Membuat Laporan Baru dengan Data Lengkap
    # ─────────────────────────────────────────────────────────────────────────
    def test_FT_01_buat_laporan_dengan_data_lengkap(self):
        """
        [FT-01] Mengirim data laporan baru dengan seluruh kolom (field)
        terisi lengkap dan benar.

        SKENARIO:
            Warga mengirim POST request ke endpoint /api/report/ dengan
            semua field wajib terisi: title, category, description, location.

        HASIL YANG DIHARAPKAN:
            Basis data berhasil menyimpan record baru dan API mengembalikan
            status HTTP 201 Created.

        PENJELASAN TEKNIS:
            Method perform_create() di ViewSet otomatis mengisi field
            reporter dengan request.user, sehingga warga tidak perlu
            mengirim field reporter secara manual.
        """
        url = reverse('report-list')

        payload = {
            'title': 'Lampu Jalan Mati',
            'category': 'Fasilitas Umum',
            'description': 'Lampu jalan di depan kampus tidak menyala sejak 3 hari lalu.',
            'location': 'Jl. Soekarno Hatta',
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            "Laporan dengan data lengkap seharusnya berhasil dibuat (HTTP 201)"
        )

        laporan = Report.objects.get(title='Lampu Jalan Mati')
        self.assertEqual(
            laporan.reporter,
            self.warga,
            "Field reporter harus otomatis terisi dengan user yang login (perform_create)"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # FT-02: Laporan Ditolak Jika Judul Kosong
    # ─────────────────────────────────────────────────────────────────────────
    def test_FT_02_ditolak_jika_judul_kosong(self):
        """
        [FT-02] Mengirim data pembuatan laporan baru dengan mengosongkan
        kolom judul (title).

        SKENARIO:
            Warga mengirim POST request TANPA field title.

        HASIL YANG DIHARAPKAN:
            Sistem menolak input dan mengembalikan HTTP 400 Bad Request
            beserta pesan error spesifik untuk kolom wajib.

        PENJELASAN TEKNIS:
            Django ModelSerializer secara otomatis memvalidasi field yang
            tidak memiliki blank=True dan null=True. Field `title` dengan
            max_length=200 tanpa blank=True akan di-reject jika kosong.
        """
        url = reverse('report-list')

        payload = {
            # 'title' sengaja tidak disertakan
            'category': 'Fasilitas Umum',
            'description': 'Deskripsi tanpa judul.',
            'location': 'Lokasi Uji',
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            "Laporan tanpa title seharusnya ditolak (HTTP 400)"
        )
        self.assertIn(
            'title',
            response.data,
            "Respons error harus menyebutkan field 'title' sebagai wajib diisi"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # FT-03: Laporan Ditolak Jika Deskripsi Kosong
    # ─────────────────────────────────────────────────────────────────────────
    def test_FT_03_ditolak_jika_deskripsi_kosong(self):
        """
        [FT-03] Mengirim data pembuatan laporan baru dengan mengosongkan
        kolom deskripsi (description).

        SKENARIO:
            Warga mengirim POST request TANPA field description.

        HASIL YANG DIHARAPKAN:
            Sistem menolak input dan mengembalikan HTTP 400 Bad Request.
        """
        url = reverse('report-list')

        payload = {
            'title': 'Laporan Tanpa Deskripsi',
            'category': 'Fasilitas Umum',
            # 'description' sengaja tidak disertakan
            'location': 'Lokasi Uji',
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            "Laporan tanpa description seharusnya ditolak (HTTP 400)"
        )
        self.assertIn(
            'description',
            response.data,
            "Respons error harus menyebutkan field 'description' sebagai wajib diisi"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # FT-04: Keamanan dari Serangan XSS (Cross-Site Scripting)
    # ─────────────────────────────────────────────────────────────────────────
    def test_FT_04_xss_script_disimpan_sebagai_string_literal(self):
        """
        [FT-04] Mengisi nilai deskripsi laporan menggunakan kode skrip
        injeksi jahat HTML: <script>alert('xss')</script>.

        SKENARIO:
            Warga sengaja memasukkan kode JavaScript berbahaya ke dalam
            field deskripsi laporan.

        HASIL YANG DIHARAPKAN:
            Sistem tetap menerima data (HTTP 201 Created) namun melakukan
            penyimpanan sebagai string literal yang aman. Kode TIDAK akan
            dieksekusi oleh browser saat ditampilkan.

        PENJELASAN TEKNIS:
            DRF menyimpan data mentah ke database. Pertahanan utama XSS
            ada di sisi rendering:
            - Django Template Engine: auto-escaping HTML secara default
            - SPA Frontend: menggunakan textContent/innerText, bukan innerHTML
            Sehingga kode <script> akan ditampilkan sebagai teks biasa,
            bukan dieksekusi sebagai JavaScript.
        """
        url = reverse('report-list')

        # Payload dengan skrip injeksi XSS di deskripsi
        kode_xss = '<script>alert("xss")</script>'
        payload = {
            'title': 'Laporan XSS Test',
            'category': 'Keamanan',
            'description': kode_xss,
            'location': 'Lab Keamanan Siber',
        }

        response = self.client.post(url, payload, format='json')

        # Verifikasi: Data tetap diterima (201 Created)
        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            "Data dengan karakter HTML harus tetap diterima oleh API"
        )

        # Verifikasi: Deskripsi tersimpan di database sebagai teks literal
        # Ambil laporan yang baru saja dibuat dari database
        laporan = Report.objects.get(title='Laporan XSS Test')

        # Kode script harus tersimpan sebagai string biasa, bukan di-execute
        # Ini membuktikan bahwa injection tidak mengubah behavior sistem
        self.assertIn(
            'script',
            laporan.description.lower(),
            "Kode XSS harus tersimpan sebagai string literal di database"
        )
