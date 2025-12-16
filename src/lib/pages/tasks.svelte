<script>
  import { onMount } from 'svelte';
  import { Task, Question } from '../../entities/all';
  import { userStore, isMentor } from '../../stores/userStore';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Select from '$lib/components/ui/select.svelte';
  import SelectTrigger from '../components/ui/SelectTrigger.svelte';
  import SelectContent from '../components/ui/SelectContent.svelte';
  import SelectItem from '../components/ui/SelectItem.svelte';
  import SelectValue from '$lib/components/ui/SelectValue.svelte';
  import { Plus, Search, Filter, CheckSquare } from 'lucide-svelte';
  import TaskCard from '$lib/components/tasks/TaskCard.svelte';
  import TaskForm from '$lib/components/tasks/Taskform.svelte';

  $: user = $userStore.user;
  $: selectedStudent = $userStore.selectedStudent;

  let tasks = [];
  let questions = [];
  let filteredTasks = [];
  let searchTerm = "";
  let statusFilter = "all";
  let showTaskForm = false;
  let editingTask = null;
  let isLoading = false;

  // Auto-load data when component is created
  (async () => {
    await loadData();
  })();

  $: filterTasks(tasks, searchTerm, statusFilter);

  async function loadData() {
    isLoading = true;
    try {
      const [tasksData, questionsData] = await Promise.all([
        Task.list("-created_date"),
        Question.list("-created_date")
      ]);
      tasks = tasksData;
      questions = questionsData;
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
    isLoading = false;
  }

  function filterTasks(allTasks, search, status) {
    let filtered = allTasks;
    if (status !== "all") {
      filtered = filtered.filter(task => task.status === status);
    }
    if (search) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.task_number.toLowerCase().includes(search.toLowerCase()) ||
        task.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    filteredTasks = filtered;
  }

  async function handleSaveTask(taskData) {
    try {
      if (taskData.id) {
        await Task.update(taskData.id, taskData);
      } else {
        await Task.create(taskData);
      }
      loadData();
      showTaskForm = false;
      editingTask = null;
    } catch (error) {
      console.error("Error saving task:", error);
    }
  }

  async function handleTaskDelete(taskId) {
    if (window.confirm("Are you sure you want to delete this task?")) {
      await Task.delete(taskId);
      loadData();
    }
  }

  function handleEditTask(task) {
    editingTask = task;
    showTaskForm = true;
  }

  async function handleQuestionAdd(questionData) {
    try {
      await Question.create(questionData);
      loadData();
    } catch (error) {
      console.error("Error adding question:", error);
    }
  }

  $: statusCounts = {
    all: tasks.length,
    assigned: tasks.filter(t => t.status === 'assigned').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    reviewed: tasks.filter(t => t.status === 'reviewed').length
  };
</script>

<div class="p-8">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-3xl font-bold text-white mb-2 flex items-center gap-3">
        <CheckSquare class="w-8 h-8 text-emerald-400" />
        Task Management
      </h1>
      <p class="text-white/70">
        Manage your assignments, upload work, and communicate with your mentor
      </p>
    </div>
    <Button
      on:click={() => { editingTask = null; showTaskForm = true; }}
      class="bg-emerald-500 hover:bg-emerald-600 text-white flex h-12 px-3 items-center rounded-md"
    >
      <Plus class="w-5 h-5 mr-2" />
      New Task
    </Button>
  </div>

  <div class="flex items-center justify-between mb-6 gap-4">
    <div class="flex items-center gap-4">
      <div class="relative w-72">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search tasks..."
          class="pl-9 pr-4 py-2 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-emerald-500 focus:border-emerald-500"
          bind:value={searchTerm}
        />
      </div>
      <Select bind:value={statusFilter}>
        <SelectTrigger class="w-[180px] bg-gray-700 border border-gray-600 text-white [&>span]:text-white flex items-center h-10 rounded-sm px-3">
          <Filter class="w-4 h-4 mr-2 text-gray-400" />
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent class="bg-gray-800 border border-gray-700 text-white">
          <SelectItem value="all">All ({statusCounts.all})</SelectItem>
          <SelectItem value="assigned">Assigned ({statusCounts.assigned})</SelectItem>
          <SelectItem value="in_progress">In Progress ({statusCounts.in_progress})</SelectItem>
          <SelectItem value="completed">Completed ({statusCounts.completed})</SelectItem>
          <SelectItem value="reviewed">Reviewed ({statusCounts.reviewed})</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>

  <!-- Tasks List -->
  <div class="space-y-6">
    {#if isLoading}
      <div class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
        <p class="text-white/60">Loading tasks...</p>
      </div>
    {:else if filteredTasks.length > 0}
      {#each filteredTasks as task (task.id)}
        <TaskCard
          {task}
          {questions}
          onTaskUpdate={handleSaveTask}
          onTaskDelete={handleTaskDelete}
          onQuestionAdd={handleQuestionAdd}
          onEdit={handleEditTask}
        />
      {/each}
    {:else}
      <div class="text-center py-12">
        <CheckSquare class="w-16 h-16 text-white/30 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-white mb-2">No tasks found</h3>
        <p class="text-white/60 mb-6">
          {searchTerm || statusFilter !== "all"
            ? "Try adjusting your filters to see more tasks."
            : "Get started by creating your first task."}
        </p>
        {#if !searchTerm && statusFilter === "all"}
          <Button
            on:click={() => { editingTask = null; showTaskForm = true; }}
            class="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus class="w-5 h-5 mr-2" />
            Create First Task
          </Button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Task Form Modal -->
  {#if showTaskForm}
    <TaskForm
      task={editingTask}
      onSave={handleSaveTask}
      onCancel={() => { showTaskForm = false; editingTask = null; }}
    />
  {/if}
</div>
