import { defineComponent, h, ref } from 'vue';

import { Icon } from '@iconify/vue';

import { ensureIconRegistered } from './icon-loader';

function createIconifyIcon(icon: string) {
  return defineComponent({
    name: `Icon-${icon}`,
    setup(props, { attrs }) {
      const ready = ref(false);

      void ensureIconRegistered(icon).finally(() => {
        ready.value = true;
      });

      return () => (ready.value ? h(Icon, { icon, ...props, ...attrs }) : null);
    },
  });
}

export { createIconifyIcon };
