/**
 * TaskYar Web 2.0 - Authenticated API Client
 */

function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : (window.__CSRF_TOKEN__ || '');
}

export async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': getCsrfToken(),
        ...(options.headers || {})
    };

    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }

    const config = {
        credentials: 'same-origin',
        ...options,
        headers
    };

    const response = await fetch(endpoint, config);

    if (response.status === 204) {
        return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        if (response.status === 401 && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('taskyar:unauthorized'));
        }
        const error = new Error((data && data.message) ? data.message : `Request failed with status ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}
