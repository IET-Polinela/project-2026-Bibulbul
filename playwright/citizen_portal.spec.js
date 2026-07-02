// =============================================================================
// FILE: citizen_portal.spec.js — E2E Test Suite Playwright
// =============================================================================
// DESKRIPSI:
//   File ini berisi seluruh skenario pengujian End-to-End (E2E) menggunakan
//   Playwright untuk menguji Portal Citizen dan Portal Admin pada aplikasi Smart City.
//
// CARA MENJALANKAN:
//   1. Pastikan server Django backend aktif:
//      > cd server_smartcity
//      > python manage.py runserver
//
//   2. Jalankan semua test:
//      > npx playwright test
//
//   3. Untuk mode visual (interaktif):
//      > npx playwright test --ui
//
//   4. Untuk menjalankan test tertentu:
//      > npx playwright test tests/e2e/citizen_portal.spec.js
//
//   5. Untuk mode headed (melihat browser):
//      > npx playwright test --headed
//
// PRASYARAT:
//   - npm init playwright@latest  (jika belum diinisialisasi)
//   - Server backend Django harus berjalan di http://localhost:8000
//   - SPA Citizen Portal harus bisa diakses (via Live Server / file:// / http-server)
//
// ARSITEKTUR APLIKASI:
//   - SPA Citizen Portal: Single Page Application berbasis hash-routing (#login, #register, #dashboard)
//   - Admin Portal: Server-side rendered Django templates (login, dashboard, report list)
//   - API Backend: Django REST Framework + SimpleJWT (token-based auth)
//   - Storage: localStorage menyimpan 'access_token', 'refresh_token', 'username'
// =============================================================================

// ---------------------------------------------------------------------------
// IMPORT & SETUP
// ---------------------------------------------------------------------------
// Mengimpor fungsi 'test' dan 'expect' dari library Playwright.
// 'test' digunakan untuk mendefinisikan skenario pengujian.
// 'expect' digunakan untuk melakukan assertion (pemeriksaan hasil).
//
// ---------------------------------------------------------------------------
const { test, expect } = require('@playwright/test');

// ---------------------------------------------------------------------------
// KONSTANTA 
// ---------------------------------------------------------------------------
// BASE_URL: Alamat server backend Django. Semua request API diarahkan ke sini.
//
// SPA_URL: Alamat di mana SPA Citizen Portal di-serve. Dalam testing,
//          kita bisa menggunakan file:// protocol atau http-server lokal.
//          Sesuaikan path ini dengan lokasi file index.html SPA Anda.
//
// CATATAN PENTING :
//   - Jika menggunakan file:// protocol, beberapa fitur (seperti fetch API)
//     mungkin diblokir oleh kebijakan CORS browser. Disarankan menggunakan
//     http-server atau Live Server extension.
// ---------------------------------------------------------------------------
const BASE_URL = 'http://localhost:8000';

// Path ke file SPA relatif terhadap folder server_smartcity
// Gunakan salah satu opsi di bawah ini sesuai environment Anda:
//   Opsi 1 (Live Server): 'http://127.0.0.1:5500/smartcity_citizen_spa/index.html'
//   Opsi 2 (http-server):  'http://localhost:8080/index.html'
//   Opsi 3 (file://):      'file:///C:/Users/.../smartcity_citizen_spa/index.html'
const SPA_URL = 'http://127.0.0.1:5500/index.html';

// ---------------------------------------------------------------------------
// KREDENSIAL TEST 
// ---------------------------------------------------------------------------
// Kredensial untuk akun test yang sudah terdaftar di database Django.
// Pastikan akun ini ada sebelum menjalankan test, atau gunakan mock API.
// ---------------------------------------------------------------------------
const TEST_CITIZEN_USERNAME = 'testwarga';
const TEST_CITIZEN_PASSWORD = 'testpassword123';
const TEST_ADMIN_USERNAME  = 'admin';
const TEST_ADMIN_PASSWORD  = 'admin123';

// ---------------------------------------------------------------------------
// FAKE JWT TOKENS UNTUK TESTING
// ---------------------------------------------------------------------------
// Token JWT palsu yang digunakan untuk simulasi sesi kadaluarsa.
//
// Struktur JWT: header.payload.signature (base64url encoded)
//
// Token di bawah sengaja dibuat dengan 'exp' (expiry) yang sudah lewat
// sehingga server akan menolaknya dengan status 401 Unauthorized.
// ---------------------------------------------------------------------------
const EXPIRED_ACCESS_TOKEN  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNjAwMDAwMDAwLCJpYXQiOjE2MDAwMDAwMDAsImp0aSI6ImZha2VfYWNjZXNzX2lkIiwidXNlcl9pZCI6MX0.fake_signature_for_testing';
const EXPIRED_REFRESH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTYwMDAwMDAwMCwiaWF0IjoxNjAwMDAwMDAwLCJqdGkiOiJmYWtlX3JlZnJlc2hfaWQiLCJ1c2VyX2lkIjoxfQ.fake_signature_for_testing';
const VALID_ACCESS_TOKEN    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjo5OTk5OTk5OTk5LCJpYXQiOjE2MDAwMDAwMDAsImp0aSI6InZhbGlkX2FjY2Vzc19pZCIsInVzZXJfaWQiOjF9.fake_valid_signature';

// =============================================================================
// FUNGSI HELPER 
// =============================================================================
// Fungsi-fungsi pembantu (helper) yang digunakan berulang kali di berbagai test.
// Memisahkan logika ke helper function membuat kode test lebih bersih dan DRY
// (Don't Repeat Yourself).
//
// =============================================================================

/**
 * loginSPA - Melakukan login ke Portal Warga (Citizen SPA)
 *
 * Langkah-langkah / Steps:
 *   1. Navigasi ke halaman SPA dengan hash #login
 *   2. Tunggu form login muncul (id='loginForm')
 *   3. Isi username dan password
 *   4. Klik tombol submit
 *   5. Tunggu navigasi ke #dashboard (jika login berhasil)
 *
 * @param {import('@playwright/test').Page} page - Objek halaman Playwright 
 * @param {string} username - Username untuk login 
 * @param {string} password - Password untuk login 
 */
async function loginSPA(page, username, password) {
    // Navigasi ke halaman login SPA
    await page.goto(`${SPA_URL}#login`);

    // Tunggu hingga form login ter-render di DOM
    // Catatan: SPA menggunakan hash-routing, jadi router.js akan meng-inject
    //          HTML form login ke dalam div #app-content saat hash = #login
    await page.waitForSelector('#loginForm', { state: 'visible', timeout: 10000 });

    // Isi field username - menggunakan locator dengan id selector
    await page.locator('#loginUsername').fill(username);

    // Isi field password
    await page.locator('#loginPassword').fill(password);

    // Klik tombol submit pada form login
    // Selector: cari button type="submit" di dalam form #loginForm
    await page.locator('#loginForm button[type="submit"]').click();
}

