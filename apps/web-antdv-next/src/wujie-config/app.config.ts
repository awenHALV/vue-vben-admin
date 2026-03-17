import website from './website';

const { projectCodes } = website;
const domins: Record<string, string> = {};

function getDomins() {
  const { MODE } = import.meta.env;
  const appUrl = window.location.origin;
  projectCodes.forEach((projectCode) => {
    const prefix = MODE === 'union' ? appUrl : '';
    domins[projectCode] =
      prefix + import.meta.env[`VITE_APP_${projectCode.toUpperCase()}`];
  });
}

getDomins();

// console.log('env', import.meta);
console.log('domins', domins);

export default domins;
