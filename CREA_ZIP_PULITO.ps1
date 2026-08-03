$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Section([string]$Text, [ConsoleColor]$Color = [ConsoleColor]::Cyan) {
    Write-Host ''
    Write-Host ('=' * 62) -ForegroundColor $Color
    Write-Host $Text -ForegroundColor $Color
    Write-Host ('=' * 62) -ForegroundColor $Color
}

try {
    $ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectName = Split-Path -Leaf $ProjectRoot

    Write-Section 'CREAZIONE ZIP PULITO - PROGETTO STAFF'
    Write-Host "Cartella progetto: $ProjectRoot"

    $RequiredItems = @('package.json', 'src')
    foreach ($Item in $RequiredItems) {
        if (-not (Test-Path (Join-Path $ProjectRoot $Item))) {
            throw "La cartella non sembra essere la root del progetto: manca '$Item'. Metti i due file nella cartella NZ e riprova."
        }
    }

    $Timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $OutputDirectory = Split-Path -Parent $ProjectRoot
    $ZipPath = Join-Path $OutputDirectory ("{0}_PULITO_{1}.zip" -f $ProjectName, $Timestamp)
    $TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("STAFF_ZIP_{0}" -f ([guid]::NewGuid().ToString('N')))
    $TempProject = Join-Path $TempRoot $ProjectName

    New-Item -ItemType Directory -Path $TempProject -Force | Out-Null

    Write-Host 'Copia dei file in corso...' -ForegroundColor Yellow

    $ExcludedDirectories = @(
        '.git',
        'node_modules',
        'dist',
        '.vercel',
        '.vite',
        '.cache',
        'coverage',
        '.idea',
        '.vscode',
        'supabase\.temp'
    )

    $ExcludedFiles = @(
        '.env',
        '.env.local',
        '.env.development',
        '.env.production',
        '.env.test',
        '*.log',
        '*.zip'
    )

    $RoboArgs = @(
        $ProjectRoot,
        $TempProject,
        '/E',
        '/R:1',
        '/W:1',
        '/NFL',
        '/NDL',
        '/NJH',
        '/NJS',
        '/NP',
        '/XD'
    ) + ($ExcludedDirectories | ForEach-Object { Join-Path $ProjectRoot $_ }) + @('/XF') + $ExcludedFiles

    & robocopy @RoboArgs | Out-Null
    $RoboExitCode = $LASTEXITCODE
    if ($RoboExitCode -ge 8) {
        throw "Errore durante la copia dei file (codice Robocopy $RoboExitCode)."
    }

    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force
    }

    Write-Host 'Creazione archivio ZIP...' -ForegroundColor Yellow
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $TempRoot,
        $ZipPath,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )

    if (-not (Test-Path $ZipPath)) {
        throw 'Lo ZIP non è stato creato.'
    }

    $ZipInfo = Get-Item $ZipPath
    if ($ZipInfo.Length -le 0) {
        throw 'Lo ZIP creato è vuoto.'
    }

    $Archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        if ($Archive.Entries.Count -eq 0) {
            throw 'Lo ZIP non contiene file.'
        }

        $ForbiddenEntries = $Archive.Entries | Where-Object {
            $_.FullName -match '(^|/)(\.git|node_modules|dist|\.vercel)(/|$)' -or
            $_.FullName -match '(^|/)\.env($|\.)'
        }

        if ($ForbiddenEntries) {
            $Names = ($ForbiddenEntries | Select-Object -First 5 -ExpandProperty FullName) -join ', '
            throw "Controllo sicurezza fallito. Trovati elementi esclusi: $Names"
        }
    }
    finally {
        $Archive.Dispose()
    }

    Write-Section 'ZIP CREATO CORRETTAMENTE' Green
    Write-Host "File: $ZipPath" -ForegroundColor Green
    Write-Host ("Dimensione: {0:N2} MB" -f ($ZipInfo.Length / 1MB)) -ForegroundColor Green
    Write-Host ''
    Write-Host 'Lo ZIP non contiene .git, .env, node_modules, dist o .vercel.' -ForegroundColor Green

    Start-Process explorer.exe "/select,`"$ZipPath`""
}
catch {
    Write-Section 'CREAZIONE ZIP NON RIUSCITA' Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ''
    Write-Host 'Nessuno ZIP non sicuro è stato conservato.' -ForegroundColor Yellow
}
finally {
    if ($TempRoot -and (Test-Path $TempRoot)) {
        Remove-Item $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }

    Write-Host ''
    Read-Host 'Premi INVIO per chiudere'
}
