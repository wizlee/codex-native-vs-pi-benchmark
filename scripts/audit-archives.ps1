param([Parameter(Mandatory=$true)][string]$TrialDirectory)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$outputPath=Join-Path $TrialDirectory 'outputs'
$reports=@()
if(Test-Path -LiteralPath $outputPath){
  foreach($archiveFile in Get-ChildItem -LiteralPath $outputPath -File -Filter '*.zip'){
    $archive=[System.IO.Compression.ZipFile]::OpenRead($archiveFile.FullName)
    try{
      $entries=@()
      foreach($entry in $archive.Entries){
        if($entry.Name -eq ''){continue}
        $sourceFile=Join-Path $TrialDirectory $entry.Name
        $matchingSource=$null
        if((Test-Path -LiteralPath $sourceFile -PathType Leaf) -and $entry.Name -match '\.(mjs|js)$'){
          $stream=$entry.Open()
          try{
            $hasher=[System.Security.Cryptography.SHA256]::Create()
            try{$archiveHash=[Convert]::ToHexString($hasher.ComputeHash($stream))}finally{$hasher.Dispose()}
          }finally{$stream.Dispose()}
          $sourceHash=(Get-FileHash -LiteralPath $sourceFile -Algorithm SHA256).Hash
          $matchingSource=($sourceHash -eq $archiveHash)
        }
        $entries += [pscustomobject]@{name=$entry.FullName;bytes=$entry.Length;matches_working_code=$matchingSource}
      }
      $reports += [pscustomobject]@{archive=$archiveFile.Name;entries=$entries;stale_code_entries=@($entries | Where-Object {$_.matches_working_code -eq $false}).Count}
    }finally{$archive.Dispose()}
  }
}
ConvertTo-Json -Depth 6 -InputObject @($reports)
