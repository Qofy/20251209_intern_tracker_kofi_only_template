<script>
  import Dialog from '$lib/components/ui/dialog.svelte';
  import DialogContent from '$lib/components/ui/DialogContent.svelte';
  import DialogHeader from '$lib/components/ui/DialogHeader.svelte';
  import DialogTitle from '$lib/components/ui/DialogTitle.svelte';

  export let onClose;

  const placeholders = [
    { key: 'student_name', description: 'Full name of the student' },
    { key: 'start_date', description: 'Internship start date' },
    { key: 'end_date', description: 'Internship end date' },
    { key: 'mentor_name', description: 'Full name of the assigned mentor' },
    { key: 'work_area', description: "Student's primary work area/department" },
    { key: 'work_description', description: 'Detailed description of tasks' },
    { key: 'weekly_hours', description: 'Contracted hours per week' },
    { key: 'probation_weeks', description: 'Probation period in weeks' },
    { key: 'probation_months', description: 'Probation period in months' },
    { key: 'company_name', description: 'The name of the company' },
    { key: 'company_address', description: 'The address of the company' },
  ];

  let open = true;

  function handleOpenChange(isOpen) {
    if (!isOpen) {
      onClose();
    }
  }
</script>

<Dialog bind:open on:openChange={(e) => handleOpenChange(e.detail)}>
  <DialogContent class="bg-white/10 backdrop-blur-md border-white/20 text-white">
    <DialogHeader>
      <DialogTitle>Placeholder Guide</DialogTitle>
    </DialogHeader>
    <div class="max-h-[60vh] overflow-y-auto">
      <p class="text-white/70 mb-4">
        Use these placeholders in your contract text. They will be replaced with actual data when a contract is generated for a student.
      </p>
      <div class="space-y-2">
        {#each placeholders as p}
          <div class="flex items-start gap-3 p-2 bg-white/5 rounded-lg">
            <code class="px-2 py-1 bg-amber-500/20 text-amber-300 rounded-md text-sm whitespace-nowrap">
              {`{{${p.key}}}`}
            </code>
            <p class="text-white/80 text-sm pt-1">{p.description}</p>
          </div>
        {/each}
      </div>
    </div>
  </DialogContent>
</Dialog>