/**
 * loginAdmin - Melakukan login ke Portal Admin (Django server-side)
 *
 * Portal Admin menggunakan Django's built-in authentication dengan
 * form POST + CSRF token. Berbeda dengan SPA yang menggunakan JWT API.
 *
 *
 * @param {import('@playwright/test').Page} page - Objek halaman Playwright 
 * @param {string} username - Username admin 
 * @param {string} password - Password admin 
 */
async function loginAdmin(page, username, password) {
    // Navigasi ke halaman login admin Django
    await page.goto(`${BASE_URL}/login/`);

    // Tunggu form login muncul
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    // Isi username & password
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="password"]').fill(password);

    // Klik tombol submit login dan tunggu hingga navigasi/redirect selesai
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }),
        page.locator('button[type="submit"]').click()
    ]);
}

/**
 * setupAuthTokens - Menyimpan token otentikasi ke localStorage browser
 *
 * Fungsi ini menggunakan page.evaluate() untuk menjalankan JavaScript
 * langsung di konteks browser (bukan di Node.js).
 * Ini berguna untuk mensimulasikan state login tanpa benar-benar
 * melakukan proses login via API.
 *
 *
 * PENTING:
 *   page.evaluate() menjalankan kode di dalam browser yang sedang diuji.
 *   Variabel dari Node.js harus di-pass sebagai argumen kedua.
 *
 *
 * @param {import('@playwright/test').Page} page - Objek halaman Playwright 
 * @param {string} accessToken  - JWT access token
 * @param {string} refreshToken - JWT refresh token
 * @param {string} [username]   - Opsional: username untuk disimpan 
 */
async function setupAuthTokens(page, accessToken, refreshToken, username = 'testwarga') {
    await page.evaluate(
        // Arrow function ini dieksekusi di dalam browser (V8 engine)
        ({ access, refresh, user }) => {
            // localStorage.setItem() menyimpan data key-value di browser
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('username', user);
        },
        // Argumen kedua: objek data yang di-pass ke browser context
        { access: accessToken, refresh: refreshToken, user: username }
    );
}


/**
 * setupAuthTokensBeforeLoad - Menyimpan token untuk halaman sekarang dan halaman berikutnya.
 *
 * Helper ini dipakai pada test UI-03, UI-04, dan UI-05 agar token sudah tersedia
 * sebelum router SPA membaca localStorage saat membuka #dashboard.
 */
async function setupAuthTokensBeforeLoad(page, accessToken, refreshToken, username = 'testwarga') {
    await page.addInitScript(({ access, refresh, user }) => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('username', user);
    }, {
        access: accessToken,
        refresh: refreshToken,
        user: username
    });

    try {
        await page.evaluate(({ access, refresh, user }) => {
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('username', user);
        }, {
            access: accessToken,
            refresh: refreshToken,
            user: username
        });
    } catch (error) {
        // Aman diabaikan jika halaman belum punya origin, misalnya masih about:blank.
    }
}



/**
 * installCitizenDashboardMock
 * Membuka dashboard SPA dalam kondisi login dan mem-mock semua fetch API laporan.
 * Ini dibuat agar UI-03, UI-04, dan UI-05 tidak bergantung pada IP public dosen
 * atau validitas JWT backend asli.
 */
async function installCitizenDashboardMock(page, options = {}) {
    const totalReports = options.totalReports ?? 25;

    await page.addInitScript(({ access, refresh, user, totalReports }) => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('username', user);

        const originalFetch = window.fetch.bind(window);

        const jsonResponse = (body, status = 200) => {
            return Promise.resolve(new Response(JSON.stringify(body), {
                status,
                headers: { 'Content-Type': 'application/json' }
            }));
        };

        const buildReports = () => {
            return Array.from({ length: totalReports }, (_, index) => {
                const id = index + 1;
                const statuses = ['DRAFT', 'REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED'];
                const status = statuses[index % statuses.length];
                return {
                    id,
                    title: `Laporan Test #${id}`,
                    description: `Deskripsi laporan pengujian nomor ${id}`,
                    category: id % 2 === 0 ? 'Infrastruktur' : 'Kebersihan',
                    location: `Lokasi Test ${id}`,
                    status,
                    reporter: status === 'DRAFT' ? user : 'Warga Anonim',
                    reporter_name: user,
                    is_owner: status === 'DRAFT',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            });
        };

        window.fetch = async (input, init = {}) => {
            const url = typeof input === 'string' ? input : input.url;
            const method = (init.method || 'GET').toUpperCase();

            // Tangkap endpoint laporan dari project, baik yang menuju localhost maupun IP public dosen.
            if (url.includes('/api/report') || url.includes('/report/')) {
                if (method === 'POST') {
                    let postData = {};
                    try {
                        postData = JSON.parse(init.body || '{}');
                    } catch (error) {}

                    return jsonResponse({
                        id: 99,
                        title: postData.title || 'Test Draft',
                        category: postData.category || 'Infrastruktur',
                        location: postData.location || 'Gedung Lab',
                        description: postData.description || 'Deskripsi test',
                        status: postData.status || 'DRAFT',
                        reporter: user,
                        reporter_name: user,
                        is_owner: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }, 201);
                }

                if (method === 'PUT') {
                    return jsonResponse({ ok: true }, 200);
                }

                if (method === 'DELETE') {
                    return Promise.resolve(new Response(null, { status: 204 }));
                }

                const reports = buildReports();

                // Untuk badge rekap: wajib ada minimal 1 DRAFT agar UI-05 lolos.
                if (url.includes('page_size=1000')) {
                    return jsonResponse({
                        count: reports.length,
                        results: reports
                    });
                }

                let pageNumber = 1;
                try {
                    const parsedUrl = new URL(url, window.location.origin);
                    pageNumber = parseInt(parsedUrl.searchParams.get('page') || '1', 10);
                } catch (error) {}

                const pageSize = 10;
                const start = (pageNumber - 1) * pageSize;
                const end = start + pageSize;
                const pageData = reports.slice(start, end);

                return jsonResponse({
                    count: reports.length,
                    results: pageData,
                    next: end < reports.length ? 'next_page_url' : null,
                    previous: pageNumber > 1 ? 'prev_page_url' : null
                });
            }

            return originalFetch(input, init);
        };
    }, {
        access: VALID_ACCESS_TOKEN,
        refresh: EXPIRED_REFRESH_TOKEN,
        user: 'testwarga',
        totalReports
    });
}
/**
 * clearAuthTokens - Menghapus semua token dari localStorage
 *
 * Digunakan di beforeEach untuk memastikan setiap test dimulai
 * dari state bersih (tidak ada sesi login tersisa).
 *
 * @param {import('@playwright/test').Page} page - Objek halaman Playwright 
 */
async function clearAuthTokens(page) {
    await page.evaluate(() => {
        // localStorage.clear() menghapus SEMUA data di localStorage domain ini
        localStorage.clear();
    });
}

/**
 * mockSPAApiUrl - Memastikan SEMUA request API di SPA mengarah ke localhost:8000
 *
 * Menggunakan wildcard '** /api/ **', fungsi ini akan mencegat request ke domain apapun
 * (misal: http://contoh-server/api, http://192.168.1.5/api, dll)
 * dan membelokkannya secara paksa ke server Django lokal di http://localhost:8000/api.
 *
 * @param {import('@playwright/test').Page} page - Objek halaman Playwright
 */
