<script>
  import { Plus, Upload, X, Save } from 'lucide-svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Textarea from '$lib/components/ui/textarea.svelte';
  import { UploadFile } from '$lib/integrations/Core';

  export let task = null;
  export let onSave;
  export let onCancel;

  let taskData = task || {
    task_number: "",
    title: "",
    description: "",
    due_date: "",
    attached_files: [],
    status: "assigned",
    code_snippet: ""
  };

  let isUploading = false;
  let isSaving = false;

  async function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    isUploading = true;
    try {
      const uploadPromises = files.map(file => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map(result => result.file_url);

      taskData = {
        ...taskData,
        attached_files: [...taskData.attached_files, ...fileUrls]
      };
    } catch (error) {
      console.error("Error uploading files:", error);
    }
    isUploading = false;
  }

  function removeFile(indexToRemove) {
    taskData = {
      ...taskData,
      attached_files: taskData.attached_files.filter((_, index) => index !== indexToRemove)
    };
  }

  async function handleSubmit() {
    if (!taskData.task_number || !taskData.title || !taskData.description) {
      return;
    }

    isSaving = true;
    await onSave(taskData);
    isSaving = false;
  }

  $: isFormValid = taskData.task_number && taskData.title && taskData.description;
</script>

<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
  <div class="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    <!-- Header -->
    <div class="p-6 border-b border-white/10">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
          <Plus class="w-6 h-6 text-emerald-400" />
          {task?.id ? "Edit Task" : "Create New Task"}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          on:click={onCancel}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <X class="w-5 h-5" />
        </Button>
      </div>
    </div>

    <!-- Form Content -->
    <div class="p-6 space-y-6">
      <!-- Basic Info Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="text-white/80 text-sm font-medium mb-2 block">
            Task Number
          </label>
          <Input
            bind:value={taskData.task_number}
            placeholder="e.g., #078"
            className="bg-white/10 border-white/20 text-white placeholder-white/50"
          />
        </div>
        <div>
          <label class="text-white/80 text-sm font-medium mb-2 block">
            Due Date
          </label>
          <Input
            type="date"
            bind:value={taskData.due_date}
            className="bg-white/10 border-white/20 text-white"
          />
        </div>
      </div>

      <!-- Task Title -->
      <div>
        <label class="text-white/80 text-sm font-medium mb-2 block">
          Task Title
        </label>
        <Input
          bind:value={taskData.title}
          placeholder="Enter task title"
          className="bg-white/10 border-white/20 text-white placeholder-white/50"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="text-white/80 text-sm font-medium mb-2 block">
          Description
        </label>
        <Textarea
          bind:value={taskData.description}
          placeholder="Detailed task description..."
          className="bg-white/10 border-white/20 text-white placeholder-white/50 min-h-[120px]"
        />
      </div>

      <!-- Code Snippet Field -->
      <div>
        <label class="text-white/80 text-sm font-medium mb-2 block">
          Code Snippet (Optional)
        </label>
        <Textarea
          bind:value={taskData.code_snippet}
          placeholder="Provide a code example for the student..."
          className="bg-gray-900/50 border-white/20 text-white placeholder-white/50 font-mono text-sm min-h-[150px]"
        />
      </div>

      <!-- File Upload -->
      <div>
        <label class="text-white/80 text-sm font-medium mb-3 block">
          Supporting Materials
        </label>
        <div class="relative mb-4">
          <input
            type="file"
            multiple
            on:change={handleFileUpload}
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <div class="bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/10 transition-colors">
            <Upload class="w-8 h-8 text-white/50 mx-auto mb-3" />
            <p class="text-white/80 font-medium">
              {isUploading ? "Uploading..." : "Click to upload supporting files"}
            </p>
            <p class="text-white/50 text-sm mt-1">
              Images, documents, reference materials
            </p>
          </div>
        </div>

        <!-- Uploaded Files List -->
        {#if taskData.attached_files.length > 0}
          <div>
            <p class="text-white/80 text-sm font-medium mb-2">Uploaded Files:</p>
            <div class="space-y-2">
              {#each taskData.attached_files as fileUrl, index}
                <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <span class="text-white text-sm">File {index + 1}</span>
                  <div class="flex items-center gap-2">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Preview
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
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="p-6 border-t border-white/10 flex justify-end gap-3">
      <Button
        variant="ghost"
        on:click={onCancel}
        className="text-white/80 hover:text-white hover:bg-white/10"
      >
        Cancel
      </Button>
      <Button
        on:click={handleSubmit}
        disabled={isSaving || !isFormValid}
        className="bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        <Save class="w-4 h-4 mr-2" />
        {isSaving ? "Saving..." : "Save Task"}
      </Button>
    </div>
  </div>
</div>
