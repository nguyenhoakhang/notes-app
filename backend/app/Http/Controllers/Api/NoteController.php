<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class NoteController extends Controller
{
    // GET /api/notes
    public function index(Request $request)
    {
        $query = Note::where('user_id', $request->user()->id)
            ->with(['labels', 'attachments', 'shares']);

        // Live search
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($q2) use ($q) {
                $q2->where('title', 'like', "%{$q}%")
                   ->orWhere('content', 'like', "%{$q}%");
            });
        }

        // Filter by label
        if ($request->filled('label_id')) {
            $query->whereHas('labels', fn($q) => $q->where('labels.id', $request->label_id));
        }

        // Pinned first, then newest
        $notes = $query->orderByDesc('is_pinned')
                       ->orderByDesc('pinned_at')
                       ->orderByDesc('created_at')
                       ->get();

        // Hide content of password-protected notes unless unlocked
        $notes->each(function ($note) {
            if ($note->password) {
                $note->makeHidden(['content']);
                $note->setAttribute('is_protected', true);
            } else {
                $note->setAttribute('is_protected', false);
            }
            $note->makeHidden(['password']);
        });

        return response()->json($notes);
    }

    // POST /api/notes
    public function store(Request $request)
    {
        $request->validate([
            'title'   => 'nullable|string|max:255',
            'content' => 'nullable|string',
            'color'   => 'nullable|string|max:20',
        ]);

        $note = Note::create([
            'user_id' => $request->user()->id,
            'title'   => $request->title,
            'content' => $request->content,
            'color'   => $request->color ?? $request->user()->note_color,
        ]);

        return response()->json($note->load('labels', 'attachments'), 201);
    }

    // GET /api/notes/{id}
    public function show(Request $request, Note $note)
    {
        $this->authorizeNote($note, $request->user());

        if ($note->password) {
            $request->validate(['note_password' => 'required|string']);
            if (!Hash::check($request->note_password, $note->password)) {
                return response()->json(['message' => 'Wrong note password'], 403);
            }
        }

        $note->makeHidden(['password']);
        $note->setAttribute('is_protected', (bool) $note->password);

        return response()->json($note->load('labels', 'attachments', 'shares.sharedWith'));
    }

    // PUT /api/notes/{id}
    public function update(Request $request, Note $note)
    {
        $this->authorizeNote($note, $request->user(), 'edit');

        if ($note->password && !$request->filled('note_password')) {
            return response()->json(['message' => 'Note password required'], 403);
        }

        if ($note->password && !Hash::check($request->note_password, $note->password)) {
            return response()->json(['message' => 'Wrong note password'], 403);
        }

        $note->update($request->only('title', 'content', 'color'));

        // Sync labels
        if ($request->has('label_ids')) {
            $note->labels()->sync($request->label_ids);
        }

        return response()->json($note->load('labels', 'attachments'));
    }

    // DELETE /api/notes/{id}
    public function destroy(Request $request, Note $note)
    {
        $this->authorizeNote($note, $request->user(), 'owner');

        if ($note->password) {
            $request->validate(['note_password' => 'required|string']);
            if (!Hash::check($request->note_password, $note->password)) {
                return response()->json(['message' => 'Wrong note password'], 403);
            }
        }

        $note->delete();
        return response()->json(['message' => 'Deleted']);
    }

    // POST /api/notes/{id}/pin
    public function pin(Request $request, Note $note)
    {
        $this->authorizeNote($note, $request->user(), 'owner');

        $note->update([
            'is_pinned' => !$note->is_pinned,
            'pinned_at' => !$note->is_pinned ? now() : null,
        ]);

        return response()->json($note);
    }

    // POST /api/notes/{id}/set-password
    public function setPassword(Request $request, Note $note)
    {
        $this->authorizeNote($note, $request->user(), 'owner');

        $request->validate(['password' => 'nullable|string|min:4|confirmed']);

        $note->update([
            'password' => $request->password ? Hash::make($request->password) : null,
        ]);

        return response()->json(['message' => 'Note password updated']);
    }

    // POST /api/notes/{id}/verify-password
    public function verifyPassword(Request $request, Note $note)
    {
        $this->authorizeNote($note, $request->user());

        $request->validate(['note_password' => 'required|string']);

        if (!$note->password || !Hash::check($request->note_password, $note->password)) {
            return response()->json(['message' => 'Wrong password'], 403);
        }

        return response()->json(['message' => 'OK']);
    }

    // ── Sharing ──────────────────────────────────────────────

    // POST /api/notes/{id}/share
    public function share(Request $request, Note $note)
    {
        $this->authorizeNote($note, $request->user(), 'owner');

        $request->validate([
            'email'      => 'required|email|exists:users,email',
            'permission' => 'required|in:read,edit',
        ]);

        $target = \App\Models\User::where('email', $request->email)->first();

        if ($target->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot share with yourself'], 422);
        }

        $share = $note->shares()->updateOrCreate(
            ['shared_with_id' => $target->id],
            ['owner_id' => $request->user()->id, 'permission' => $request->permission]
        );

        return response()->json($share->load('sharedWith'), 201);
    }

    // DELETE /api/notes/{id}/share/{share_id}
    public function revokeShare(Request $request, Note $note, $shareId)
    {
        $this->authorizeNote($note, $request->user(), 'owner');

        $note->shares()->findOrFail($shareId)->delete();
        return response()->json(['message' => 'Access revoked']);
    }

    // PATCH /api/notes/{id}/share/{share_id}
    public function updateShare(Request $request, Note $note, $shareId)
    {
        $this->authorizeNote($note, $request->user(), 'owner');

        $request->validate(['permission' => 'required|in:read,edit']);

        $share = $note->shares()->findOrFail($shareId);
        $share->update(['permission' => $request->permission]);

        return response()->json($share);
    }

    // GET /api/notes/shared-with-me
    public function sharedWithMe(Request $request)
    {
        $shares = \App\Models\NoteShare::where('shared_with_id', $request->user()->id)
            ->with(['note.labels', 'note.attachments', 'owner'])
            ->latest()
            ->get()
            ->map(function ($share) {
                $note = $share->note;
                if ($note && $note->password) {
                    $note->makeHidden(['content']);
                    $note->setAttribute('is_protected', true);
                }
                $note?->makeHidden(['password']);
                return [
                    'share_id'   => $share->id,
                    'permission' => $share->permission,
                    'shared_at'  => $share->created_at,
                    'shared_by'  => $share->owner->only('id', 'name', 'email'),
                    'note'       => $note,
                ];
            });

        return response()->json($shares);
    }

    // ── Helpers ──────────────────────────────────────────────

    private function authorizeNote(Note $note, $user, string $require = 'read')
    {
        $isOwner = $note->user_id === $user->id;
        if ($isOwner) return;

        if ($require === 'owner') {
            abort(403, 'Only the owner can do this');
        }

        $share = $note->shares()->where('shared_with_id', $user->id)->first();
        if (!$share) abort(403, 'No access');
        if ($require === 'edit' && $share->permission !== 'edit') abort(403, 'Read-only access');
    }
}