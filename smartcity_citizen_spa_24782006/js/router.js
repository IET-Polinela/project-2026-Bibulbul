// js/router.js

const routes = {
    '#login':     pageLogin,
    '#dashboard': pageDashboard,
};

function handleRouting() {
    const hash       = window.location.hash || '#login';
    const appContent = document.getElementById('app-content');

    // Guard: belum login → paksa ke login
    if (!isLoggedIn() && hash !== '#login') {
        window.location.hash = '#login';
        return;
    }

    // Guard: sudah login → redirect ke dashboard
    if (isLoggedIn() && hash === '#login') {
        window.location.hash = '#dashboard';
        return;
    }

    // Render halaman
    const pageRenderer = routes[hash];
    if (pageRenderer) {
        appContent.innerHTML = pageRenderer();
    } else {
        appContent.innerHTML = `
            <div class="text-center mt-5 text-muted">
                <i class="bi bi-map fs-1"></i>
                <h4 class="mt-3">404 — Halaman tidak ditemukan</h4>
                <a href="#dashboard" class="btn btn-primary mt-3">Kembali</a>
            </div>
        `;
    }

    if (hash === '#login')     setupLoginForm();
    if (hash === '#dashboard') loadDashboardData('my_reports', 1);

    renderNavbar();
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('DOMContentLoaded', handleRouting);