<#
  deploy-ftp.ps1  —  Sube Esteban IA a tu hosting por FTP
  ---------------------------------------------------------
  Este script NUNCA guarda tu contraseña en el archivo. Te la pregunta
  cada vez que lo corres (con el texto oculto) y solo la usa en memoria
  durante la subida. No se escribe en ningún log ni en disco.

  USO BÁSICO (primero para verificar la conexión y ver qué carpetas hay):
    .\deploy-ftp.ps1 -ListOnly

  USO REAL (sube todo el sitio):
    .\deploy-ftp.ps1

  Si tu host, puerto o carpeta remota son distintos a los valores por
  defecto de abajo, pásalos como parámetros, por ejemplo:
    .\deploy-ftp.ps1 -FtpHost "ftp.midominio.com" -RemotePath "www" -ListOnly

  DÓNDE ENCONTRAR ESTOS DATOS:
    - Host, usuario y puerto FTP: en el panel de tu hosting
      (cPanel > "Cuentas FTP" / "FTP Accounts", o el correo de bienvenida
      que te mandó el proveedor al contratar el hosting).
    - Carpeta remota: casi siempre "public_html" (cPanel) o "www".
      Usa -ListOnly para confirmarlo antes de subir nada.
#>

param(
  [string]$FtpHost = "ftp.us.stackcp.com",
  [int]$FtpPort = 21,
  [string]$RemotePath = "public_html",
  [string]$Username = "esteban-serna.com",
  [switch]$ListOnly
)

$ErrorActionPreference = "Stop"

# ── Credenciales: se piden en el momento, nunca quedan guardadas ──────────
if (-not $Username) {
  $Username = Read-Host "Usuario FTP"
}
$SecurePassword = Read-Host "Contraseña FTP" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
$Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR) | Out-Null

$RemotePath = $RemotePath.Trim('/')
$BaseUri = "ftp://$($FtpHost):$FtpPort/$RemotePath"

function New-FtpRequest {
  param([string]$Uri, [string]$Method)
  $req = [System.Net.FtpWebRequest]::Create($Uri)
  $req.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
  $req.Method = $Method
  $req.UsePassive = $true
  $req.UseBinary = $true
  $req.KeepAlive = $false
  return $req
}

function Get-FtpListing {
  param([string]$Path)
  $uri = "ftp://$($FtpHost):$($FtpPort)/$Path"
  Write-Host "Conectando a $uri ..." -ForegroundColor Cyan
  $req = New-FtpRequest -Uri $uri -Method ([System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails)
  $resp = $req.GetResponse()
  $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
  $listing = $reader.ReadToEnd()
  $reader.Close()
  $resp.Close()
  Write-Host "Contenido de '$Path':" -ForegroundColor Green
  Write-Host $listing
}

function New-RemoteDirectory {
  param([string]$RelativeDir)
  if ([string]::IsNullOrWhiteSpace($RelativeDir)) { return }
  $parts = $RelativeDir -split '/'
  $current = $RemotePath
  foreach ($part in $parts) {
    if ([string]::IsNullOrWhiteSpace($part)) { continue }
    $current = "$current/$part"
    $uri = "ftp://$($FtpHost):$($FtpPort)/$current"
    try {
      $req = New-FtpRequest -Uri $uri -Method ([System.Net.WebRequestMethods+Ftp]::MakeDirectory)
      $resp = $req.GetResponse()
      $resp.Close()
    } catch [System.Net.WebException] {
      # 550 = ya existe: lo ignoramos, cualquier otro error se re-lanza
      $response = $_.Exception.Response
      if (-not $response -or $response.StatusCode -ne [System.Net.FtpStatusCode]::ActionNotTakenFileUnavailable) {
        # No es "ya existe", pero tampoco frenamos el despliegue por una carpeta
        Write-Host "  (aviso creando carpeta '$current': $($_.Exception.Message))" -ForegroundColor DarkYellow
      }
    }
  }
}

function Send-FtpFile {
  param([string]$LocalFile, [string]$RemoteRelativePath)
  $uri = "ftp://$($FtpHost):$($FtpPort)/$RemotePath/$RemoteRelativePath"
  $req = New-FtpRequest -Uri $uri -Method ([System.Net.WebRequestMethods+Ftp]::UploadFile)
  $bytes = [System.IO.File]::ReadAllBytes($LocalFile)
  $req.ContentLength = $bytes.Length
  $stream = $req.GetRequestStream()
  $stream.Write($bytes, 0, $bytes.Length)
  $stream.Close()
  $resp = $req.GetResponse()
  $resp.Close()
}

if ($ListOnly) {
  Get-FtpListing -Path $RemotePath
  return
}

# ── Qué se sube: todo el sitio, menos archivos de repo/documentación ──────
$LocalRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ExcludeTopDirs = @('.archive', '.git', '.claude')
$ExcludeFileNames = @(
  '.gitignore', 'README.md', 'CLAUDE.md', 'package.json',
  'despliegue_esteban_serna.zip', 'deploy-ftp.ps1', 'delete-ftp-folder.ps1'
)

$files = Get-ChildItem -Path $LocalRoot -Recurse -File | Where-Object {
  $rel = $_.FullName.Substring($LocalRoot.Length + 1)
  $topDir = ($rel -split '[\\/]')[0]
  (-not ($ExcludeTopDirs -contains $topDir)) -and (-not ($ExcludeFileNames -contains $_.Name))
}

Write-Host "Subiendo $($files.Count) archivos a ftp://$($FtpHost):$($FtpPort)/$RemotePath ..." -ForegroundColor Cyan

$madeDirs = @{}
$okCount = 0
$failCount = 0

foreach ($file in $files) {
  $relativePath = $file.FullName.Substring($LocalRoot.Length + 1) -replace '\\', '/'
  $relativeDir = Split-Path -Parent $relativePath
  if ($relativeDir -and $relativeDir -ne '.') {
    $relativeDir = $relativeDir -replace '\\', '/'
    if (-not $madeDirs.ContainsKey($relativeDir)) {
      New-RemoteDirectory -RelativeDir $relativeDir
      $madeDirs[$relativeDir] = $true
    }
  }

  try {
    Send-FtpFile -LocalFile $file.FullName -RemoteRelativePath $relativePath
    Write-Host "  OK  $relativePath" -ForegroundColor Green
    $okCount++
  } catch {
    Write-Host "  ERROR  $relativePath -> $($_.Exception.Message)" -ForegroundColor Red
    $failCount++
  }
}

Write-Host ""
Write-Host "Listo: $okCount subidos, $failCount con error." -ForegroundColor Cyan
if ($failCount -gt 0) {
  Write-Host "Revisa los errores de arriba (usuario/permiso/ruta) y vuelve a correr el script." -ForegroundColor Yellow
}
