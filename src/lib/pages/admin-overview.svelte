<script>
  import { onMount } from 'svelte';
  import { Student, TimeEntry, Task, Question } from '../../entities/all';
  import { Settings, Users, Clock, CheckSquare, MessageCircle, BarChart3 } from 'lucide-svelte';

  let allStudents = [];
  let stats = {
    totalStudents: 0,
    activeStudents: 0,
    totalTimeEntries: 0,
    totalTasks: 0,
    pendingQuestions: 0,
    totalHoursApproved: 0,
  };

  onMount(() => {
    loadSystemStats();
  });

  async function loadSystemStats() {
    try {
      const [students, timeEntries, tasks, questions] = await Promise.all([
        Student.list(),
        TimeEntry.list(),
        Task.list(),
        Question.list()
      ]);

      allStudents = students;
      const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.approved_hours || 0), 0);
      const pendingQuestions = questions.filter(q => q.status === 'pending').length;
      const activeStudents = students.filter(s => s.status === 'active').length;

      stats = {
        totalStudents: students.length,
        activeStudents,
        totalTimeEntries: timeEntries.length,
        totalTasks: tasks.length,
        pendingQuestions,
        totalHoursApproved: totalHours,
      };
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  }
</script>

<div class="p-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-white mb-2 flex items-center gap-3">
      <Settings class="w-8 h-8 text-purple-400" />
      System Overview
    </h1>
    <p class="text-white/70">Complete system statistics and monitoring</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
      <div class="flex items-center justify-between mb-4">
        <div class="p-3 rounded-xl bg-blue-500 bg-opacity-20 border border-white/20">
          <Users class="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 class="text-white/80 text-sm font-medium mb-2">Total Students</h3>
      <div class="flex items-baseline gap-2 mb-2">
        <span class="text-3xl font-bold text-white">{stats.totalStudents}</span>
      </div>
      <p class="text-white/60 text-sm">{stats.activeStudents} currently active</p>
    </div>

    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
      <div class="flex items-center justify-between mb-4">
        <div class="p-3 rounded-xl bg-emerald-500 bg-opacity-20 border border-white/20">
          <Clock class="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 class="text-white/80 text-sm font-medium mb-2">Time Entries</h3>
      <div class="flex items-baseline gap-2 mb-2">
        <span class="text-3xl font-bold text-white">{stats.totalTimeEntries}</span>
      </div>
      <p class="text-white/60 text-sm">All submitted time logs</p>
    </div>

    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
      <div class="flex items-center justify-between mb-4">
        <div class="p-3 rounded-xl bg-purple-500 bg-opacity-20 border border-white/20">
          <CheckSquare class="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 class="text-white/80 text-sm font-medium mb-2">Total Tasks</h3>
      <div class="flex items-baseline gap-2 mb-2">
        <span class="text-3xl font-bold text-white">{stats.totalTasks}</span>
      </div>
      <p class="text-white/60 text-sm">Assignments in system</p>
    </div>

    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
      <div class="flex items-center justify-between mb-4">
        <div class="p-3 rounded-xl bg-amber-500 bg-opacity-20 border border-white/20">
          <BarChart3 class="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 class="text-white/80 text-sm font-medium mb-2">Approved Hours</h3>
      <div class="flex items-baseline gap-2 mb-2">
        <span class="text-3xl font-bold text-white">{stats.totalHoursApproved.toFixed(1)}h</span>
      </div>
      <p class="text-white/60 text-sm">Total hours approved</p>
    </div>

    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
      <div class="flex items-center justify-between mb-4">
        <div class="p-3 rounded-xl bg-red-500 bg-opacity-20 border border-white/20">
          <MessageCircle class="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 class="text-white/80 text-sm font-medium mb-2">Pending Questions</h3>
      <div class="flex items-baseline gap-2 mb-2">
        <span class="text-3xl font-bold text-white">{stats.pendingQuestions}</span>
      </div>
      <p class="text-white/60 text-sm">Awaiting mentor response</p>
    </div>

    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
      <div class="flex items-center justify-between mb-4">
        <div class="p-3 rounded-xl bg-green-500 bg-opacity-20 border border-white/20">
          <Settings class="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 class="text-white/80 text-sm font-medium mb-2">System Health</h3>
      <div class="flex items-baseline gap-2 mb-2">
        <span class="text-3xl font-bold text-white">✓ Good</span>
      </div>
      <p class="text-white/60 text-sm">All systems operational</p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
      <h3 class="text-xl font-bold text-white mb-6">Recent Students</h3>
      <div class="space-y-4">
        {#each allStudents.slice(0, 5) as student}
          <div class="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
            <div>
              <p class="text-white font-medium">{student.full_name}</p>
              <p class="text-white/60 text-sm">{student.student_email}</p>
            </div>
            <div class="text-right">
              <span class={`px-2 py-1 rounded-lg text-xs font-medium ${
                student.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                student.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
                'bg-amber-500/20 text-amber-300'
              }`}>
                {student.status}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
      <h3 class="text-xl font-bold text-white mb-6">System Actions</h3>
      <div class="space-y-3">
        <button class="w-full p-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl border border-blue-400/30 text-blue-300 text-left transition-colors">
          📊 Generate System Report
        </button>
        <button class="w-full p-3 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl border border-emerald-400/30 text-emerald-300 text-left transition-colors">
          🔄 Sync All Data
        </button>
        <button class="w-full p-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl border border-purple-400/30 text-purple-300 text-left transition-colors">
          📧 Send System Notifications
        </button>
        <button class="w-full p-3 bg-amber-500/20 hover:bg-amber-500/30 rounded-xl border border-amber-400/30 text-amber-300 text-left transition-colors">
          🗂️ Export All Data
        </button>
      </div>
    </div>
  </div>
</div>
