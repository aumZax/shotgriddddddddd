import { useState } from "react";
import ENDPOINTS from "../config";

interface AuthUser {
    id?: string;
    username?: string;
    fullName?: string;
    email?: string;
    role?: string;
    imageURL?: string;
    bio?: string;
    created_at?: string;
}

type ViewMode = "profile" | "edit" | "changepass";

const Profile = () => {
    // อ่านข้อมูล user จาก localStorage
    const [user, setUser] = useState<AuthUser | null>(() => {
        const storedUser = localStorage.getItem("authUser");
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const [viewMode, setViewMode] = useState<ViewMode>("profile");
    
    // State สำหรับ Edit Profile
    const [editForm, setEditForm] = useState({
        username: user?.username || "",
        fullName: user?.fullName || "",
        bio: user?.bio || "",
        imageURL: user?.imageURL || "",
    });

    // State สำหรับ Change Password
    const [passForm, setPassForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const handleSaveProfile = () => {
        const updatedUser = { ...user, ...editForm };
        setUser(updatedUser);
        localStorage.setItem("authUser", JSON.stringify(updatedUser));
        setViewMode("profile");
        alert("บันทึกข้อมูลสำเร็จ!");
    };

    const handleChangePassword = () => {
        if (passForm.newPassword !== passForm.confirmPassword) {
            alert("รหัสผ่านใหม่ไม่ตรงกัน!");
            return;
        }
        if (passForm.newPassword.length < 6) {
            alert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร!");
            return;
        }
        alert("เปลี่ยนรหัสผ่านสำเร็จ!");
        setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setViewMode("profile");
    };

    const handleLogout = () => {
        const ok = window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?");
        if (ok) {
            localStorage.clear();
            window.location.href = "/";
        }
    };

    if (!user) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    backgroundColor: "#0e0e11",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#9ca3af",
                    fontFamily: "Inter, system-ui, sans-serif",
                }}
            >
                No profile data
            </div>
        );
    }

    // Profile View
    if (viewMode === "profile") {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    backgroundColor: "#0e0e11",
                    display: "flex",
                    justifyContent: "center",
                    padding: "60px 20px",
                    color: "#e5e7eb",
                    fontFamily: "Inter, system-ui, sans-serif",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: "900px",
                        backgroundColor: "#151518",
                        borderRadius: "20px",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            gap: "32px",
                            padding: "40px",
                            borderBottom: "1px solid #232326",
                            alignItems: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <img
                            src={ENDPOINTS.image_url + user.imageURL || "https://via.placeholder.com/150"}
                            alt="avatar"
                            style={{
                                width: "140px",
                                height: "140px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "4px solid #27272a",
                            }}
                        />

                        <div style={{ flex: 1, minWidth: "250px" }}>
                            <h2 style={{ fontSize: "28px", marginBottom: "6px", margin: "0 0 6px 0" }}>
                                {user.username || "Unknown User"}
                            </h2>

                            <p style={{ color: "#9ca3af", marginBottom: "8px", margin: "0 0 8px 0" }}>
                                @{user.email || "-"}
                            </p>

                            {user.role && (
                                <div
                                    style={{
                                        display: "inline-block",
                                        padding: "6px 14px",
                                        backgroundColor: "#1f2937",
                                        borderRadius: "999px",
                                        fontSize: "13px",
                                        marginBottom: "14px",
                                    }}
                                >
                                    {user.role}
                                </div>
                            )}

                            <p style={{ color: "#d1d5db", maxWidth: "520px", margin: "0" }}>
                                {user.bio || "No bio provided"}
                            </p>
                        </div>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                            gap: "32px",
                            padding: "40px",
                        }}
                    >
                        <div>
                            <h4 style={{ marginBottom: "16px", color: "#9ca3af", margin: "0 0 16px 0" }}>
                                Account Information
                            </h4>

                            <div style={{ marginBottom: "12px" }}>
                                <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px 0" }}>Email</p>
                                <p style={{ margin: "0" }}>{user.email || "-"}</p>
                            </div>

                            <div>
                                <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px 0" }}>Joined</p>
                                <p style={{ margin: "0" }}>
                                    {user.created_at
                                        ? new Date(user.created_at).toLocaleDateString()
                                        : "-"}
                                </p>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ marginBottom: "16px", color: "#9ca3af", margin: "0 0 16px 0" }}>
                                Actions
                            </h4>

                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "14px",
                                }}
                            >
                                <button
                                    onClick={() => setViewMode("edit")}
                                    style={{
                                        padding: "12px",
                                        borderRadius: "10px",
                                        backgroundColor: "#2563eb",
                                        color: "#fff",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontFamily: "inherit",
                                    }}
                                >
                                    Edit Profile
                                </button>

                                <button
                                    onClick={() => setViewMode("changepass")}
                                    style={{
                                        padding: "12px",
                                        borderRadius: "10px",
                                        backgroundColor: "#18181b",
                                        color: "#e5e7eb",
                                        border: "1px solid #27272a",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontFamily: "inherit",
                                    }}
                                >
                                    Change Password
                                </button>

                                <button
                                    onClick={handleLogout}
                                    style={{
                                        padding: "12px",
                                        borderRadius: "10px",
                                        backgroundColor: "#7f1d1d",
                                        color: "#fecaca",
                                        border: "1px solid #991b1b",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontFamily: "inherit",
                                    }}
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Edit Profile View
    if (viewMode === "edit") {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    backgroundColor: "#0e0e11",
                    display: "flex",
                    justifyContent: "center",
                    padding: "60px 20px",
                    color: "#e5e7eb",
                    fontFamily: "Inter, system-ui, sans-serif",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: "600px",
                        backgroundColor: "#151518",
                        borderRadius: "20px",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                        padding: "40px",
                    }}
                >
                    <h2 style={{ fontSize: "28px", marginBottom: "30px", margin: "0 0 30px 0" }}>
                        Edit Profile
                    </h2>

                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#9ca3af" }}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={editForm.username}
                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                            style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "10px",
                                backgroundColor: "#18181b",
                                border: "1px solid #27272a",
                                color: "#e5e7eb",
                                fontSize: "14px",
                                fontFamily: "inherit",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#9ca3af" }}>
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={editForm.fullName}
                            onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                            style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "10px",
                                backgroundColor: "#18181b",
                                border: "1px solid #27272a",
                                color: "#e5e7eb",
                                fontSize: "14px",
                                fontFamily: "inherit",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#9ca3af" }}>
                            Bio
                        </label>
                        <textarea
                            value={editForm.bio}
                            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                            rows={4}
                            style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "10px",
                                backgroundColor: "#18181b",
                                border: "1px solid #27272a",
                                color: "#e5e7eb",
                                fontSize: "14px",
                                resize: "vertical",
                                fontFamily: "inherit",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "30px" }}>
                        <label style={{ display: "block", marginBottom: "8px", color: "#9ca3af" }}>
                            Avatar URL
                        </label>
                        <input
                            type="text"
                            value={editForm.imageURL}
                            onChange={(e) => setEditForm({ ...editForm, imageURL: e.target.value })}
                            style={{
                                width: "100%",
                                padding: "12px",
                                borderRadius: "10px",
                                backgroundColor: "#18181b",
                                border: "1px solid #27272a",
                                color: "#e5e7eb",
                                fontSize: "14px",
                                fontFamily: "inherit",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    <div style={{ display: "flex", gap: "12px" }}>
                        <button
                            onClick={handleSaveProfile}
                            style={{
                                flex: 1,
                                padding: "12px",
                                borderRadius: "10px",
                                backgroundColor: "#2563eb",
                                color: "#fff",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontFamily: "inherit",
                            }}
                        >
                            Save Changes
                        </button>

                        <button
                            onClick={() => {
                                setEditForm({
                                    username: user.username || "",
                                    fullName: user.fullName || "",
                                    bio: user.bio || "",
                                    imageURL: user.imageURL || "",
                                });
                                setViewMode("profile");
                            }}
                            style={{
                                flex: 1,
                                padding: "12px",
                                borderRadius: "10px",
                                backgroundColor: "#18181b",
                                color: "#e5e7eb",
                                border: "1px solid #27272a",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontFamily: "inherit",
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Change Password View
    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#0e0e11",
                display: "flex",
                justifyContent: "center",
                padding: "60px 20px",
                color: "#e5e7eb",
                fontFamily: "Inter, system-ui, sans-serif",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "600px",
                    backgroundColor: "#151518",
                    borderRadius: "20px",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                    padding: "40px",
                }}
            >
                <h2 style={{ fontSize: "28px", marginBottom: "30px", margin: "0 0 30px 0" }}>
                    Change Password
                </h2>

                <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "8px", color: "#9ca3af" }}>
                        Current Password
                    </label>
                    <input
                        type="password"
                        value={passForm.currentPassword}
                        onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "10px",
                            backgroundColor: "#18181b",
                            border: "1px solid #27272a",
                            color: "#e5e7eb",
                            fontSize: "14px",
                            fontFamily: "inherit",
                            boxSizing: "border-box",
                        }}
                    />
                </div>

                <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "8px", color: "#9ca3af" }}>
                        New Password
                    </label>
                    <input
                        type="password"
                        value={passForm.newPassword}
                        onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "10px",
                            backgroundColor: "#18181b",
                            border: "1px solid #27272a",
                            color: "#e5e7eb",
                            fontSize: "14px",
                            fontFamily: "inherit",
                            boxSizing: "border-box",
                        }}
                    />
                </div>

                <div style={{ marginBottom: "30px" }}>
                    <label style={{ display: "block", marginBottom: "8px", color: "#9ca3af" }}>
                        Confirm New Password
                    </label>
                    <input
                        type="password"
                        value={passForm.confirmPassword}
                        onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "10px",
                            backgroundColor: "#18181b",
                            border: "1px solid #27272a",
                            color: "#e5e7eb",
                            fontSize: "14px",
                            fontFamily: "inherit",
                            boxSizing: "border-box",
                        }}
                    />
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                    <button
                        onClick={handleChangePassword}
                        style={{
                            flex: 1,
                            padding: "12px",
                            borderRadius: "10px",
                            backgroundColor: "#2563eb",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontFamily: "inherit",
                        }}
                    >
                        Change Password
                    </button>

                    <button
                        onClick={() => {
                            setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                            setViewMode("profile");
                        }}
                        style={{
                            flex: 1,
                            padding: "12px",
                            borderRadius: "10px",
                            backgroundColor: "#18181b",
                            color: "#e5e7eb",
                            border: "1px solid #27272a",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontFamily: "inherit",
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