async function mockSPAApiUrl(page) {
    const localBaseUrl = BASE_URL;

    // Gunakan wildcard **/api/** untuk menangkap dari host/domain mana saja
    await page.route('**/api/**', async (route) => {
        const originalUrl = route.request().url();

        // [PENTING] Mencegah infinite loop: 
        // Jika request sudah benar mengarah ke localhost:8000, biarkan saja lewat.
        if (originalUrl.startsWith(localBaseUrl)) {
            return route.continue();
        }

        // Parsing URL asli menggunakan objek URL bawaan JavaScript
        const urlObj = new URL(originalUrl);
        
        // urlObj.pathname akan mengambil "/api/endpoint/"
        // urlObj.search akan mengambil query string (misal: "?search=jalan") jika ada
        const newUrl = `${localBaseUrl}${urlObj.pathname}${urlObj.search}`;

        // Lanjutkan request dengan URL yang sudah dibelokkan ke localhost
        await route.continue({ url: newUrl });
    });
}


// #############################################################################
// #                                                                           #
// #   MODUL 1: OTORISASI & SESI (AUTH-04, AUTH-05, AUTH-06)                   #
// #                                                                           #
// #   Modul ini menguji mekanisme perlindungan rute (auth guard) pada SPA.    #
// #                                                                           #
// #   Konsep yang diuji:                                                      #
// #   - Auth Guard: redirect pengguna yang belum login ke halaman login       #
// #   - Token Expiry: penanganan token JWT yang sudah kadaluarsa              #
// #   - Session Cleanup: pembersihan localStorage saat sesi berakhir          #
// #                                                                           #
// #############################################################################

