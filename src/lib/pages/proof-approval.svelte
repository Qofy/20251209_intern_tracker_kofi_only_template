<script>
  import { onMount } from 'svelte';
  import { TimeEntry } from '../../entities/all';
  import { userStore, isMentor } from '../../stores/userStore';
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
  import { FileText, Download, Filter, Edit, Check, X, CheckCircle2, AlertCircle, Eye, XCircle } from 'lucide-svelte';

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
  let viewingEntry = null;
  let showDetailsModal = false;

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

  function viewDetails(entry) {
    viewingEntry = entry;
    showDetailsModal = true;
  }

  function closeDetailsModal() {
    showDetailsModal = false;
    viewingEntry = null;
  }

  async function downloadFile(url, filename) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename || 'proof-file.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file');
    }
  }

  async function downloadAllFiles(entry) {
    if (!entry.proof_files || entry.proof_files.length === 0) {
      alert('No files to download');
      return;
    }

    for (let i = 0; i < entry.proof_files.length; i++) {
      const file = entry.proof_files[i];
      const filename = `${entry.created_by}-proof-${i + 1}-${format(parseISO(entry.date), 'yyyy-MM-dd')}.pdf`;
      await downloadFile(file, filename);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
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
        <SelectTrigger class="bg-white/10 border-white/20 text-white flex items-center h-10 rounded-sm px-3">
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
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="text-xl font-bold text-white">{entry.created_by}</h3>
                <p class="text-white/80">{format(parseISO(entry.date), 'MMMM d, yyyy')}</p>
              </div>
              <Badge class={statusBadge.class}>{statusBadge.label}</Badge>
            </div>
            <!-- Action Buttons Row -->
            <div class="flex gap-2 flex-wrap">
              <Button
                on:click={() => viewDetails(entry)}
                class="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-400/30 h-9 px-4 flex items-center rounded-md"
              >
                <Eye class="w-4 h-4 mr-2" />
                View Details
              </Button>
              {#if entry.proof_files && entry.proof_files.length > 0}
                <Button
                  on:click={() => downloadAllFiles(entry)}
                  class="bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-400/30 h-9 px-4 flex items-center rounded-md"
                >
                  <Download class="w-4 h-4 mr-2" />
                  Download All Files ({entry.proof_files.length})
                </Button>
              {/if}
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
                        <div class="flex items-center gap-2">
                          <button
                            on:click={() => downloadFile(file, `${entry.created_by}-proof-${index + 1}.pdf`)}
                            class="flex-1 flex items-center gap-2 p-2 bg-blue-500/20 rounded-lg border border-blue-400/30 text-blue-300 hover:bg-blue-500/30 transition-colors"
                          >
                            <Download class="w-4 h-4" />
                            <span>Proof File {index + 1}</span>
                          </button>
                          <a
                            href={file}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="p-2 bg-purple-500/20 rounded-lg border border-purple-400/30 text-purple-300 hover:bg-purple-500/30 transition-colors"
                            title="View in new tab"
                          >
                            <Eye class="w-4 h-4" />
                          </a>
                        </div>
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

<!-- Detailed View Modal -->
{#if showDetailsModal && viewingEntry}
  {@const badge = getStatusBadge(viewingEntry.status)}
  <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" on:click={closeDetailsModal}>
    <div class="bg-gray-900 rounded-2xl border border-white/20 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
      <!-- Modal Header -->
      <div class="flex items-start justify-between mb-6 border-b border-white/10 pb-4">
        <div>
          <h2 class="text-2xl font-bold text-white mb-2">Submission Details</h2>
          <p class="text-white/70">{viewingEntry.created_by} • {format(parseISO(viewingEntry.date), 'MMMM d, yyyy')}</p>
        </div>
        <button
          on:click={closeDetailsModal}
          class="text-white/70 hover:text-white transition-colors"
        >
          <XCircle class="w-6 h-6" />
        </button>
      </div>

      <!-- Modal Content -->
      <div class="space-y-6">
        <!-- Status Badge -->
        <div>
          <Badge class={badge.class}>{badge.label}</Badge>
        </div>

        <!-- Time Details -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 bg-white/5 rounded-lg border border-white/10">
            <p class="text-white/60 text-sm mb-1">Date</p>
            <p class="text-white font-semibold">{format(parseISO(viewingEntry.date), 'MMMM d, yyyy')}</p>
          </div>
          <div class="p-4 bg-white/5 rounded-lg border border-white/10">
            <p class="text-white/60 text-sm mb-1">Start Time</p>
            <p class="text-white font-semibold">{viewingEntry.start_time || 'N/A'}</p>
          </div>
          <div class="p-4 bg-white/5 rounded-lg border border-white/10">
            <p class="text-white/60 text-sm mb-1">End Time</p>
            <p class="text-white font-semibold">{viewingEntry.end_time || 'N/A'}</p>
          </div>
        </div>

        <!-- Hours Details -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 bg-blue-500/10 rounded-lg border border-blue-400/30">
            <p class="text-blue-300 text-sm mb-1">Claimed Hours</p>
            <p class="text-white font-bold text-2xl">{viewingEntry.manually_inputted_hours?.toFixed(2) || '0.00'}h</p>
          </div>
          <div class="p-4 bg-green-500/10 rounded-lg border border-green-400/30">
            <p class="text-green-300 text-sm mb-1">Approved Hours</p>
            <p class="text-white font-bold text-2xl">{viewingEntry.approved_hours?.toFixed(2) || '0.00'}h</p>
          </div>
        </div>

        <!-- Description -->
        {#if viewingEntry.description}
          <div class="p-4 bg-white/5 rounded-lg border border-white/10">
            <p class="text-white/60 text-sm mb-2">Description</p>
            <p class="text-white">{viewingEntry.description}</p>
          </div>
        {/if}

        <!-- Proof Type -->
        <div class="p-4 bg-white/5 rounded-lg border border-white/10">
          <p class="text-white/60 text-sm mb-2">Proof Type</p>
          <p class="text-white font-medium capitalize">{viewingEntry.proof_type?.replace('_', ' ') || 'N/A'}</p>
        </div>

        <!-- Proof Files -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-white font-semibold">Proof Files</h3>
            {#if viewingEntry.proof_files && viewingEntry.proof_files.length > 0}
              <Button
                on:click={() => downloadAllFiles(viewingEntry)}
                class="bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-400/30 h-8 px-3 text-sm flex items-center rounded-md"
              >
                <Download class="w-3 h-3 mr-2" />
                Download All
              </Button>
            {/if}
          </div>
          {#if viewingEntry.proof_files && viewingEntry.proof_files.length > 0}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              {#each viewingEntry.proof_files as file, index}
                <div class="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                  <FileText class="w-5 h-5 text-blue-400" />
                  <div class="flex-1 min-w-0">
                    <p class="text-white text-sm font-medium">Proof File {index + 1}</p>
                  </div>
                  <div class="flex gap-1">
                    <button
                      on:click={() => downloadFile(file, `${viewingEntry.created_by}-proof-${index + 1}.pdf`)}
                      class="p-2 bg-blue-500/20 rounded border border-blue-400/30 text-blue-300 hover:bg-blue-500/30 transition-colors"
                      title="Download"
                    >
                      <Download class="w-4 h-4" />
                    </button>
                    <a
                      href={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="p-2 bg-purple-500/20 rounded border border-purple-400/30 text-purple-300 hover:bg-purple-500/30 transition-colors"
                      title="View"
                    >
                      <Eye class="w-4 h-4" />
                    </a>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-white/60 text-sm">No proof files uploaded</p>
          {/if}
        </div>

        <!-- Mentor Comments -->
        {#if viewingEntry.mentor_comments}
          <div class="p-4 bg-yellow-500/10 rounded-lg border border-yellow-400/30">
            <p class="text-yellow-300 text-sm mb-2">Mentor Comments</p>
            <p class="text-white">{viewingEntry.mentor_comments}</p>
          </div>
        {/if}

        <!-- Break Times if available -->
        {#if viewingEntry.break_start || viewingEntry.break_end}
          <div class="p-4 bg-white/5 rounded-lg border border-white/10">
            <p class="text-white/60 text-sm mb-2">Break Times</p>
            <div class="flex gap-4">
              <div>
                <span class="text-white/70 text-xs">Break Start:</span>
                <span class="text-white ml-2">{viewingEntry.break_start || 'N/A'}</span>
              </div>
              <div>
                <span class="text-white/70 text-xs">Break End:</span>
                <span class="text-white ml-2">{viewingEntry.break_end || 'N/A'}</span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Metadata -->
        <div class="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <p class="text-white/60 text-xs mb-1">Created At</p>
            <p class="text-white text-sm">{viewingEntry.created_at ? format(parseISO(viewingEntry.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
          </div>
          <div>
            <p class="text-white/60 text-xs mb-1">Updated At</p>
            <p class="text-white text-sm">{viewingEntry.updated_at ? format(parseISO(viewingEntry.updated_at), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
        <Button
          on:click={closeDetailsModal}
          class="bg-gray-600 hover:bg-gray-700 text-white h-10 px-6 rounded-md"
        >
          Close
        </Button>
        {#if viewingEntry.status === 'submitted'}
          <Button
            on:click={() => { handleReject(viewingEntry); closeDetailsModal(); }}
            class="bg-red-500 hover:bg-red-600 text-white h-10 px-6 rounded-md flex items-center"
          >
            <X class="w-4 h-4 mr-2" />
            Reject
          </Button>
          <Button
            on:click={() => { handleApprove(viewingEntry); closeDetailsModal(); }}
            class="bg-green-500 hover:bg-green-600 text-white h-10 px-6 rounded-md flex items-center"
          >
            <Check class="w-4 h-4 mr-2" />
            Approve
          </Button>
        {/if}
      </div>
    </div>
  </div>
{/if}
