const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000")
  .trim()
  .replace(/\/+$/, "");

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.detail || "Không thể kết nối hệ thống. Vui lòng thử lại.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

export function signIn(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser(token) {
  return request("/api/auth/me", { token });
}

export function refreshSession(token) {
  return request("/api/auth/refresh", { token, method: "POST" });
}

export function signOut(token) {
  return request("/api/auth/logout", { token, method: "POST" });
}
