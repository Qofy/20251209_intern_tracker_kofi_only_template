<script>
  export let icon = null;
  export let label = '';
  export let value = '';
  export let subtext = '';
  export let color = 'blue';
  export let trend = null;

  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
  };

  $: colorClass = colorClasses[color] || colorClasses.blue;
</script>

<div class="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all">
  <div class="flex items-start justify-between mb-4">
    <div class={`p-3 rounded-lg ${colorClass}`}>
      {#if icon}
        <svelte:component this={icon} class="w-6 h-6" />
      {/if}
    </div>
    {#if trend}
      <span class="text-sm {trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'}">
        {trend > 0 ? '+' : ''}{trend}%
      </span>
    {/if}
  </div>
  <div>
    <p class="text-white/60 text-sm mb-1">{label}</p>
    <p class="text-2xl font-bold text-white mb-1">{value}</p>
    {#if subtext}
      <p class="text-white/40 text-xs">{subtext}</p>
    {/if}
  </div>
</div>
