import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { getCurrentUser, signIn } from "./api.js";

const TOKEN_KEY = "customer-management-access-token";

function LoginPage({ onSignedIn, initialError }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await signIn(email.trim(), password);
      sessionStorage.setItem(TOKEN_KEY, result.access_token);
      onSignedIn(result.user);
      navigate(`/dashboard/${encodeURIComponent(result.user.role)}`, {
        replace: true,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">
          CM
        </div>
        <p className="eyebrow">CUSTOMER MANAGEMENT</p>
        <h1 id="login-title">Đăng nhập</h1>
        <p className="intro">Đăng nhập để tiếp tục vào hệ thống của bạn.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <p className="security-note">
          Tài khoản được cấp bởi quản trị viên hệ thống.
        </p>
      </section>
    </main>
  );
}

function DashboardPage({ user, onSignOut }) {
  const { role } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role !== user.role) {
      navigate(`/dashboard/${encodeURIComponent(user.role)}`, { replace: true });
    }
  }, [navigate, role, user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="dashboard-layout">
      <header className="dashboard-header">
        <Link
          className="dashboard-brand"
          to={`/dashboard/${encodeURIComponent(user.role)}`}
        >
          <span className="brand-mark small" aria-hidden="true">
            CM
          </span>
          Customer Management
        </Link>
        <button
          className="sign-out-button"
          type="button"
          onClick={() => {
            onSignOut();
            navigate("/login", { replace: true });
          }}
        >
          Đăng xuất
        </button>
      </header>
      <section className="welcome-card">
        <p className="eyebrow">TRANG CHỦ THEO VAI TRÒ</p>
        <h1>Xin chào!</h1>
        <p>
          Bạn đã đăng nhập với tài khoản <strong>{user.email}</strong>.
        </p>
        <div className="role-badge">
          Vai trò: <strong>{user.role}</strong>
        </div>
        <p className="placeholder-note">
          Đây là trang chủ khởi tạo theo role. Có thể bổ sung dashboard riêng khi
          chốt danh sách vai trò và nghiệp vụ tương ứng.
        </p>
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setCheckingSession(false);
      return;
    }

    getCurrentUser(token)
      .then(setUser)
      .catch((requestError) => {
        if (requestError.status === 401) {
          sessionStorage.removeItem(TOKEN_KEY);
        } else {
          setSessionError(requestError.message);
        }
      })
      .finally(() => setCheckingSession(false));
  }, []);

  function signOut() {
    sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  if (checkingSession) {
    return <main className="loading-screen">Đang kiểm tra phiên đăng nhập...</main>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate
              to={`/dashboard/${encodeURIComponent(user.role)}`}
              replace
            />
          ) : (
            <LoginPage onSignedIn={setUser} initialError={sessionError} />
          )
        }
      />
      <Route
        path="/dashboard/:role"
        element={<DashboardPage user={user} onSignOut={signOut} />}
      />
      <Route
        path="*"
        element={
          <Navigate
            to={user ? `/dashboard/${encodeURIComponent(user.role)}` : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
}
