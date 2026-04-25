# =============================
# REQUIRE ADMIN
# =============================
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Start-Process powershell "-ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# =============================
# WORKSPACE & SETTINGS
# =============================
$ScraperApiKey = "b5009ca3c5200be803a72cc263a83744"
$RunStamp      = Get-Date -Format "yyyyMMdd_HHmmss"
$Root          = "C:\LANForge"
$DownloadRoot  = Join-Path $Root "Downloads\$RunStamp"
$ExtractRoot   = Join-Path $Root "Extracted\$RunStamp"
$LogRoot       = Join-Path $Root "Logs"
$LogFile       = Join-Path $LogRoot "run_$RunStamp.log"

New-Item -ItemType Directory -Force -Path $DownloadRoot,$ExtractRoot,$LogRoot | Out-Null

function Log($m){ Add-Content $LogFile "[$(Get-Date -Format 'HH:mm:ss')] $m" }

# =============================
# GUI
# =============================
$form = New-Object System.Windows.Forms.Form
$form.Text = "LANForge Post Build Tool"
$form.Size = New-Object System.Drawing.Size(540,340)
$form.StartPosition = "CenterScreen"
$form.BackColor = "#0f172a"

$title = New-Object System.Windows.Forms.Label
$title.Text = "LANForge Post Build Tool"
$title.ForeColor = "White"
$title.Font = New-Object System.Drawing.Font("Segoe UI",16,[System.Drawing.FontStyle]::Bold)
$title.AutoSize = $true
$title.Location = New-Object System.Drawing.Point(120,20)
$form.Controls.Add($title)

$status = New-Object System.Windows.Forms.Label
$status.Text = "Ready"
$status.ForeColor = "White"
$status.AutoSize = $true
$status.Location = New-Object System.Drawing.Point(20,240)
$form.Controls.Add($status)

$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location = New-Object System.Drawing.Point(20,210)
$progress.Size = New-Object System.Drawing.Size(480,20)
$form.Controls.Add($progress)

$button = New-Object System.Windows.Forms.Button
$button.Text = "Run Full Setup"
$button.Size = New-Object System.Drawing.Size(220,45)
$button.Location = New-Object System.Drawing.Point(160,120)
$form.Controls.Add($button)

function Update-Status($msg, $percent) {
    $status.Text = $msg
    if ($null -ne $percent -and $percent -ge 0 -and $percent -le 100) { $progress.Value = $percent }
    $form.Refresh()
}

# =============================
# HELPERS
# =============================
function Normalize([string]$t){ return ($t -replace '\s+',' ').Trim().ToUpper() }

function Get-Board {
    $b = Get-CimInstance Win32_BaseBoard
    [pscustomobject]@{
        Vendor = (Normalize $b.Manufacturer)
        Model  = (Normalize ($b.Product -replace '\(MS-\d+\)',''))
    }
}

function Resolve-Url([string]$base,[string]$href){
    try { return ([Uri]::new([Uri]$base,$href)).AbsoluteUri } catch { return $null }
}

# ScraperAPI Integration (JavaScript Rendering Enabled)
function Get-Links([string]$url){
    Log "Requesting $url via ScraperAPI..."
    
    $EncodedUrl = [uri]::EscapeDataString($url)
    $ApiUrl = "http://api.scraperapi.com/?api_key=$ScraperApiKey&url=$EncodedUrl&render=true"
    
    try {
        $html = (Invoke-WebRequest -Uri $ApiUrl -UseBasicParsing -TimeoutSec 120).Content
    } catch {
        Log "ERR ScraperAPI Failed: $($_.Exception.Message)"
        return @()
    }

    $rx = [regex]'href\s*=\s*["''](?<u>[^"'']+)["'']'
    $set = @{}
    
    foreach($m in $rx.Matches($html)){
        # Resolve against the original vendor URL, not the ScraperAPI URL
        $u = Resolve-Url $url $m.Groups['u'].Value
        if($u){ $set[$u]=1 }
    }
    
    Log "Found $($set.Keys.Count) total URLs on page."
    return $set.Keys
}

