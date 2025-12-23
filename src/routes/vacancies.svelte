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
  let showDetailsModal = false;
  let selectedVacancy = null;
  let detailsVacancy = null;
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

  function openDetails(vac) {
    detailsVacancy = vac;
    showDetailsModal = true;
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
        vacancy_title: selectedVacancy.title || selectedVacancy.name,
        cover_letter: form.cover_letter,
        company_id: selectedVacancy.company_id
      };

      console.log('[Vacancies] Submitting application:', payload);
      await Application.create(payload);
      alert('Application submitted successfully! You will be notified once reviewed.');
      showApplyModal = false;
      // Reset form
      form = {
        full_name: '',
        email: '',
        cover_letter: '',
        documents: { cv: '' }
      };
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
              <div class="mt-3 flex gap-2 items-center">
                <Button on:click={() => openApply(v)} class="bg-blue-500 h-10 px-4 flex items-center justify-center rounded-md">Apply</Button>
                <button on:click={() => openDetails(v)} class="text-white/80 underline ml-2 hover:text-white transition-colors">Details</button>
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

  <!-- Apply Modal -->
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
        <Button variant="ghost" on:click={() => (showApplyModal = false)} class="text-white border-white/20 hover:bg-white/10 h-10 px-4 flex items-center justify-center rounded-md">Cancel</Button>
        <Button on:click={submitApplication} disabled={isSubmitting || isUploading} class="bg-green-500 hover:bg-green-600 text-white h-10 px-4 flex items-center justify-center rounded-md">{isSubmitting ? 'Submitting…' : 'Submit Application'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Details Modal -->
  <Dialog let:open let:onOpenChange>
    <DialogContent open={showDetailsModal} onOpenChange={(value) => showDetailsModal = value} className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white border border-white/20 max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-white text-2xl mb-2">{detailsVacancy?.title}</DialogTitle>
        {#if detailsVacancy?.company_name}
          <div class="text-white/70 text-sm">{detailsVacancy.company_name}</div>
        {/if}
      </DialogHeader>

      <div class="space-y-6 my-4">
        <!-- Job Overview -->
        <div class="grid grid-cols-2 gap-4 pb-4 border-b border-white/10">
          <div>
            <div class="text-sm text-white/60">Location</div>
            <div class="text-white font-medium">{detailsVacancy?.location || 'N/A'}</div>
          </div>
          <div>
            <div class="text-sm text-white/60">Job Type</div>
            <div class="text-white font-medium">{detailsVacancy?.type || 'N/A'}</div>
          </div>
          <div>
            <div class="text-sm text-white/60">Experience Level</div>
            <div class="text-white font-medium">{detailsVacancy?.experience_level || 'N/A'}</div>
          </div>
          <div>
            <div class="text-sm text-white/60">Remote</div>
            <div class="text-white font-medium">{detailsVacancy?.remote ? 'Yes' : 'No'}</div>
          </div>
          {#if detailsVacancy?.department}
            <div>
              <div class="text-sm text-white/60">Department</div>
              <div class="text-white font-medium">{detailsVacancy.department}</div>
            </div>
          {/if}
          {#if detailsVacancy?.positions_available && detailsVacancy.positions_available > 1}
            <div>
              <div class="text-sm text-white/60">Openings</div>
              <div class="text-white font-medium">{detailsVacancy.positions_available} positions</div>
            </div>
          {/if}
          {#if detailsVacancy?.salary_min || detailsVacancy?.salary_max}
            <div class="col-span-2">
              <div class="text-sm text-white/60">Salary Range</div>
              <div class="text-white font-medium">
                {#if detailsVacancy.salary_min && detailsVacancy.salary_max}
                  ${detailsVacancy.salary_min.toLocaleString()} - ${detailsVacancy.salary_max.toLocaleString()} / year
                {:else if detailsVacancy.salary_min}
                  From ${detailsVacancy.salary_min.toLocaleString()} / year
                {:else if detailsVacancy.salary_max}
                  Up to ${detailsVacancy.salary_max.toLocaleString()} / year
                {/if}
              </div>
            </div>
          {/if}
          {#if detailsVacancy?.application_deadline}
            <div class="col-span-2">
              <div class="text-sm text-white/60">Application Deadline</div>
              <div class="text-white font-medium">{new Date(detailsVacancy.application_deadline).toLocaleDateString()}</div>
            </div>
          {/if}
        </div>

        <!-- Description -->
        {#if detailsVacancy?.description}
          <div>
            <h3 class="text-white font-semibold mb-2">About the Role</h3>
            <div class="text-white/90 leading-relaxed whitespace-pre-wrap">{detailsVacancy.description}</div>
          </div>
        {/if}

        <!-- Responsibilities -->
        {#if detailsVacancy?.responsibilities}
          <div>
            <h3 class="text-white font-semibold mb-2">Key Responsibilities</h3>
            <div class="text-white/90 leading-relaxed whitespace-pre-wrap">{detailsVacancy.responsibilities}</div>
          </div>
        {/if}

        <!-- Requirements -->
        {#if detailsVacancy?.requirements}
          <div>
            <h3 class="text-white font-semibold mb-2">Qualifications & Requirements</h3>
            <div class="text-white/90 leading-relaxed whitespace-pre-wrap">{detailsVacancy.requirements}</div>
          </div>
        {/if}

        <!-- Skills -->
        {#if detailsVacancy?.skills_required}
          <div>
            <h3 class="text-white font-semibold mb-2">Required Skills</h3>
            <div class="text-white/90 leading-relaxed whitespace-pre-wrap">{detailsVacancy.skills_required}</div>
          </div>
        {/if}

        <!-- Benefits -->
        {#if detailsVacancy?.benefits}
          <div>
            <h3 class="text-white font-semibold mb-2">Benefits & Perks</h3>
            <div class="text-white/90 leading-relaxed whitespace-pre-wrap">{detailsVacancy.benefits}</div>
          </div>
        {/if}

        <!-- Contact -->
        {#if detailsVacancy?.contact_email}
          <div class="pt-4 border-t border-white/10">
            <div class="text-sm text-white/60">Contact</div>
            <div class="text-white font-medium">{detailsVacancy.contact_email}</div>
          </div>
        {/if}
      </div>

      <DialogFooter>
        <Button variant="ghost" on:click={() => (showDetailsModal = false)} class="text-white border-white/20 hover:bg-white/10 h-10 px-4 flex items-center justify-center rounded-md">Close</Button>
        <Button on:click={() => { showDetailsModal = false; openApply(detailsVacancy); }} class="bg-blue-500 hover:bg-blue-600 text-white h-10 px-4 flex items-center justify-center rounded-md">Apply Now</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</div>
