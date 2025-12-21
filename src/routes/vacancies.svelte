<script>
  import { onMount } from 'svelte';
  import { Vacancy, Application } from '../entities/all';
  import { userStore } from '../stores/userStore';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Dialog from '$lib/components/ui/dialog.svelte';
  import { UploadFile } from '$lib/integrations/Core.js';

  let vacancies = [];
  let loading = false;
  let showApplyModal = false;
  let selectedVacancy = null;
  let isSubmitting = false;
  let isUploading = false;

  $: user = $userStore.user;

  let form = {
    full_name: '',
    email: '',
    cover_letter: '',
    documents: { cv: '' }
  };

  onMount(async () => {
    await loadVacancies();
  });

  async function loadVacancies() {
    loading = true;
    try {
      vacancies = await Vacancy.list();
    } catch (e) {
      console.error('Failed to load vacancies:', e);
      vacancies = [];
    } finally {
      loading = false;
    }
  }

  function openApply(vac) {
    selectedVacancy = vac;
    form = {
      full_name: user?.full_name || user?.name || '',
      email: user?.email || '',
      cover_letter: '',
      documents: { cv: '' }
    };
    showApplyModal = true;
  }

  async function handleFileChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    isUploading = true;
    try {
      const uploaded = await UploadFile({ file: f });
      form.documents.cv = uploaded.file_url;
    } catch (err) {
      console.error('Upload failed', err);
      alert('File upload failed');
    } finally {
      isUploading = false;
    }
  }

  async function submitApplication() {
    if (!selectedVacancy) return;
    if (!form.full_name.trim() || !form.email.trim()) {
      alert('Please provide your name and email');
      return;
    }
    isSubmitting = true;
    try {
      const payload = {
        applicant_email: form.email,
        status: 'submitted',
        student_data: { full_name: form.full_name, email: form.email },
        documents: { cv: form.documents.cv },
        vacancy_id: selectedVacancy.id,
        vacancy_title: selectedVacancy.title || selectedVacancy.name
      };

      await Application.create(payload);
      alert('Application submitted. Thank you!');
      showApplyModal = false;
    } catch (err) {
      console.error('Failed to submit application:', err);
      alert('Failed to submit application. Please try again.');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<style>
  .vacancy-card { @apply bg-white/5 p-4 rounded-lg; }
</style>

<div class="container mx-auto p-6">
  <h1 class="text-3xl font-bold mb-4">Available Jobs</h1>

  {#if loading}
    <div>Loading vacancies…</div>
  {:else}
    {#if vacancies && vacancies.length}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each vacancies as v}
          <div class="vacancy-card">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-xl font-semibold">{v.title}</h3>
                <div class="text-sm text-white/70">{v.location} • {v.type}</div>
              </div>
              <div class="text-sm text-white/60">{v.posted_by}</div>
            </div>
            <p class="mt-2 text-sm text-white/80">{v.description}</p>
            <div class="mt-3 flex gap-2">
              <Button on:click={() => openApply(v)} class="bg-blue-500">Apply</Button>
              <a href={`/vacancies/${v.id}`} class="text-white/80 underline ml-2">Details</a>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div>No vacancies posted yet.</div>
    {/if}
  {/if}

  {#if showApplyModal}
    <Dialog on:close={() => (showApplyModal = false)} open={showApplyModal}>
      <h2 slot="title">Apply for: {selectedVacancy?.title}</h2>
      <div slot="body">
        <div class="space-y-3">
          <Input bind:value={form.full_name} placeholder="Full name" />
          <Input bind:value={form.email} placeholder="Email" />
          <textarea bind:value={form.cover_letter} placeholder="Cover letter" class="w-full p-2 rounded h-28"></textarea>

          <div>
            <label class="text-sm mr-2">Upload CV</label>
            <input type="file" accept="application/pdf,application/msword" on:change={handleFileChange} />
            {#if isUploading}<div class="text-sm">Uploading…</div>{/if}
            {#if form.documents.cv}
              <div class="text-sm mt-1">Uploaded</div>
            {/if}
          </div>
        </div>
      </div>
      <div slot="footer" class="flex gap-2">
        <Button variant="ghost" on:click={() => (showApplyModal = false)}>Cancel</Button>
        <Button on:click={submitApplication} disabled={isSubmitting || isUploading} class="bg-green-500">{isSubmitting ? 'Submitting…' : 'Submit Application'}</Button>
      </div>
    </Dialog>
  {/if}
</div>