function Is-Pkg([string]$u){
    $l=$u.ToLower()
    return $l.EndsWith(".zip") -or $l.EndsWith(".cab") -or $l.EndsWith(".exe") -or $l.EndsWith(".msi")
}

function Pick-Links($links,$inc,$exc,$max=2){
    $out=@()
    foreach($l in $links){
        $ll=$l.ToLower()
        if(-not (Is-Pkg $l)){ continue }
        if($ll -match 'bios|firmware'){ continue }
        $ok=$false; $score=0
        foreach($p in $inc){ if($ll -match $p){ $ok=$true; $score+=10 } }
        if(-not $ok){ continue }
        foreach($p in $exc){ if($ll -match $p){ $ok=$false; break } }
        if(-not $ok){ continue }
        if($ll -match 'driver'){ $score+=3 }
        if($ll -match 'chipset|lan|ethernet|wifi|wireless|bluetooth|audio|realtek|intel|amd|mediatek|qualcomm'){ $score+=2 }
        $out += [pscustomobject]@{Url=$l;Score=$score}
    }
    return ($out | Sort-Object Score -Descending | Select-Object -First $max).Url
}

function DL([string]$url){
    $name = [IO.Path]::GetFileName(([Uri]$url).AbsolutePath)
    if([string]::IsNullOrWhiteSpace($name)){ $name = "pkg_" + [guid]::NewGuid().ToString("N") }
    $dest = Join-Path $DownloadRoot $name
    Invoke-WebRequest $url -OutFile $dest -UseBasicParsing
    return $dest
}

function Expand-Pkg([string]$p){
    $ext=[IO.Path]::GetExtension($p).ToLower()
    $dir=Join-Path $ExtractRoot ([IO.Path]::GetFileNameWithoutExtension($p))
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    if($ext -eq ".zip"){
        Expand-Archive $p -DestinationPath $dir -Force
        return $dir
    }
    if($ext -eq ".cab"){
        & "$env:SystemRoot\System32\expand.exe" $p -F:* $dir | Out-Null
        return $dir
    }
    return $null
}

function Install-INF([string]$dir){
    $pn = "$env:SystemRoot\System32\pnputil.exe"
    Start-Process $pn -ArgumentList "/add-driver `"$dir\*.inf`" /subdirs /install" -Wait -NoNewWindow
}

function Silent-Args([string]$p){
    $f=[IO.Path]::GetFileName($p).ToLower()
    $e=[IO.Path]::GetExtension($p).ToLower()
    if($e -eq ".msi"){ return "/qn /norestart" }
    if($e -eq ".exe"){
        if($f -match 'intel'){ return "-s" }
        if($f -match 'realtek|audio|lan|wifi|bluetooth|chipset|setup'){ return "/s /v`"/qn`"" }
    }
    return $null
}

function Install-Pkg([string]$p){
    $ext=[IO.Path]::GetExtension($p).ToLower()
    if($ext -in ".zip",".cab"){
        $d=Expand-Pkg $p
        if($d){ Install-INF $d }
        return
    }
    
    $args = Silent-Args $p
    if($args){
        Log "Executing: $p $args"
        Start-Process $p -ArgumentList $args -Wait -NoNewWindow
    } else {
        Log "Executing (No Args): $p"
        Start-Process $p -Wait -NoNewWindow
    }
}

# =============================
# CATEGORY RULES
# =============================
$Rules = @(
    @{Name="Chipset";   Inc=@('chipset','smbus','gpio','psp','mei','serial.?io'); Exc=@('raid','rst','vmd')},
    @{Name="LAN";       Inc=@('lan','ethernet','realtek','intel-network');         Exc=@('wifi','wireless','bluetooth')},
    @{Name="WiFi";      Inc=@('wifi','wi-fi','wireless','wlan','mediatek','intel-wireless','qualcomm'); Exc=@('bluetooth')},
    @{Name="Bluetooth"; Inc=@('bluetooth','\bbt\b');                                Exc=@('wifi')},
    @{Name="Audio";     Inc=@('audio','realtek-audio','nahimic');                   Exc=@('sonic','utility')}
)

