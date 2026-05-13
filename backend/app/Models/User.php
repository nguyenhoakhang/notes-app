<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Laravel\Sanctum\HasApiTokens;  // ADD THIS LINE

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;  // ADD HasApiTokens HERE

    protected $fillable = [
        'name',
        'email',
        'password',
        'font_size',
        'note_color',
        'theme',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}