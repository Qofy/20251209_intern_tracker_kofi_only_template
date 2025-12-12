<script>
  import { onMount } from 'svelte';
  import { TimeEntry } from '../entities/all';
  import { userStore, isMentor } from '../stores/userStore';
  import { format, parseISO } from 'date-fns';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Textarea from '$lib/components/ui/textarea.svelte';
  import Badge from '$lib/components/ui/badget.svelte';
  import Select from '$lib/components/ui/select.svelte';
  import SelectContent from '$lib/components/ui/SelectContent.svelte';
  import SelectItem from '$lib/components/ui/SelectItem.svelte';
  import SelectTrigger from '$lib/components/ui/SelectTrigger.svelte';
  import SelectValue from '$lib/components/ui/SelectValue.svelte';
  import { FileText, Download, Filter, Edit, Check, X, CheckCircle2, AlertCircle } from 'lucide-svelte';

  $: selectedStudent = $userStore.selectedStudent;

  let entries = [];
  let statusFilter = 'submitted';
  let isLoading = true;

  onMount(() => {
    loadEntries();
  });

  $: if (statusFilter || selectedStudent) {
    loadEntries();
  }

  async function loadEntries() {
    isLoading = true;
    try {
      let filter = { ...(statusFilter === 'all' ? {} : { status: statusFilter }) };

      if (selectedStudent && selectedStudent.id) {
        filter.created_by_id = selectedStudent.id;
      }

      const data = await TimeEntry.filter(filter, "-date");
      entries = data;
    } catch (error) {
      console.error("Error loading entries:", error);
    }
    isLoading = false;
  }

  async function handleUpdate(id, data) {
    await TimeEntry.update(id, data);
    loadEntries();
  }

  async function handleApprove(entry) {
    await TimeEntry.update(entry.id, {
      ...entry,
      status: 'approved'
    });
    loadEntries();
  }

  async function handleReject(entry) {
    await TimeEntry.update(entry.id, {
      ...entry,
      status: 'rejected',
      approved_hours: 0,
    });
    loadEntries();
  }

  function getStatusBadge(status) {
    const configs = {
      submitted: 'bg-amber-500/20 text-amber-300 border border-amber-400/30',
      approved: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
      rejected: 'bg-red-500/20 text-red-300 border border-red-400/30'
    };
    const labels = {
      submitted: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected'
    };
    return { class: configs[status] || '', label: labels[status] || status };
  }

  let editingEntries = {};

  function startEdit(entryId) {
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      editingEntries[entryId] = { ...entry };
    }
  }

  function cancelEdit(entryId) {
    delete editingEntries[entryId];
    editingEntries = editingEntries;
  }

  async function saveEdit(entryId) {
    await handleUpdate(entryId, editingEntries[entryId]);
    delete editingEntries[entryId];
    editingEntries = editingEntries;
  }

  $: editingMap = editingEntries;
</script>

