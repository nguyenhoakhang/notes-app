<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    protected $fillable = [
        'user_id','title','content','color',
        'is_pinned','pinned_at','password'
    ];

    protected $casts = ['is_pinned' => 'boolean', 'pinned_at' => 'datetime'];

    public function user()      { return $this->belongsTo(User::class); }
    public function labels()    { return $this->belongsToMany(Label::class); }
    public function attachments(){ return $this->hasMany(Attachment::class); }
    public function shares()    { return $this->hasMany(NoteShare::class); }
}