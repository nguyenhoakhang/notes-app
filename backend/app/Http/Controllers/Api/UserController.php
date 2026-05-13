<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function updatePreferences(Request $request)
    {
        $request->validate([
            'font_size'   => 'sometimes|in:small,medium,large',
            'note_color'  => 'sometimes|string|max:20',
            'theme'       => 'sometimes|in:light,dark',
        ]);

        $request->user()->update($request->only('font_size', 'note_color', 'theme'));

        return response()->json($request->user());
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $request->user()->id,
        ]);

        $request->user()->update($request->only('name', 'email'));

        return response()->json($request->user());
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'password'         => 'required|confirmed|min:8',
        ]);

        if (!\Hash::check($request->current_password, $request->user()->password)) {
            return response()->json(['message' => 'Current password incorrect'], 422);
        }

        $request->user()->update(['password' => \Hash::make($request->password)]);
        $request->user()->tokens()->delete(); // force re-login

        return response()->json(['message' => 'Password changed. Please login again.']);
    }
}