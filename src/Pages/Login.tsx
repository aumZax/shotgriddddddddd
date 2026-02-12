import { useEffect, useState } from "react";
import axios from "axios";
import ENDPOINTS from "../config";
import { useNavigate } from "react-router-dom";



export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
  const token = localStorage.getItem("token");

  if (token) {
    navigate("/Home");
  }
}, []);

    const handleLogin = async () => {
    if (!identifier || !password) {
      setError("Please enter username/email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await axios.post(ENDPOINTS.LOGIN, {
        identifier,
        password,
      });

      // 
      // console.log("✅ Login response:", data);

      // เก็บข้อมูล user
      const user = data.user;
      if (!user) throw new Error("Invalid login response");
      // console.log("✅ Logged in user:", user);

      localStorage.clear();
      
      localStorage.setItem("authUser", JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        imageURL: user.imageURL, 
      }));

      localStorage.setItem("token", data.token);
      // console.log("✅ Login successful, navigating to /Home");
      navigate("/Home");

    } catch (err) {
      // console.error("❌ Login error:", err);
      if (axios.isAxiosError(err)) {
        // API ส่ง error message กลับมา
        const errorMsg = err.response?.data?.message || "Login failed";
        setError(errorMsg);
      } else {
        setError("Invalid username/email or password");
      }
    } finally {
      setLoading(false);
    }
  };
  /* ---------- styles ---------- */
  const contentStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(10, 10, 30, 0.30)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(18px) saturate(140%)",
    padding: "26px",
    borderRadius: "18px",
    width: "320px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.15)",
    boxShadow: `
      0 0 60px rgba(120, 100, 255, 0.35),
      0 25px 70px rgba(0,0,0,0.8)
    `,
  };

  const titleStyle: React.CSSProperties = {
    color: "#4f6bff",
    fontSize: "2rem",
    fontWeight: 800,
    marginBottom: "20px",
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px",
    marginBottom: "12px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "rgba(0,0,0,0.65)",
    color: "white",
    fontSize: "16px",
    outline: "none",
    width: "100%",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#0278f7",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    color: "white",
  };

  const buttonDisabledStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#555",
    cursor: "not-allowed",
  };

  const errorStyle: React.CSSProperties = {
    color: "#ff4d4f",
    marginBottom: "10px",
    fontSize: "0.9rem",
  };

  const logoStyle: React.CSSProperties = {
    width: "90px",
    height: "90px",
    borderRadius: "50%",
    margin: "0 auto 20px",
    boxShadow: "0 10px 20px rgba(0,0,0,0.4)",
  };

  /* ---------- render ---------- */
  return (
    <>
      {/* ===== Space BG ===== */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -2,
          overflow: "hidden",
        }}
      >
        <iframe
          src="/bg.html"
          title="space-bg"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* ===== Dark Overlay ===== */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0.35), rgba(0,0,0,0.85))",
        }}
      />

      {/* ===== Login Content ===== */}
      <div style={contentStyle}>
        <div style={cardStyle}>
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSX7twFVDnuQJdGFWns0m7bKsKNK5tldjNBbA&s"
            alt="logo"
            style={logoStyle}
          />

          <h2 style={titleStyle}>SIGN IN</h2>

          {error && <div style={errorStyle}>{error}</div>}

          <input
            type="text"
            placeholder="Username or Email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            style={inputStyle}
            autoComplete="username"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            autoComplete="current-password"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            style={loading ? buttonDisabledStyle : buttonStyle}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p style={{ marginTop: 20, fontSize: "0.9rem", color: "white" }}>
            Don't have an account?{" "}
            <span
              style={{ color: "#667eea", cursor: "pointer" }}
              onClick={() => navigate("/register")}
            >
              sign up
            </span>
          </p>
        </div>
      </div>
    </>
  );
}