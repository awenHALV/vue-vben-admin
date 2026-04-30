declare module 'markdown-it' {
  export interface Token {
    index: number;
  }

  export type RendererRule = (tokens: Token[], idx: number) => string;

  export interface Renderer {
    rules: Record<string, RendererRule>;
  }

  export interface MarkdownItOptions {
    html?: boolean;
    linkify?: boolean;
    typographer?: boolean;
  }

  export default class MarkdownIt {
    constructor(options?: MarkdownItOptions);

    renderer: Renderer;

    use(plugin: (md: MarkdownIt) => void): this;

    render(text: string): string;
  }
}

declare module 'markdown-it-multimd-table' {
  import type MarkdownIt from 'markdown-it';

  const plugin: (md: MarkdownIt) => void;
  export default plugin;
}

