import { LayoutGrid, List, LogOut, Settings, Moon, Sun, X } from "lucide-react";
import useAuthStore from "../../store/authStore";
import { useNavigate } from "react-router-dom";

export default function Navbar({
  search,
  setSearch,
  searching, // Đại ca nhớ truyền thêm state này từ cha nhé
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

      {/* Phần Search Indicator đã được cập nhật */}
      <div className="search-wrap">
        <input
          className="search-input"
          type="text"
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Hiện spinner khi đang tìm kiếm */}
        {searching && <span className="search-spinner" />}

        {/* Hiện nút X để xóa nhanh khi đã nhập text và không trong trạng thái search */}
        {search && !searching && (
          <button
            className="search-clear"
            onClick={() => setSearch("")}
            type="button"
          >
            <X size={14} />
          </button>
        )}
      </div>

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
        <span className="navbar-user">{user?.display_name || user?.name}</span>
        <button onClick={logout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
}
