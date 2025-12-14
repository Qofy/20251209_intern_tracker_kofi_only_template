<script>
  import { onMount } from 'svelte';
  import { userStore, isStudent } from '../../stores/userStore';
  import { TimeEntry } from '../../entities/all';
  import { format } from 'date-fns';
  import { Clock, Save, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Textarea from '$lib/components/ui/textarea.svelte';
  import Select from '$lib/components/ui/select.svelte';
  import SelectContent from '$lib/components/ui/SelectContent.svelte';
  import SelectItem from '$lib/components/ui/SelectItem.svelte';
  import SelectTrigger from '$lib/components/ui/SelectTrigger.svelte';
  import SelectValue from '$lib/components/ui/SelectValue.svelte';
  import { UploadFile } from '$lib/integrations/Core';

  $: selectedStudent = $userStore.selectedStudent;

  let selectedDate = format(new Date(), 'yyyy-MM-dd');
  let timeEntry = null;
  let isLoading = false;
  let uploadingFiles = false;

  onMount(() => {
    loadTimeEntry();
  });

  $: {
    if (selectedDate) {
      loadTimeEntry();
    }
  }

  async function loadTimeEntry() {
    try {
      const entries = await TimeEntry.filter({ date: selectedDate });
      if (entries.length > 0) {
        timeEntry = entries[0];
      } else {
        timeEntry = {
          date: selectedDate,
          start_time: '',
          end_time: '',
          break_start: '',
          break_end: '',
          manually_inputted_hours: 0,
          proof_hours: 0,
          proof_type: '',
          proof_files: [],
          status: 'draft',
          claimed_hours: 0,
          claimed_status: 'not_claimed',
          work_description: '',
          tracking_ended: false,
        };
      }
    } catch (error) {
      console.error("Error loading time entry:", error);
    }
  }

  function handleInputChange(field, value) {
    timeEntry = {
      ...timeEntry,
      [field]: value
    };
  }

  function calculateHours() {
    if (!timeEntry?.start_time || !timeEntry?.end_time) return 0;

    const start = new Date(`2000-01-01T${timeEntry.start_time}:00`);
    const end = new Date(`2000-01-01T${timeEntry.end_time}:00`);
    let breakTime = 0;

    if (timeEntry.break_start && timeEntry.break_end) {
      const breakStart = new Date(`2000-01-01T${timeEntry.break_start}:00`);
      const breakEndTime = new Date(`2000-01-01T${timeEntry.break_end}:00`);
      breakTime = (breakEndTime - breakStart) / (1000 * 60 * 60);
    }

    return Math.max(0, (end - start) / (1000 * 60 * 60) - breakTime);
  }

  async function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    uploadingFiles = true;
    try {
      const uploadPromises = files.map(file => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map(result => result.file_url);

      timeEntry = {
        ...timeEntry,
        proof_files: [...(timeEntry.proof_files || []), ...fileUrls]
      };
    } catch (error) {
      console.error("Error uploading files:", error);
    }
    uploadingFiles = false;
  }

  function removeFile(index) {
    timeEntry = {
      ...timeEntry,
      proof_files: timeEntry.proof_files.filter((_, i) => i !== index)
    };
  }

  async function saveTimeEntry() {
    isLoading = true;
    try {
      const calculatedHours = calculateHours();
      const dataToSave = {
        ...timeEntry,
        manually_inputted_hours: calculatedHours
      };

      if (timeEntry.id) {
        await TimeEntry.update(timeEntry.id, dataToSave);
      } else {
        const created = await TimeEntry.create(dataToSave);
        timeEntry = created;
      }
    } catch (error) {
      console.error("Error saving time entry:", error);
    }
    isLoading = false;
  }

  async function handleClaimHours(claimType = 'current') {
    if (!timeEntry) return;

    try {
      let claimData = {
        ...timeEntry,
        claimed_hours: calculateHours(),
        claimed_status: 'draft',
        work_description: timeEntry.work_description || 'Daily tracked work',
      };

      if (claimType === 'day') {
        claimData.end_time = format(new Date(), 'HH:mm');
        claimData.tracking_ended = true;
      }

      if (claimData.status !== 'submitted' && claimData.status !== 'approved') {
        claimData.status = 'draft';
      }

      await TimeEntry.update(timeEntry.id, claimData);

      if (claimType === 'day') {
        alert('Day claimed successfully! You can now review and submit your claims for approval in the Claim Hours page.');
      } else {
        alert('Hours claimed successfully! You can continue tracking or review and submit your claims for approval.');
      }

      loadTimeEntry();
    } catch (error) {
      console.error("Error claiming hours:", error);
    }
  }
</script>

<div class="p-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-white mb-2">Daily Time Tracker</h1>
    <p class="text-white/70">Log your daily work hours with proof and evidence</p>
  </div>

  <!-- Date Selection -->
  <div class="mb-8">
    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
      <label for="date" class="text-white font-medium mb-2 block">Select Date</label>
      <Input
        id="date"
        type="date"
        bind:value={selectedDate}
        class="bg-white/10 border-white/20 text-white placeholder-white/50"
      />
    </div>
  </div>

  {#if timeEntry}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Time Input Section -->
      <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
        <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Clock class="w-6 h-6 text-blue-400" />
          Time Entry
        </h3>

        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label class="text-white/80 text-sm font-medium mb-2 block">Start Time</label>
            <Input
              type="time"
              bind:value={timeEntry.start_time}
              class="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <label class="text-white/80 text-sm font-medium mb-2 block">End Time</label>
            <Input
              type="time"
              bind:value={timeEntry.end_time}
              class="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <label class="text-white/80 text-sm font-medium mb-2 block">Break Start</label>
            <Input
              type="time"
              bind:value={timeEntry.break_start}
              class="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <label class="text-white/80 text-sm font-medium mb-2 block">Break End</label>
            <Input
              type="time"
              bind:value={timeEntry.break_end}
              class="bg-white/10 border-white/20 text-white"
            />
          </div>
        </div>

        <!-- Calculated Hours Display -->
        <div class="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
          <p class="text-white/80 text-sm mb-1">Calculated Working Hours</p>
          <p class="text-2xl font-bold text-amber-400">{calculateHours().toFixed(2)} hours</p>
        </div>

        <!-- Proof Type Selection -->
        <div class="mb-6">
          <label class="text-white/80 text-sm font-medium mb-2 block">Proof Type</label>
          <Select
            value={timeEntry.proof_type}
            onValueChange={(value) => handleInputChange('proof_type', value)}
          >
            <SelectTrigger class="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Select proof type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="git">Git Commits</SelectItem>
              <SelectItem value="history">Work History/Screenshots</SelectItem>
              <SelectItem value="professor_proof">Professor Verification</SelectItem>
              <SelectItem value="materials">Work Materials/Files</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 flex-wrap">
          <Button
            on:click={saveTimeEntry}
            disabled={isLoading}
            class="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Save class="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save Entry"}
          </Button>

          {#if !timeEntry.tracking_ended && calculateHours() > 0}
            <Button
              on:click={() => handleClaimHours('current')}
              class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Claim Hours
            </Button>

            <Button
              on:click={() => handleClaimHours('day')}
              class="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
            >
              Claim & End Day
            </Button>
          {/if}
        </div>

        {#if timeEntry.tracking_ended}
          <div class="mt-4 p-3 bg-amber-500/20 rounded-lg border border-amber-400/30">
            <p class="text-amber-300 text-sm text-center">
              ⏰ Day tracking ended. Use Claim Hours page to modify your claims.
            </p>
          </div>
        {/if}
      </div>

      <!-- Proof Upload Section -->
      <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
        <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <FileText class="w-6 h-6 text-emerald-400" />
          Proof & Evidence
        </h3>

        <!-- File Upload -->
        <div class="mb-6">
          <label class="text-white/80 text-sm font-medium mb-2 block">Upload Proof Files</label>
          <div class="relative">
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              on:change={handleFileUpload}
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploadingFiles}
            />
            <div class="bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:bg-white/10 transition-colors">
              <Upload class="w-12 h-12 text-white/50 mx-auto mb-4" />
              <p class="text-white/80 font-medium">
                {uploadingFiles ? "Uploading..." : "Click to upload proof files"}
              </p>
              <p class="text-white/50 text-sm mt-1">
                PDF, images, documents accepted
              </p>
            </div>
          </div>
        </div>

        <!-- Uploaded Files -->
        {#if timeEntry.proof_files && timeEntry.proof_files.length > 0}
          <div class="mb-6">
            <label class="text-white/80 text-sm font-medium mb-3 block">Uploaded Files</label>
            <div class="space-y-2">
              {#each timeEntry.proof_files as fileUrl, index}
                <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <span class="text-white text-sm">File {index + 1}</span>
                  <div class="flex items-center gap-2">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      View
                    </a>
                    <button
                      on:click={() => removeFile(index)}
                      class="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Status Display -->
        <div class="mb-6">
          <div class={`p-4 rounded-xl border flex items-center gap-3 ${
            timeEntry.status === 'approved'
              ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
              : timeEntry.status === 'submitted'
              ? 'bg-amber-500/20 border-amber-400/30 text-amber-300'
              : 'bg-white/5 border-white/20 text-white/80'
          }`}>
            {#if timeEntry.status === 'approved'}
              <CheckCircle2 class="w-5 h-5" />
            {/if}
            {#if timeEntry.status === 'submitted'}
              <AlertCircle class="w-5 h-5" />
            {/if}
            <div>
              <p class="font-medium capitalize">Overall Entry Status: {timeEntry.status}</p>
              <p class="text-sm opacity-80">
                {#if timeEntry.status === 'draft'}
                  Entry is currently a draft. Save and claim your hours.
                {:else if timeEntry.status === 'submitted'}
                  This entry is part of a submission awaiting mentor approval.
                {:else if timeEntry.status === 'approved'}
                  This entry has been approved by the mentor.
                {/if}
              </p>
            </div>
          </div>
        </div>

        <!-- Claimed Status Display -->
        {#if timeEntry.claimed_status && timeEntry.claimed_status !== 'not_claimed'}
          <div class={`mt-4 p-4 rounded-xl border flex items-center gap-3 ${
            timeEntry.claimed_status === 'approved'
              ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
              : timeEntry.claimed_status === 'submitted'
              ? 'bg-blue-500/20 border-blue-400/30 text-blue-300'
              : 'bg-white/5 border-white/20 text-white/80'
          }`}>
            {#if timeEntry.claimed_status === 'approved'}
              <CheckCircle2 class="w-5 h-5" />
            {/if}
            {#if timeEntry.claimed_status === 'submitted'}
              <AlertCircle class="w-5 h-5" />
            {/if}
            <div>
              <p class="font-medium capitalize">Claim Status: {timeEntry.claimed_status}</p>
              <p class="text-sm opacity-80">
                {#if timeEntry.claimed_status === 'draft'}
                  Hours for this day are claimed (draft). Review and submit in Claim Hours.
                {:else if timeEntry.claimed_status === 'submitted'}
                  Hours for this day have been submitted for approval.
                {:else if timeEntry.claimed_status === 'approved'}
                  Hours for this day have been approved.
                {/if}
              </p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