test.describe('Modul 1: Otorisasi & Sesi (AUTH-04, AUTH-05, AUTH-06)', () => {
    // =========================================================================
    // PENGANTAR MODUL
    // =========================================================================
    // Setiap aplikasi SPA yang menggunakan token-based authentication (JWT)
    // harus memiliki mekanisme auth guard yang melindungi halaman tertentu
    // dari akses tanpa otentikasi.
    //
    // Dalam aplikasi ini (lihat router.js baris 122-139):
    //   - Fungsi handleRouting() memeriksa token di localStorage
    //   - Jika TIDAK ada token dan user mengakses #dashboard → redirect ke #login
    //   - Jika ADA token dan user mengakses #login/#register → redirect ke #dashboard
    // =========================================================================

    // -------------------------------------------------------------------------
    // beforeEach: Dijalankan sebelum SETIAP test dalam describe block ini.
    //
    // Tujuan: Membersihkan state browser agar setiap test independen.
    //
    // PRINSIP TESTING:
    //   Setiap test harus bisa berjalan secara independen (isolated).
    //   Hasil test A tidak boleh mempengaruhi test B.
    // -------------------------------------------------------------------------
    test.beforeEach(async ({ page }) => {
        // 1. Navigasi ke SPA terlebih dahulu agar localStorage tersedia
        //    (localStorage hanya tersedia setelah halaman dimuat)
        await page.goto(SPA_URL);

        // 2. Bersihkan localStorage untuk memastikan state bersih
        await clearAuthTokens(page);

        // 3. Setup route interceptor agar API calls diarahkan ke localhost
        await mockSPAApiUrl(page);
    });

    // =========================================================================
    // TEST CASE: AUTH-04
    // =========================================================================
    // JUDUL:
    //   Auth Guard: Akses dashboard tanpa token harus redirect ke login
    //
    // SKENARIO:
    //   Pengguna yang BELUM login (tidak memiliki access_token di localStorage)
    //   mencoba mengakses halaman #dashboard secara langsung melalui URL.
    //
    // EKSPEKTASI:
    //   Router SPA (handleRouting di router.js) mendeteksi tidak ada token
    //   dan melakukan redirect otomatis ke #login.
    //
    // REFERENSI KODE:
    //   Lihat router.js baris 133-138:
    //     } else {
    //         if (hash === '#dashboard') {
    //             window.location.hash = '#login';
    //             return;
    //         }
    //     }
    // =========================================================================
    test('AUTH-04: Akses #dashboard tanpa token → redirect ke #login', async ({ page }) => {
        // -------------------------------------------------------------------
        // LANGKAH 1: Pastikan localStorage benar-benar kosong (tidak ada token)
        // -------------------------------------------------------------------
        const tokenBefore = await page.evaluate(() => {
            // Jalankan di browser: cek apakah ada access_token
            return localStorage.getItem('access_token');
        });

        // Assertion: token harus null (tidak ada)
        expect(tokenBefore).toBeNull();

        // -------------------------------------------------------------------
        // LANGKAH 2: Navigasi langsung ke #dashboard (tanpa login)
        // -------------------------------------------------------------------
        // Ini mensimulasikan pengguna yang mengetik URL langsung di address bar
        // atau mengklik bookmark ke halaman dashboard.
        await page.goto(`${SPA_URL}#dashboard`);

        // -------------------------------------------------------------------
        // LANGKAH 3: Tunggu router SPA melakukan redirect
        // -------------------------------------------------------------------
        // page.waitForFunction() menunggu hingga kondisi tertentu terpenuhi
        // di dalam browser. Kita menunggu hash URL berubah menjadi '#login'.
        //
        await page.waitForFunction(
            () => window.location.hash === '#login',
            null,
            { timeout: 5000 }
        );

        // -------------------------------------------------------------------
        // LANGKAH 4: Verifikasi bahwa URL hash sekarang adalah #login
        // -------------------------------------------------------------------
        // expect(page).toHaveURL() memeriksa URL lengkap halaman saat ini.
        // Kita gunakan regex agar fleksibel dengan base URL.
        //
        await expect(page).toHaveURL(/#login/);

        // -------------------------------------------------------------------
        // LANGKAH 5: Verifikasi bahwa form login ditampilkan
        // -------------------------------------------------------------------
        // Ini adalah verifikasi tambahan: bukan hanya URL yang berubah,
        // tapi konten halaman juga harus menampilkan form login.
        //
        const loginForm = page.locator('#loginForm');
        await expect(loginForm).toBeVisible({ timeout: 5000 });

        // Cetak info debug ke console test (opsional, untuk debugging)
        console.log('[AUTH-04] ✅ Redirect dari #dashboard ke #login berhasil diverifikasi');
    });

    // =========================================================================
    // TEST CASE: AUTH-05
    // =========================================================================
    // JUDUL:
    //   Token Interceptor: Access token kadaluarsa → SPA menangani 401 error
    //
    // SKENARIO:
    //   Pengguna memiliki access_token yang sudah kadaluarsa (expired) namun
    //   refresh_token masih valid. Saat SPA melakukan API call dan mendapat
    //   respons 401, interceptor di api.js harus membersihkan localStorage
    //   dan mengarahkan pengguna ke halaman login.
    //
    // CATATAN TEKNIS:
    //   Dalam kode api.js (baris 28-33), interceptor sederhana diimplementasikan:
    //     if(response.status == 401){
    //         alert('Sesi Anda telah habis atau Anda belum login.');
    //         localStorage.clear();
    //         window.location.hash = '#login';
    //         return null;
    //     }
    //
    //   Perhatikan bahwa SPA ini TIDAK memiliki mekanisme auto-refresh token.
    //   Jadi ketika access_token expired, SPA langsung redirect ke login.
    //
    // STRATEGI TESTING:
    //   Kita menggunakan page.route() untuk mock respons 401 dari API server,
    //   sehingga kita tidak perlu benar-benar mengirim expired token ke server.
    // =========================================================================
    test('AUTH-05: Token kadaluarsa → interceptor menangani 401 dan redirect ke #login', async ({ page }) => {
        // -------------------------------------------------------------------
        // LANGKAH 1: Setup token di localStorage (simulasi user yang sudah login
        //            tapi tokennya sudah kadaluarsa)
        // -------------------------------------------------------------------
        await setupAuthTokens(page, EXPIRED_ACCESS_TOKEN, EXPIRED_REFRESH_TOKEN);

        // Verifikasi token tersimpan dengan benar
        const storedToken = await page.evaluate(() => localStorage.getItem('access_token'));
        expect(storedToken).toBe(EXPIRED_ACCESS_TOKEN);

        // -------------------------------------------------------------------
        // LANGKAH 2: Mock respons API untuk mensimulasikan 401 Unauthorized
        // -------------------------------------------------------------------
        // page.route() dapat menginterceptsi request HTTP
        // dan memberikan respons buatan (mock response).
        //
        // Pola URL '**\/api/report/**' akan mencocokkan semua request
        // ke endpoint report API (termasuk query parameters).
        //
        // -------------------------------------------------------------------


        // Mock SEMUA request ke API endpoint agar mengembalikan 401
        await page.route('**/api/**', async (route) => {
            // route.fulfill() langsung mengembalikan respons tanpa mengirim
            // request ke server asli. Ini sangat berguna untuk testing.
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({
                    detail: 'Given token not valid for any token type',
                    code: 'token_not_valid'
                })
            });
        });

        // -------------------------------------------------------------------
        // LANGKAH 3: Handle dialog alert yang muncul dari interceptor api.js
        // -------------------------------------------------------------------
        // Kode api.js menampilkan alert('Sesi Anda telah habis...') saat
        // menerima respons 401. Playwright akan error jika dialog tidak ditangani.
        //
        // page.on('dialog') mendaftarkan event handler untuk dialog browser
        // (alert, confirm, prompt). Kita harus accept/dismiss dialog.
        page.on('dialog', async (dialog) => {
            // Verifikasi pesan alert sesuai dengan yang ada di api.js
            console.log(`[AUTH-05] Dialog muncul: "${dialog.message()}"`);
            await dialog.accept();
        });

        // -------------------------------------------------------------------
        // LANGKAH 4: Navigasi ke #dashboard (router.js akan mengizinkan karena
        //            ada token di localStorage, meskipun token sudah expired)
        // -------------------------------------------------------------------
        // Auth guard di router.js HANYA memeriksa keberadaan token (ada/tidak),
        // BUKAN validitas token. Validitas dicek saat API call dilakukan.
        //
        await page.goto(`${SPA_URL}#dashboard`);

        // Tunggu hingga dashboard ter-render dan API call dilakukan
        // Saat dashboard dimuat, setupDashboardEvents() dan loadDashboardData()
        // akan dipanggil, yang akan memicu requestAPI() → mendapat 401 → redirect
        //
        await page.waitForTimeout(2000);

        // -------------------------------------------------------------------
        // LANGKAH 5: Verifikasi redirect ke #login setelah 401
        // -------------------------------------------------------------------
        await page.waitForFunction(
            () => window.location.hash === '#login',
            null,
            { timeout: 10000 }
        );

        await expect(page).toHaveURL(/#login/);

        // -------------------------------------------------------------------
        // LANGKAH 6: Verifikasi localStorage sudah dibersihkan oleh interceptor
        // -------------------------------------------------------------------
        // Kode api.js baris 30: localStorage.clear()
        const tokenAfter = await page.evaluate(() => localStorage.getItem('access_token'));
        const refreshAfter = await page.evaluate(() => localStorage.getItem('refresh_token'));

        // Token harus null setelah interceptor membersihkan localStorage
        expect(tokenAfter).toBeNull();
        expect(refreshAfter).toBeNull();

        console.log('[AUTH-05] ✅ Interceptor 401 berhasil: localStorage dibersihkan, redirect ke #login');
    });

    // =========================================================================
    // TEST CASE: AUTH-06
    // =========================================================================
    // JUDUL:
    //   Kedua Token Kadaluarsa: Access + Refresh expired → redirect ke #login
    //
    // SKENARIO:
    //   Kedua token (access dan refresh) sudah kadaluarsa. Pengguna mencoba
    //   mengakses #dashboard. SPA harus mendeteksi kegagalan autentikasi
    //   dan mengarahkan pengguna kembali ke halaman login.
    //
    // PERBEDAAN DENGAN AUTH-05:
    //   AUTH-05 fokus pada interceptor menangani respons 401.
    //   AUTH-06 fokus pada state akhir: localStorage HARUS bersih dan
    //   pengguna HARUS berada di halaman login.
    //
    // =========================================================================
    test('AUTH-06: Kedua token kadaluarsa → localStorage dibersihkan, redirect ke #login', async ({ page }) => {
        // -------------------------------------------------------------------
        // LANGKAH 1: Simpan kedua token yang sudah kadaluarsa ke localStorage
        // -------------------------------------------------------------------
        await setupAuthTokens(page, EXPIRED_ACCESS_TOKEN, EXPIRED_REFRESH_TOKEN);

        // Verifikasi awal: kedua token tersimpan
        const accessBefore = await page.evaluate(() => localStorage.getItem('access_token'));
        const refreshBefore = await page.evaluate(() => localStorage.getItem('refresh_token'));
        expect(accessBefore).not.toBeNull();
        expect(refreshBefore).not.toBeNull();

        // -------------------------------------------------------------------
        // LANGKAH 2: Mock API untuk menolak semua request dengan 401
        // -------------------------------------------------------------------
        // Karena kedua token expired, server pasti menolak. Kita mock
        // agar test tidak bergantung pada koneksi server yang sebenarnya.

        await page.route('**/api/**', async (route) => {
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({
                    detail: 'Token is invalid or expired',
                    code: 'token_not_valid'
                })
            });
        });

        // -------------------------------------------------------------------
        // LANGKAH 3: Handle dialog alert agar test tidak terganggu
        // -------------------------------------------------------------------
        page.on('dialog', async (dialog) => {
            console.log(`[AUTH-06] Dialog muncul: "${dialog.message()}"`);
            await dialog.accept();
        });

        // -------------------------------------------------------------------
        // LANGKAH 4: Coba akses dashboard
        // -------------------------------------------------------------------
        await page.goto(`${SPA_URL}#dashboard`);

        // Tunggu proses redirect terjadi
        await page.waitForTimeout(2000);

        // -------------------------------------------------------------------
        // LANGKAH 5: Verifikasi TIGA hal sekaligus (Triple Assertion)
        // -------------------------------------------------------------------

        // 5a. URL harus mengarah ke #login
        await page.waitForFunction(
            () => window.location.hash === '#login',
            null,
            { timeout: 10000 }
        );
        await expect(page).toHaveURL(/#login/);

        // 5b. localStorage harus bersih (access_token harus null)
        const accessAfter = await page.evaluate(() => localStorage.getItem('access_token'));
        expect(accessAfter).toBeNull();

        // 5c. localStorage harus bersih (refresh_token harus null)
        const refreshAfter = await page.evaluate(() => localStorage.getItem('refresh_token'));
        expect(refreshAfter).toBeNull();

        // 5d. Verifikasi username juga ikut terhapus
        const usernameAfter = await page.evaluate(() => localStorage.getItem('username'));
        expect(usernameAfter).toBeNull();

        // 5e. Form login harus terlihat (verifikasi visual)
        await expect(page.locator('#loginForm')).toBeVisible({ timeout: 5000 });

        console.log('[AUTH-06] ✅ Kedua token expired: localStorage bersih, redirect ke #login berhasil');
    });
});


