import { useState } from "react";
import { X, Lock, LockOpen } from "lucide-react";
import api from "../../api/axios";
import toast from "react-hot-toast";

export default function NotePasswordModal({ note, onClose, onUpdate }) {
  const hasPassword = note.is_protected;

  const [mode, setMode] = useState(hasPassword ? "manage" : "set"); // set | manage | change | remove
  const [form, setForm] = useState({
    current: "",
    password: "",
    password_confirmation: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();

    if (
      (mode === "set" || mode === "change") &&
      form.password !== form.password_confirmation
    ) {
      return toast.error("Passwords do not match");
    }

    setLoading(true);
    try {
      if (mode === "set" || mode === "change") {
        await api.post(`/notes/${note.id}/set-password`, {
          password: form.password,
          password_confirmation: form.password_confirmation,
        });
        toast.success(mode === "set" ? "Password set!" : "Password changed!");
      } else if (mode === "remove") {
        await api.post(`/notes/${note.id}/set-password`, {
          password: null,
          password_confirmation: null,
        });
        toast.success("Password removed");
      }
      onUpdate();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{hasPassword ? "🔒 Note Password" : "🔓 Set Note Password"}</h3>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {mode === "manage" ? (
          <div className="notepass-manage">
            <p className="text-muted">This note is password protected.</p>
            <div className="notepass-manage-btns">
              <button
                className="btn-secondary"
                onClick={() => setMode("change")}
              >
                <Lock size={15} /> Change password
              </button>
              <button
                className="btn-danger-outline"
                onClick={() => setMode("remove")}
              >
                <LockOpen size={15} /> Remove password
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            {mode === "remove" ? (
              <p className="text-muted" style={{ marginBottom: "1rem" }}>
                Remove the password from this note? Anyone with access can view
                it.
              </p>
            ) : (
              <>
                <div className="form-group">
                  <label>New password</label>
                  <input
                    type="password"
                    value={form.password}
                    required
                    minLength={4}
                    onChange={(e) => set("password", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Confirm password</label>
                  <input
                    type="password"
                    value={form.password_confirmation}
                    required
                    onChange={(e) =>
                      set("password_confirmation", e.target.value)
                    }
                  />
                </div>
              </>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => (hasPassword ? setMode("manage") : onClose())}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary-sm"
                disabled={loading}
              >
                {loading ? "…" : mode === "remove" ? "Remove" : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
