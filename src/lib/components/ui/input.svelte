<script>
  export let type = 'text';
  export let value = '';
  export let placeholder = '';
  export let disabled = false;

  const classes = 'flex h-10 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-white/40';

  function handleInput(e) {
    value = e.target.value;
  }
</script>

<input
  type={type}
  value={value}
  placeholder={placeholder}
  disabled={disabled}
  class={classes}
  on:input={handleInput}
  on:input
  on:change
  on:blur
  on:focus
  {...$$restProps}
/>