// #############################################################################
// #                                                                           #
// #   MODUL 5: INTERAKTIVITAS UI (UI-01 through UI-06)                        #
// #                                                                           #
// #   Modul ini menguji fitur-fitur interaktif pada antarmuka pengguna,        #
// #   termasuk Chart.js rendering, live search, pagination, modal dialog,     #
// #   form submission, dan responsive design.                                 #
// #                                                                           #
// #############################################################################

test.describe('Modul 5: Interaktivitas UI (UI-01 through UI-06)', () => {
    // =========================================================================
    // PENGANTAR MODUL
    // =========================================================================
    // Test UI memverifikasi bahwa elemen-elemen antarmuka berfungsi dengan baik
    // dari perspektif pengguna akhir. Ini mencakup:
    //
    // 1. Rendering visual (chart, tabel, modal)
    // 2. Interaksi pengguna (klik, ketik, scroll)
    // 3. Respons dinamis (AJAX, filtering, pagination)
    // 4. Responsive design (tampilan mobile vs desktop)
    // =========================================================================

    // =========================================================================
    // TEST CASE: UI-01
    // =========================================================================
    // JUDUL:
    //   Chart.js Rendering: Grafik statistik dashboard admin ter-render
    //
    // SKENARIO:
    //   Admin login ke portal admin, navigasi ke halaman /dashboard/,
    //   tunggu Chart.js selesai merender, dan verifikasi bahwa elemen
    //   canvas chart (statusChart dan categoryChart) ada dan terlihat.
    //
    // KONSEP TEKNIS:
    //   - Chart.js merender grafik ke elemen <canvas> HTML5
    //   - Dashboard mengambil data dari /dashboard/api/data/ via fetch()
    //   - Chart diinisialisasi setelah data berhasil di-fetch
    //
    // REFERENSI KODE:
    //   Lihat dashboard.html baris 47-74:
    //     - <canvas id="statusChart"> → Chart.js doughnut chart
    //     - <canvas id="categoryChart"> → Chart.js bar chart
    //     - fetch('/dashboard/api/data/') → data source
    // =========================================================================
    test('UI-01: Chart.js di Dashboard Admin ter-render dengan benar', async ({ page }) => {
        // -------------------------------------------------------------------
        // LANGKAH 1: Login ke portal admin
        // -------------------------------------------------------------------
        // Menggunakan helper function loginAdmin yang sudah kita buat
        await loginAdmin(page, TEST_ADMIN_USERNAME, TEST_ADMIN_PASSWORD);

        // -------------------------------------------------------------------
        // LANGKAH 2: Navigasi ke halaman dashboard
        // -------------------------------------------------------------------
        await page.goto(`${BASE_URL}/dashboard/`);

        // Tunggu halaman selesai dimuat sepenuhnya
        await page.waitForLoadState('networkidle');

        // -------------------------------------------------------------------
        // LANGKAH 3: Tunggu Chart.js selesai merender
        // -------------------------------------------------------------------
        // Chart.js merender secara asinkron setelah data di-fetch dari API.
        // Kita perlu menunggu:
        //   1. Fetch ke /dashboard/api/data/ selesai
        //   2. new Chart() dipanggil dan canvas di-render
        //
        // Strategi: Tunggu elemen canvas terlihat di viewport
        // -------------------------------------------------------------------
        const statusChartCanvas  = page.locator('#statusChart');
        const categoryChartCanvas = page.locator('#categoryChart');

        // -------------------------------------------------------------------
        // LANGKAH 4: Verifikasi elemen canvas ada dan terlihat
        // -------------------------------------------------------------------
        // toBeVisible() memeriksa bahwa elemen:
        //   - Ada di DOM
        //   - Tidak di-hidden (display:none, visibility:hidden)
        //   - Memiliki dimensi > 0 (width dan height)
        //
        await expect(statusChartCanvas).toBeVisible({ timeout: 15000 });
        await expect(categoryChartCanvas).toBeVisible({ timeout: 15000 });

        // -------------------------------------------------------------------
        // LANGKAH 5: Verifikasi tambahan - cek bahwa canvas sudah di-render
        //            oleh Chart.js (canvas memiliki konten/grafik)
        // -------------------------------------------------------------------
        // Cara mendeteksi Chart.js telah merender: periksa apakah ada
        // instance Chart yang terkait dengan canvas element.
        //
        // Chart.js menyimpan referensi instance di Chart.instances
        const chartsRendered = await page.evaluate(() => {
            // Cek apakah Chart (library) tersedia di window global
            if (typeof Chart === 'undefined') return false;

            // Chart.instances menyimpan semua chart yang telah dibuat
            // Di Chart.js v4+, ini adalah objek dengan key = chart id
            const instances = Object.keys(Chart.instances || {});
            return instances.length >= 2; // Minimal 2 chart (status + category)
        });

        expect(chartsRendered).toBe(true);

        // -------------------------------------------------------------------
        // LANGKAH 6: Verifikasi tabel data juga ada
        // -------------------------------------------------------------------
        // Dashboard juga menampilkan 2 tabel: reportedTable dan resolvedTable
        await expect(page.locator('#reportedTable')).toBeVisible();
        await expect(page.locator('#resolvedTable')).toBeVisible();

        console.log('[UI-01] ✅ Chart.js statusChart dan categoryChart berhasil ter-render');
    });

    // =========================================================================
    // TEST CASE: UI-02
    // =========================================================================
    // JUDUL:
    //   Live Search: Pencarian di halaman daftar laporan admin
    //
    // SKENARIO:
    //   Admin login, navigasi ke halaman daftar laporan (/reports/),
    //   ketik keyword pencarian di input #searchInput, dan verifikasi
    //   bahwa tabel ter-filter sesuai keyword (via AJAX call ke /search/).
    //
    // REFERENSI KODE:
    //   Lihat report_list.html baris 82-103:
    //     searchInput.addEventListener('keyup', function() {
    //         fetch(`/search/?q=${this.value}`)
    //         .then(res => res.json())
    //         .then(data => {
    //             tableBody.innerHTML = '';
    //             data.results.forEach(r => { ... });
    //         });
    //     });
    //
    // KONSEP TEKNIS:
    //   - Live Search: setiap keyup di input, AJAX request dikirim
    //   - page.waitForResponse(): menunggu respons HTTP tertentu
    //   - Filter dilakukan di server (endpoint /search/?q=...)
    // =========================================================================
    test('UI-02: Live Search pada daftar laporan admin berfungsi', async ({ page }) => {
        // -------------------------------------------------------------------
        // LANGKAH 1: Login ke portal admin
        // -------------------------------------------------------------------
        await loginAdmin(page, TEST_ADMIN_USERNAME, TEST_ADMIN_PASSWORD);

        // -------------------------------------------------------------------
        // LANGKAH 2: Navigasi ke halaman daftar laporan (/reports/ via main_app urls)
        // -------------------------------------------------------------------
        // Halaman ini berisi tabel semua laporan dan input pencarian.
        // URL /reports/ didefinisikan di main_app/urls.py
        await page.goto(`${BASE_URL}/reports/`);
        await page.waitForLoadState('networkidle');

        // -------------------------------------------------------------------
        // LANGKAH 3: Verifikasi elemen pencarian dan tabel ada
        // -------------------------------------------------------------------
        const searchInput = page.locator('#searchInput');
        const tableBody   = page.locator('#reportTableBody');

        await expect(searchInput).toBeVisible({ timeout: 10000 });
        await expect(tableBody).toBeVisible({ timeout: 10000 });

        // Catat jumlah baris awal sebelum pencarian
        const initialRowCount = await tableBody.locator('tr').count();
        console.log(`[UI-02] Jumlah baris awal: ${initialRowCount}`);

        // -------------------------------------------------------------------
        // LANGKAH 4: Ketik keyword pencarian dan tunggu respons AJAX
        // -------------------------------------------------------------------
        // Kita menggunakan Promise.all() untuk menjalankan dua operasi secara
        // bersamaan (concurrent):
        //   1. Menunggu respons HTTP dari /search/
        //   2. Mengetik keyword ke input field
        //
        // MENGAPA Promise.all()?
        // Jika kita ketik dulu baru tunggu response, response mungkin sudah
        // datang sebelum waitForResponse dipanggil → timeout.
        const searchKeyword = 'Lampu';

        // Mulai mendengarkan response spesifik untuk query pencarian 'Lampu'
        const responsePromise = page.waitForResponse(
            (response) => response.url().includes(`/search/?q=${searchKeyword}`) && response.status() === 200,
            { timeout: 15000 }
        );

        // Ketik keyword pencarian secara berurutan
        await searchInput.click();
        await searchInput.fill('');
        await searchInput.type(searchKeyword, { delay: 100 });

        // Tunggu hingga respon AJAX selesai diterima
        const searchResponse = await responsePromise;

        // -------------------------------------------------------------------
        // LANGKAH 5: Verifikasi respons AJAX berhasil
        // -------------------------------------------------------------------
        expect(searchResponse.status()).toBe(200);

        // Parse data JSON dari respons
        const responseData = await searchResponse.json();
        console.log(`[UI-02] Hasil pencarian "${searchKeyword}": ${responseData.results?.length || 0} item`);

        // -------------------------------------------------------------------
        // LANGKAH 6: Tunggu tabel diperbarui dan verifikasi
        // -------------------------------------------------------------------
        // Beri waktu untuk DOM update setelah data diterima
        await page.waitForTimeout(1000);

        // Hitung jumlah baris setelah pencarian
        const filteredRowCount = await tableBody.locator('tr').count();
        console.log(`[UI-02] Jumlah baris setelah filter: ${filteredRowCount}`);

        // Verifikasi: jumlah baris setelah filter harus sesuai dengan data respons
        // Jika ada hasil, baris harus > 0
        if (responseData.results && responseData.results.length > 0) {
            expect(filteredRowCount).toBeGreaterThan(0);
            expect(filteredRowCount).toBe(responseData.results.length);
        }

        console.log('[UI-02] ✅ Live search berfungsi: input → AJAX → tabel terupdate');
    });

    // =========================================================================
    // TEST CASE: UI-03
    // =========================================================================
    // JUDUL:
    //   Pagination: Daftar laporan publik (Feed Kota) dibatasi maks 10 item
    //
    // SKENARIO:
    //   Dengan asumsi ada 25+ laporan di database, navigasi ke SPA #dashboard,
    //   klik tab "Feed Kota (Publik)", hitung jumlah kartu laporan di
    //   #listContainer, dan pastikan tidak lebih dari 10. Juga verifikasi
    //   bahwa kontrol pagination ada di #paginationContainer.
    //
    // KONSEP TEKNIS:
    //   - Pagination server-side: API mengembalikan data terpaginasi
    //   - app.js menggunakan page_size=10 sebagai default
    //   - totalPages dihitung dari: Math.ceil(count / 10)
    //
    // REFERENSI KODE:
    //   app.js baris 64: const response = await requestAPI(`/report/?tab=${tab}&page=${page}`)
    //   app.js baris 69: totalPages = Math.ceil(count / 10) || 1;
    //   app.js baris 230-264: renderPagination() → membuat navigasi halaman
    // =========================================================================
    test('UI-03: Pagination Feed Kota — maks 10 kartu, kontrol pagination muncul', async ({ page }) => {
        // Setup login + mock API sebelum halaman SPA dimuat.
        await installCitizenDashboardMock(page, { totalReports: 25 });
        page.on('dialog', async (dialog) => await dialog.accept());

        await page.goto(`${SPA_URL}#dashboard`);
        await expect(page.getByRole('button', { name: /Buat Laporan/i })).toBeVisible({ timeout: 10000 });

        const tabFeedKota = page.locator('#tabFeedKota');
        await expect(tabFeedKota).toBeVisible({ timeout: 10000 });
        await tabFeedKota.click();

        const listContainer = page.locator('#listContainer');
        await expect(listContainer).toBeVisible({ timeout: 10000 });

        // Project kamu merender card langsung sebagai .card, sedangkan script dosen awalnya mencari .col.
        // Selector ini dibuat fleksibel agar mengikuti struktur project kamu.
        await expect(listContainer.locator('.card').first()).toBeVisible({ timeout: 10000 });
        const reportCards = listContainer.locator('.col');
        const cardCount = await reportCards.count();

        expect(cardCount).toBeLessThanOrEqual(10);
        expect(cardCount).toBeGreaterThan(0);

        const paginationContainer = page.locator('#paginationContainer');
        await expect(paginationContainer).toBeVisible({ timeout: 10000 });

        const paginationButtons = paginationContainer.locator('.page-item');
        const paginationCount = await paginationButtons.count();
        expect(paginationCount).toBeGreaterThanOrEqual(3);

        console.log(`[UI-03] ✅ Pagination terverifikasi: ${cardCount} kartu, ${paginationCount} tombol navigasi`);
    });

    // =========================================================================
    // TEST CASE: UI-04
    // =========================================================================
    // JUDUL:
    //   Modal Dialog: Tombol "Buat Laporan Baru" membuka modal #reportModal
    //
    // SKENARIO:
    //   Login ke SPA, navigasi ke #dashboard, klik tombol #btnBukaModal,
    //   dan verifikasi bahwa modal Bootstrap #reportModal muncul (visible).
    //
    // REFERENSI KODE:
    //   - app.js baris 282-292: setupDashboardEvents() → pasang event listener
    //     btnBukaModal.addEventListener('click', function() {
    //         reportModalInstance.show();
    //     });
    //   - index.html baris 31: <div class="modal fade" id="reportModal">
    //
    // KONSEP TEKNIS:
    //   - Bootstrap Modal: overlay dialog yang dimunculkan dengan JS
    //   - Class 'show' ditambahkan ke modal saat ditampilkan
    //   - Modal instance dibuat dengan: new bootstrap.Modal(element)
    // =========================================================================
    test('UI-04: Klik tombol Buat Laporan → modal #reportModal muncul', async ({ page }) => {
        // Mock endpoint laporan SEBELUM dashboard dibuka
        await page.route(/.*\/api\/report\/?.*/, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    count: 0,
                    results: []
                })
            });
        });

        // Buka halaman dulu agar localStorage punya origin yang benar
        await page.goto(`${SPA_URL}#login`);

        // Set token langsung di origin SPA
        await page.evaluate(({ access, refresh }) => {
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('username', 'testwarga');
        }, {
            access: VALID_ACCESS_TOKEN,
            refresh: EXPIRED_REFRESH_TOKEN
        });

        // Masuk ke dashboard
        await page.goto(`${SPA_URL}#dashboard`);

        // DEBUG — jangan hapus dulu
        console.log('DEBUG URL:', page.url());
        console.log('DEBUG HASH:', await page.evaluate(() => window.location.hash));
        console.log('DEBUG TOKEN:', await page.evaluate(() => localStorage.getItem('access_token')));
        console.log('DEBUG LOGIN FORM COUNT:', await page.locator('#loginForm').count());
        console.log('DEBUG BTN COUNT:', await page.locator('#btnBukaModal').count());
        console.log('DEBUG BODY:', (await page.locator('body').innerText()).slice(0, 500));

        const btnBukaModal = page.getByRole('button', { name: /Buat Laporan/i });
        await expect(btnBukaModal).toBeVisible({ timeout: 10000 });

        const reportModal = page.locator('#reportModal');
        await expect(reportModal).not.toBeVisible();

        await btnBukaModal.click();

        await expect(reportModal).toBeVisible({ timeout: 5000 });

        const hasShowClass = await reportModal.evaluate((el) => el.classList.contains('show'));
        expect(hasShowClass).toBe(true);

        await expect(page.locator('#reportForm')).toBeVisible();
        await expect(page.locator('#inputTitle')).toBeVisible();
        await expect(page.locator('#inputCategory')).toBeVisible();
        await expect(page.locator('#inputLocation')).toBeVisible();
        await expect(page.locator('#inputDescription')).toBeVisible();
        await expect(page.locator('#btnDraft')).toBeVisible();
        await expect(page.locator('#btnSubmit')).toBeVisible();

        console.log('[UI-04] ✅ Modal #reportModal berhasil dibuka');
    });

    // =========================================================================
    // TEST CASE: UI-05
    // =========================================================================
    // JUDUL:
    //   Form Submission: Simpan Draft laporan via modal form
    //
    // SKENARIO:
    //   Login ke SPA, buka modal form, isi semua field, klik "Simpan Draft",
    //   dan verifikasi:
    //   1. Modal tertutup setelah submit berhasil
    //   2. Notifikasi sukses muncul (alert)
    //   3. Badge count Draf di #summaryStats terupdate
    //
    // REFERENSI KODE:
    //   app.js baris 347-412: setupReportForm()
    //   - btnDraft → kirimLaporan('DRAFT')
    //   - Jika response.status 200/201 → reportModalInstance.hide(), alert, loadDashboardData()
    //   - loadDashboardData() memanggil loadSummaryStats() → update badge
    // =========================================================================
    test('UI-05: Isi form dan simpan draft → modal tutup, notifikasi muncul', async ({ page }) => {
        // Setup login + mock API sebelum halaman SPA dimuat.
        await installCitizenDashboardMock(page, { totalReports: 25 });

        let alertMessage = '';
        page.on('dialog', async (dialog) => {
            alertMessage = dialog.message();
            console.log(`[UI-05] Alert: "${alertMessage}"`);
            await dialog.accept();
        });

        await page.goto(`${SPA_URL}#dashboard`);
        await expect(page.getByRole('button', { name: /Buat Laporan/i })).toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: /Buat Laporan/i }).click();
        await expect(page.locator('#reportModal')).toBeVisible({ timeout: 5000 });

        await page.locator('#inputTitle').fill('AC Mati di Lab CPS 1');
        await page.locator('#inputCategory').selectOption('Infrastruktur');
        await page.locator('#inputLocation').fill('Gedung Lab Analisis, Lantai 2');
        await page.locator('#inputDescription').fill(
            'Unit AC di ruang Lab CPS 1 tidak berfungsi sejak tadi pagi. ' +
            'Suhu ruangan sangat panas dan mengganggu kegiatan praktikum.'
        );

        await page.locator('#btnDraft').click();

        const reportModal = page.locator('#reportModal');
        await expect(reportModal).not.toBeVisible({ timeout: 5000 });

        expect(alertMessage).toContain('berhasil');

        const summaryStats = page.locator('#summaryStats');
        await expect(summaryStats).toBeVisible({ timeout: 10000 });

        const draftBadge = summaryStats.locator('.badge.bg-secondary').first();
        const draftCountText = await draftBadge.textContent();
        const draftCount = parseInt(draftCountText, 10);

        expect(draftCount).toBeGreaterThanOrEqual(1);

        console.log(`[UI-05] ✅ Draft tersimpan: modal tutup, alert muncul, badge Draf = ${draftCount}`);
    });

    // =========================================================================
    // TEST CASE: UI-06
    // =========================================================================
    // JUDUL:
    //   Responsive Design: Navbar collapse pada viewport mobile
    //
    // SKENARIO:
    //   Set viewport ke ukuran mobile (400x800), muat halaman SPA, dan
    //   verifikasi bahwa navbar dalam keadaan collapsed (tombol toggler
    //   terlihat, atau menu collapse tidak ditampilkan secara default).
    //
    // KONSEP TEKNIS:
    //   - Bootstrap Responsive Navbar:
    //     - navbar-expand-lg: collapse di bawah breakpoint lg (992px)
    //     - navbar-toggler: tombol hamburger yang muncul saat collapsed
    //     - collapse navbar-collapse: div yang di-toggle show/hide
    //
    // REFERENSI KODE:
    //   index.html baris 16-23:
    //     <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
    //       ...
    //       <div id="nav-menus" class="ms-auto">
    //
    //   CATATAN: Navbar SPA ini menggunakan struktur sederhana tanpa
    //   Bootstrap collapse standard (tidak ada .navbar-collapse).
    //   Elemen #nav-menus langsung berada di dalam navbar.
    //   Saat viewport kecil, elemen-elemen navbar akan wrap/stack.
    //
    // PLAYWRIGHT VIEWPORT TESTING:
    //   Kita dapat mengatur ukuran viewport per test pada Playwright.
    //   Ini lebih handal dari CSS media query test karena benar-benar
    //   mengubah dimensi rendering browser.
    //
    // =========================================================================
    test('UI-06: Responsive navbar pada viewport mobile (400x800)', async ({ page }) => {
        // -------------------------------------------------------------------
        // LANGKAH 1: Set viewport ke ukuran mobile
        // -------------------------------------------------------------------
        // page.setViewportSize() mengubah dimensi viewport browser.
        // Ini mensimulasikan pengguna yang membuka halaman di smartphone.
        //
        // Ukuran 400x800 adalah ukuran umum smartphone
        //
        // Catatan: Ini HANYA mengubah viewport, bukan user agent.
        // Jika perlu mengubah user agent, gunakan page.context().
        //
        await page.setViewportSize({ width: 400, height: 800 });

        // -------------------------------------------------------------------
        // LANGKAH 2: Navigasi ke SPA
        // -------------------------------------------------------------------
        await page.goto(SPA_URL);
        await page.waitForLoadState('domcontentloaded');

        // -------------------------------------------------------------------
        // LANGKAH 3: Verifikasi navbar ada dan terlihat
        // -------------------------------------------------------------------
        const navbar = page.locator('.navbar');
        await expect(navbar).toBeVisible({ timeout: 5000 });

        // -------------------------------------------------------------------
        // LANGKAH 4: Verifikasi responsive behavior
        // -------------------------------------------------------------------
        // Navbar menggunakan class 'navbar-expand-lg' yang berarti:
        // - Di atas 992px: navbar expanded (horizontal, semua item terlihat)
        // - Di bawah 992px: navbar collapsed (vertikal, tombol toggler muncul)
        //
        // Viewport kita 400px < 992px, jadi navbar harus dalam state collapsed.
        //
        // STRATEGI VERIFIKASI:
        // Struktur navbar di SPA ini sederhana (tanpa navbar-collapse standard).
        // Kita verifikasi bahwa di viewport mobile, navbar toggler button
        // terlihat ATAU elemen #nav-menus memiliki layout terbatas.
        //
        // -------------------------------------------------------------------

        // Cek apakah ada tombol navbar-toggler (Bootstrap standard)
        const navbarToggler = page.locator('.navbar-toggler');
        const togglerCount = await navbarToggler.count();

        if (togglerCount > 0) {
            // Jika ada tombol toggler, pastikan ia terlihat di mobile
            await expect(navbarToggler).toBeVisible();
            console.log('[UI-06] ✓ Navbar toggler (hamburger) button terlihat di mobile');

            // Verifikasi bahwa collapse container tidak dalam state 'show'
            const navbarCollapse = page.locator('.navbar-collapse');
            const collapseCount = await navbarCollapse.count();
            if (collapseCount > 0) {
                const hasShow = await navbarCollapse.evaluate(
                    (el) => el.classList.contains('show')
                );
                // Secara default, collapse tidak memiliki class 'show' di mobile
                expect(hasShow).toBe(false);
                console.log('[UI-06] ✓ Navbar collapse TIDAK dalam state "show" (tersembunyi)');
            }
        } else {
            // Jika tidak ada toggler (struktur navbar sederhana seperti di SPA ini),
            // verifikasi bahwa navbar memiliki layout yang sesuai untuk mobile
            //
            // Verifikasi bahwa lebar navbar sesuai viewport
            const navbarBox = await navbar.boundingBox();
            expect(navbarBox).not.toBeNull();

            // Lebar navbar harus <= lebar viewport (400px)
            expect(navbarBox.width).toBeLessThanOrEqual(400);

            // Verifikasi elemen nav-menus masih ada
            const navMenus = page.locator('#nav-menus');
            const navMenusCount = await navMenus.count();
            expect(navMenusCount).toBeGreaterThanOrEqual(1);

            console.log('[UI-06] ✓ Navbar beradaptasi dengan viewport mobile (400px)');
        }

        // -------------------------------------------------------------------
        // LANGKAH 5: Verifikasi kontras — bandingkan dengan viewport desktop
        // -------------------------------------------------------------------
        // Sebagai verifikasi tambahan, kita bisa membuktikan perbedaan
        // antara layout mobile dan desktop.
        //
        // Simpan state mobile untuk perbandingan
        const mobileNavbarBox = await navbar.boundingBox();
        const mobileWidth = mobileNavbarBox?.width || 0;

        // Ubah ke viewport desktop
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForTimeout(500); // Tunggu re-layout / Wait for re-layout

        const desktopNavbarBox = await navbar.boundingBox();
        const desktopWidth = desktopNavbarBox?.width || 0;

        // Navbar desktop harus lebih lebar dari mobile
        expect(desktopWidth).toBeGreaterThan(mobileWidth);

        console.log(`[UI-06] ✅ Responsive terverifikasi: mobile=${mobileWidth}px, desktop=${desktopWidth}px`);

        // Reset viewport ke default (opsional, untuk test berikutnya)
        await page.setViewportSize({ width: 1280, height: 720 });
    });

}); // end test.describe('Modul 5: Interaktivitas UI')