# =============================
# BOARD CATALOG (21 BOARDS)
# =============================
$BoardCatalog = @(
    @{V="ASROCK";   R='B850I\s+LIGHTNING'; S='https://www.asrock.com/mb/AMD/B850I%20Lightning%20WiFi/index.asp#Download'},
    @{V="ASROCK";   R='Z890I';             S='https://www.asrock.com/mb/Intel/Z890I/index.asp#Download'},

    @{V="ASUS";     R='CROSSHAIR\s+X870E'; S='https://rog.asus.com/motherboards/rog-crosshair/rog-crosshair-x870e-hero/helpdesk_download/'},
    @{V="ASUS";     R='MAXIMUS\s+Z890\s+HERO'; S='https://rog.asus.com/motherboards/rog-maximus/rog-maximus-z890-hero/helpdesk_download/'},
    @{V="ASUS";     R='STRIX\s+X870-A';    S='https://rog.asus.com/motherboards/rog-strix/rog-strix-x870-a-gaming-wifi/helpdesk_download/'},
    @{V="ASUS";     R='STRIX\s+X870E-E';   S='https://rog.asus.com/motherboards/rog-strix/rog-strix-x870e-e-gaming-wifi/helpdesk_download/'},
    @{V="ASUS";     R='STRIX\s+X870I';     S='https://rog.asus.com/motherboards/rog-strix/rog-strix-x870-i-gaming-wifi/helpdesk_download/'},
    @{V="ASUS";     R='STRIX\s+B850I';     S='https://rog.asus.com/motherboards/rog-strix/rog-strix-b850-i-gaming-wifi/helpdesk_download/'},
    @{V="ASUS";     R='STRIX\s+B850$';     S='https://rog.asus.com/motherboards/rog-strix/rog-strix-b850-i-gaming-wifi/helpdesk_download/'},
    @{V="ASUS";     R='STRIX\s+X870$';     S='https://rog.asus.com/motherboards/rog-strix/rog-strix-x870-i-gaming-wifi/helpdesk_download/'},
    @{V="ASUS";     R='STRIX\s+Z890';      S='https://rog.asus.com/motherboards/rog-strix/rog-strix-z890-e-gaming-wifi/helpdesk_download/'},

    @{V="GIGABYTE"; R='B760I\s+AORUS\s+PRO'; S='https://www.gigabyte.com/Motherboard/B760I-AORUS-PRO-rev-1x/support'},
    @{V="GIGABYTE"; R='Z790\s+AORUS\s+ELITE\s+AX'; S='https://www.gigabyte.com/Motherboard/Z790-AORUS-ELITE-AX-rev-1x/support'},
    @{V="GIGABYTE"; R='Z890\s+AORUS\s+ELITE\s+WIFI7'; S='https://www.gigabyte.com/Motherboard/Z890-AORUS-ELITE-WIFI7-rev-1x/support'},
    @{V="GIGABYTE"; R='Z890\s+AORUS\s+MASTER'; S='https://www.gigabyte.com/Motherboard/Z890-AORUS-MASTER-rev-1x/support'},
    @{V="GIGABYTE"; R='Z890I\s+AORUS'; S='https://www.gigabyte.com/Motherboard/Z890I-AORUS-rev-1x/support'},
    @{V="GIGABYTE"; R='B850\s+GAMING\s+X'; S='https://www.gigabyte.com/Motherboard/B850-GAMING-X-WIFI6E-rev-1x/support'},

    @{V="MSI";      R='B850\s+TOMAHAWK'; S='https://www.msi.com/Motherboard/MAG-B850-TOMAHAWK-WIFI/support'},
    @{V="MSI";      R='B850M-VC';        S='https://www.msi.com/Motherboard/PRO-B850M-VC-WIFI/support'},
    @{V="MSI";      R='MAG\s+X870';      S='https://www.msi.com/Motherboard/MAG-X870-TOMAHAWK-WIFI/support'},
    @{V="MSI";      R='PRO\s+Z790';      S='https://www.msi.com/Motherboard/PRO-Z790-A-WIFI/support'}
)

