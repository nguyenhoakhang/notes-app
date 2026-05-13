<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\UserController;

use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\LabelController;
use App\Http\Controllers\Api\AttachmentController;

// =========================
// Public routes
// =========================

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Email verification (signed URL)
Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verify'])
    ->middleware(['signed'])
    ->name('verification.verify');

// Password reset
Route::post('/forgot-password', [PasswordResetController::class, 'sendLink']);
Route::post('/reset-password',  [PasswordResetController::class, 'reset']);


// =========================
// Protected routes (Sanctum)
// =========================

Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // Email verification
    Route::post('/email/verification-notification', [AuthController::class, 'sendVerification']);

    // User
    Route::patch('/user/preferences', [UserController::class, 'updatePreferences']);
    Route::patch('/user/profile',     [UserController::class, 'updateProfile']);
    Route::post('/user/change-password', [UserController::class, 'changePassword']);

    // =========================
    // Notes
    // =========================

    Route::get('/notes/shared-with-me', [NoteController::class, 'sharedWithMe']);
    Route::apiResource('notes', NoteController::class);

    Route::post('/notes/{note}/pin',             [NoteController::class, 'pin']);
    Route::post('/notes/{note}/set-password',    [NoteController::class, 'setPassword']);
    Route::post('/notes/{note}/verify-password', [NoteController::class, 'verifyPassword']);

    // Sharing
    Route::post('/notes/{note}/share',             [NoteController::class, 'share']);
    Route::delete('/notes/{note}/share/{shareId}', [NoteController::class, 'revokeShare']);
    Route::patch('/notes/{note}/share/{shareId}',  [NoteController::class, 'updateShare']);

    // Labels
    Route::apiResource('labels', LabelController::class)
        ->except(['show']);

    // Attachments
    Route::post('/notes/{note}/attachments', [AttachmentController::class, 'store']);
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy']);
});