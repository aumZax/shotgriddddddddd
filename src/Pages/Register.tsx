import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ENDPOINTS from "../config";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [showAvatarModal, setShowAvatarModal] = useState<boolean>(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");

  const defaultAvatars = [
    { id: "avatar1", src: "/avartar/avartar1.jpg" },
    { id: "avatar2", src: "/avartar/avartar2.jpg" },
    { id: "avatar3", src: "/avartar/avartar3.jpg" },
    { id: "avatar4", src: "/avartar/avartar4.jpg" },
    { id: "avatar5", src: "/avartar/avartar5.jpg" },
    { id: "avatar6", src: "/avartar/avartar6.jpg" },
    { id: "avatar7", src: "/avartar/avartar7.jpg" },
    { id: "avatar8", src: "/avartar/avartar8.jpg" },
    { id: "avatar9", src: "/avartar/avartar9.jpg" },
  ];

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegisterClick = (): void => {
    setError("");

    // Validation
    if (!email || !username || !password || !confirmPassword ) {
      return setError("Please fill in all fields");
    }

    if (!validateEmail(email)) {
      return setError("Please enter a valid email address");
    }

    if (username.length < 3) {
      return setError("Username must be at least 3 characters");
    }

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    // Open avatar selection modal
    setShowAvatarModal(true);
  };

  // ฟังก์ชัน upload avatar ไปที่ API ก่อน
  const uploadAvatarToServer = async (avatarSrc: string): Promise<string> => {
    try {
      console.log("📤 Uploading avatar from:", avatarSrc);

      // ดึงไฟล์จาก public folder
      const response = await fetch(avatarSrc);
      const blob = await response.blob();
      const fileName = avatarSrc.split('/').pop() || 'avatar.jpg';
      const file = new File([blob], fileName, { type: blob.type });

      // สร้าง FormData
      const formData = new FormData();
      formData.append('avatar', file);

      // เรียก API upload
      const uploadResponse = await axios.post(
        ENDPOINTS.UPLOAD_AVATAR,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log("✅ Avatar uploaded successfully:", uploadResponse.data);
      
      // ได้ imageURL กลับมา เช่น "uploads/avatars/xxx.jpg"
      return uploadResponse.data.imageURL;

    } catch (err) {
      console.error("❌ Avatar upload failed:", err);
      throw new Error("Failed to upload avatar. Please try again.");
    }
  };

  const handleAvatarConfirm = async (): Promise<void> => {
    if (!selectedAvatar) {
      setError("Please select an avatar");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // หา src ของ avatar ที่เลือก
      const selectedAvatarObj = defaultAvatars.find(av => av.id === selectedAvatar);
      if (!selectedAvatarObj) {
        throw new Error("Avatar not found");
      }

      console.log("📝 Selected avatar:", selectedAvatarObj.src);

      // ขั้นตอนที่ 1: Upload avatar ไปที่ API ก่อน
      const uploadedImageURL = await uploadAvatarToServer(selectedAvatarObj.src);
      console.log("✅ Got imageURL from API:", uploadedImageURL);

      // ขั้นตอนที่ 2: Register ด้วย imageURL ที่ได้จาก API
      const registrationData = {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: "Viewer",
        imageURL: uploadedImageURL, // ใช้ URL ที่ได้จาก API upload
      };

      console.log("📝 Registering user with data:", {
        username: registrationData.username,
        email: registrationData.email,
        role: registrationData.role,
        imageURL: registrationData.imageURL,
        password: "***hidden***"
      });

      // Register via API
      const registerResponse = await axios.post(
        ENDPOINTS.REGISTER, 
        registrationData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      console.log("✅ Registration successful!", registerResponse.data);
      
      alert("Registration successful! Please login.");
      navigate("/");
      
    } catch (err) {
      console.error("❌ Full error:", err);
      
      let errorMessage = "Registration failed. Please try again.";
      
      if (axios.isAxiosError(err)) {
        if (err.response) {
          const status = err.response.status;
          const data = err.response.data;
          
          console.error("Response status:", status);
          console.error("Response data:", data);
          
          errorMessage = data?.message 
            || data?.error 
            || data?.msg
            || `Server error (${status})`;
          
          if (status === 409 || errorMessage.toLowerCase().includes('already exists')) {
            errorMessage = "Email or username already exists";
          } else if (status === 400) {
            errorMessage = data?.message || "Invalid registration data";
          } else if (status === 500) {
            errorMessage = "Server error. Please try again later or contact support.";
          }
        } else if (err.request) {
          console.error("No response received:", err.request);
          errorMessage = "No response from server. Check your connection.";
        } else {
          errorMessage = err.message || "Failed to send registration request";
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      if (!errorMessage.includes("Server error")) {
        setShowAvatarModal(false);
      }
      
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = (): void => {
    if (!loading) {
      setShowAvatarModal(false);
      setSelectedAvatar("");
      setError("");
    }
  };

  // Styles
  const contentStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "rgba(15, 14, 14, 0.8)",
    padding: "20px",
    borderRadius: "10px",
    boxShadow: "0 0 10px rgba(0,0,0,0.3)",
    width: "300px",
    height: "max-content",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
  };

  const titleStyle: React.CSSProperties = {
    color: "rgba(36, 47, 167, 1)",
    fontSize: "xx-large",
    fontWeight: "800",
    paddingBottom: "20px",
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "5px",
    border: "none",
    fontSize: "16px",
    outline: "none",
    backgroundColor: "rgba(0, 0, 0, 0.63)",
    boxShadow: "inset 0 0 15px rgba(255,255,255,0.2)",
    color: "white",
    fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px",
    fontSize: "1rem",
    borderRadius: "5px",
    border: "none",
    backgroundColor: "rgba(2, 120, 247, 1)",
    color: "black",
    fontWeight: "700",
    cursor: "pointer",
    transition: "background-color 0.2s",
  };

  const buttonDisabledStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#aaa",
    cursor: "not-allowed",
    opacity: 0.6,
  };

  const errorStyle: React.CSSProperties = {
    color: "#ff6b6b",
    marginBottom: "15px",
    textAlign: "center",
    fontSize: "0.9rem",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    padding: "8px",
    borderRadius: "5px",
    border: "1px solid rgba(255, 107, 107, 0.3)",
  };

  const logoStyle: React.CSSProperties = {
    width: "90px",
    height: "90px",
    objectFit: "cover",
    borderRadius: "50%",
    margin: "0 auto 20px",
    display: "block",
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
  };

  return (
    <>
      {/* Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: -2, overflow: "hidden" }}>
        <iframe
          src="/bg.html"
          title="space-bg"
          style={{ width: "100%", height: "100%", border: "none", pointerEvents: "none" }}
        />
      </div>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          background: "radial-gradient(circle at center, rgba(0,0,0,0.25), rgba(0,0,0,0.85))",
        }}
      />

      {/* Register Form */}
      <div style={contentStyle}>
        <div style={cardStyle}>
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSX7twFVDnuQJdGFWns0m7bKsKNK5tldjNBbA&s"
            alt="logo"
            style={logoStyle}
          />
          <h2 style={titleStyle}>SIGN UP</h2>
          {error && <div style={errorStyle}>{error}</div>}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            disabled={loading}
            autoComplete="email"
          />
          <input
            type="text"
            placeholder="Username (min 3 characters)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            disabled={loading}
            autoComplete="username"
          />
         
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            disabled={loading}
            autoComplete="new-password"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={inputStyle}
            disabled={loading}
            autoComplete="new-password"
          />

          <button
            onClick={handleRegisterClick}
            disabled={loading}
            style={loading ? buttonDisabledStyle : buttonStyle}
          >
            {loading ? "Registering..." : "Register"}
          </button>

          <p style={{ textAlign: "center", marginTop: "20px", fontSize: "0.9rem", color: "white" }}>
            Already have an account?{" "}
            <span 
              style={{ 
                color: "#667eea", 
                cursor: loading ? "not-allowed" : "pointer",
                textDecoration: "underline"
              }} 
              onClick={() => !loading && navigate("/")}
            >
              Sign In
            </span>
          </p>
        </div>
      </div>

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={handleModalClose}
        >
          <div
            style={{
              backgroundColor: "rgba(15, 14, 14, 0.95)",
              padding: "20px",
              borderRadius: "15px",
              width: "90%",
              maxWidth: "480px",
              position: "relative",
              border: "2px solid rgba(2, 120, 247, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            {!loading && (
              <button
                onClick={handleModalClose}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  color: "white",
                  fontSize: "1.5rem",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            )}

            <h2
              style={{
                color: "rgba(2, 120, 247, 1)",
                textAlign: "center",
                marginBottom: "8px",
                fontSize: "1.5rem",
                fontWeight: "700",
              }}
            >
              Choose Your Avatar
            </h2>

            {error && (
              <div style={{ 
                ...errorStyle, 
                marginTop: "10px",
                marginBottom: "15px" 
              }}>
                {error}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              {defaultAvatars.map((avatar, index) => (
                <div
                  key={avatar.id}
                  onClick={() => !loading && setSelectedAvatar(avatar.id)}
                  style={{
                    cursor: loading ? "not-allowed" : "pointer",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border:
                      selectedAvatar === avatar.id
                        ? "4px solid rgba(2, 120, 247, 1)"
                        : "4px solid rgba(255,255,255,0.1)",
                    aspectRatio: "1",
                    transition: "transform 0.2s, border-color 0.2s",
                    transform: selectedAvatar === avatar.id ? "scale(1.05)" : "scale(1)",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAvatar !== avatar.id) {
                      e.currentTarget.style.transform = "scale(1)";
                    }
                  }}
                >
                  <img
                    src={avatar.src}
                    alt={`avatar ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleAvatarConfirm}
              disabled={!selectedAvatar || loading}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "0.95rem",
                borderRadius: "8px",
                border: "none",
                backgroundColor:
                  !selectedAvatar || loading ? "#555" : "rgba(2, 120, 247, 1)",
                color: "white",
                fontWeight: "700",
                cursor: !selectedAvatar || loading ? "not-allowed" : "pointer",
                opacity: !selectedAvatar || loading ? 0.6 : 1,
                transition: "background-color 0.2s",
              }}
            >
              {loading ? "⏳ Registering..." : "✓ Confirm & Register"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
