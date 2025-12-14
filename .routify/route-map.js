
export const map = {
    'widgets': () => import('./routes.widgets.js').then(m => m.default) ,
'default': () => import('./routes.default.js').then(m => m.default) 
}
