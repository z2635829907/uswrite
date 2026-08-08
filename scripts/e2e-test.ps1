$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$base = "http://localhost:3000"

function Call-Json($method, $path, $body = $null, $session = $null) {
  $params = @{
    Uri = "$base$path"
    Method = $method
    UseBasicParsing = $true
  }
  if ($body -ne $null) {
    $params.ContentType = "application/json"
    $params.Body = ($body | ConvertTo-Json -Compress)
  }
  if ($session -ne $null) { $params.WebSession = $session }
  $res = Invoke-WebRequest @params
  $res.Content
}

function Check($label, $condition, $detail = "") {
  if ($condition) {
    Write-Host "PASS  $label" -ForegroundColor Green
  } else {
    Write-Host "FAIL  $label  $detail" -ForegroundColor Red
  }
}

$suffix = Get-Random -Minimum 1000 -Maximum 9999
$username = "tester$suffix"
$email = "tester$suffix@test.local"
$password = "Test@12345"

Write-Host "=== 1. 公开页面 ==="
$homeRes = Invoke-WebRequest -Uri "$base/" -UseBasicParsing
Check "首页可访问" ($homeRes.StatusCode -eq 200 -and $homeRes.Content -match "拾光")

$postsPage = Invoke-WebRequest -Uri "$base/posts" -UseBasicParsing
Check "文章列表页" ($postsPage.Content -match "把时间还给清晨")

$detail = Invoke-WebRequest -Uri "$base/posts/morning-light" -UseBasicParsing
Check "文章详情页" ($detail.Content -match "把时间还给清晨")

$search = Invoke-WebRequest -Uri "$base/posts?q=清晨" -UseBasicParsing
Check "搜索功能" ($search.Content -match "搜索：清晨")

$tag = Invoke-WebRequest -Uri "$base/tags/随笔" -UseBasicParsing
Check "标签页" ($tag.StatusCode -eq 200)

$userPage = Invoke-WebRequest -Uri "$base/users/demo" -UseBasicParsing
Check "用户主页" ($userPage.Content -match "林禾")

Write-Host ""
Write-Host "=== 2. 未登录访问保护页面 ==="
$guardRes = Invoke-WebRequest -Uri "$base/write" -UseBasicParsing -MaximumRedirection 0
Check "写文章需登录" ($guardRes.StatusCode -eq 307 -and $guardRes.Headers["Location"] -match "^/login")

Write-Host ""
Write-Host "=== 3. 注册与登录 ==="
$reg = Invoke-WebRequest -Uri "$base/api/auth/register" -Method POST -ContentType "application/json" -Body (@{ username=$username; email=$email; password=$password; displayName="测试用户$suffix" } | ConvertTo-Json -Compress) -UseBasicParsing -SessionVariable tester
Check "注册新用户" ($reg.StatusCode -eq 200 -and $reg.Content -match '"ok":true')

$login = Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -ContentType "application/json" -Body (@{ account=$username; password=$password } | ConvertTo-Json -Compress) -UseBasicParsing -SessionVariable tester2
Check "用户登录" ($login.StatusCode -eq 200 -and $login.Content -match '"ok":true')

$wrongLogin = $null
try {
  Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -ContentType "application/json" -Body (@{ account=$username; password="WrongPass1" } | ConvertTo-Json -Compress) -UseBasicParsing
} catch {
  $wrongLogin = $_.Exception.Response.StatusCode.value__
}
Check "错误密码被拒绝" ($wrongLogin -eq 401)

Write-Host ""
Write-Host "=== 4. 写作流程 ==="
$postTitle = "E2E Test Post $suffix"
$postContent = ("This is an automated end-to-end test article. " * 5)
$draft = Invoke-WebRequest -Uri "$base/api/posts" -Method POST -ContentType "application/json" -Body (@{ title=$postTitle; content=$postContent; excerpt="test excerpt"; tags="test,blog"; coverSeed="e2e-test"; action="draft" } | ConvertTo-Json -Compress) -UseBasicParsing -WebSession $tester
$draftData = $draft.Content | ConvertFrom-Json
$postId = $draftData.id
$postSlug = $draftData.slug
Check "保存草稿" ($draftData.status -eq "draft" -and $draftData.ok -eq $true)

