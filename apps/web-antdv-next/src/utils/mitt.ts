import mitt from 'mitt';

type Events = {
  'industry-new-update': string;
  'release-notice-update': string;
};

const emitter = mitt<Events>();

export default emitter;
