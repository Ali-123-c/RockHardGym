# Fingerprint Device Test Suite
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "FINGERPRINT DEVICE TEST SUITE" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: API Server Health
Write-Host "[TEST 1] API Server Health Check" -ForegroundColor Yellow
$apiTest = curl http://localhost:3002/api/members -ErrorAction SilentlyContinue
if ($apiTest -and ($apiTest | ConvertFrom-Json).success) {
    Write-Host "✅ API Server is running on port 3002" -ForegroundColor Green
} else {
    Write-Host "❌ API Server is not responding" -ForegroundColor Red
}
Write-Host ""

# Test 2: Fingerprint Bridge Status
Write-Host "[TEST 2] Fingerprint Bridge Connection" -ForegroundColor Yellow
$bridgeTest = curl http://localhost:5050/health -ErrorAction SilentlyContinue
if ($bridgeTest) {
    Write-Host "✅ Bridge is running on port 5050" -ForegroundColor Green
    $bridgeTest | ConvertFrom-Json | Format-List
} else {
    Write-Host "⚠️  Bridge health endpoint not accessible" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Create Test Member
Write-Host "[TEST 3] Create Test Member" -ForegroundColor Yellow
$memberPayload = @{
    name = "Fingerprint Test User"
    phone = "03001234567"
    membership_no = "FP-TEST-$(Get-Random -Minimum 1000 -Maximum 9999)"
    city = "Test City"
    joining_date = (Get-Date).ToString("yyyy-MM-dd")
    fee_amount = 5000
} | ConvertTo-Json

$memberResponse = curl -X POST http://localhost:3002/api/members `
    -ContentType "application/json" `
    -Body $memberPayload `
    -ErrorAction SilentlyContinue

$memberJson = $memberResponse | ConvertFrom-Json
if ($memberJson.success) {
    Write-Host "✅ Member created successfully" -ForegroundColor Green
    $testMemberId = $memberJson.data.id
    Write-Host "   Member ID: $testMemberId" -ForegroundColor Cyan
} else {
    Write-Host "❌ Failed to create member" -ForegroundColor Red
    Write-Host $memberJson
}
Write-Host ""

# Test 4: Check Fingerprint Status for Member
Write-Host "[TEST 4] Fingerprint Device Status for Member" -ForegroundColor Yellow
if ($testMemberId) {
    $fpStatusResponse = curl http://localhost:3002/api/members/$testMemberId/fingerprint `
        -ErrorAction SilentlyContinue
    $fpStatusJson = $fpStatusResponse | ConvertFrom-Json
    
    Write-Host "✅ Fingerprint status endpoint response:" -ForegroundColor Green
    $fpStatusJson | Format-List
} else {
    Write-Host "⚠️  Cannot test fingerprint status - no member ID" -ForegroundColor Yellow
}
Write-Host ""

# Test 5: Duplicate Phone Test
Write-Host "[TEST 5] Duplicate Phone Detection" -ForegroundColor Yellow
$dupPayload = @{
    name = "Another User"
    phone = "03001234567"
    membership_no = "DUP-TEST-$(Get-Random -Minimum 1000 -Maximum 9999)"
    city = "Another City"
    joining_date = (Get-Date).ToString("yyyy-MM-dd")
    fee_amount = 5000
} | ConvertTo-Json

$dupResponse = curl -X POST http://localhost:3002/api/members `
    -ContentType "application/json" `
    -Body $dupPayload `
    -ErrorAction SilentlyContinue

$dupJson = $dupResponse | ConvertFrom-Json
if ($dupJson.success -eq $false -and $dupJson.error) {
    Write-Host "✅ Duplicate detection working: $($dupJson.error)" -ForegroundColor Green
} else {
    Write-Host "❌ Duplicate phone was not caught" -ForegroundColor Red
}
Write-Host ""

# Test 6: Mark Attendance
Write-Host "[TEST 6] Mark Attendance" -ForegroundColor Yellow
if ($testMemberId) {
    $attendancePayload = @{
        member_id = $testMemberId
        local_date = (Get-Date).ToString("yyyy-MM-dd")
        idempotency_key = "test-$(Get-Random -Minimum 10000 -Maximum 99999)"
    } | ConvertTo-Json

    $attendanceResponse = curl -X POST http://localhost:3002/api/attendance `
        -ContentType "application/json" `
        -Body $attendancePayload `
        -ErrorAction SilentlyContinue

    $attendanceJson = $attendanceResponse | ConvertFrom-Json
    if ($attendanceJson.success) {
        Write-Host "✅ Attendance marked successfully" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Attendance response: $($attendanceJson.error)" -ForegroundColor Cyan
    }
} else {
    Write-Host "⚠️  Cannot test attendance - no member ID" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "TEST SUITE COMPLETED" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
