import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../api/axios";
import useAuthStore from "../store/authStore";
import toast from "react-hot-toast";

const FONT_SIZES = ["small", "medium", "large"];
const NOTE_COLORS = [
  "#ffffff",
  "#fef9c3",
  "#d1fae5",
  "#dbeafe",
  "#fce7f3",
  "#ede9fe",
  "#ffedd5",
];

export default function PreferencesPage() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState({
    font_size: user?.font_size || "medium",
    note_color: user?.note_color || "#ffffff",
    theme: user?.theme || "light",
  });
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [passwords, setPasswords] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [saving, setSaving] = useState(false);

  const setP = (k, v) => setPrefs((p) => ({ ...p, [k]: v }));
  const setPro = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  const setPwd = (k, v) => setPasswords((p) => ({ ...p, [k]: v }));

  const savePrefs = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch("/user/preferences", prefs);
      updateUser(data);
      document.documentElement.setAttribute("data-theme", prefs.theme);
      toast.success("Preferences saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch("/user/profile", profile);
      updateUser(data);
      toast.success("Profile updated");
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors)
        Object.values(errors)
          .flat()
          .forEach((m) => toast.error(m));
      else toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.password !== passwords.password_confirmation)
      return toast.error("Passwords do not match");
    setSaving(true);
    try {
      await api.post("/user/change-password", passwords);
      toast.success("Password changed. Please log in again.");
      await logout();
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="prefs-page">
      <div className="prefs-container">
        <div className="prefs-header">
          <button className="btn-icon" onClick={() => navigate("/")}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1>Preferences</h1>
        </div>

        {/* Appearance */}
        <section className="prefs-section">
          <h2>Appearance</h2>

          <div className="prefs-field">
            <label>Theme</label>
            <div className="btn-group">
              {["light", "dark"].map((t) => (
                <button
                  key={t}
                  className={`btn-option ${prefs.theme === t ? "active" : ""}`}
                  onClick={() => setP("theme", t)}
                >
                  {t === "light" ? "☀️ Light" : "🌙 Dark"}
                </button>
              ))}
            </div>
          </div>

          <div className="prefs-field">
            <label>Font size</label>
            <div className="btn-group">
              {FONT_SIZES.map((s) => (
                <button
                  key={s}
                  className={`btn-option ${prefs.font_size === s ? "active" : ""}`}
                  onClick={() => setP("font_size", s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="prefs-field">
            <label>Default note color</label>
            <div className="color-picker-row">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-dot ${prefs.note_color === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setP("note_color", c)}
                />
              ))}
            </div>
          </div>

          <button
            className="btn-primary-sm"
            onClick={savePrefs}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save appearance"}
          </button>
        </section>

        {/* Profile */}
        <section className="prefs-section">
          <h2>Profile</h2>
          <form onSubmit={saveProfile}>
            <div className="form-group">
              <label>Display name</label>
              <input
                type="text"
                value={profile.name}
                required
                onChange={(e) => setPro("name", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={profile.email}
                required
                onChange={(e) => setPro("email", e.target.value)}
              />
            </div>
            <button className="btn-primary-sm" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </section>

        {/* Change password */}
        <section className="prefs-section">
          <h2>Change password</h2>
          <form onSubmit={changePassword}>
            <div className="form-group">
              <label>Current password</label>
              <input
                type="password"
                value={passwords.current_password}
                required
                onChange={(e) => setPwd("current_password", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>New password</label>
              <input
                type="password"
                value={passwords.password}
                required
                minLength={8}
                onChange={(e) => setPwd("password", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Confirm new password</label>
              <input
                type="password"
                value={passwords.password_confirmation}
                required
                onChange={(e) =>
                  setPwd("password_confirmation", e.target.value)
                }
              />
            </div>
            <button className="btn-primary-sm" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Change password"}
            </button>
          </form>
        </section>

        {/* Danger zone */}
        <section className="prefs-section danger-zone">
          <h2>Account</h2>
          <button className="btn-danger" onClick={logout}>
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
