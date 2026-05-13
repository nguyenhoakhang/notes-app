import { Pin, Lock, Share2, Pencil, Trash2 } from "lucide-react";

export default function NoteCard({ note, view, onEdit, onDelete, onPin }) {
  const isGrid = view === "grid";

  return (
    <div
      className={`note-card ${isGrid ? "note-card-grid" : "note-card-list"}`}
      style={{ background: note.color || "#ffffff" }}
      onClick={() => onEdit(note)}
    >
      <div className="note-card-header">
        <span className="note-title">{note.title || <em>Untitled</em>}</span>
        <div className="note-icons">
          {note.is_pinned && <Pin size={13} className="icon-pin" />}
          {note.is_protected && <Lock size={13} className="icon-lock" />}
          {note.shares?.length > 0 && (
            <Share2 size={13} className="icon-share" />
          )}
        </div>
      </div>

      {!note.is_protected && <p className="note-preview">{note.content}</p>}
      {note.is_protected && (
        <p className="note-protected-hint">🔒 Password protected</p>
      )}

      {note.labels?.length > 0 && (
        <div className="note-labels">
          {note.labels.map((l) => (
            <span key={l.id} className="note-label-chip">
              {l.name}
            </span>
          ))}
        </div>
      )}

      <div className="note-card-footer">
        <span className="note-date">
          {new Date(note.created_at).toLocaleDateString()}
        </span>
        <div className="note-card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onPin(note)}
            title={note.is_pinned ? "Unpin" : "Pin"}
          >
            <Pin size={14} className={note.is_pinned ? "pinned" : ""} />
          </button>
          <button onClick={() => onEdit(note)} title="Edit">
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(note)}
            title="Delete"
            className="btn-danger-icon"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
