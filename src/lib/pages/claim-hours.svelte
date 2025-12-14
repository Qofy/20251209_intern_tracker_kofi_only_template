<script>
  import { onMount } from 'svelte';
  import { TimeEntry } from '../../entities/all';
  import { userStore } from '../../stores/userStore';
  import { format, parseISO } from 'date-fns';
  import Button from '../components/ui/button.svelte';
  import Input from '../components/ui/input.svelte';
  import Textarea from '../components/ui/textarea.svelte';
  import Badge from '../components/ui/badget.svelte';
  import { Clock, Send, Plus, Edit, Trash2, FileText, Wand2, Loader2 } from 'lucide-svelte';
  import { InvokeLLM } from '$lib/integrations/Core';
  import HourClaimForm from '../components/claims/HoursClaimsForm.svelte';

  $: user = $userStore.user;
  $: selectedStudent = $userStore.selectedStudent;

  let selectedDate = format(new Date(), 'yyyy-MM-dd');
  let timeEntries = [];
  let showClaimForm = false;
  let editingClaim = null;
  let scheduleText = "";
  let isParsing = false;
  let isLoading = false;

  onMount(() => {
    loadTimeEntries();
  });

  $: if (selectedDate || user) {
    loadTimeEntries();
  }

  async function loadTimeEntries() {
    isLoading = true;
    try {
      const entries = await TimeEntry.filter({
        date: selectedDate,
        created_by: user?.email
      });
      timeEntries = entries;
    } catch (error) {
      console.error("Error loading time entries:", error);
    }
    isLoading = false;
  }

  async function handleParseSchedule() {
    if (!scheduleText) return;

    isParsing = true;
    try {
      const prompt = `Parse the following schedule text and extract work periods (ignore breaks and lunch). For each work period, provide start_time, end_time, and activity. Format times as HH:mm. Extract task references like "TASK #056".

Example:
Input: "6:00 to 9:30 Start GPT course from Chapter 9\n9:30 to 9:45 break\n9:45 Learn TASK #056"
Output: [
  {"start_time": "06:00", "end_time": "09:30", "activity": "Start GPT course from Chapter 9", "task_reference": ""},
  {"start_time": "09:45", "end_time": "", "activity": "Learn TASK #056", "task_reference": "TASK #056"}
]

Text to parse:
${scheduleText}`;

      const schema = {
        type: "object",
        properties: {
          work_periods: {
            type: "array",
            items: {
              type: "object",
              properties: {
                start_time: { type: "string" },
                end_time: { type: "string" },
                activity: { type: "string" },
                task_reference: { type: "string" }
              },
              required: ["start_time", "activity"]
            }
          }
        },
        required: ["work_periods"]
      };

      const result = await InvokeLLM({ prompt, response_json_schema: schema });

      if (result.work_periods && result.work_periods.length > 0) {
        for (const period of result.work_periods) {
          const hours = calculateHoursFromTimes(period.start_time, period.end_time);
          await TimeEntry.create({
            date: selectedDate,
            start_time: period.start_time,
            end_time: period.end_time || period.start_time,
            work_description: period.activity,
            task_reference: period.task_reference,
            manually_inputted_hours: hours,
            claimed_hours: hours,
            status: 'draft',
            claimed_status: 'draft'
          });
        }

        scheduleText = "";
        loadTimeEntries();
      }
    } catch (error) {
      console.error("Error parsing schedule:", error);
      alert("Error parsing schedule. Please try again.");
    }
    isParsing = false;
  }

  function calculateHoursFromTimes(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    return Math.max(0, (end - start) / (1000 * 60 * 60));
  }

  async function handleSubmitForApproval(entryId, submitType = 'single') {
    try {
      if (submitType === 'day') {
        const updates = timeEntries.map(entry =>
          TimeEntry.update(entry.id, {
            claimed_status: 'submitted',
            submitted_at: new Date().toISOString()
          })
        );
        await Promise.all(updates);
      } else {
        await TimeEntry.update(entryId, {
          claimed_status: 'submitted',
          submitted_at: new Date().toISOString()
        });
      }
      loadTimeEntries();
    } catch (error) {
      console.error("Error submitting for approval:", error);
    }
  }

  async function handleDeleteClaim(entryId) {
    if (window.confirm("Are you sure you want to delete this claim?")) {
      await TimeEntry.delete(entryId);
      loadTimeEntries();
    }
  }

  function getStatusBadge(entry) {
    const status = entry.claimed_status || 'draft';
    const configs = {
      draft: 'bg-gray-500/20 text-gray-300 border-gray-400/30',
      submitted: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      approved: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      rejected: 'bg-red-500/20 text-red-300 border-red-400/30'
    };
    const labels = {
      draft: 'Draft',
      submitted: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected'
    };
    return { class: configs[status] || '', label: labels[status] || status };
  }

  function canEdit(entry) {
    return entry.claimed_status === 'draft' || !entry.claimed_status;
  }

  $: hasDraftEntries = timeEntries.some(entry => canEdit(entry));
  $: totalClaimedHours = timeEntries.reduce((sum, entry) => sum + (entry.claimed_hours || 0), 0);
</script>

