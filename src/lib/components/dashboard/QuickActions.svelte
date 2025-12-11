<script>
  import { Clock, Play, Pause, Square } from 'lucide-svelte';

  export let onStartDay;
  export let onBreakStart;
  export let onBreakEnd;
  export let onEndDay;
  export let currentStatus = 'not_started';

  const actions = [
    {
      id: 'start',
      label: 'Start Day',
      icon: Play,
      color: 'from-emerald-400 to-green-500',
      disabled: currentStatus === 'working' || currentStatus === 'on_break'
    },
    {
      id: 'break_start',
      label: 'Start Break',
      icon: Pause,
      color: 'from-amber-400 to-orange-500',
      disabled: currentStatus !== 'working'
    },
    {
      id: 'break_end',
      label: 'End Break',
      icon: Play,
      color: 'from-blue-400 to-cyan-500',
      disabled: currentStatus !== 'on_break'
    },
    {
      id: 'end_day',
      label: 'End Day',
      icon: Square,
      color: 'from-red-400 to-pink-500',
      disabled: currentStatus === 'not_started' || currentStatus === 'ended'
    },
  ];

  function handleAction(actionId) {
    switch(actionId) {
      case 'start': onStartDay(); break;
      case 'break_start': onBreakStart(); break;
      case 'break_end': onBreakEnd(); break;
      case 'end_day': onEndDay(); break;
    }
  }
</script>

<div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg">
  <div class="flex items-center gap-3 mb-6">
    <Clock class="w-6 h-6 text-amber-400" />
    <h3 class="text-xl font-bold text-white">Daily Check-in</h3>
  </div>

  <div class="grid grid-cols-2 gap-3">
    {#each actions as action}
      <button
        on:click={() => handleAction(action.id)}
        disabled={action.disabled}
        class={`p-4 rounded-xl border border-white/20 transition-all duration-200 ${
          action.disabled
            ? 'bg-white/5 text-white/40 cursor-not-allowed'
            : `bg-gradient-to-r ${action.color} text-white hover:shadow-lg hover:scale-105 active:scale-95`
        }`}
      >
        <svelte:component this={action.icon} class="w-5 h-5 mx-auto mb-2" />
        <p class="text-sm font-medium">{action.label}</p>
      </button>
    {/each}
  </div>

  <div class="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
    <p class="text-white/80 text-sm">Current Status:</p>
    <p class="text-amber-400 font-semibold capitalize">{currentStatus.replace('_', ' ')}</p>
  </div>
</div>
