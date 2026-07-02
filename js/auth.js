// js/auth.js

function setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btn      = form.querySelector('button[type="submit"]');

        // Loading state
        btn.disabled     = true;
        btn.innerHTML    = `<span class="spinner-border spinner-border-sm me-2"></span>Masuk...`;

        try {
            const response = await requestAPI('/api/token/', 'POST', { username, password });

            if (response.status === 200) {
                const data = await response.json();
                localStorage.setItem('access_token',  data.access);
                localStorage.setItem('refresh_token', data.refresh);
                localStorage.setItem('username',      username);
                window.location.hash = '#dashboard';
            } else {
                showToast('Username atau password salah.', 'danger');
            }
        } catch (error) {
            showToast('Tidak dapat terhubung ke server.', 'danger');
            console.error(error);
        } finally {
            btn.disabled  = false;
            btn.innerHTML = `<i class="bi bi-box-arrow-in-right me-2"></i>Masuk`;
        }
    });
}

function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    window.location.hash = '#login';
}

function isLoggedIn() {
    return !!localStorage.getItem('access_token');
}

// Fungsi toast notifikasi global
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const id   = 'toast-' + Date.now();
    const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';

    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="toast align-items-center text-bg-${type} border-0 show mb-2" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${icon} me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto"
                    onclick="document.getElementById('${id}').remove()"></button>
            </div>
        </div>
    `);

    // Auto-hapus setelah 3 detik
    setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.remove();
    }, 3000);
}