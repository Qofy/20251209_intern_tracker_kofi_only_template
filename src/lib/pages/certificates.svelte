<script>
  import { onMount } from 'svelte';
  import { InternCertificate } from '../../entities/all';
  import { Plus, Search, GraduationCap, Eye, Edit, Trash2 } from 'lucide-svelte';
  import { format } from 'date-fns';

  let certificates = [];
  let loading = true;
  let searchTerm = '';
  let showCreateForm = false;
  let selectedCertificate = null;
  let viewMode = 'list'; // list, details, edit, create

  onMount(async () => {
    await loadCertificates();
  });

  async function loadCertificates() {
    loading = true;
    try {
      const data = await InternCertificate.list('-created_date');
      certificates = data;
    } catch (error) {
      console.error('Error loading certificates:', error);
    } finally {
      loading = false;
    }
  }

  $: filteredCertificates = certificates.filter(cert =>
    cert.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.certificate_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function viewCertificate(cert) {
    selectedCertificate = cert;
    viewMode = 'details';
  }

  function editCertificate(cert) {
    selectedCertificate = cert;
    viewMode = 'edit';
  }

  async function deleteCertificate(cert) {
    if (confirm('Are you sure you want to delete this certificate? This action cannot be undone.')) {
      try {
        await InternCertificate.delete(cert.id);
        await loadCertificates();
        alert('Certificate deleted successfully');
      } catch (error) {
        console.error('Failed to delete certificate:', error);
        alert('Failed to delete certificate');
      }
    }
  }

  function createNew() {
    selectedCertificate = null;
    viewMode = 'create';
  }

  function backToList() {
    viewMode = 'list';
    selectedCertificate = null;
    loadCertificates();
  }
</script>

{#if viewMode === 'list'}
  <div class="p-8 space-y-6">
    <!-- Header -->
    <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Intern Hours Certificates</h1>
          <p class="text-white/70">Manage internship completion certificates</p>
        </div>

        <button
          on:click={createNew}
          class="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 px-6 py-3 text-white font-medium flex items-center gap-2 rounded-lg transition-all"
        >
          <Plus class="w-5 h-5" />
          New Certificate
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-4">
      <div class="bg-white/5 p-3 flex items-center gap-3 rounded-lg">
        <Search class="w-5 h-5 text-white/60" />
        <input
          type="text"
          placeholder="Search certificates..."
          bind:value={searchTerm}
          class="flex-1 bg-transparent outline-none text-white placeholder-white/50"
        />
      </div>
    </div>

    <!-- Certificates Grid -->
    {#if loading}
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each [1, 2, 3, 4, 5, 6] as i}
          <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6 animate-pulse">
            <div class="space-y-3">
              <div class="h-6 bg-white/10 rounded w-3/4"></div>
              <div class="h-4 bg-white/10 rounded w-1/2"></div>
              <div class="h-4 bg-white/10 rounded w-2/3"></div>
            </div>
          </div>
        {/each}
      </div>
    {:else if filteredCertificates.length === 0}
      <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-12 text-center">
        <div class="bg-white/5 w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-lg">
          <GraduationCap class="w-8 h-8 text-white/50" />
        </div>
        <h3 class="text-lg font-semibold text-white mb-2">
          {searchTerm ? 'No certificates found' : 'No certificates yet'}
        </h3>
        <p class="text-white/70 mb-4">
          {searchTerm ? 'Try adjusting your search terms' : 'Create your first internship certificate'}
        </p>
        {#if !searchTerm}
          <button
            on:click={createNew}
            class="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 px-6 py-3 text-white font-medium inline-block rounded-lg transition-all"
          >
            Create First Certificate
          </button>
        {/if}
      </div>
    {:else}
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each filteredCertificates as certificate (certificate.id)}
          <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6 hover:bg-white/10 transition-all duration-300">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm text-white/60">#{certificate.certificate_number}</span>
                </div>
                <h3 class="text-lg font-semibold text-white mb-1">{certificate.student_name}</h3>
                <p class="text-sm text-white/70">{certificate.company_name}</p>
              </div>
              <div class="bg-white/5 p-2 rounded-lg">
                <GraduationCap class="w-5 h-5 text-white" />
              </div>
            </div>

            <div class="space-y-2 mb-4">
              <div class="flex items-center justify-between">
                <span class="text-sm text-white/60">Total Hours</span>
                <span class="font-semibold text-white">{certificate.total_hours}h</span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-sm text-white/60">Period</span>
                <span class="text-xs text-white/60">
                  {format(new Date(certificate.start_date), 'MMM d')} - {format(new Date(certificate.end_date), 'MMM d, yyyy')}
                </span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-sm text-white/60">Created</span>
                <span class="text-xs text-white/60">
                  {format(new Date(certificate.created_date), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            <div class="flex gap-2">
              <button
                on:click={() => viewCertificate(certificate)}
                class="bg-white/5 hover:bg-white/10 flex-1 py-2 px-3 text-sm text-white/80 hover:text-white flex items-center justify-center gap-1 rounded-lg transition-all"
              >
                <Eye class="w-4 h-4" />
                View
              </button>
              <button
                on:click={() => editCertificate(certificate)}
                class="bg-white/5 hover:bg-white/10 flex-1 py-2 px-3 text-sm text-white/80 hover:text-white flex items-center justify-center gap-1 rounded-lg transition-all"
              >
                <Edit class="w-4 h-4" />
                Edit
              </button>
              <button
                on:click={() => deleteCertificate(certificate)}
                class="bg-red-500/20 hover:bg-red-500/30 py-2 px-3 text-sm text-red-400 hover:text-red-300 flex items-center justify-center gap-1 rounded-lg transition-all"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{:else if viewMode === 'details'}
  <div class="p-8">
    {#await import('./certificate-details.svelte')}
      <div class="text-white">Loading...</div>
    {:then module}
      <svelte:component this={module.default} certificate={selectedCertificate} onBack={backToList} />
    {/await}
  </div>
{:else if viewMode === 'edit'}
  <div class="p-8">
    {#await import('./certificate-edit.svelte')}
      <div class="text-white">Loading...</div>
    {:then module}
      <svelte:component this={module.default} certificate={selectedCertificate} onBack={backToList} />
    {/await}
  </div>
{:else if viewMode === 'create'}
  <div class="p-8">
    {#await import('./certificate-create.svelte')}
      <div class="text-white">Loading...</div>
    {:then module}
      <svelte:component this={module.default} onBack={backToList} />
    {/await}
  </div>
{/if}
