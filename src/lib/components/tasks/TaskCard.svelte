<script>
  import { format, parseISO } from 'date-fns';
  import { FileText, MessageCircle, Upload, Eye, Download, Send, Edit, X, Trash2, Code2 } from 'lucide-svelte';
  import Button from '$lib/components/ui/button.svelte';
  import Badge from '$lib/components/ui/badget.svelte';
  import Textarea from '$lib/components/ui/textarea.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import { UploadFile } from '$lib/integrations/Core';

  export let task;
  export let questions = [];
  export let onTaskUpdate;
  export let onTaskDelete;
  export let onQuestionAdd;
  export let onEdit;

  const statusColors = {
    assigned: "bg-blue-500/20 text-blue-300 border-blue-400/30",
    in_progress: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    completed: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    reviewed: "bg-purple-500/20 text-purple-300 border-purple-400/30"
  };

  let isExpanded = false;
  let isUploading = false;
  let newQuestion = "";
  let isSubmittingQuestion = false;
  let completionNotes = task.completion_notes || "";

  $: taskQuestions = questions.filter(q => q.task_id === task.id);

  async function handleFileUpload(event, fileType) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    isUploading = true;
    try {
      const uploadPromises = files.map(file => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map(result => result.file_url);

      const updatedTask = {
        ...task,
        [fileType]: [...(task[fileType] || []), ...fileUrls]
      };

      await onTaskUpdate(task.id, updatedTask);
    } catch (error) {
      console.error("Error uploading files:", error);
    }
    isUploading = false;
  }

  async function removeCompletionFile(indexToRemove) {
    const updatedFiles = task.completion_files.filter((_, index) => index !== indexToRemove);
    await onTaskUpdate(task.id, { ...task, completion_files: updatedFiles });
  }

  async function handleStatusChange(newStatus) {
    await onTaskUpdate(task.id, {
      ...task,
      status: newStatus,
      completion_notes: completionNotes
    });
  }

  async function handleQuestionSubmit() {
    if (!newQuestion.trim()) return;

    isSubmittingQuestion = true;
    try {
      await onQuestionAdd({
        task_id: task.id,
        question: newQuestion,
        status: "pending"
      });
      newQuestion = "";
    } catch (error) {
      console.error("Error submitting question:", error);
    }
    isSubmittingQuestion = false;
  }
</script>

