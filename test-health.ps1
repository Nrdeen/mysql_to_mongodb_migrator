Start-Sleep -Seconds 2
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "[SUCCESS] Server is running!"
    Write-Host "Response:"
    Write-Host $response.Content
} 
catch {
    Write-Host "[ERROR] Cannot connect to server"
    Write-Host $_.Exception.Message
    exit 1
}
