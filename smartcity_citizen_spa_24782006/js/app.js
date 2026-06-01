// js/app.js

// Update navbar sesuai status login
function renderNavbar() {
    const navMenus = document.getElementById('nav-menus');
    if (!navMenus) return;

    if (isLoggedIn()) {
        const username = localStorage.getItem('username') || 'Warga';
        navMenus.innerHTML = `
            <span class="navbar-text text-white me-3">
                <i class="bi bi-person-circle me-1"></i>${username}
            </span>
            <button class="btn btn-outline-light btn-sm" onclick="logout()">
                <i class="bi bi-box-arrow-right me-1"></i>Keluar
            </button>
        `;
    } else {
        navMenus.innerHTML = `
            <a href="#login" class="btn btn-outline-light btn-sm">
                <i class="bi bi-box-arrow-in-right me-1"></i>Masuk
            </a>
        `;
    }
}

// Konten halaman Login
function pageLogin() {
    return `
        <div class="row justify-content-center mt-5">
            <div class="col-md-4">
                <div class="card shadow-sm border-0 p-4">
                    <h4 class="fw-bold text-center mb-4">
                        <i class="bi bi-buildings-fill text-primary me-2"></i>Login Warga
                    </h4>
                    <form id="loginForm">
                        <div class="mb-3">
                            <label class="form-label">Username</label>
                            <input type="text" id="loginUsername"
                                class="form-control" placeholder="Username" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Password</label>
                            <input type="password" id="loginPassword"
                                class="form-control" placeholder="Password" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100 fw-bold">
                            <i class="bi bi-box-arrow-in-right me-2"></i>Masuk
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
}

// Konten halaman Dashboard (3 kolom responsive)
function pageDashboard() {
    const username = localStorage.getItem('username') || 'Warga';
    return `
        <div class="row g-4">

            <!-- Kiri 25% -->
            <aside class="col-12 col-lg-3">
                <div class="card border-0 shadow-sm p-3">
                    <h6 class="fw-bold text-muted mb-3">MENU</h6>
                    <a href="#dashboard" class="d-flex align-items-center gap-2 p-2 rounded text-decoration-none text-dark">
                        <i class="bi bi-house-fill"></i> Beranda
                    </a>
                    <a href="#laporan" class="d-flex align-items-center gap-2 p-2 rounded text-decoration-none text-dark">
                        <i class="bi bi-file-earmark-text"></i> Laporan Saya
                    </a>
                    <hr>
                    <button onclick="logout()"
                        class="d-flex align-items-center gap-2 p-2 rounded border-0 bg-transparent text-danger">
                        <i class="bi bi-box-arrow-right"></i> Keluar
                    </button>
                </div>
            </aside>

            <!-- Tengah 50% -->
            <section class="col-12 col-lg-6">
                <div class="card border-0 shadow-sm p-4 text-center text-muted">
                    <i class="bi bi-inbox fs-1"></i>
                    <h5 class="mt-3">Selamat Datang, ${username}!</h5>
                    <p class="small">Koneksi API untuk data laporan akan diimplementasikan pada Lab 12.</p>
                </div>
                <div class="mt-3">
                    <button class="btn btn-primary w-100 fw-bold">
                        <i class="bi bi-plus-circle-fill me-2"></i>Buat Laporan Baru
                    </button>
                </div>
            </section>

            <!-- Kanan 25% -->
            <aside class="col-12 col-lg-3">
                <div class="card border-0 shadow-sm p-3">
                    <h6 class="fw-bold mb-3">
                        <i class="bi bi-info-circle-fill text-primary me-2"></i>Pengumuman
                    </h6>
                    <p class="small text-muted">Belum ada pengumuman terbaru.</p>
                </div>
            </aside>

        </div>
    `;
}