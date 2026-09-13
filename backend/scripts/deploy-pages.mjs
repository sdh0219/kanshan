// 一键部署到 Cloudflare Pages：构建前端 → 打包 _worker.js → 组装 dist-pages → wrangler pages deploy
// 用法: npm run deploy:pages  （在 backend 目录下执行）
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distPages = path.join(root, 'dist-pages');
const feDist = path.join(root, '..', 'frontend', 'dist');

const run = (cmd, opts = {}) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts });
};

// 1. 构建前端 + 打包 worker
run('npm run build:client');
fs.rmSync(distPages, { recursive: true, force: true });
fs.mkdirSync(distPages, { recursive: true });
run('npx esbuild src/worker.ts --bundle --format=esm --platform=browser --outfile=dist-pages/_worker.js');

// 2. 复制静态资源
fs.cpSync(feDist, distPages, { recursive: true });
console.log(`\n已组装 ${distPages} (${fs.readdirSync(distPages).length} 项)`);

// 3. 部署（配置在 pages-deploy/wrangler.jsonc，Pages 命令只认 cwd 下的 wrangler.jsonc）
const r = spawnSync('npx', ['wrangler', 'pages', 'deploy', '--commit-dirty=true'], {
  stdio: 'inherit', cwd: path.join(root, 'pages-deploy'), shell: true,
});
process.exit(r.status ?? 1);
