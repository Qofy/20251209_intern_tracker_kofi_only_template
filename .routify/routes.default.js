// @ts-nocheck


export const routes = {
  "meta": {},
  "id": "_default",
  "name": "",
  "file": {
    "path": "src/routes/_module.svelte",
    "dir": "src/routes",
    "base": "_module.svelte",
    "ext": ".svelte",
    "name": "_module"
  },
  "asyncModule": () => import('../src/routes/_module.svelte'),
  "rootName": "default",
  "routifyDir": import.meta.url,
  "children": [
    {
      "meta": {},
      "id": "_default_admin_debug_svelte",
      "name": "admin-debug",
      "file": {
        "path": "src/routes/admin-debug.svelte",
        "dir": "src/routes",
        "base": "admin-debug.svelte",
        "ext": ".svelte",
        "name": "admin-debug"
      },
      "asyncModule": () => import('../src/routes/admin-debug.svelte'),
      "children": []
    },
    {
      "meta": {},
      "id": "_default_company_admin",
      "name": "company-admin",
      "module": false,
      "file": {
        "path": "src/routes/company-admin",
        "dir": "src/routes",
        "base": "company-admin",
        "ext": "",
        "name": "company-admin"
      },
      "children": [
        {
          "meta": {
            "isDefault": true
          },
          "id": "_default_company_admin_index_svelte",
          "name": "index",
          "file": {
            "path": "src/routes/company-admin/index.svelte",
            "dir": "src/routes/company-admin",
            "base": "index.svelte",
            "ext": ".svelte",
            "name": "index"
          },
          "asyncModule": () => import('../src/routes/company-admin/index.svelte'),
          "children": []
        }
      ]
    },
    {
      "meta": {},
      "id": "_default_company_setup",
      "name": "company-setup",
      "module": false,
      "file": {
        "path": "src/routes/company-setup",
        "dir": "src/routes",
        "base": "company-setup",
        "ext": "",
        "name": "company-setup"
      },
      "children": [
        {
          "meta": {
            "isDefault": true
          },
          "id": "_default_company_setup_index_svelte",
          "name": "index",
          "file": {
            "path": "src/routes/company-setup/index.svelte",
            "dir": "src/routes/company-setup",
            "base": "index.svelte",
            "ext": ".svelte",
            "name": "index"
          },
          "asyncModule": () => import('../src/routes/company-setup/index.svelte'),
          "children": []
        }
      ]
    },
    {
      "meta": {},
      "id": "_default_dashboard",
      "name": "dashboard",
      "module": false,
      "file": {
        "path": "src/routes/dashboard",
        "dir": "src/routes",
        "base": "dashboard",
        "ext": "",
        "name": "dashboard"
      },
      "children": [
        {
          "meta": {
            "isDefault": true
          },
          "id": "_default_dashboard_index_svelte",
          "name": "index",
          "file": {
            "path": "src/routes/dashboard/index.svelte",
            "dir": "src/routes/dashboard",
            "base": "index.svelte",
            "ext": ".svelte",
            "name": "index"
          },
          "asyncModule": () => import('../src/routes/dashboard/index.svelte'),
          "children": []
        }
      ]
    },
    {
      "meta": {
        "isDefault": true
      },
      "id": "_default_index_svelte",
      "name": "index",
      "file": {
        "path": "src/routes/index.svelte",
        "dir": "src/routes",
        "base": "index.svelte",
        "ext": ".svelte",
        "name": "index"
      },
      "asyncModule": () => import('../src/routes/index.svelte'),
      "children": []
    },
    {
      "meta": {},
      "id": "_default_login",
      "name": "login",
      "module": false,
      "file": {
        "path": "src/routes/login",
        "dir": "src/routes",
        "base": "login",
        "ext": "",
        "name": "login"
      },
      "children": [
        {
          "meta": {
            "isDefault": true
          },
          "id": "_default_login_index_svelte",
          "name": "index",
          "file": {
            "path": "src/routes/login/index.svelte",
            "dir": "src/routes/login",
            "base": "index.svelte",
            "ext": ".svelte",
            "name": "index"
          },
          "asyncModule": () => import('../src/routes/login/index.svelte'),
          "children": []
        }
      ]
    },
    {
      "meta": {},
      "id": "_default_vacancies_svelte",
      "name": "vacancies",
      "file": {
        "path": "src/routes/vacancies.svelte",
        "dir": "src/routes",
        "base": "vacancies.svelte",
        "ext": ".svelte",
        "name": "vacancies"
      },
      "asyncModule": () => import('../src/routes/vacancies.svelte'),
      "children": []
    },
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