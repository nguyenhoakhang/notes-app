import { useState, useEffect, useRef, useMemo } from "react";
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
import {
  fetchNotes,
  fetchLabels,
  createNote,
  updateNote,
  deleteNote,
  pinNote,
} from "../api/offlineApi";
import useOnlineStatus from "../hooks/useOnlineStatus";
import useSyncQueue from "../hooks/useSyncQueue";
import OfflineBanner from "../components/OfflineBanner";

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
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [theme, setTheme] = useState(user?.theme || "light");
  const pinningRef = useRef(new Set());
  const debouncedSearch = useDebounce(search, 300);
  const online = useOnlineStatus();
  const { syncAll } = useSyncQueue(online);
  const handleCreatorClose = () => {
    setCreatingOpen(false);
    setNotes((prev) =>
      prev.filter(
        (n) =>
          !String(n.id).startsWith("temp_") ||
          n.title?.trim() ||
          n.content?.trim(),
      ),
    );
  };
  const handlePin = async (note) => {
    if (pinningRef.current.has(note.id)) return;
    pinningRef.current.add(note.id);

    // Optimistic update
    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id
          ? {
              ...n,
              is_pinned: !n.is_pinned,
              pinned_at: new Date().toISOString(),
            }
          : n,
      ),
    );

    try {
      const updated = await pinNote(note.id);
      if (updated) {
        setNotes((prev) =>
          prev.map((n) => (n.id === note.id ? { ...n, ...updated } : n)),
        );
      }
    } catch {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === note.id
            ? { ...n, is_pinned: note.is_pinned, pinned_at: note.pinned_at }
            : n,
        ),
      );
      toast.error("Pin failed");
    } finally {
      pinningRef.current.delete(note.id);
    }
  };
  const displayedNotes = useMemo(() => {
    if (activeSection === "shared") {
      return shared.map((s) => ({
        ...s.note,
        _sharedBy: s.shared_by,
        _permission: s.permission,
      }));
    }
    if (!search.trim()) return notes;

    const q = search.toLowerCase();
    return notes.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q),
    );
  }, [notes, shared, search, activeSection]);
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
    fetchNotesData();
    fetchLabelsData();
    fetchShared();
  }, []);

  // Search / filter
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearching(false);
      fetchNotesData();
      return;
    }
    setSearching(true);
    fetchNotesData().finally(() => setSearching(false));
  }, [debouncedSearch, activeLabel]);

  // Tìm hàm fetchNotes cũ và thay bằng:
  const fetchNotesData = async () => {
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (activeLabel) params.label_id = activeLabel;
      const data = await fetchNotes(params);
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

  const fetchLabelsData = async () => {
    const data = await fetchLabels();
    setLabels(data);
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

  const handleDelete = async () => {
    await deleteNote(deletingNote.id);
    setNotes((prev) => prev.filter((n) => n.id !== deletingNote.id));
    setDeletingNote(null);
    toast.success("Note deleted");
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
      <OfflineBanner online={online} />
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
                onClick={() => setCreatingOpen(true)}
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
              notes={displayedNotes}
              view={view}
              onEdit={setEditingNote}
              onDelete={setDeletingNote}
              onPin={handlePin}
            />
          )}
        </main>
      </div>

      {/* New note editor */}
      {creatingOpen && (
        <NoteEditor
          note={null}
          labels={labels}
          onSave={handleSave}
          onClose={handleCreatorClose}
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
