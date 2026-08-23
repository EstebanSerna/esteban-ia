<#
  delete-ftp-folder.ps1  —  Borra una carpeta remota por FTP (PERMANENTE)
  -------------------------------------------------------------------------
  Igual que deploy-ftp.ps1: nunca guarda tu contraseña, te la pregunta en
  el momento y solo la usa en memoria.

  Por defecto apunta a la carpeta suelta "Esteban" que vimos en el listado
  de public_html. Antes de borrar, SIEMPRE lista todo el contenido (incluye
  subcarpetas) y pide que escribas BORRAR para confirmar. FTP no tiene
  papelera: lo que se borra aquí no se puede recuperar.

  USO:
    .\delete-ftp-folder.ps1
    .\delete-ftp-folder.ps1 -TargetPath "public_html/OtraCarpeta"
#>

param(
  [string]$FtpHost = "ftp.us.stackcp.com",
  [int]$FtpPort = 21,
  [string]$Username = "esteban-serna.com",
  [string]$TargetPath = "public_html/Esteban"
)

$ErrorActionPreference = "Stop"
$TargetPath = $TargetPath.Trim('/')

if (-not $Username) {
  $Username = Read-Host "Usuario FTP"
}
$SecurePassword = Read-Host "Contraseña FTP" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
$Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR) | Out-Null

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

function Get-FtpEntries {
  # Devuelve @{Name; IsDirectory} para cada entrada de una carpeta remota
  param([string]$Path)
  $uri = "ftp://$($FtpHost):$($FtpPort)/$Path"
  $req = New-FtpRequest -Uri $uri -Method ([System.Net.WebRequestMethods+Ftp]::ListDirectoryDetails)
  $resp = $req.GetResponse()
  $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
  $raw = $reader.ReadToEnd()
  $reader.Close()
  $resp.Close()

  $entries = @()
  foreach ($line in ($raw -split "`r?`n")) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $fields = $line -split '\s+', 9
    if ($fields.Count -lt 9) { continue }
    $name = $fields[8]
    if ($name -eq '.' -or $name -eq '..') { continue }
    $isDir = $fields[0].StartsWith('d')
    $entries += [PSCustomObject]@{ Name = $name; IsDirectory = $isDir }
  }
  return $entries
}

function Show-FtpTree {
  param([string]$Path, [int]$Depth = 0)
  $indent = "  " * $Depth
  $entries = Get-FtpEntries -Path $Path
  foreach ($e in $entries) {
    $childPath = "$Path/$($e.Name)"
    if ($e.IsDirectory) {
      Write-Host "$indent[carpeta] $($e.Name)/" -ForegroundColor Yellow
      Show-FtpTree -Path $childPath -Depth ($Depth + 1)
    } else {
      Write-Host "$indent$($e.Name)" -ForegroundColor Gray
    }
  }
}

function Remove-FtpFolderRecursive {
  param([string]$Path)
  $entries = Get-FtpEntries -Path $Path
  foreach ($e in $entries) {
    $childPath = "$Path/$($e.Name)"
    if ($e.IsDirectory) {
      Remove-FtpFolderRecursive -Path $childPath
    } else {
      $uri = "ftp://$($FtpHost):$($FtpPort)/$childPath"
      $req = New-FtpRequest -Uri $uri -Method ([System.Net.WebRequestMethods+Ftp]::DeleteFile)
      $resp = $req.GetResponse()
      $resp.Close()
      Write-Host "  borrado archivo: $childPath" -ForegroundColor DarkGray
    }
  }
  $uri = "ftp://$($FtpHost):$($FtpPort)/$Path"
  $req = New-FtpRequest -Uri $uri -Method ([System.Net.WebRequestMethods+Ftp]::RemoveDirectory)
  $resp = $req.GetResponse()
  $resp.Close()
  Write-Host "  borrada carpeta: $Path" -ForegroundColor DarkGray
}

Write-Host "Esto es lo que hay dentro de '$TargetPath' (se borrará TODO, sin papelera):" -ForegroundColor Cyan
Write-Host ""
Show-FtpTree -Path $TargetPath
Write-Host ""

$confirm = Read-Host "Escribe BORRAR (en mayúsculas) para confirmar el borrado permanente de '$TargetPath'"
if ($confirm -ne "BORRAR") {
  Write-Host "Cancelado. No se borró nada." -ForegroundColor Yellow
  return
}

Remove-FtpFolderRecursive -Path $TargetPath
Write-Host ""
Write-Host "Listo: '$TargetPath' fue eliminada por completo." -ForegroundColor Green
