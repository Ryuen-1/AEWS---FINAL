$ErrorActionPreference = 'Stop'
$qaDirectory = (Resolve-Path 'tmp/report-letterhead-qa').Path
$wordApp = New-Object -ComObject Word.Application
$wordApp.Visible = $false
$wordApp.DisplayAlerts = 0
try {
  foreach ($roleName in @('amu','instructor','admin')) {
    $wordDoc = $wordApp.Documents.Open((Join-Path $qaDirectory "$roleName.docx"), $false, $true)
    try {
      $wordDoc.ExportAsFixedFormat((Join-Path $qaDirectory "$roleName-word.pdf"), 17)
      Write-Output "Rendered $roleName Word report"
    } finally { $wordDoc.Close(0) }
  }
} finally { $wordApp.Quit() }
$excelApp = New-Object -ComObject Excel.Application
$excelApp.Visible = $false
$excelApp.DisplayAlerts = $false
try {
  foreach ($roleName in @('amu','instructor','admin')) {
    $excelBook = $excelApp.Workbooks.Open((Join-Path $qaDirectory "$roleName.xlsx"), 0, $true)
    try {
      $excelBook.ExportAsFixedFormat(0, (Join-Path $qaDirectory "$roleName-excel.pdf"))
      Write-Output "Rendered $roleName Excel report"
    } finally { $excelBook.Close($false) }
  }
} finally { $excelApp.Quit() }
