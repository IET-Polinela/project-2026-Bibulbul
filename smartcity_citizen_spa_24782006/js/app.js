// js/app.js

// Variable global untuk tracking mode edit
let editingReportId = null;
let currentTab = 'my_reports';
let currentPage = 1;

// =====================
// NAVBAR
// =====================
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

// =====================
// HALAMAN LOGIN
// =====================
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

// =====================
// HALAMAN DASHBOARD
// =====================
function pageDashboard() {
    return `
        <div class="row g-4">

            <!-- Kiri 25% - Sidebar -->
            <aside class="col-12 col-lg-3">
                <div class="card border-0 shadow-sm p-3 mb-3">
                    <h6 class="fw-bold text-muted mb-3">MENU</h6>
                    <a href="#dashboard" class="d-flex align-items-center gap-2 p-2 rounded text-decoration-none text-dark">
                        <i class="bi bi-house-fill"></i> Beranda
                    </a>
                    <hr>
                    <button onclick="logout()"
                        class="d-flex align-items-center gap-2 p-2 rounded border-0 bg-transparent text-danger">
                        <i class="bi bi-box-arrow-right"></i> Keluar
                    </button>
                </div>

                <!-- Rekap Status -->
                <div class="card border-0 shadow-sm p-3">
                    <h6 class="fw-bold mb-3">
                        <i class="bi bi-bar-chart-fill text-primary me-2"></i>Rekap Laporan
                    </h6>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="small">Draft</span>
                        <span class="badge bg-secondary" id="countDraft">-</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="small">Diproses</span>
                        <span class="badge bg-warning text-dark" id="countProcessed">-</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="small">Selesai</span>
                        <span class="badge bg-success" id="countDone">-</span>
                    </div>
                </div>
            </aside>

            <!-- Tengah 50% - Konten Utama -->
            <section class="col-12 col-lg-6">
                <!-- Tab Navigation -->
                <div class="d-flex gap-2 mb-3">
                    <button class="btn btn-primary btn-sm fw-bold" onclick="switchTab('my_reports')" id="tabMyReports">
                        <i class="bi bi-person-lines-fill me-1"></i>Laporan Saya
                    </button>
                    <button class="btn btn-outline-primary btn-sm fw-bold" onclick="switchTab('feed')" id="tabFeed">
                        <i class="bi bi-globe me-1"></i>Feed Kota
                    </button>
                    <button class="btn btn-success btn-sm fw-bold ms-auto" onclick="openCreateModal()">
                        <i class="bi bi-plus-circle-fill me-1"></i>Buat Laporan
                    </button>
                </div>

                <!-- List Laporan -->
                <div id="listContainer">
                    <div class="text-center text-muted py-5">
                        <div class="spinner-border text-primary" role="status"></div>
                        <p class="mt-2">Memuat data...</p>
                    </div>
                </div>

                <!-- Pagination -->
                <div id="paginationContainer" class="d-flex justify-content-center mt-3"></div>
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

// =====================
// SWITCH TAB
// =====================
function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;

    document.getElementById('tabMyReports').className =
        tab === 'my_reports' ? 'btn btn-primary btn-sm fw-bold' : 'btn btn-outline-primary btn-sm fw-bold';
    document.getElementById('tabFeed').className =
        tab === 'feed' ? 'btn btn-primary btn-sm fw-bold' : 'btn btn-outline-primary btn-sm fw-bold';

    loadDashboardData(tab, 1);
}

// =====================
// LOAD DATA DARI API
// =====================
async function loadDashboardData(tab = currentTab, page = currentPage) {
    currentTab = tab;
    currentPage = page;

    const response = await requestAPI(`/api/report/?tab=${tab}&page=${page}`, 'GET');

    if (response && response.status === 200) {
        const data = await response.json();

        const reports    = data.results ?? [];
        const totalCount = data.count ?? 0;
        const totalPages = Math.ceil(totalCount / 10);

        renderList(reports);
        renderPagination(totalPages, page);
        loadSummaryStats();

    } else {
        if (response && response.status === 401) {
            alert('Sesi habis, silakan login ulang.');
            logout();
            return;
        }
        const listContainer = document.getElementById('listContainer');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="col-12 text-center text-muted p-5">
                    <i class="bi bi-exclamation-triangle fs-1"></i>
                    <p>Gagal memuat data laporan.</p>
                </div>
            `;
        }
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) paginationContainer.innerHTML = '';
    }
}

