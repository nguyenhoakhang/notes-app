import { useState } from "react";
import { LayoutGrid, List, LogOut, Settings, Moon, Sun } from "lucide-react";
import useAuthStore from "../../store/authStore";
import useDebounce from "../../hooks/useDebounce";
import { useNavigate } from "react-router-dom";
export default function Navbar({
  search,
  setSearch,
  view,
  setView,
  theme,
  toggleTheme,
}) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  return (
    <nav className="navbar">
      <div className="navbar-brand">📝 NoteApp</div>

      <input
        className="search-input"
        type="text"
        placeholder="Search notes…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="navbar-actions">
        <button onClick={toggleTheme} title="Toggle theme">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={() => setView("grid")}
          className={view === "grid" ? "active" : ""}
          title="Grid view"
        >
          <LayoutGrid size={18} />
        </button>
        <button
          onClick={() => setView("list")}
          className={view === "list" ? "active" : ""}
          title="List view"
        >
          <List size={18} />
        </button>
        <button onClick={() => navigate("/preferences")} title="Preferences">
          <Settings size={18} />
        </button>
        <span className="navbar-user">{user?.name}</span>
        <button onClick={logout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
}
