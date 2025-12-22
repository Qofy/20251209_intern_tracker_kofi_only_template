<script>
  import { onMount } from 'svelte';
  import { Vacancy, Application } from '../entities/all';
  import { userStore } from '../stores/userStore';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Dialog from '$lib/components/ui/dialog.svelte';
  import DialogContent from '$lib/components/ui/DialogContent.svelte';
  import DialogHeader from '$lib/components/ui/DialogHeader.svelte';
  import DialogTitle from '$lib/components/ui/DialogTitle.svelte';
  import DialogFooter from '$lib/components/ui/DialogFooter.svelte';
  import { UploadFile } from '$lib/integrations/Core.js';

  let vacancies = [];
  let loading = true;
  let showApplyModal = false;
  let selectedVacancy = null;
  let isSubmitting = false;
  let isUploading = false;

  let user = null;

  // Subscribe to userStore
  userStore.subscribe(state => {
    user = state?.user || null;
  });

  let form = {
    full_name: '',
    email: '',
    cover_letter: '',
    documents: { cv: '' }
  };

  // Load vacancies immediately when script runs
  loadVacancies();

  onMount(async () => {
    // Refresh data when component mounts
    await loadVacancies();
  });

  async function loadVacancies() {
    loading = true;
    try {
      const result = await Vacancy.list();
      vacancies = result || [];
    } catch (e) {
      console.error('Error loading vacancies:', e);
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

<div class="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white">
  <div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6 text-center">Available Jobs</h1>

    {#if loading}
      <div class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <div class="text-lg">Loading vacancies…</div>
        </div>
      </div>
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
        <div class="flex items-center justify-center min-h-[400px]">
          <div class="text-center">
            <div class="text-lg text-white/70">No vacancies posted yet.</div>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <Dialog let:open let:onOpenChange>
    <DialogContent open={showApplyModal} onOpenChange={(value) => showApplyModal = value} className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white border border-white/20">
      <DialogHeader>
        <DialogTitle className="text-white text-xl">Apply for: {selectedVacancy?.title}</DialogTitle>
      </DialogHeader>

      <div class="space-y-3 my-4">
        <Input bind:value={form.full_name} placeholder="Full name" class="bg-white/10 border-white/20 text-white placeholder-white/50" />
        <Input bind:value={form.email} placeholder="Email" class="bg-white/10 border-white/20 text-white placeholder-white/50" />
        <textarea bind:value={form.cover_letter} placeholder="Cover letter" class="w-full p-2 rounded h-28 bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"></textarea>

        <div>
          <label class="text-sm text-white/80 mr-2 block mb-1">Upload CV</label>
          <input type="file" accept="application/pdf,application/msword" on:change={handleFileChange} class="text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-white/20 file:text-white hover:file:bg-white/30" />
          {#if isUploading}<div class="text-sm text-white/70 mt-1">Uploading…</div>{/if}
          {#if form.documents.cv}
            <div class="text-sm mt-1 text-green-400">Uploaded ✓</div>
          {/if}
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" on:click={() => (showApplyModal = false)} class="text-white border-white/20 hover:bg-white/10">Cancel</Button>
        <Button on:click={submitApplication} disabled={isSubmitting || isUploading} class="bg-green-500 hover:bg-green-600 text-white">{isSubmitting ? 'Submitting…' : 'Submit Application'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</div>
