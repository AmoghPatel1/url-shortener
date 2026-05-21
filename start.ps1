$root = $PSScriptRoot

function Wait-ForPort($port, $name, $timeoutSec = 120) {
    Write-Host "Waiting for $name on port $port..." -NoNewline
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("localhost", $port)
            $tcp.Close()
            Write-Host " ready!"
            return $true
        } catch {
            Write-Host "." -NoNewline
            Start-Sleep -Seconds 2
        }
    }
    Write-Host " TIMED OUT"
    return $false
}

Write-Host "Starting infrastructure..."
docker-compose up -d

Write-Host "Starting backend..."
$backend = Start-Job -Name "backend" -ScriptBlock {
    Set-Location "$using:root\backend"
    .\mvnw.cmd spring-boot:run
}
$backend.Id | Out-File -FilePath "$root\.backend.jobid" -Encoding utf8

Wait-ForPort 8081 "backend"

Write-Host "Starting frontend..."
$frontend = Start-Job -Name "frontend" -ScriptBlock {
    Set-Location "$using:root\frontend"
    npm run dev
}
$frontend.Id | Out-File -FilePath "$root\.frontend.jobid" -Encoding utf8

Wait-ForPort 3000 "frontend"

Write-Host ""
Write-Host "All services up."
Write-Host "Stream logs:  Receive-Job -Name backend -Keep"
Write-Host "              Receive-Job -Name frontend -Keep"
Write-Host "Stop all:     .\stop.ps1"