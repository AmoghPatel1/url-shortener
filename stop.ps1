$root = $PSScriptRoot

function Stop-ByJobFile($file, $name) {
    if (Test-Path $file) {
        $jobId = Get-Content $file
        $job = Get-Job -Id $jobId -ErrorAction SilentlyContinue
        if ($job) {
            Write-Host "Stopping $name (job $jobId)..."
            Stop-Job -Id $jobId
            Remove-Job -Id $jobId
        } else {
            Write-Host "$name job not found."
        }
        Remove-Item $file
    } else {
        Write-Host "No job file for $name."
    }
}

Stop-ByJobFile "$root\.backend.jobid" "backend"
Stop-ByJobFile "$root\.frontend.jobid" "frontend"

Write-Host "Stopping infrastructure..."
docker-compose down

Write-Host "Done."