<script>
  export let htmlFor = '';

  const classes = 'text-sm font-medium leading-none text-gray-700';
</script>

<label
  for={htmlFor}
  class={classes}
  {...$$restProps}
>
  <slot />
</label>
