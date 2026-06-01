// js/auth.js

function setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async function(event) {
        event.preventDefault(); // Cegah halaman reload & password bocor ke URL

        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        try {
            // Kirim POST ke /api/token/
            const response = await requestAPI('/api/token/', 'POST', {
                username: username,
                password: password,
            });

            if (response.status === 200) {
                const data = await response.json();

                // Simpan token ke localStorage
                localStorage.setItem('access_token', data.access);
                localStorage.setItem('refresh_token', data.refresh);
                localStorage.setItem('username', username);

                alert(`Login berhasil! Selamat datang, ${username}!`);

                // Redirect ke dashboard
                window.location.hash = '#dashboard';

            } else {
                alert('Login gagal! Username atau password salah.');
            }

        } catch (error) {
            alert('Tidak dapat terhubung ke server. Pastikan backend berjalan!');
            console.error(error);
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