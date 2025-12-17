<script>
  import Button from '$lib/components/ui/button.svelte';
  import { Download } from 'lucide-svelte';

  export let template;
  export let onClose;

  function replacePlaceholders(text) {
    if (!text) return '';
    const data = {
      student_name: template.student_name || "Student Name",
      start_date: template.start_date || "TBD",
      end_date: template.end_date || "TBD",
      mentor_name: template.mentor_name || "Mentor Name",
      work_area: template.work_area || "Work Area",
      work_description: template.work_description || "Work Description",
      weekly_hours: template.weekly_hours || "40",
      probation_weeks: template.probation_weeks || "4",
      probation_months: template.probation_months || "1",
      company_name: template.company_name || "Company Name",
      company_address: template.company_address || "Company Address",
    };
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
  }

  function handlePrint() {
    window.print();
  }
</script>

<svelte:head>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .print-container { padding: 0 !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
    }
    @page { size: A4; margin: 2cm; }
  </style>
</svelte:head>

<!-- Modal Overlay -->
<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
  <div class="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
    <div class="no-print p-4 border-b border-gray-200 flex items-center justify-between">
      <h2 class="text-xl font-bold text-black">Contract Preview - {template?.title || 'Untitled'}</h2>
      <div class="flex gap-2">
        <Button on:click={handlePrint} class="bg-blue-600 text-white hover:bg-blue-700">
          <Download class="w-4 h-4 mr-2" />
          Export PDF
        </Button>
        <Button on:click={onClose} variant="outline">Close</Button>
      </div>
    </div>

    <div class="print-container grid grid-cols-2 gap-8 p-6 text-sm text-black">
      <div>
        <h3 class="text-center font-bold mb-4">Pflicht-Praktikumsvertrag</h3>
        <div class="space-y-4">
          {#each template?.paragraphs || [] as para, index}
            <div class="mb-6">
              <h4 class="font-bold mb-2">§ {index + 1} {replacePlaceholders(para.title_de)}</h4>
              <p class="whitespace-pre-wrap leading-relaxed">{replacePlaceholders(para.content_de)}</p>
            </div>
          {/each}
        </div>
      </div>

      <div>
        <h3 class="text-center font-bold mb-4">Compulsory Internship Contract</h3>
        <div class="space-y-4">
          {#each template?.paragraphs || [] as para, index}
            <div class="mb-6">
              <h4 class="font-bold mb-2">§ {index + 1} {replacePlaceholders(para.title_en)}</h4>
              <p class="whitespace-pre-wrap leading-relaxed">{replacePlaceholders(para.content_en)}</p>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>
