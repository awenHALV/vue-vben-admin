import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 自动扫描组件并生成映射表脚本
 * 扫描 src/views 下所有 .vue 文件中的 defineOptions({ name: '...' })
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 根目录路径（根据实际项目结构调整，假设在 apps/web-antdv-next/scripts 下）
const rootPath = path.resolve(__dirname, '..');
const viewsDir = path.join(rootPath, 'src/views');
const outputPath = path.join(rootPath, 'src/router/component-map.ts');

const mapping = {};

/**
 * 递归扫描文件
 */
function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.vue')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // 匹配 defineOptions({ name: '...' }) 或 defineOptions({name:'...'})
      const nameMatch = content.match(/defineOptions\s*\(\s*{\s*name\s*:\s*['"]([^'"]+)['"]/);
      
      if (nameMatch && nameMatch[1]) {
        const featureCode = nameMatch[1];
        // 计算相对于 src/views 的路径，并去掉 .vue 后缀
        const relativePath = path.relative(viewsDir, fullPath).replace(/\\/g, '/').replace('.vue', '');
        mapping[featureCode] = relativePath;
      }
    }
  }
}

console.log('🚀 开始扫描组件...');
scanDir(viewsDir);

// 生成文件内容
const entries = Object.entries(mapping)
  .map(([code, viewPath]) => `  '${code}': '${viewPath}',`)
  .join('\n');

const template = `import type { ComponentRecordType } from '@vben/types';

/**
 * 业务组件映射表（此文件由 scripts/generate-component-map.mjs 自动生成，请勿手动修改）
 */
export const FEATURE_COMPONENT_MAP: Record<string, string> = {
${entries}
};

export const mappedFeatureCodes = Object.keys(FEATURE_COMPONENT_MAP);

export function transformComponentMap(
  pageMap: ComponentRecordType,
): ComponentRecordType {
  const newMap: ComponentRecordType = { ...pageMap };

  Object.entries(FEATURE_COMPONENT_MAP).forEach(([featureCode, viewPath]) => {
    const fullPath = \`../views/\${viewPath}.vue\`;
    if (pageMap[fullPath]) {
      newMap[\`\${featureCode}.vue\`] = pageMap[fullPath];
    }
  });

  return newMap;
}
`;

fs.writeFileSync(outputPath, template);
console.log(`✅ 映射表已更新: ${Object.keys(mapping).length} 个组件已自动关联。`);