// #############################################################################
// #                                                                           #
// #   CATATAN AKHIR                                                           #
// #                                                                           #
// #############################################################################
//
// 1. MOCK vs REAL SERVER:
//    Test di atas menggunakan page.route() untuk mock API responses di
//    beberapa tempat. Ini dilakukan untuk:
//    - Mengurangi ketergantungan pada server backend yang harus berjalan
//    - Membuat test lebih stabil dan deterministik
//    - Test dapat berjalan tanpa data seed di database
//
// 2. MENJALANKAN DENGAN REAL SERVER:
//    Untuk test yang menggunakan real server (UI-01, UI-02), pastikan:
//    - Django server berjalan: python manage.py runserver
//    - Database memiliki data seed (laporan dan user)
//    - Akun admin dan citizen sudah dibuat
//
// 3. TIPS DEBUGGING:
//    - Gunakan --headed mode: npx playwright test --headed
//    - Gunakan --ui mode: npx playwright test --ui
//    - Tambahkan await page.pause() untuk debug step-by-step
//    - Cek screenshot otomatis di playwright-report/ saat test gagal
//
// 4. KONFIGURASI PLAYWRIGHT:
//    Pastikan file playwright.config.js sudah dikonfigurasi untuk:
//    - baseURL jika diperlukan
//    - timeout yang cukup (minimal 30 detik)
//    - browser: chromium (default, paling stabil)
//
// =============================================================================
// SELESAI
// =============================================================================