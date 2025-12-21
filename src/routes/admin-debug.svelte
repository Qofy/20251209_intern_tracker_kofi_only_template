<script>
  import { onMount } from 'svelte';
  import { User, Student, Contract, Application, TimeEntry, Task } from '../entities/all';
  import { userStore } from '../stores/userStore';

  let loading = false;
  let user = null;
  let withScope = {};
  let withoutScope = {};
  let error = null;

  $: storeUser = $userStore;

  onMount(async () => {
    await runDiagnostics();
  });

  async function runDiagnostics() {
    loading = true;
    error = null;
    try {
      // Resolve current user
      user = storeUser.user || await User.me();
      const companyKey = user?.companyKey || user?.company_key || user?.companyId || user?.company_id;

      // Without company filter
      const allStudents = await Student.list();
      const allContracts = await Contract.list();
      const allApps = await Application.list();
      const allEntries = await TimeEntry.list();
      const allTasks = await Task.list();

      // With company filter (if companyKey exists)
      let scopedStudents = allStudents;
      let scopedContracts = allContracts;
      let scopedApps = allApps;
      let scopedEntries = allEntries;
      let scopedTasks = allTasks;

      if (companyKey) {
        const filter = { companyKey };
        scopedStudents = await Student.list(filter);
        scopedContracts = await Contract.list(filter);
        scopedApps = await Application.list(filter);
        scopedEntries = await TimeEntry.list(filter);
        scopedTasks = await Task.list(filter);
      }

      withScope = {
        companyKey: companyKey || null,
        students: { count: scopedStudents.length, sample: scopedStudents.slice(0,5) },
        contracts: { count: scopedContracts.length, sample: scopedContracts.slice(0,5) },
        applications: { count: scopedApps.length, sample: scopedApps.slice(0,5) },
        timeEntries: { count: scopedEntries.length, sample: scopedEntries.slice(0,5) },
        tasks: { count: scopedTasks.length, sample: scopedTasks.slice(0,5) }
      };

      withoutScope = {
        students: { count: allStudents.length, sample: allStudents.slice(0,5) },
        contracts: { count: allContracts.length, sample: allContracts.slice(0,5) },
        applications: { count: allApps.length, sample: allApps.slice(0,5) },
        timeEntries: { count: allEntries.length, sample: allEntries.slice(0,5) },
        tasks: { count: allTasks.length, sample: allTasks.slice(0,5) }
      };

    } catch (e) {
      console.error('Diagnostics error', e);
      error = e.message || String(e);
    } finally {
      loading = false;
    }
  }

  function diffCounts() {
    const keys = ['students','contracts','applications','timeEntries','tasks'];
    return keys.map(k => ({ key: k, withScope: withScope[k]?.count || 0, withoutScope: withoutScope[k]?.count || 0 }));
  }
</script>

<div class="p-6">
  <h1 class="text-2xl font-bold mb-4">Admin Debug — Data Scoping Diagnostics</h1>

  {#if loading}
    <div>Running diagnostics…</div>
  {:else}
    {#if error}
      <div class="text-red-500">Error: {error}</div>
    {:else}
      <div class="mb-4">
        <strong>Current user:</strong>
        <pre style="white-space:pre-wrap">{JSON.stringify(user, null, 2)}</pre>
      </div>

      <h2 class="text-lg font-semibold mt-4">Counts</h2>
      <table class="w-full mb-4">
        <thead>
          <tr><th>Entity</th><th>With company filter</th><th>Without company filter</th></tr>
        </thead>
        <tbody>
          {#each diffCounts() as row}
            <tr>
              <td class="py-1">{row.key}</td>
              <td class="py-1">{row.withScope}</td>
              <td class="py-1">{row.withoutScope}</td>
            </tr>
          {/each}
        </tbody>
      </table>

      <details class="mb-3">
        <summary class="cursor-pointer">Sample (scoped) entities</summary>
        <div>
          <h3>Students</h3>
          <pre style="white-space:pre-wrap">{JSON.stringify(withScope.students?.sample || [], null, 2)}</pre>
          <h3>Contracts</h3>
          <pre style="white-space:pre-wrap">{JSON.stringify(withScope.contracts?.sample || [], null, 2)}</pre>
          <h3>Applications</h3>
          <pre style="white-space:pre-wrap">{JSON.stringify(withScope.applications?.sample || [], null, 2)}</pre>
        </div>
      </details>

      <details>
        <summary class="cursor-pointer">Sample (unscoped) entities</summary>
        <div>
          <h3>Students</h3>
          <pre style="white-space:pre-wrap">{JSON.stringify(withoutScope.students?.sample || [], null, 2)}</pre>
          <h3>Contracts</h3>
          <pre style="white-space:pre-wrap">{JSON.stringify(withoutScope.contracts?.sample || [], null, 2)}</pre>
          <h3>Applications</h3>
          <pre style="white-space:pre-wrap">{JSON.stringify(withoutScope.applications?.sample || [], null, 2)}</pre>
        </div>
      </details>

      <div class="mt-4">
        <button on:click={runDiagnostics} class="px-3 py-1 bg-blue-500 text-white rounded">Re-run diagnostics</button>
      </div>
    {/if}
  {/if}
</div>
