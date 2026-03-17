#!/bin/bash

# 1. 进入 apps 目录，删除除 web-antdv-next 以外的所有应用
echo "正在清理多余的应用项目..."
cd apps
# 遍历 apps 下的所有文件夹
for dir in */ ; do
    if [[ "$dir" != "web-antdv-next/" ]]; then
        echo "正在删除: $dir"
        rm -rf "$dir"
    fi
done
cd ..

# 2. 修改根目录 package.json 的启动命令
echo "正在优化启动脚本..."
# 使用 node 脚本安全地修改 package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
// 修改 dev 命令，直接指向 antdv-next
pkg.scripts.dev = 'pnpm --filter @vben/web-antdv-next dev';
// 如果你也想让 build 命令也只针对这个项目
pkg.scripts.build = 'pnpm --filter @vben/web-antdv-next build';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# 3. 提示后续操作
echo "---------------------------------------"
echo "✅ 清理完成！"
echo "1. 请确保已安装 pnpm: npm install -g pnpm"
echo "2. 执行 pnpm install 重新链接依赖"
echo "3. 执行 npm run dev 即可直接启动 Antdv Next 项目"
echo "---------------------------------------"
