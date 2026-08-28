param(
  [Parameter(Mandatory = $true)][string]$OriginalPath,
  [Parameter(Mandatory = $true)][string]$GeneratedPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

Add-Type -AssemblyName System.Drawing
$original = [System.Drawing.Bitmap]::FromFile($OriginalPath)
$generated = [System.Drawing.Bitmap]::FromFile($GeneratedPath)
$result = New-Object System.Drawing.Bitmap($original.Width, $original.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($result)

try {
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $full = New-Object System.Drawing.Rectangle(0, 0, $original.Width, $original.Height)
  $graphics.DrawImage($generated, $full)

  # Restore the approved frame from the original bitmap pixel-for-pixel.
  $topHeight = [int][Math]::Round($original.Height * 0.022)
  $bottomHeight = [int][Math]::Round($original.Height * 0.022)
  $sideWidth = [int][Math]::Round($original.Width * 0.05)
  $bottomY = $original.Height - $bottomHeight
  $regions = @(
    (New-Object System.Drawing.Rectangle(0, 0, $original.Width, $topHeight)),
    (New-Object System.Drawing.Rectangle(0, $bottomY, $original.Width, $bottomHeight)),
    (New-Object System.Drawing.Rectangle(0, $topHeight, $sideWidth, ($bottomY - $topHeight))),
    (New-Object System.Drawing.Rectangle(($original.Width - $sideWidth), $topHeight, $sideWidth, ($bottomY - $topHeight)))
  )
  foreach ($region in $regions) {
    $graphics.DrawImage($original, $region, $region, [System.Drawing.GraphicsUnit]::Pixel)
  }
  $result.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
  $graphics.Dispose()
  $result.Dispose()
  $generated.Dispose()
  $original.Dispose()
}
