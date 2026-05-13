import NoteCard from "./NoteCard";

export default function NoteGrid({ notes, view, onEdit, onDelete, onPin }) {
  if (!notes.length)
    return (
      <div className="empty-state">
        <div className="empty-icon">📝</div>
        <h3>No notes yet</h3>
        <p>
          Click <strong>+ New Note</strong> to get started.
        </p>
      </div>
    );

  const pinned = notes.filter((n) => n.is_pinned);
  const unpinned = notes.filter((n) => !n.is_pinned);

  return (
    <div>
      {pinned.length > 0 && (
        <>
          <p className="notes-section-label">📌 Pinned</p>
          <div className={view === "grid" ? "notes-grid" : "notes-list"}>
            {pinned.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                view={view}
                onEdit={onEdit}
                onDelete={onDelete}
                onPin={onPin}
              />
            ))}
          </div>
        </>
      )}
      {unpinned.length > 0 && (
        <>
          {pinned.length > 0 && <p className="notes-section-label">Other</p>}
          <div className={view === "grid" ? "notes-grid" : "notes-list"}>
            {unpinned.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                view={view}
                onEdit={onEdit}
                onDelete={onDelete}
                onPin={onPin}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
