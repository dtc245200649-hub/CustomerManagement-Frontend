import { useEffect, useRef, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { getCurrentUser, refreshSession, signIn, signOut } from "./api.js";

const TOKEN_KEY = "customer-management-access-token";
const SESSION_CHECK_INTERVAL_MS = 15_000;
const SESSION_ACTIVITY_WINDOW_MS = 5 * 60_000;
const SESSION_REFRESH_LEAD_MS = 60_000;

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
      onSignedIn(result);
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

function DashboardPage({ user, onSignOut, error }) {
  const { role } = useParams();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

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
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            try {
              if (await onSignOut()) {
                navigate("/login", { replace: true });
              }
            } finally {
              setSigningOut(false);
            }
          }}
        >
          {signingOut ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
      </header>
      <section className="welcome-card">
        <p className="eyebrow">TRANG CHỦ THEO VAI TRÒ</p>
        <h1>Xin chào!</h1>
        <p>
          Bạn đã đăng nhập với tài khoản <strong>{user.email}</strong>.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
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
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [authError, setAuthError] = useState("");
  const lastActivityAt = useRef(Date.now());
  const refreshingSession = useRef(false);

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setCheckingSession(false);
      return;
    }

    getCurrentUser(token)
      .then((currentUser) => {
        setUser(currentUser);
        setSession({
          expiresAt: Date.now() + currentUser.expires_in * 1000,
          lifetimeMs: currentUser.expires_in * 1000,
        });
      })
      .catch((requestError) => {
        if (requestError.status === 401) {
          sessionStorage.removeItem(TOKEN_KEY);
          setSessionError(requestError.message);
        } else {
          setSessionError(requestError.message);
        }
      })
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!user || !session) {
      return undefined;
    }

    const recordActivity = () => {
      lastActivityAt.current = Date.now();
    };
    const expireSession = (message) => {
      sessionStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setSession(null);
      setSessionError(message);
      setAuthError("");
    };
    const activityEvents = [
      "pointerdown",
      "pointermove",
      "keydown",
      "touchstart",
      "wheel",
      "focus",
    ];
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity),
    );

    const timer = window.setInterval(async () => {
      const now = Date.now();
      if (now >= session.expiresAt) {
        expireSession("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return;
      }

      const refreshBeforeMs = Math.min(
        SESSION_REFRESH_LEAD_MS,
        session.lifetimeMs / 2,
      );
      const isRecentlyActive =
        now - lastActivityAt.current <= SESSION_ACTIVITY_WINDOW_MS;
      if (
        now < session.expiresAt - refreshBeforeMs ||
        !isRecentlyActive ||
        refreshingSession.current
      ) {
        return;
      }

      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) {
        expireSession("Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.");
        return;
      }

      refreshingSession.current = true;
      try {
        const result = await refreshSession(token);
        if (sessionStorage.getItem(TOKEN_KEY) !== token) {
          return;
        }
        sessionStorage.setItem(TOKEN_KEY, result.access_token);
        setSession({
          expiresAt: Date.now() + result.expires_in * 1000,
          lifetimeMs: result.expires_in * 1000,
        });
        setAuthError("");
      } catch (requestError) {
        if (requestError.status === 401) {
          expireSession("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        } else {
          setAuthError(requestError.message);
        }
      } finally {
        refreshingSession.current = false;
      }
    }, SESSION_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity),
      );
    };
  }, [session, user]);

  function handleSignedIn(result) {
    sessionStorage.setItem(TOKEN_KEY, result.access_token);
    setUser(result.user);
    setSession({
      expiresAt: Date.now() + result.expires_in * 1000,
      lifetimeMs: result.expires_in * 1000,
    });
    setSessionError("");
    setAuthError("");
    lastActivityAt.current = Date.now();
  }

  async function handleSignOut() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setSession(null);
      return true;
    }

    try {
      await signOut(token);
      sessionStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setSession(null);
      setAuthError("");
      return true;
    } catch (requestError) {
      if (requestError.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setSession(null);
        setSessionError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return true;
      }
      setAuthError(requestError.message);
      return false;
    }
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
            <LoginPage onSignedIn={handleSignedIn} initialError={sessionError} />
          )
        }
      />
      <Route
        path="/dashboard/:role"
        element={
          <DashboardPage
            user={user}
            onSignOut={handleSignOut}
            error={authError}
          />
        }
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