// =====================
// RENDER KARTU LAPORAN
// =====================
function renderList(reports) {
    const listContainer = document.getElementById('listContainer');
    if (!listContainer) return;

    if (reports.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-inbox fs-1"></i>
                <p class="mt-2">Belum ada laporan.</p>
            </div>
        `;
        return;
    }

    const statusConfig = {
        'DRAFT':       { color: 'secondary', label: 'Draft',          progress: 10  },
        'REPORTED':    { color: 'warning',   label: 'Diajukan',       progress: 30  },
        'VERIFIED':    { color: 'info',      label: 'Diverifikasi',   progress: 55  },
        'IN_PROGRESS': { color: 'primary',   label: 'Diproses',       progress: 75  },
        'ONPROGRESS':  { color: 'primary',   label: 'Diproses',       progress: 75  },
        'RESOLVED':    { color: 'success',   label: 'Selesai',        progress: 100 },
        'DONE':        { color: 'success',   label: 'Selesai',        progress: 100 },
        'REJECTED':    { color: 'danger',    label: 'Ditolak',        progress: 100 },
    };

    listContainer.innerHTML = reports.map(report => {
        const s = statusConfig[report.status] || { color: 'secondary', label: report.status, progress: 0 };

        const editButton = (report.is_owner && report.status === 'DRAFT') ? `
            <button class="btn btn-sm btn-outline-secondary" onclick="editDraft(${report.id})">
                <i class="bi bi-pencil me-1"></i>Edit
            </button>
        ` : '';

        return `
            <div class="card border-0 shadow-sm mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="fw-bold mb-0">${report.title}</h6>
                        <span class="badge bg-${s.color}">${s.label}</span>
                    </div>
                    <p class="text-muted small mb-1">
                        <i class="bi bi-tag me-1"></i>${report.category}
                    </p>
                    <p class="text-muted small mb-2">
                        <i class="bi bi-geo-alt me-1"></i>${report.location}
                    </p>
                    <p class="small mb-2">${report.description}</p>
                    <div class="progress mb-2" style="height: 6px;">
                        <div class="progress-bar bg-${s.color}" style="width: ${s.progress}%"></div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">
                            <i class="bi bi-person me-1"></i>${report.reporter}
                        </small>
                        ${editButton}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// =====================
// RENDER PAGINATION
// =====================
function renderPagination(totalPages, activePage) {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer || totalPages <= 1) return;

    let html = '<nav><ul class="pagination pagination-sm flex-wrap justify-content-center">';

    // Tombol Prev
    html += `
        <li class="page-item ${activePage === 1 ? 'disabled' : ''}">
            <button class="page-link" onclick="loadDashboardData('${currentTab}', ${activePage - 1})">
                <i class="bi bi-chevron-left"></i>
            </button>
        </li>
    `;

    // Logika tampilkan nomor halaman (maks 5 di sekitar halaman aktif)
    let startPage = Math.max(1, activePage - 2);
    let endPage   = Math.min(totalPages, activePage + 2);

    // Selalu tampilkan halaman 1
    if (startPage > 1) {
        html += `<li class="page-item"><button class="page-link" onclick="loadDashboardData('${currentTab}', 1)">1</button></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // Halaman di sekitar aktif
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === activePage ? 'active' : ''}">
                <button class="page-link" onclick="loadDashboardData('${currentTab}', ${i})">${i}</button>
            </li>
        `;
    }

    // Selalu tampilkan halaman terakhir
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `<li class="page-item"><button class="page-link" onclick="loadDashboardData('${currentTab}', ${totalPages})">${totalPages}</button></li>`;
    }

    // Tombol Next
    html += `
        <li class="page-item ${activePage === totalPages ? 'disabled' : ''}">
            <button class="page-link" onclick="loadDashboardData('${currentTab}', ${activePage + 1})">
                <i class="bi bi-chevron-right"></i>
            </button>
        </li>
    `;

    html += '</ul></nav>';
    paginationContainer.innerHTML = html;
}

// =====================
// SUMMARY STATS SIDEBAR
// =====================
async function loadSummaryStats() {
    const response = await requestAPI('/api/report/?tab=my_reports&page_size=1000', 'GET');
    if (!response || response.status !== 200) return;

    const data    = await response.json();
    const reports = data.results ?? [];

    const draft     = reports.filter(r => r.status === 'DRAFT').length;
    const processed = reports.filter(r => ['REPORTED','VERIFIED','ONPROGRESS','IN_PROGRESS'].includes(r.status)).length;
    const done      = reports.filter(r => ['DONE','RESOLVED'].includes(r.status)).length;

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('countDraft',     draft);
    el('countProcessed', processed);
    el('countDone',      done);
}

// =====================
// MODAL - BUAT LAPORAN BARU
// =====================
function openCreateModal() {
    editingReportId = null;
    document.getElementById('reportForm').reset();
    document.getElementById('reportModalLabel').innerHTML =
        '<i class="bi bi-pencil-square me-2"></i>Buat Laporan Baru';
    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    modal.show();
    setupModalButtons();
}

// =====================
// MODAL - EDIT DRAFT
// =====================
async function editDraft(id) {
    editingReportId = id;
    const response = await requestAPI(`/api/report/${id}/`, 'GET');
    if (!response || response.status !== 200) return;

    const report = await response.json();

    document.getElementById('fieldTitle').value       = report.title;
    document.getElementById('fieldCategory').value    = report.category;
    document.getElementById('fieldDescription').value = report.description;
    document.getElementById('fieldLocation').value    = report.location;
    document.getElementById('reportModalLabel').innerHTML =
        '<i class="bi bi-pencil me-2"></i>Edit Draft Laporan';

    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    modal.show();
    setupModalButtons();
}

// =====================
// SETUP TOMBOL MODAL
// =====================
function setupModalButtons() {
    document.getElementById('btnDraft').onclick  = () => submitReport('DRAFT');
    document.getElementById('btnSubmit').onclick = () => submitReport('REPORTED');
}

// =====================
// SUBMIT LAPORAN
// =====================
async function submitReport(status) {
    const body = {
        title:       document.getElementById('fieldTitle').value,
        category:    document.getElementById('fieldCategory').value,
        description: document.getElementById('fieldDescription').value,
        location:    document.getElementById('fieldLocation').value,
        status:      status,
    };

    const isEdit   = editingReportId !== null;
    const method   = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `/api/report/${editingReportId}/` : '/api/report/';

    const response = await requestAPI(endpoint, method, body);

    if (response && (response.status === 201 || response.status === 200)) {
        bootstrap.Modal.getInstance(document.getElementById('reportModal')).hide();
        document.getElementById('reportForm').reset();
        editingReportId = null;
        loadDashboardData(currentTab, currentPage);
    } else {
        const err = await response.json();
        alert('Gagal menyimpan laporan: ' + JSON.stringify(err));
    }
}