function Find-Entry($v,$m){
    foreach($e in $BoardCatalog){
        if($v -ne $e.V){ continue }
        if($m -match $e.R){ return $e }
    }
    return $null
}

# =============================
# INSTALL MOTHERBOARD DRIVERS
# =============================
function Install-Mobo {
    Update-Status "Detecting motherboard..." 5
    $b = Get-Board
    Log "Board: $($b.Vendor) $($b.Model)"

    $entry = Find-Entry $b.Vendor $b.Model
    if(-not $entry){
        Update-Status "Unsupported board (add to catalog)" 10
        return
    }

    Update-Status "Scraping link data (takes 30-60s)..." 15
    $links = Get-Links $entry.S

    if ($links.Count -eq 0) {
        Log "ERR: No links returned from ScraperAPI. Check API quota or URL structure."
        Update-Status "Scrape Failed. Check logs." 15
        return
    }

    foreach($r in $Rules){
        Update-Status "Installing $($r.Name)..." ([int](15 + (60/($Rules.Count)) * ([array]::IndexOf($Rules,$r))))
        $picked = Pick-Links $links $r.Inc $r.Exc 2
        foreach($u in $picked){
            try{
                Log "DL $u"
                $p = DL $u
                Install-Pkg $p
            } catch {
                Log "ERR $u :: $($_.Exception.Message)"
            }
        }
    }
}

# =============================
# GPU INSTALL
# =============================
function Install-NVIDIA {
    $gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -match "NVIDIA" }
    if(-not $gpu){ return $false }

    Update-Status "Fetching latest NVIDIA driver URL..." 80
    Log "Found NVIDIA GPU. Querying API..."
    
    try {
        $nvApi = "https://gfwsl.geforce.com/services_toolkit/services/com/nvidia/services/AjaxDriverService.php?osID=57&languageCode=1033&bld=8"
        $nvXml = Invoke-RestMethod -Uri $nvApi -UseBasicParsing
        $url = $nvXml.GetDriverAndExecuteResponse.Expected_Download_URL
        
        Update-Status "Downloading NVIDIA driver..." 85
        $path = Join-Path $DownloadRoot "nvidia_latest.exe"
        Invoke-WebRequest $url -OutFile $path -UseBasicParsing
        
        Update-Status "Installing NVIDIA driver..." 90
        Log "Running NVIDIA installer..."
        Start-Process $path -ArgumentList "-s -noreboot -clean" -Wait -NoNewWindow
    } catch {
        Log "ERR NVIDIA: $($_.Exception.Message)"
    }
    return $true
}

function Install-AMD {
    $gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -match "AMD|Radeon" }
    if(-not $gpu){ return $false }

    Update-Status "Installing AMD driver via Winget..." 85
    Log "Found AMD GPU. Deploying via Winget..."
    try {
        Start-Process "winget" -ArgumentList "install --id AMD.Adrenalin -e --accept-package-agreements --accept-source-agreements --silent" -Wait -NoNewWindow
    } catch {
        Log "ERR AMD: $($_.Exception.Message)"
    }
    return $true
}

# =============================
# MAIN
# =============================
$button.Add_Click({
    Update-Status "Starting..." 2
    Start-Sleep 1

    Install-Mobo

    if(-not (Install-NVIDIA)){
        Install-AMD
    }

    Update-Status "Complete ✅" 100
    Log "Script finished successfully."
})

$form.ShowDialog()