import { defineComponent, h, ref, watch } from 'vue';

import type { IconifyIcon as IconifyIconStructure } from '@iconify/vue';

import { Icon } from '@iconify/vue';

import { ensureIconRegistered } from './icon-loader';

const IconifyIcon = defineComponent({
  name: 'IconifyIcon',
  props: {
    icon: {
      required: true,
      type: [Object, String],
    },
  },
  setup(props, { attrs, slots }) {
    const ready = ref(false);

    watch(
      () => props.icon,
      async (icon) => {
        ready.value = false;
        await ensureIconRegistered(icon);
        ready.value = true;
      },
      { immediate: true },
    );

    return () => {
      if (!ready.value) {
        return null;
      }

      return h(
        Icon,
        {
          ...attrs,
          icon: props.icon as IconifyIconStructure | string,
        },
        slots,
      );
    };
  },
});

export { IconifyIcon };