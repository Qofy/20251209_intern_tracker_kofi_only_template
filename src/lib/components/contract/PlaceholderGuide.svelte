<script>
  import Button from '$lib/components/ui/button.svelte';

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
</script>

<!-- Modal Overlay -->
<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
  <div class="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
    <div class="flex items-start justify-between mb-4">
      <div>
        <h2 class="text-xl font-bold text-white mb-2">Placeholder Guide</h2>
        <p class="text-white/70 text-sm">
          Use these placeholders in your contract text. They will be replaced with actual data.
        </p>
      </div>
      <Button on:click={onClose} variant="outline" class="text-white/70 hover:text-white">
        Close
      </Button>
    </div>
    
    <div class="space-y-2">
      {#each placeholders as p}
        <div class="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
          <code class="px-2 py-1 bg-amber-500/20 text-amber-300 rounded-md text-sm whitespace-nowrap font-mono">
            {`{{${p.key}}}`}
          </code>
          <p class="text-white/80 text-sm pt-1">{p.description}</p>
        </div>
      {/each}
    </div>
  </div>
</div>
