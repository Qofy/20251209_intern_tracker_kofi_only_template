// @ts-nocheck


export const routes = {
  "meta": {},
  "id": "_widgets",
  "name": "",
  "file": {
    "path": "src/widgets",
    "dir": "src",
    "base": "widgets",
    "ext": "",
    "name": "widgets"
  },
  "rootName": "widgets",
  "routifyDir": import.meta.url,
  "children": [
    {
      "meta": {
        "dynamic": true,
        "dynamicSpread": true,
        "order": false,
        "inline": false
      },
      "name": "[...404]",
      "file": {
        "path": ".routify/components/[...404].svelte",
        "dir": ".routify/components",
        "base": "[...404].svelte",
        "ext": ".svelte",
        "name": "[...404]"
      },
      "asyncModule": () => import('./components/[...404].svelte'),
      "children": []
    }
  ]
}
export default routes