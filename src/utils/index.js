export const createPageUrl = (pageName) => {
  return `/${pageName.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '')}`;
};