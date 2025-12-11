<script>
  export let open;
  export let onOpenChange;
</script>

<button on:click={() => onOpenChange(true)} {...$$restProps}>
  <slot />
</button>
