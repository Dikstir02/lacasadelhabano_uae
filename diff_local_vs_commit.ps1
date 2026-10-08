param(
    [string]$File = "styles.css"
)

$working = Get-Content $File
$committed = git show HEAD:"$File"

$lines = @()
for ($i = 0; $i -lt $working.Length; $i++) {
    $w = $working[$i]
    $c = if ($committed -match [regex]::Split($committed, "`n")[0]) { $committed[$i] } else { $null }
    if ($w -ne $c) {
        $lines += "--- $i : $w"
        $lines += "+++ $i : $c"
    }
}
$lines | Select-Object -First 40
