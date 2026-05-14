import type { IconifyIconStructure } from '@vben-core/icons';

import { addIcon, registerIconLoader } from '@vben-core/icons';

const svgModules = import.meta.glob('./icons/**/*.svg', {
  import: 'default',
  query: '?raw',
});

const svgLoaders = Object.fromEntries(
  Object.entries(svgModules).map(([key, loader]) => {
    const start = key.lastIndexOf('/') + 1;
    const end = key.lastIndexOf('.');
    return [key.slice(start, end), loader as () => Promise<string>];
  }),
) as Record<string, () => Promise<string>>;

const loadingIcons = new Map<string, Promise<void>>();
const registeredIcons = new Set<string>();

function parseSvg(svgData: string): IconifyIconStructure {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgData, 'image/svg+xml');
  const svgElement = xmlDoc.documentElement;

  // 提取 SVG 根元素的关键样式属性
  const getAttrs = (el: Element, attrs: string[]) =>
    attrs
      .map((attr) =>
        el.hasAttribute(attr) ? `${attr}="${el.getAttribute(attr)}"` : '',
      )
      .filter(Boolean)
      .join(' ');

  const rootAttrs = getAttrs(svgElement, [
    'fill',
    'stroke',
    'fill-rule',
    'stroke-width',
  ]);

  const svgContent = [...svgElement.childNodes]
    .filter((node) => node.nodeType === Node.ELEMENT_NODE)
    .map((node) => new XMLSerializer().serializeToString(node))
    .join('');
  // 若根有属性，用一个 g 标签包裹内容并继承属性
  const body = rootAttrs ? `<g ${rootAttrs}>${svgContent}</g>` : svgContent;

  const viewBoxValue = svgElement.getAttribute('viewBox') || '';
  const [left, top, width, height] = viewBoxValue.split(' ').map((val) => {
    const num = Number(val);
    return Number.isNaN(num) ? undefined : num;
  });

  return {
    body,
    height,
    left,
    top,
    width,
  };
}

/**
 * 自定义的svg图片转化为组件
 * @example ./svg/avatar.svg
 * <Icon icon="svg:avatar"></Icon>
 */
async function ensureSvgIconRegistered(iconName: string) {
  if (registeredIcons.has(iconName)) {
    return;
  }

  const currentTask = loadingIcons.get(iconName);
  if (currentTask) {
    return currentTask;
  }

  const loadSvgModule = svgLoaders[iconName];
  if (!loadSvgModule) {
    return;
  }

  const task = loadSvgModule()
    .then((svgContent) => {
      addIcon(`svg:${iconName}`, parseSvg(svgContent));
      registeredIcons.add(iconName);
    })
    .finally(() => {
      loadingIcons.delete(iconName);
    });

  loadingIcons.set(iconName, task);
  return task;
}

async function loadSvgIcons() {
  await Promise.all(Object.keys(svgLoaders).map(ensureSvgIconRegistered));
}

registerIconLoader('svg', ensureSvgIconRegistered);

export { ensureSvgIconRegistered, loadSvgIcons };
