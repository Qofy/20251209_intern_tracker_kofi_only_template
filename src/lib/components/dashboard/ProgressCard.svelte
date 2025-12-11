<script>
  import { TrendingUp } from 'lucide-svelte';

  export let title;
  export let current;
  export let total;
  export let percentage;
  export let icon = null;
  export let color = 'bg-blue-500';
  export let trend = null;
</script>

<div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
  <div class="flex items-start justify-between mb-4">
    <div class="{color} bg-opacity-20 border border-white/20 p-3 rounded-xl">
      {#if icon}
        <svelte:component this={icon} class="w-6 h-6 text-white" />
      {/if}
    </div>
    {#if trend}
      <div class="flex items-center gap-1 text-emerald-300 text-sm">
        <TrendingUp class="w-4 h-4" />
        <span>{trend}</span>
      </div>
    {/if}
  </div>

  <h3 class="text-white/80 text-sm font-medium mb-2">{title}</h3>
  <div class="flex items-baseline gap-2 mb-3">
    <span class="text-2xl font-bold text-white">{current}</span>
    <span class="text-white/60">/ {total}</span>
    <span class="text-amber-400 text-lg font-semibold ml-2">{percentage}%</span>
  </div>

  <!-- Progress Bar -->
  <div class="w-full bg-white/10 rounded-full h-2 border border-white/20">
    <div
      class="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500 shadow-lg"
      style="width: {Math.min(percentage, 100)}%"
    />
  </div>
</div>
