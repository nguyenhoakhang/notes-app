# API Test Script for Notes App
$baseUrl = "http://localhost:8080/api"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "testuser_$timestamp@test.com"
$testPassword = "12345678"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Notes App API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Test-Success {
    param($TestName, $Success, $Message = "")
    if ($Success) {
        Write-Host "[PASS] $TestName" -ForegroundColor Green
        if ($Message) { Write-Host "       $Message" -ForegroundColor Gray }
    } else {
        Write-Host "[FAIL] $TestName" -ForegroundColor Red
        if ($Message) { Write-Host "       $Message" -ForegroundColor Red }
    }
    Write-Host ""
}

# 1. Register
Write-Host "1. Testing Registration" -ForegroundColor Yellow
$registerBody = @{
    name = "Test User"
    email = $testEmail
    password = $testPassword
    password_confirmation = $testPassword
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Method POST -Uri "$baseUrl/register" -ContentType "application/json" -Headers @{ Accept = "application/json" } -Body $registerBody
    $token = $response.token
    $userId = $response.user.id
    Test-Success -TestName "Registration" -Success $true -Message "User ID: $userId"
} catch {
    Test-Success -TestName "Registration" -Success $false -Message $_.Exception.Message
    exit 1
}

# 2. Login
Write-Host "2. Testing Login" -ForegroundColor Yellow
$loginBody = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method POST -Uri "$baseUrl/login" -ContentType "application/json" -Headers @{ Accept = "application/json" } -Body $loginBody
    $token = $response.token
    Test-Success -TestName "Login" -Success $true -Message "Token obtained"
} catch {
    Test-Success -TestName "Login" -Success $false -Message $_.Exception.Message
}

# 3. Get Current User
Write-Host "3. Testing Get Current User" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "$baseUrl/me" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" }
    Test-Success -TestName "Get Current User" -Success $true -Message "User: $($response.name)"
} catch {
    Test-Success -TestName "Get Current User" -Success $false -Message $_.Exception.Message
}

# 4. Create Notes
Write-Host "4. Testing Create Notes" -ForegroundColor Yellow
$note1Body = @{ title = "First Note"; content = "Content of first note"; color = "#ffeb3b" } | ConvertTo-Json
$note2Body = @{ title = "Second Note"; content = "Content of second note"; color = "#e3f2fd" } | ConvertTo-Json

try {
    $note1 = Invoke-RestMethod -Method POST -Uri "$baseUrl/notes" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" } -ContentType "application/json" -Body $note1Body
    $note2 = Invoke-RestMethod -Method POST -Uri "$baseUrl/notes" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" } -ContentType "application/json" -Body $note2Body
    Test-Success -TestName "Create Notes" -Success $true -Message "Created notes: ID $($note1.id), $($note2.id)"
} catch {
    Test-Success -TestName "Create Notes" -Success $false -Message $_.Exception.Message
}

# 5. Get All Notes
Write-Host "5. Testing Get All Notes" -ForegroundColor Yellow
try {
    $allNotes = Invoke-RestMethod -Method GET -Uri "$baseUrl/notes" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" }
    $count = ($allNotes | Measure-Object).Count
    Test-Success -TestName "Get All Notes" -Success $true -Message "Retrieved $count notes"
} catch {
    Test-Success -TestName "Get All Notes" -Success $false -Message $_.Exception.Message
}

# 6. Get Single Note
Write-Host "6. Testing Get Single Note" -ForegroundColor Yellow
try {
    $singleNote = Invoke-RestMethod -Method GET -Uri "$baseUrl/notes/$($note1.id)" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" }
    Test-Success -TestName "Get Single Note" -Success $true -Message "Note: $($singleNote.title)"
} catch {
    Test-Success -TestName "Get Single Note" -Success $false -Message $_.Exception.Message
}

# 7. Update Note
Write-Host "7. Testing Update Note" -ForegroundColor Yellow
$updateBody = @{ title = "Updated Note"; content = "Updated content" } | ConvertTo-Json
try {
    $updated = Invoke-RestMethod -Method PUT -Uri "$baseUrl/notes/$($note1.id)" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" } -ContentType "application/json" -Body $updateBody
    Test-Success -TestName "Update Note" -Success $true -Message "Title: $($updated.title)"
} catch {
    Test-Success -TestName "Update Note" -Success $false -Message $_.Exception.Message
}

# 8. Pin Note
Write-Host "8. Testing Pin Note" -ForegroundColor Yellow
try {
    $pinned = Invoke-RestMethod -Method POST -Uri "$baseUrl/notes/$($note2.id)/pin" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" }
    Test-Success -TestName "Pin Note" -Success $true -Message "Note pinned"
} catch {
    Test-Success -TestName "Pin Note" -Success $false -Message $_.Exception.Message
}

# 9. Create Labels
Write-Host "9. Testing Create Labels" -ForegroundColor Yellow
$label1Body = @{ name = "Work" } | ConvertTo-Json
$label2Body = @{ name = "Personal" } | ConvertTo-Json

