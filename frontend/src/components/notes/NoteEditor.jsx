import { useState, useEffect, useRef, useCallback } from "react";
import { X, Lock, Share2, Paperclip, Trash2 } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";
import ShareModal from "./ShareModal";
import NotePasswordModal from "./NotePasswordModal";
import useCollabEditor from "../../hooks/useCollabEditor";
import useAuthStore from "../../store/authStore";

const COLORS = [
  "#ffffff",
  "#fef9c3",
  "#d1fae5",
  "#dbeafe",
  "#fce7f3",
  "#ede9fe",
  "#ffedd5",
  "#f1f5f9",
];
const AUTOSAVE_DELAY = 1500;

export default function NoteEditor({
  note,
  labels,
  onSave,
  onClose,
  readOnly = false,
}) {
  const isNew = !note?.id;
  const [form, setForm] = useState({
    title: note?.title || "",
    content: note?.content || "",
    color: note?.color || "#ffffff",
    label_ids: note?.labels?.map((l) => l.id) || [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noteId, setNoteId] = useState(note?.id || null);

  // Password unlock state
  const [locked, setLocked] = useState(note?.is_protected || false);
  const [notePassword, setNotePassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState(note?.attachments || []);
  const fileRef = useRef();

  const [showShare, setShowShare] = useState(false);
  const [showNotePass, setShowNotePass] = useState(false);
  const [noteData, setNoteData] = useState(note);
  const { user } = useAuthStore();
  const token = localStorage.getItem("token");

  // Collab is active when: note exists, not read-only, and not locked
  const collabEnabled = !isNew && !readOnly && !locked;

  const { bindTextarea, status, users } = useCollabEditor({
    noteId: noteId,
    userId: user?.id,
    token: token,
    enabled: collabEnabled,
    onContentChange: (text) => setForm((f) => ({ ...f, content: text })),
    initialContent: form.content,
  });
  const timerRef = useRef();

  const autoSave = useCallback(
    async (data, id) => {
      setSaving(true);
      try {
        let res;
        if (!id) {
          res = await api.post("/notes", data);
          setNoteId(res.data.id);
          id = res.data.id;
        } else {
          res = await api.put(`/notes/${id}`, data);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onSave(res.data);
        return id;
      } catch {
        toast.error("Auto-save failed");
      } finally {
        setSaving(false);
      }
    },
    [onSave],
  );

  // Trigger auto-save on change
  useEffect(() => {
    if (readOnly || locked) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => autoSave(form, noteId), AUTOSAVE_DELAY);
    return () => clearTimeout(timerRef.current);
  }, [form]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleLabel = (id) => {
    set(
      "label_ids",
      form.label_ids.includes(id)
        ? form.label_ids.filter((i) => i !== id)
        : [...form.label_ids, id],
    );
  };

  const unlock = async () => {
    setUnlocking(true);
    try {
      await api.post(`/notes/${noteId}/verify-password`, {
        note_password: notePassword,
      });
      // Fetch full content
      const { data } = await api.get(`/notes/${noteId}`, {
        params: { note_password: notePassword },
      });
      setForm({
        title: data.title || "",
        content: data.content || "",
        color: data.color,
        label_ids: data.labels?.map((l) => l.id) || [],
      });
      setLocked(false);
    } catch {
      toast.error("Wrong password");
    } finally {
      setUnlocking(false);
    }
  };

  const uploadFiles = async (files) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files[]", f));
    try {
      const { data } = await api.post(`/notes/${noteId}/attachments`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAttachments((a) => [...a, ...data]);
    } catch {
      toast.error("Upload failed");
    }
  };

  const deleteAttachment = async (att) => {
    try {
      await api.delete(`/attachments/${att.id}`);
      setAttachments((a) => a.filter((x) => x.id !== att.id));
    } catch {
      toast.error("Delete failed");
    }
  };

  if (locked)
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>🔒 This note is password protected</h3>
          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label>Note password</label>
            <input
              type="password"
              value={notePassword}
              autoFocus
              onChange={(e) => setNotePassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && unlock()}
            />
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary-sm"
              onClick={unlock}
              disabled={unlocking}
            >
              {unlocking ? "Checking…" : "Unlock"}
            </button>
          </div>
        </div>
      </div>
    );
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="note-editor" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="editor-header">
          <input
            className="editor-title"
            placeholder="Title"
            value={form.title}
            readOnly={readOnly}
            onChange={(e) => set("title", e.target.value)}
          />
          <div className="editor-header-actions">
            <span className="autosave-status">
              {saving ? "💾 Saving…" : saved ? "✓ Saved" : ""}
            </span>
            {noteId && !readOnly && (
              <>
                <button
                  onClick={() => setShowNotePass(true)}
                  title="Note password"
                >
                  <Lock
                    size={16}
                    style={{
                      color: noteData?.is_protected ? "#6366f1" : undefined,
                    }}
                  />
                </button>
                <button onClick={() => setShowShare(true)} title="Share note">
                  <Share2 size={16} />
                </button>
              </>
            )}
            <button onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="editor-content-wrap">
          {/* Collab status bar */}
          {collabEnabled && (
            <div className="collab-bar">
              <span className={`collab-dot collab-dot--${status}`} />
              <span className="collab-status">
                {status === "connected"
                  ? "Live"
                  : status === "connecting"
                    ? "Connecting…"
                    : "Offline"}
              </span>
              {users.length > 0 && (
                <div className="collab-users">
                  {users.slice(0, 3).map((u, i) => (
                    <span
                      key={i}
                      className="collab-avatar"
                      style={{ background: u.color }}
                      title={`User ${u.id}`}
                    >
                      {String(u.id).slice(-2)}
                    </span>
                  ))}
                  {users.length > 3 && (
                    <span className="collab-count">+{users.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          )}

          <textarea
            className="editor-content"
            placeholder="Take a note…"
            value={collabEnabled ? undefined : form.content}
            defaultValue={collabEnabled ? form.content : undefined}
            readOnly={readOnly}
            ref={collabEnabled ? bindTextarea : null}
            onChange={
              collabEnabled ? undefined : (e) => set("content", e.target.value)
            }
          />
        </div>

        {/* Color picker */}
        {!readOnly && (
          <div className="editor-colors">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`color-dot ${form.color === c ? "active" : ""}`}
                style={{ background: c }}
                onClick={() => set("color", c)}
              />
            ))}
          </div>
        )}

        {/* Labels */}
        <div className="editor-labels">
          {labels.map((l) => (
            <button
              key={l.id}
              className={`label-chip ${form.label_ids.includes(l.id) ? "active" : ""}`}
              onClick={() => !readOnly && toggleLabel(l.id)}
            >
              {l.name}
            </button>
          ))}
        </div>

        {/* Attachments */}
        {noteId && (
          <div className="editor-attachments">
            {attachments.map((att) => (
              <div key={att.id} className="attachment-item">
                {att.mime_type?.startsWith("image/") ? (
                  <img
                    src={`/storage/${att.path}`}
                    alt={att.filename}
                    className="attachment-thumb"
                  />
                ) : (
                  <a
                    href={`/storage/${att.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📎 {att.filename}
                  </a>
                )}
                {!readOnly && (
                  <button
                    className="attachment-delete"
                    onClick={() => deleteAttachment(att)}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <>
                <button
                  className="btn-icon"
                  onClick={() => fileRef.current.click()}
                >
                  <Paperclip size={15} /> Attach
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => uploadFiles(e.target.files)}
                />
              </>
            )}
          </div>
        )}
        {/* Share Modal thật */}
        {showShare && (
          <ShareModal
            note={{
              id: noteId,
              shares: attachments,
              is_protected: noteData?.is_protected,
            }}
            onClose={() => setShowShare(false)}
            onUpdate={() => onSave({ ...noteData, id: noteId })}
          />
        )}

        {/* Note Password Modal thật */}
        {showNotePass && (
          <NotePasswordModal
            note={{ id: noteId, is_protected: noteData?.is_protected }}
            onClose={() => setShowNotePass(false)}
            onUpdate={() => {
              setNoteData((d) => ({
                ...d,
                is_protected: !noteData?.is_protected,
              }));
              onSave({ ...noteData, id: noteId });
            }}
          />
        )}
      </div>
    </div>
  );
}