<div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
  <!-- Header -->
  <div class="p-6 border-b border-white/10">
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
          <span class="text-white font-bold">{task.task_number}</span>
        </div>
        <div>
          <h3 class="text-xl font-bold text-white">{task.title}</h3>
          <p class="text-white/60 text-sm">
            Due: {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : 'No due date'}
          </p>
        </div>
      </div>
      <Badge className={`${statusColors[task.status]} border font-medium`}>
        {task.status.replace('_', ' ').toUpperCase()}
      </Badge>
    </div>

    <p class="text-white/80 mb-4">{task.description}</p>

    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/20 hover:text-red-300" on:click={() => onTaskDelete(task.id)}>
          <Trash2 class="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-blue-400 hover:bg-blue-500/20 hover:text-blue-300" on:click={() => onEdit(task)}>
          <Edit class="w-4 h-4" />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        on:click={() => isExpanded = !isExpanded}
        className="text-white/80 hover:text-white hover:bg-white/10"
      >
        <Eye class="w-4 h-4 mr-2" />
        {isExpanded ? 'Hide Details' : 'View Details'}
      </Button>
    </div>
  </div>

  <!-- Expanded Content -->
  {#if isExpanded}
    <div class="p-6 space-y-6">
      {#if task.attached_files && task.attached_files.length > 0}
        <div>
          <h4 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileText class="w-5 h-5 text-purple-400" />
            Supporting Materials
          </h4>
          <div class="space-y-2">
            {#each task.attached_files as fileUrl, index}
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 p-2 bg-purple-500/20 rounded-lg border border-purple-400/30 text-purple-300 text-sm hover:bg-purple-500/30 transition-colors">
                <Download class="w-4 h-4" />
                <span>Material {index + 1}</span>
              </a>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Code Snippet Section -->
      {#if task.code_snippet}
        <div>
          <h4 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Code2 class="w-5 h-5 text-cyan-400" />
            Code Snippet
          </h4>
          <pre class="bg-gray-900/70 rounded-lg p-4 border border-white/10">
            <code class="text-white font-mono text-sm whitespace-pre-wrap">
              {task.code_snippet}
            </code>
          </pre>
        </div>
      {/if}

      <!-- Student Work Upload -->
      <div>
        <h4 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Upload class="w-5 h-5 text-emerald-400" />
          Submit Your Work
        </h4>

        <div class="mb-4">
          <div class="relative">
            <input
              type="file"
              multiple
              on:change={(e) => handleFileUpload(e, 'completion_files')}
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            <div class="bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/10 transition-colors">
              <Upload class="w-8 h-8 text-white/50 mx-auto mb-3" />
              <p class="text-white/80 font-medium">
                {isUploading ? "Uploading..." : "Upload completed work files"}
              </p>
            </div>
          </div>
        </div>

        {#if task.completion_files && task.completion_files.length > 0}
          <div class="mb-4">
            <p class="text-white/80 text-sm font-medium mb-2">Submitted Files:</p>
            <div class="space-y-2">
              {#each task.completion_files as fileUrl, index}
                <div class="flex items-center justify-between p-2 bg-emerald-500/20 rounded-lg border border-emerald-400/30 text-emerald-300 text-sm">
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 hover:underline">
                    <FileText class="w-4 h-4" />
                    <span>Submission {index + 1}</span>
                  </a>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300" on:click={() => removeCompletionFile(index)}>
                    <X class="w-4 h-4" />
                  </Button>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <div>
          <h4 class="text-lg font-semibold text-white mb-4">Completion Notes</h4>
          <Textarea
            placeholder="Add notes about your completed work here..."
            bind:value={completionNotes}
            className="w-full bg-white/5 border border-white/10 text-white placeholder-white/50 rounded-lg p-3 focus:ring-1 focus:ring-white/30 focus:border-white/30"
            rows={4}
          />
        </div>

        <div class="flex gap-2 mt-4">
          <Button
            on:click={() => handleStatusChange("completed")}
            disabled={task.status === "completed"}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Mark as Completed
          </Button>
          <Button
            on:click={() => handleStatusChange("in_progress")}
            disabled={task.status === "in_progress"}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            Mark as In Progress
          </Button>
        </div>
      </div>

      <!-- Q&A Section -->
      <div>
        <h4 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MessageCircle class="w-5 h-5 text-blue-400" />
          Questions & Answers
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 ml-2">
            {taskQuestions.length}
          </Badge>
        </h4>

        <div class="space-y-4 mb-6">
          {#if taskQuestions.length === 0}
            <p class="text-white/60">No questions for this task yet.</p>
          {:else}
            {#each taskQuestions as q}
              <div class="bg-white/5 p-4 rounded-lg border border-white/10">
                <p class="font-semibold text-white">{q.question}</p>
                <p class="text-white/70 text-sm mt-2">
                  {q.answer ? q.answer : "No answer yet."}
                </p>
                <Badge className={`mt-2 ${q.status === 'answered' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-orange-500/20 text-orange-300 border-orange-400/30'} font-medium`}>
                  {q.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            {/each}
          {/if}
        </div>

        <div class="flex gap-2">
          <Input
            type="text"
            placeholder="Ask a question about this task..."
            bind:value={newQuestion}
            className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/50 rounded-lg p-3 focus:ring-1 focus:ring-white/30 focus:border-white/30"
          />
          <Button on:click={handleQuestionSubmit} disabled={isSubmittingQuestion || !newQuestion.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Send class="w-4 h-4 mr-2" />
            Ask
          </Button>
        </div>
      </div>
    </div>
  {/if}
</div>
