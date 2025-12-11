<script>
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Textarea from '$lib/components/ui/textarea.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Label from '$lib/components/ui/label.svelte';
  import { Clock, Save, CheckCircle2 } from 'lucide-svelte';
  import { TimeEntry } from '$lib/entities/all';
  import { format } from 'date-fns';

  export let date;
  export let schedule = null;
  export let currentUser = null;

  let timeEntry = null;
  let claimedHours = 0;
  let workDescription = "";
  let isSaving = false;

  $: if (date) {
    loadTimeEntry();
  }

  async function loadTimeEntry() {
    try {
      const entries = await TimeEntry.filter({ date: date });
      if (entries.length > 0) {
        const entry = entries[0];
        timeEntry = entry;
        claimedHours = entry.manually_inputted_hours || 0;
        workDescription = entry.work_description || "";
      } else {
        timeEntry = null;
        claimedHours = 0;
        workDescription = "";
      }
    } catch (error) {
      console.error("Error loading time entry:", error);
    }
  }

  async function handleSave() {
    isSaving = true;
    try {
      const entryData = {
        date: date,
        manually_inputted_hours: claimedHours,
        work_description: workDescription,
        status: "draft"
      };

      if (timeEntry) {
        await TimeEntry.update(timeEntry.id, entryData);
      } else {
        const newEntry = await TimeEntry.create(entryData);
        timeEntry = newEntry;
      }

      alert("Hours claimed successfully!");
    } catch (error) {
      console.error("Error saving claimed hours:", error);
      alert("Error saving claimed hours. Please try again.");
    }
    isSaving = false;
  }

  async function handleSubmitForApproval() {
    await handleSave();
    if (timeEntry) {
      try {
        await TimeEntry.update(timeEntry.id, { status: "submitted" });
        alert("Hours submitted for mentor approval!");
      } catch (error) {
        console.error("Error submitting for approval:", error);
      }
    }
  }

  onMount(() => {
    loadTimeEntry();
  });
</script>

{#if !currentUser}
  <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
    <p class="text-white/60 text-center">Please log in to claim hours.</p>
  </div>
{:else}
  <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
    <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
      <Clock class="w-6 h-6 text-emerald-400" />
      Claim Your Work Hours
    </h3>

    <p class="text-white/70 text-sm mb-6">
      Date: <span class="font-semibold text-emerald-300">{format(new Date(date), 'MMMM d, yyyy')}</span>
    </p>

    {#if schedule && schedule.parsed_schedule}
      <div class="mb-6">
        <h4 class="text-white/80 font-medium mb-3">Today's Scheduled Activities:</h4>
        <div class="space-y-2">
          {#each schedule.parsed_schedule as item, index}
            <div class="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/10">
              <Clock class="w-4 h-4 text-amber-400" />
              <span class="text-amber-400 text-sm">
                {item.start_time}{item.end_time ? ` - ${item.end_time}` : ''}
              </span>
              <span class="text-white text-sm">{item.activity}</span>
              {#if item.task_reference}
                <span class="text-purple-300 text-xs px-2 py-1 bg-purple-500/20 rounded">
                  {item.task_reference}
                </span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="space-y-4">
      <div>
        <Label className="text-white/80 mb-2 block">Hours Worked Today</Label>
        <Input
          type="number"
          step="0.5"
          min="0"
          max="24"
          bind:value={claimedHours}
          placeholder="Enter hours worked..."
          className="bg-white/10 border-white/20 text-white placeholder-white/50"
        />
      </div>

      <div>
        <Label className="text-white/80 mb-2 block">Work Description</Label>
        <Textarea
          bind:value={workDescription}
          placeholder="Describe what you worked on today, which tasks you completed, any challenges faced, etc..."
          className="bg-white/10 border-white/20 text-white placeholder-white/50 min-h-[120px]"
        />
      </div>

      {#if timeEntry}
        <div class="p-4 bg-white/5 rounded-lg border border-white/10">
          <div class="flex items-center gap-2 mb-2">
            <CheckCircle2 class={`w-5 h-5 ${
              timeEntry.status === 'approved' ? 'text-emerald-400' :
              timeEntry.status === 'submitted' ? 'text-amber-400' :
              'text-blue-400'
            }`} />
            <span class="text-white font-medium capitalize">{timeEntry.status}</span>
          </div>
          <p class="text-white/60 text-sm">
            {#if timeEntry.status === 'draft'}
              Save your hours and submit for approval
            {:else if timeEntry.status === 'submitted'}
              Waiting for mentor approval
            {:else if timeEntry.status === 'approved'}
              Approved: {timeEntry.approved_hours || 0} hours
            {:else if timeEntry.status === 'rejected'}
              Entry was rejected - please revise and resubmit
            {/if}
          </p>
        </div>
      {/if}

      <div class="flex gap-3">
        <Button
          on:click={handleSave}
          disabled={isSaving || !claimedHours}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Save class="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Draft"}
        </Button>

        {#if !timeEntry || timeEntry.status === 'draft' || timeEntry.status === 'rejected'}
          <Button
            on:click={handleSubmitForApproval}
            disabled={isSaving || !claimedHours || !workDescription}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <CheckCircle2 class="w-4 h-4 mr-2" />
            Submit for Approval
          </Button>
        {/if}
      </div>
    </div>
  </div>
{/if}