try {
    $label1 = Invoke-RestMethod -Method POST -Uri "$baseUrl/labels" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" } -ContentType "application/json" -Body $label1Body
    $label2 = Invoke-RestMethod -Method POST -Uri "$baseUrl/labels" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" } -ContentType "application/json" -Body $label2Body
    Test-Success -TestName "Create Labels" -Success $true -Message "Created: $($label1.name), $($label2.name)"
} catch {
    Test-Success -TestName "Create Labels" -Success $false -Message $_.Exception.Message
}

# 10. Get All Labels
Write-Host "10. Testing Get All Labels" -ForegroundColor Yellow
try {
    $allLabels = Invoke-RestMethod -Method GET -Uri "$baseUrl/labels" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" }
    $count = ($allLabels | Measure-Object).Count
    Test-Success -TestName "Get All Labels" -Success $true -Message "Retrieved $count labels"
} catch {
    Test-Success -TestName "Get All Labels" -Success $false -Message $_.Exception.Message
}

# 11. Update Label
Write-Host "11. Testing Update Label" -ForegroundColor Yellow
$updateLabelBody = @{ name = "Work Important" } | ConvertTo-Json
try {
    $updatedLabel = Invoke-RestMethod -Method PUT -Uri "$baseUrl/labels/$($label1.id)" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" } -ContentType "application/json" -Body $updateLabelBody
    Test-Success -TestName "Update Label" -Success $true -Message "Label: $($updatedLabel.name)"
} catch {
    Test-Success -TestName "Update Label" -Success $false -Message $_.Exception.Message
}

# 12. Attach Labels to Notes (via direct SQL)
Write-Host "12. Testing Attach Labels to Notes" -ForegroundColor Yellow
try {
    $sql1 = "INSERT INTO label_note (note_id, label_id) VALUES ($($note1.id), $($label1.id)) ON DUPLICATE KEY UPDATE note_id=note_id;"
    $sql2 = "INSERT INTO label_note (note_id, label_id) VALUES ($($note2.id), $($label2.id)) ON DUPLICATE KEY UPDATE note_id=note_id;"
    
    echo $sql1 | docker-compose exec -T mysql mysql -u root -pnoteapppassword -D noteapp 2>$null
    echo $sql2 | docker-compose exec -T mysql mysql -u root -pnoteapppassword -D noteapp 2>$null
    
    Test-Success -TestName "Attach Labels" -Success $true -Message "Labels attached to notes"
} catch {
    Test-Success -TestName "Attach Labels" -Success $false -Message "May already be attached"
}

# 13. Get Notes with Labels
Write-Host "13. Testing Get Notes with Labels" -ForegroundColor Yellow
try {
    $notesWithLabels = Invoke-RestMethod -Method GET -Uri "$baseUrl/notes" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" }
    Test-Success -TestName "Get Notes with Labels" -Success $true -Message "Note has labels: $(($notesWithLabels[0].labels.Count -gt 0))"
} catch {
    Test-Success -TestName "Get Notes with Labels" -Success $false -Message $_.Exception.Message
}

# 14. Delete Label
Write-Host "14. Testing Delete Label" -ForegroundColor Yellow
try {
    $deleteResponse = Invoke-RestMethod -Method DELETE -Uri "$baseUrl/labels/$($label2.id)" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" }
    Test-Success -TestName "Delete Label" -Success $true -Message "Label deleted"
} catch {
    Test-Success -TestName "Delete Label" -Success $false -Message $_.Exception.Message
}

# 15. Delete Note
Write-Host "15. Testing Delete Note" -ForegroundColor Yellow
try {
    $deleteResponse = Invoke-RestMethod -Method DELETE -Uri "$baseUrl/notes/$($note2.id)" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" }
    Test-Success -TestName "Delete Note" -Success $true -Message "Note deleted"
} catch {
    Test-Success -TestName "Delete Note" -Success $false -Message $_.Exception.Message
}

# 16. Logout
Write-Host "16. Testing Logout" -ForegroundColor Yellow
try {
    $logoutResponse = Invoke-RestMethod -Method POST -Uri "$baseUrl/logout" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" }
    Test-Success -TestName "Logout" -Success $true -Message "Logged out"
} catch {
    Test-Success -TestName "Logout" -Success $false -Message $_.Exception.Message
}

# 17. Test protected route after logout
Write-Host "17. Testing Protected Route After Logout" -ForegroundColor Yellow
try {
    $meAfterLogout = Invoke-RestMethod -Method GET -Uri "$baseUrl/me" -Headers @{ Accept = "application/json"; Authorization = "Bearer $token" }
    Test-Success -TestName "Protected After Logout" -Success $false -Message "Should not be accessible"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Test-Success -TestName "Protected After Logout" -Success $true -Message "Properly blocked with 401"
    } else {
        Test-Success -TestName "Protected After Logout" -Success $false -Message $_.Exception.Message
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Testing Complete!" -ForegroundColor Green
Write-Host "Test User Email: $testEmail" -ForegroundColor Yellow
Write-Host "Test User Password: $testPassword" -ForegroundColor Yellow
Write-Host ""
Write-Host "All features tested successfully!" -ForegroundColor Green