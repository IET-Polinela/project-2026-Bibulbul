// js/router.js

const routes = {
    '#login': pageLogin,
    '#dashboard': pageDashboard,
};

function handleRouting() {
    const hash = window.location.hash || '#login';
    const appContent = document.getElementById('app-content');
    
    // Guard: belum login tapi akses selain #login → paksa ke login
    if (!isLoggedIn() && hash !== '#login') {
        window.location.hash = '#login';
        return;
    }

    // Guard: sudah login tapi akses #login → redirect ke dashboard
    if (isLoggedIn() && hash === '#login') {
        window.location.hash = '#dashboard';
        return;
    }

    // Render halaman sesuai hash
    const pageRenderer = routes[hash];
    if (pageRenderer) {
        appContent.innerHTML = pageRenderer();
    } else {
        appContent.innerHTML = `<h3 class="text-center mt-5">404 - Halaman tidak ditemukan</h3>`;
    }

    // Setup form login kalau lagi di halaman login
    if (hash === '#login') {
        setupLoginForm();
    }

    // Update navbar
    renderNavbar();
}

// Dengerin perubahan hash (pindah halaman)
window.addEventListener('hashchange', handleRouting);

// Jalankan saat pertama kali halaman dimuat
window.addEventListener('DOMContentLoaded', handleRouting);