<div class="p-8">
  <div class="mb-8 flex justify-between items-center">
    <div>
      <h1 class="text-3xl font-bold text-white mb-2 flex items-center gap-3">
        <FileText class="w-8 h-8 text-amber-400" />
        Proof & Approval
      </h1>
      <p class="text-white/70">Review and approve submitted work hours from your interns.</p>
    </div>
    <div class="w-48">
      <Select
        value={statusFilter}
        onValueChange={(val) => statusFilter = val}
      >
        <SelectTrigger class="bg-white/10 border-white/20 text-white">
          <Filter class="w-4 h-4 mr-2" />
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Entries</SelectItem>
          <SelectItem value="submitted">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>

  <div class="space-y-6">
    {#if isLoading}
      <div class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
        <p class="text-white/60">Loading submissions...</p>
      </div>
    {:else if entries.length > 0}
      {#each entries as entry (entry.id)}
        {@const statusBadge = getStatusBadge(entry.status)}
        <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg">
          <div class="p-6 border-b border-white/10">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="text-xl font-bold text-white">{entry.created_by}</h3>
                <p class="text-white/80">{format(parseISO(entry.date), 'MMMM d, yyyy')}</p>
              </div>
              <Badge class={statusBadge.class}>{statusBadge.label}</Badge>
            </div>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 class="text-lg font-semibold text-white mb-4">Submitted Details</h4>
                <div class="space-y-4">
                  <div class="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
                    <span class="text-white/80">Claimed Hours</span>
                    <span class="font-bold text-white text-lg">{entry.manually_inputted_hours?.toFixed(2)}h</span>
                  </div>
                  <div class="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
                    <span class="text-white/80">Proof Type</span>
                    <span class="font-medium text-white capitalize">{entry.proof_type?.replace('_', ' ') || 'N/A'}</span>
                  </div>
                </div>
                <div class="mt-4">
                  <h5 class="text-white/80 mb-2">Proof Files</h5>
                  {#if entry.proof_files?.length > 0}
                    <div class="space-y-2">
                      {#each entry.proof_files as file, index}
                        <a href={file} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 p-2 bg-blue-500/20 rounded-lg border border-blue-400/30 text-blue-300 hover:bg-blue-500/30 transition-colors">
                          <Download class="w-4 h-4" />
                          <span>Proof File {index + 1}</span>
                        </a>
                      {/each}
                    </div>
                  {:else}
                    <p class="text-white/60 text-sm">No files uploaded.</p>
                  {/if}
                </div>
              </div>

              <div>
                <h4 class="text-lg font-semibold text-white mb-4">Mentor Review</h4>
                <div class="space-y-4">
                  <div>
                      <label class="text-white/80 mb-2 block">Approved Hours</label>
                      {#if editingMap[entry.id]}
                        <Input
                          type="number"
                          step="0.1"
                          bind:value={editingEntries[entry.id].approved_hours}
                          class="bg-white/10 border-white/20 text-white"
                        />
                      {:else}
                        <Input
                          type="number"
                          step="0.1"
                          value={entry.approved_hours ?? entry.manually_inputted_hours}
                          on:focus={() => startEdit(entry.id)}
                          class="bg-white/10 border-white/20 text-white"
                        />
                      {/if}
                    </div>
                  <div>
                    <label class="text-white/80 mb-2 block">Comments</label>
                    {#if editingMap[entry.id]}
                      <Textarea
                        bind:value={editingEntries[entry.id].mentor_comments}
                        placeholder="Provide feedback on the submission..."
                        class="bg-white/10 border-white/20 text-white min-h-[120px]"
                      />
                    {:else}
                      <Textarea
                        value={entry.mentor_comments || ''}
                        on:focus={() => startEdit(entry.id)}
                        placeholder="Provide feedback on the submission..."
                        class="bg-white/10 border-white/20 text-white min-h-[120px]"
                      />
                    {/if}
                  </div>
                  <div class="flex gap-3">
                    {#if isEditing}
                      <Button on:click={() => cancelEdit(entry.id)} class="flex-1 bg-gray-500 hover:bg-gray-600 text-white">
                        Cancel
                      </Button>
                      <Button on:click={() => saveEdit(entry.id)} class="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                        <Edit class="w-4 h-4 mr-2" /> Save Changes
                      </Button>
                    {:else}
                      {#if entry.status === 'submitted'}
                        <Button on:click={() => handleReject(entry)} class="flex-1 bg-red-500 hover:bg-red-600 text-white">
                          <X class="w-4 h-4 mr-2" /> Reject
                        </Button>
                        <Button on:click={() => handleApprove(entry)} class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white">
                          <Check class="w-4 h-4 mr-2" /> Approve
                        </Button>
                      {/if}
                      {#if entry.status === 'approved'}
                        <Button on:click={() => startEdit(entry.id)} class="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                          <Edit class="w-4 h-4 mr-2" /> Edit
                        </Button>
                      {/if}
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/each}
    {:else}
      <div class="text-center py-12">
        <Check class="w-16 h-16 text-white/30 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-white mb-2">All Clear!</h3>
        <p class="text-white/60">No entries match the current filter.</p>
      </div>
    {/if}
  </div>
</div>
