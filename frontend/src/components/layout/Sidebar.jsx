import { useState } from "react";
import { Tag, Plus, Pencil, Trash2, Share2, StickyNote } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

export default function Sidebar({
  labels,
  activeLabel,
  setActiveLabel,
  onLabelsChange,
  activeSection,
  setActiveSection,
}) {
  const [editing, setEditing] = useState(null); // label id being renamed
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const createLabel = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const { data } = await api.post("/labels", { name: newName.trim() });
      onLabelsChange([...labels, data]);
      setNewName("");
      setAdding(false);
    } catch {
      toast.error("Failed to create label");
    }
  };

  const renameLabel = async (label) => {
    if (!editName.trim() || editName === label.name) return setEditing(null);
    try {
      const { data } = await api.put(`/labels/${label.id}`, {
        name: editName.trim(),
      });
      onLabelsChange(labels.map((l) => (l.id === label.id ? data : l)));
      setEditing(null);
    } catch {
      toast.error("Failed to rename");
    }
  };

  const deleteLabel = async (label) => {
    if (!confirm(`Delete label "${label.name}"?`)) return;
    try {
      await api.delete(`/labels/${label.id}`);
      onLabelsChange(labels.filter((l) => l.id !== label.id));
      if (activeLabel === label.id) setActiveLabel(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <aside className="sidebar">
      <div
        className={`sidebar-item ${activeSection === "notes" && !activeLabel ? "active" : ""}`}
        onClick={() => {
          setActiveSection("notes");
          setActiveLabel(null);
        }}
      >
        <StickyNote size={16} /> All Notes
      </div>
      <div
        className={`sidebar-item ${activeSection === "shared" ? "active" : ""}`}
        onClick={() => {
          setActiveSection("shared");
          setActiveLabel(null);
        }}
      >
        <Share2 size={16} /> Shared with me
      </div>

      <div className="sidebar-section-title">
        <Tag size={14} /> Labels
        <button onClick={() => setAdding(true)} title="New label">
          <Plus size={14} />
        </button>
      </div>

      {adding && (
        <form onSubmit={createLabel} className="label-add-form">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Label name"
          />
          <button type="submit">Add</button>
          <button type="button" onClick={() => setAdding(false)}>
            ✕
          </button>
        </form>
      )}

      {labels.map((label) => (
        <div
          key={label.id}
          className={`sidebar-item label-item ${activeLabel === label.id ? "active" : ""}`}
          onClick={() => {
            setActiveLabel(label.id);
            setActiveSection("notes");
          }}
        >
          {editing === label.id ? (
            <input
              autoFocus
              className="label-rename-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => renameLabel(label)}
              onKeyDown={(e) => e.key === "Enter" && renameLabel(label)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="label-name"># {label.name}</span>
          )}
          <div className="label-actions" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setEditing(label.id);
                setEditName(label.name);
              }}
            >
              <Pencil size={12} />
            </button>
            <button onClick={() => deleteLabel(label)}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
}
