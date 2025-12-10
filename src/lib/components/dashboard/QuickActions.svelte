<script>
  import { goto } from '@roxi/routify';
  import { Clock, Calendar, FileText, CheckSquare } from 'lucide-svelte';

  export let role = 'student';

  const actions = {
    student: [
      { icon: Clock, label: 'Track Time', href: '/daily-tracker', color: 'blue' },
      { icon: CheckSquare, label: 'View Tasks', href: '/tasks', color: 'green' },
      { icon: FileText, label: 'My Documents', href: '/my-documents', color: 'purple' },
      { icon: Calendar, label: 'Schedule', href: '/schedule-manager', color: 'orange' }
    ],
    mentor: [
      { icon: CheckSquare, label: 'Approve Work', href: '/proof-approval', color: 'green' },
      { icon: FileText, label: 'View Students', href: '/students', color: 'blue' },
      { icon: Calendar, label: 'Schedule', href: '/schedule-manager', color: 'orange' },
      { icon: Clock, label: 'Reports', href: '/reports', color: 'purple' }
    ],
    admin: [
      { icon: CheckSquare, label: 'Student Management', href: '/admin-students', color: 'blue' },
      { icon: FileText, label: 'System Overview', href: '/admin-overview', color: 'green' },
      { icon: Calendar, label: 'Applications', href: '/application-tracker', color: 'purple' },
      { icon: Clock, label: 'Reports', href: '/reports', color: 'orange' }
    ]
  };

  $: currentActions = actions[role] || actions.student;

  function handleAction(href) {
    $goto(href);
  }
</script>

<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
  {#each currentActions as action}
    <button
      on:click={() => handleAction(action.href)}
      class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 hover:bg-white/10 transition-all group"
    >
      <div class="flex flex-col items-center text-center">
        <div class={`p-3 rounded-lg mb-3 group-hover:scale-110 transition-transform
          ${action.color === 'blue' ? 'bg-blue-500/10 text-blue-400' : ''}
          ${action.color === 'green' ? 'bg-green-500/10 text-green-400' : ''}
          ${action.color === 'purple' ? 'bg-purple-500/10 text-purple-400' : ''}
          ${action.color === 'orange' ? 'bg-orange-500/10 text-orange-400' : ''}
        `}>
          <svelte:component this={action.icon} class="w-6 h-6" />
        </div>
        <p class="text-white/80 text-sm font-medium">{action.label}</p>
      </div>
    </button>
  {/each}
</div>