<div class="p-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-white mb-2 flex items-center gap-3">
      <Clock class="w-8 h-8 text-emerald-400" />
      Claim Work Hours
    </h1>
    <p class="text-white/70">Submit your work hours for mentor approval</p>
  </div>

  <!-- Date Selection -->
  <div class="mb-8 max-w-sm">
    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
      <label for="date" class="text-white font-medium mb-2 block">Select Date</label>
      <Input
        id="date"
        type="date"
        bind:value={selectedDate}
        class="bg-white/10 border-white/20 text-white"
      />
    </div>
  </div>

  <!-- Schedule Parser -->
  <div class="mb-8">
    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
      <h3 class="text-xl font-bold text-white mb-4">Parse Schedule to Claims</h3>
      <p class="text-white/70 text-sm mb-4">
        Paste your schedule text below and we'll extract work periods automatically
      </p>

      <Textarea
        bind:value={scheduleText}
        placeholder="Schedule Kelvin, August 26th, I suggest the following
6:00 to 9:30 Start GPT course from Chapter 9
9:30 to 9:45 break
9:45 Learn TASK #056
11:45 Break
12:00 Learn RUST Machine Learning Course
13:00 to 13:30 Lunch
13:30 to 14:00 document upload your work , write questions
14:00 Meet Present Question/Answer
TASK #056"
        class="bg-white/10 border-white/20 text-white placeholder-white/50 min-h-[150px] mb-4"
      />

      <div class="flex gap-4">
        <Button
          on:click={handleParseSchedule}
          disabled={isParsing || !scheduleText}
          class="bg-purple-500 hover:bg-purple-600 text-white"
        >
          {#if isParsing}
            <Loader2 class="w-4 h-4 mr-2 animate-spin" />
          {:else}
            <Wand2 class="w-4 h-4 mr-2" />
          {/if}
          {isParsing ? "Parsing..." : "Parse & Create Claims"}
        </Button>

        <Button
          on:click={() => showClaimForm = true}
          class="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Plus class="w-4 h-4 mr-2" />
          Add Manual Claim
        </Button>
      </div>
    </div>
  </div>

  <!-- Claims Summary -->
  <div class="mb-8">
    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-white mb-2">
            Claims for {format(parseISO(selectedDate), 'MMMM d, yyyy')}
          </h3>
          <p class="text-white/70">
            Total Claimed: <span class="text-amber-400 font-semibold">{totalClaimedHours.toFixed(2)} hours</span>
          </p>
        </div>

        {#if hasDraftEntries}
          <Button
            on:click={() => handleSubmitForApproval(null, 'day')}
            class="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Send class="w-4 h-4 mr-2" />
            Submit Entire Day
          </Button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Time Entries -->
  <div class="space-y-4">
    {#if isLoading}
      <div class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
        <p class="text-white/60">Loading claims...</p>
      </div>
    {:else if timeEntries.length > 0}
      {#each timeEntries as entry (entry.id)}
        {@const statusBadge = getStatusBadge(entry)}
        <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
          <div class="flex items-start justify-between mb-4">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <Clock class="w-5 h-5 text-amber-400" />
                <span class="text-amber-400 font-semibold text-lg">
                  {entry.start_time} - {entry.end_time}
                </span>
                <span class="text-white font-bold">
                  {(entry.claimed_hours || 0).toFixed(2)}h
                </span>
                <Badge class={statusBadge.class}>{statusBadge.label}</Badge>
              </div>

              <h4 class="text-white font-medium text-lg mb-2">{entry.work_description}</h4>

              {#if entry.task_reference}
                <div class="flex items-center gap-2 mb-2">
                  <FileText class="w-4 h-4 text-blue-400" />
                  <span class="text-blue-300 text-sm">{entry.task_reference}</span>
                </div>
              {/if}

              {#if entry.mentor_comments}
                <div class="mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
                  <p class="text-white/80 text-sm"><strong>Mentor Notes:</strong> {entry.mentor_comments}</p>
                </div>
              {/if}
            </div>

            <div class="flex gap-2">
              {#if canEdit(entry)}
                <Button
                  variant="ghost"
                  size="icon"
                  on:click={() => editingClaim = entry}
                  class="text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
                >
                  <Edit class="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  on:click={() => handleDeleteClaim(entry.id)}
                  class="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                >
                  <Trash2 class="w-4 h-4" />
                </Button>
                <Button
                  on:click={() => handleSubmitForApproval(entry.id)}
                  size="sm"
                  class="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <Send class="w-4 h-4 mr-1" />
                  Submit
                </Button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {:else}
      <div class="text-center py-12">
        <Clock class="w-16 h-16 text-white/30 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-white mb-2">No Claims Yet</h3>
        <p class="text-white/60 mb-6">
          Parse your schedule or add manual claims to get started.
        </p>
      </div>
    {/if}
  </div>

  <!-- Modals -->
  {#if showClaimForm}
    <HourClaimForm
      date={selectedDate}
      claim={null}
      onSave={async (claimData) => {
        await TimeEntry.create({
          ...claimData,
          date: selectedDate,
          status: 'draft',
          claimed_status: 'draft'
        });
        loadTimeEntries();
        showClaimForm = false;
      }}
      onCancel={() => showClaimForm = false}
    />
  {/if}

  {#if editingClaim}
    <HourClaimForm
      date={selectedDate}
      claim={editingClaim}
      onSave={async (claimData) => {
        await TimeEntry.update(editingClaim.id, claimData);
        loadTimeEntries();
        editingClaim = null;
      }}
      onCancel={() => editingClaim = null}
    />
  {/if}
</div>
