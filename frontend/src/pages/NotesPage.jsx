import { useState, useEffect } from "react";
import api from "../api/axios";
import useAuthStore from "../store/authStore";
import useDebounce from "../hooks/useDebounce";
import toast from "react-hot-toast";

import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import NoteGrid from "../components/notes/NoteGrid";
import NoteEditor from "../components/notes/NoteEditor";
import DeleteConfirmModal from "../components/notes/DeleteConfirmModal";
import UnverifiedBanner from "../components/UnverifiedBanner";

export default function NotesPage() {
  const { user, updateUser } = useAuthStore();

  const [notes, setNotes] = useState([]);
  const [shared, setShared] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid"); // grid | list
  const [activeLabel, setActiveLabel] = useState(null);
  const [activeSection, setActiveSection] = useState("notes"); // notes | shared

  const [editingNote, setEditingNote] = useState(null);
  const [deletingNote, setDeletingNote] = useState(null);
  const [creating, setCreating] = useState(false);

  const [theme, setTheme] = useState(user?.theme || "light");

  const debouncedSearch = useDebounce(search, 300);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const size = { small: "14px", medium: "16px", large: "18px" };
    document.documentElement.style.setProperty(
      "--base-font",
      size[user?.font_size || "medium"],
    );
  }, [theme, user?.font_size]);

  const toggleTheme = async () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      await api.patch("/user/preferences", { theme: next });
    } catch {}
  };

  // Load notes
  useEffect(() => {
    fetchNotes();
    fetchShared();
    fetchLabels();
  }, []);

  // Search / filter
  useEffect(() => {
    fetchNotes();
  }, [debouncedSearch, activeLabel]);

  const fetchNotes = async () => {
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (activeLabel) params.label_id = activeLabel;
      const { data } = await api.get("/notes", { params });
      setNotes(data);
    } catch {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const fetchShared = async () => {
    try {
      const { data } = await api.get("/notes/shared-with-me");
      setShared(data);
    } catch {}
  };

  const fetchLabels = async () => {
    try {
      const { data } = await api.get("/labels");
      setLabels(data);
    } catch {}
  };

  // Note saved from editor (create or update)
  const handleSave = (savedNote) => {
    setNotes((prev) => {
      const exists = prev.find((n) => n.id === savedNote.id);
      return exists
        ? prev.map((n) => (n.id === savedNote.id ? savedNote : n))
        : [savedNote, ...prev];
    });
  };

  const handlePin = async (note) => {
    try {
      const { data } = await api.post(`/notes/${note.id}/pin`);
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, ...data } : n)),
      );
    } catch {
      toast.error("Failed to pin");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/notes/${deletingNote.id}`);
      setNotes((prev) => prev.filter((n) => n.id !== deletingNote.id));
      setDeletingNote(null);
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const displayNotes =
    activeSection === "shared"
      ? shared.map((s) => ({
          ...s.note,
          _sharedBy: s.shared_by,
          _permission: s.permission,
          _shareId: s.share_id,
        }))
      : notes;

  return (
    <div className="app-layout" data-theme={theme}>
      {user && !user.email_verified_at && <UnverifiedBanner />}

      <Navbar
        search={search}
        setSearch={setSearch}
        view={view}
        setView={setView}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div className="app-body">
        <Sidebar
          labels={labels}
          activeLabel={activeLabel}
          setActiveLabel={setActiveLabel}
          onLabelsChange={setLabels}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />

        <main className="notes-main">
          <div className="notes-toolbar">
            <h2 className="notes-heading">
              {activeSection === "shared"
                ? "Shared with me"
                : activeLabel
                  ? `# ${labels.find((l) => l.id === activeLabel)?.name}`
                  : "All Notes"}
            </h2>
            {activeSection === "notes" && (
              <button
                className="btn-primary-sm"
                onClick={() => setCreating(true)}
              >
                + New Note
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading-notes">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton note-skeleton" />
              ))}
            </div>
          ) : (
            <NoteGrid
              notes={displayNotes}
              view={view}
              onEdit={setEditingNote}
              onDelete={setDeletingNote}
              onPin={handlePin}
            />
          )}
        </main>
      </div>

      {/* New note editor */}
      {creating && (
        <NoteEditor
          note={null}
          labels={labels}
          onSave={handleSave}
          onClose={() => setCreating(false)}
        />
      )}

      {/* Edit note editor */}
      {editingNote && (
        <NoteEditor
          note={editingNote}
          labels={labels}
          onSave={handleSave}
          onClose={() => setEditingNote(null)}
          readOnly={editingNote._permission === "read"}
        />
      )}

      {/* Delete confirm */}
      {deletingNote && (
        <DeleteConfirmModal
          note={deletingNote}
          onConfirm={handleDelete}
          onCancel={() => setDeletingNote(null)}
        />
      )}
    </div>
  );
}
