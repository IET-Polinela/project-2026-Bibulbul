// js/api.js

const BASE_URL = 'http://103.151.63.71:8009';

async function requestAPI(endpoint, method = 'GET', bodyData = null) {
    const headers = {
        'Content-Type': 'application/json',
    };

    // Ambil token dari localStorage, sisipkan ke Authorization header
    const token = localStorage.getItem('access_token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method: method,
        headers: headers,
    };

    // Kalau ada body data, tambahkan ke request
    if (bodyData) {
        options.body = JSON.stringify(bodyData);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    return response;
}