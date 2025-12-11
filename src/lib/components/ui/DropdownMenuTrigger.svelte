<script>
  export let open;
  export let onOpenChange;
</script>

<button 
  on:click={() => onOpenChange(!open)} 
  {...$$restProps}
  type="button"
>
  <slot />
</button>
