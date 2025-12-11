<script>
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Textarea from '$lib/components/ui/textarea.svelte';
  import Select from '$lib/components/ui/select.svelte';
  import SelectContent from '$lib/components/ui/SelectContent.svelte';
  import SelectItem from '$lib/components/ui/SelectItem.svelte';
  import SelectTrigger from '$lib/components/ui/SelectTrigger.svelte';
  import SelectValue from '$lib/components/ui/SelectValue.svelte';
  import Dialog from '$lib/components/ui/dialog.svelte';
  import DialogContent from '$lib/components/ui/DialogContent.svelte';
  import DialogHeader from '$lib/components/ui/DialogHeader.svelte';
  import DialogTitle from '$lib/components/ui/DialogTitle.svelte';
  import { Clock, Plus, Edit, Trash2, FileText, Link as LinkIcon, ArrowUp, ArrowDown, Calendar, AlertTriangle } from 'lucide-svelte';
  import { Task } from '$lib/entities/all';
  import { UploadFile } from '$lib/integrations/Core';
  import { format, parseISO } from 'date-fns';

  export let date;
  export let schedule = null;
  export let onScheduleUpdate;
  export let selectedStudent = null;
  export let isStudent = false;
  export let currentUser = null;
  export let isLoading = false;

  let scheduleItems = [];
  let editingItem = null;
  let availableTasks = [];
  let showEditor = false;

  $: if (schedule && schedule.parsed_schedule) {
    scheduleItems = schedule.parsed_schedule;
  } else {
    scheduleItems = [];
  }

  $: hasValidContext = (selectedStudent && selectedStudent.student_email) || (isStudent && currentUser);

  onMount(() => {
    loadTasks();
  });

  async function loadTasks() {
    try {
      const tasks = await Task.list();
      availableTasks = tasks;
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  }

  async function saveScheduleItems(items) {
    if (!schedule) {
      const studentEmail = isStudent ? currentUser?.email : selectedStudent?.student_email;
      if (!studentEmail) return;

      try {
        const newScheduleData = {
          date: date,
          student_email: studentEmail,
          raw_text: "",
          parsed_schedule: items,
          materials: [],
          created_by_mentor: !isStudent
        };
        await onScheduleUpdate(null, newScheduleData);
      } catch (error) {
        console.error("Error creating new schedule:", error);
      }
      return;
    }

    try {
      const updatedSchedule = {
        ...schedule,
        parsed_schedule: items
      };
      await onScheduleUpdate(schedule.id, updatedSchedule);
    } catch (error) {
      console.error("Error saving schedule items:", error);
    }
  }

  function handleAddItem() {
    const newItem = {
      start_time: "",
      end_time: "",
      activity: "New Activity",
      task_reference: "",
      description: "",
      files: [],
      linked_task_id: ""
    };
    editingItem = { ...newItem, index: undefined };
    showEditor = true;
  }

  function handleEditItem(item, index) {
    editingItem = { ...item, index };
    showEditor = true;
  }

  async function handleItemSave(updatedItem) {
    let updatedItems;
    if (editingItem.index !== undefined) {
      updatedItems = scheduleItems.map((item, index) =>
        editingItem.index === index ? updatedItem : item
      );
    } else {
      updatedItems = [...scheduleItems, updatedItem];
    }

    scheduleItems = updatedItems;
    await saveScheduleItems(updatedItems);
    showEditor = false;
    editingItem = null;
  }

  async function handleDeleteItem(index) {
    if (window.confirm("Are you sure you want to delete this schedule item?")) {
      const updatedItems = scheduleItems.filter((_, i) => i !== index);
      scheduleItems = updatedItems;
      await saveScheduleItems(updatedItems);
    }
  }

  async function moveItem(index, direction) {
    if ((direction === -1 && index === 0) || (direction === 1 && index === scheduleItems.length - 1)) {
      return;
    }
    
    const items = [...scheduleItems];
    const newIndex = index + direction;
    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    
    scheduleItems = items;
    await saveScheduleItems(items);
  }

  function closeEditor() {
    showEditor = false;
    editingItem = null;
  }
</script>

<div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
  <div class="flex items-center justify-between mb-6">
    <h3 class="text-xl font-bold text-white">Schedule Editor for {format(parseISO(date), 'MMMM d, yyyy')}</h3>
    {#if hasValidContext}
      <Button on:click={handleAddItem} className="bg-emerald-500 hover:bg-emerald-600 text-white">
        <Plus class="w-4 h-4 mr-2" />
        Add Item
      </Button>
    {/if}
  </div>

  {#if isLoading}
    <div class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
      <p class="text-white/60">Loading schedule...</p>
    </div>
  {:else if scheduleItems.length > 0}
    <div class="space-y-3">
      {#each scheduleItems as item, index}
        <div class="bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/8 transition-all duration-200">
          <div class="flex items-start gap-4">
            <div class="flex flex-col gap-1 mt-2">
              <button
                on:click={() => moveItem(index, -1)}
                disabled={index === 0}
                class="text-white/40 hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowUp class="w-4 h-4" />
              </button>
              <button
                on:click={() => moveItem(index, 1)}
                disabled={index === scheduleItems.length - 1}
                class="text-white/40 hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowDown class="w-4 h-4" />
              </button>
            </div>

            <div class="flex-1">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <div class="flex items-center gap-3 mb-1">
                    <Clock class="w-4 h-4 text-amber-400" />
                    <span class="text-amber-400 font-semibold">
                      {item.start_time}{item.end_time ? ` - ${item.end_time}` : ''}
                    </span>
                  </div>
                  <h4 class="text-white font-medium text-lg">{item.activity}</h4>
                </div>

                <div class="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    on:click={() => handleEditItem(item, index)}
                    className="text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
                  >
                    <Edit class="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    on:click={() => handleDeleteItem(index)}
                    className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {#if item.task_reference}
                <div class="flex items-center gap-2 mb-2">
                  <LinkIcon class="w-4 h-4 text-purple-400" />
                  <span class="text-purple-300 text-sm">{item.task_reference}</span>
                </div>
              {/if}

              {#if item.description}
                <p class="text-white/70 text-sm mb-2">{item.description}</p>
              {/if}

              {#if item.files && item.files.length > 0}
                <div class="flex items-center gap-2 flex-wrap">
                  {#each item.files as fileUrl, fileIndex}
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded border border-blue-400/30 text-blue-300 text-xs hover:bg-blue-500/30"
                    >
                      <FileText class="w-3 h-3" />
                      File {fileIndex + 1}
                    </a>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center py-12">
      <Calendar class="w-16 h-16 text-white/30 mx-auto mb-4" />
      <p class="text-white/60">
        {#if !hasValidContext}
          <AlertTriangle class="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          Please select a student to view or create their schedule.
        {:else}
          No schedule items created for this date.
        {/if}
      </p>
      {#if hasValidContext}
        <Button on:click={handleAddItem} className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white">
          <Plus class="w-4 h-4 mr-2" />
          Add First Item
        </Button>
      {/if}
    </div>
  {/if}
</div>

{#if showEditor && editingItem}
  <ScheduleItemEditor
    item={editingItem}
    {availableTasks}
    onSave={handleItemSave}
    onClose={closeEditor}
  />
{/if}

<!-- Schedule Item Editor Component -->
<script context="module">
  export function ScheduleItemEditor({ item, availableTasks, onSave, onClose }) {
    let formData = item || {
      start_time: "",
      end_time: "",
      activity: "",
      task_reference: "",
      description: "",
      files: [],
      linked_task_id: ""
    };
    let isUploading = false;
    let timeError = '';
    let open = true;

    $: {
      if (formData.start_time && formData.end_time) {
        if (formData.end_time <= formData.start_time) {
          timeError = 'End time must be after start time.';
        } else {
          timeError = '';
        }
      } else {
        timeError = '';
      }
    }

    async function handleFileUpload(event) {
      const files = Array.from(event.target.files);
      if (files.length === 0) return;

      isUploading = true;
      try {
        const uploadPromises = files.map(file => UploadFile({ file }));
        const results = await Promise.all(uploadPromises);
        const fileUrls = results.map(result => result.file_url);

        formData = {
          ...formData,
          files: [...(formData.files || []), ...fileUrls]
        };
      } catch (error) {
        console.error("Error uploading files:", error);
      }
      isUploading = false;
    }

    function removeFile(index) {
      formData = {
        ...formData,
        files: formData.files.filter((_, i) => i !== index)
      };
    }

    function handleClose() {
      open = false;
      onClose();
    }

    return {
      formData,
      isUploading,
      timeError,
      open,
      handleFileUpload,
      removeFile,
      handleClose
    };
  }
</script>

{#if showEditor}
  <Dialog {open} onOpenChange={closeEditor}>
    <DialogContent {open} onOpenChange={closeEditor}>
      <div class="bg-white/10 backdrop-blur-md border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg p-6">
        <DialogHeader>
          <DialogTitle>Edit Schedule Item</DialogTitle>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/80 text-sm font-medium mb-2 block">Start Time</label>
              <Input
                type="time"
                bind:value={editingItem.start_time}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label class="text-white/80 text-sm font-medium mb-2 block">End Time</label>
              <Input
                type="time"
                bind:value={editingItem.end_time}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          {#if timeError}
            <p class="text-sm text-red-400 -mt-2 ml-1">{timeError}</p>
          {/if}

          <div>
            <label class="text-white/80 text-sm font-medium mb-2 block">Activity</label>
            <Input
              bind:value={editingItem.activity}
              placeholder="Activity description"
              className="bg-white/10 border-white/20 text-white placeholder-white/50"
            />
          </div>

          <div>
            <label class="text-white/80 text-sm font-medium mb-2 block">Task Reference</label>
            <Input
              bind:value={editingItem.task_reference}
              placeholder="e.g., TASK #054"
              className="bg-white/10 border-white/20 text-white placeholder-white/50"
            />
          </div>

          <div>
            <label class="text-white/80 text-sm font-medium mb-2 block">Link to Task</label>
            <Select bind:value={editingItem.linked_task_id}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select a task to link" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No linked task</SelectItem>
                {#each availableTasks as task}
                  <SelectItem value={task.id}>
                    {task.task_number} - {task.title}
                  </SelectItem>
                {/each}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label class="text-white/80 text-sm font-medium mb-2 block">Description</label>
            <Textarea
              bind:value={editingItem.description}
              placeholder="Additional details about this activity..."
              className="bg-white/10 border-white/20 text-white placeholder-white/50 min-h-[80px]"
            />
          </div>

          <div>
            <label class="text-white/80 text-sm font-medium mb-3 block">Attach Files</label>
            <div class="relative mb-4">
              <input
                type="file"
                multiple
                on:change={handleFileUpload}
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <div class="bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:bg-white/10 transition-colors">
                <FileText class="w-6 h-6 text-white/50 mx-auto mb-2" />
                <p class="text-white/80 text-sm">
                  {isUploading ? "Uploading..." : "Click to attach files"}
                </p>
              </div>
            </div>

            {#if editingItem.files && editingItem.files.length > 0}
              <div class="space-y-2">
                {#each editingItem.files as fileUrl, index}
                  <div class="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10">
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
            {/if}
          </div>
        </div>

        <div class="flex justify-end gap-3 border-t border-white/10 pt-4">
          <Button variant="ghost" on:click={closeEditor} className="text-white/80 hover:text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button on:click={() => handleItemSave(editingItem)} className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={!!timeError}>
            Save Changes
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
{/if}
