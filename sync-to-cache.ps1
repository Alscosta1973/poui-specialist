# Sincroniza os arquivos do plugin poui-specialist com o cache instalado do Claude Code
# Execute sempre apos alterar skills, commands ou agents

$source = "C:\TOTVS\Projetos\Claude\poui-specialist"
$dests  = @(
    "C:\Users\andre\.claude\plugins\cache\poui-specialist-marketplace\poui-specialist\1.0.0"
)

$dirs = @(".claude-plugin", "commands", "skills", "agents")

foreach ($dest in $dests) {
    Write-Host "`n-> $dest"
    foreach ($dir in $dirs) {
        $src = Join-Path $source $dir
        $dst = Join-Path $dest $dir
        if (Test-Path $src) {
            robocopy $src $dst /MIR /NFL /NDL /NJH /NJS | Out-Null
            Write-Host "   OK  $dir"
        }
    }
}

Write-Host "`nSincronizacao concluida."