$submit = Invoke-WebRequest -Uri "$base/api/posts/$postId" -Method PATCH -ContentType "application/json" -Body (@{ title=$postTitle; content=$postContent; excerpt="test excerpt"; tags="test,blog"; coverSeed="e2e-test"; action="submit" } | ConvertTo-Json -Compress) -UseBasicParsing -WebSession $tester
$submitData = $submit.Content | ConvertFrom-Json
Check "提交审核" ($submitData.status -eq "pending")

try {
  Invoke-WebRequest -Uri "$base/posts/$postSlug" -UseBasicParsing
  Check "待审核文章未公开" $false
} catch {
  Check "待审核文章未公开" ($_.Exception.Response.StatusCode.value__ -eq 404)
}

Write-Host ""
Write-Host "=== 5. 点赞与收藏 ==="
$like = Invoke-WebRequest -Uri "$base/api/posts/1/like" -Method POST -UseBasicParsing -WebSession $tester
$likeData = $like.Content | ConvertFrom-Json
Check "点赞成功" ($likeData.liked -eq $true -and $likeData.count -ge 1)

$unlike = Invoke-WebRequest -Uri "$base/api/posts/1/like" -Method POST -UseBasicParsing -WebSession $tester
$unlikeData = $unlike.Content | ConvertFrom-Json
Check "取消点赞" ($unlikeData.liked -eq $false)

$bookmark = Invoke-WebRequest -Uri "$base/api/posts/1/bookmark" -Method POST -UseBasicParsing -WebSession $tester
$bookmarkData = $bookmark.Content | ConvertFrom-Json
Check "收藏成功" ($bookmarkData.bookmarked -eq $true)

Write-Host ""
Write-Host "=== 6. 评论与通知 ==="
$comment = Invoke-WebRequest -Uri "$base/api/posts/1/comments" -Method POST -ContentType "application/json" -Body (@{ content="自动化测试评论：写得很真诚。" } | ConvertTo-Json -Compress) -UseBasicParsing -WebSession $tester
Check "发表评论" ($comment.StatusCode -eq 200 -and $comment.Content -match '"ok":true')

$demoLogin = Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -ContentType "application/json" -Body (@{ account="demo"; password="Demo@2026" } | ConvertTo-Json -Compress) -UseBasicParsing -SessionVariable demo
$demoNotif = Invoke-WebRequest -Uri "$base/notifications" -UseBasicParsing -WebSession $demo
Check "作者收到通知" ($demoNotif.Content -match "评论了")

Write-Host ""
Write-Host "=== 7. 管理员审核 ==="
$adminLogin = Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -ContentType "application/json" -Body (@{ account="admin"; password="Admin@2026" } | ConvertTo-Json -Compress) -UseBasicParsing -SessionVariable admin
Check "管理员登录" ($adminLogin.StatusCode -eq 200)

$adminPage = Invoke-WebRequest -Uri "$base/admin" -UseBasicParsing -WebSession $admin
Check "后台仪表盘" ($adminPage.Content -match "待审核文章")

$review = Invoke-WebRequest -Uri "$base/api/admin/posts/$postId/review" -Method POST -ContentType "application/json" -Body (@{ decision="approve" } | ConvertTo-Json -Compress) -UseBasicParsing -WebSession $admin
$reviewData = $review.Content | ConvertFrom-Json
Check "通过审核" ($reviewData.status -eq "approved")

$publicView = Invoke-WebRequest -Uri "$base/posts/$postSlug" -UseBasicParsing
Check "审核后文章公开" ($publicView.Content -match $postTitle)

$favorites = Invoke-WebRequest -Uri "$base/favorites" -UseBasicParsing -WebSession $tester
Check "收藏页" ($favorites.Content -match "我的收藏")

$settings = Invoke-WebRequest -Uri "$base/settings" -UseBasicParsing -WebSession $tester
Check "设置页" ($settings.Content -match "账号设置")

$adminUsers = Invoke-WebRequest -Uri "$base/admin/users" -UseBasicParsing -WebSession $admin
Check "用户管理页" ($adminUsers.Content -match $username)

Write-Host ""
Write-Host "=== 8. 重复用户名注册被拒 ==="
try {
  Invoke-WebRequest -Uri "$base/api/auth/register" -Method POST -ContentType "application/json" -Body (@{ username=$username; email="other@test.local"; password=$password; displayName="重复" } | ConvertTo-Json -Compress) -UseBasicParsing
  Check "重复用户名被拒" $false
} catch {
  Check "重复用户名被拒" ($_.Exception.Response.StatusCode.value__ -eq 409)
}

Write-Host ""
Write-Host "测试完成。用户名: $username"
