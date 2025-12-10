<script>
  import { onMount } from 'svelte';
  import { TimeEntry } from '../../entities/all';
  import { userStore } from '../../stores/userStore';
  import { format, subDays, parseISO, differenceInBusinessDays } from 'date-fns';
  import Button from '../../lib/components/ui/button/button.svelte';
  import Input from '../../lib/components/ui/input/input.svelte';
  import Label from '../../lib/components/ui/label/label.svelte';
  import { BarChart3, Download, Printer, QrCode, FileSpreadsheet } from 'lucide-svelte';

  $: selectedStudent = $userStore.selectedStudent;

  let entries = [];
  let dateRange = {
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  };
  let reportUrl = '';
  let reportContentRef;

  onMount(() => {
    if (selectedStudent) {
      loadEntries();
    }
  });

  $: if (selectedStudent) {
    loadEntries();
    updateReportUrl();
  }

  $: if (dateRange) {
    updateReportUrl();
  }

  function updateReportUrl() {
    const url = `${window.location.origin}/reports?student=${selectedStudent?.id}&from=${dateRange.from}&to=${dateRange.to}`;
    reportUrl = url;
  }

  async function loadEntries() {
    const data = await TimeEntry.filter({
      status: 'approved',
      created_by: selectedStudent.created_by
    }, "-date");
    entries = data;
  }

  $: filteredEntries = entries.filter(entry => {
    const entryDate = entry.date;
    return entryDate >= dateRange.from && entryDate <= dateRange.to;
  });

  function handleDateChange(field, value) {
    dateRange = { ...dateRange, [field]: value };
  }

  function exportToCSV(detailed = false) {
    const headers = detailed
      ? ['Date', 'Approved Hours', 'Mentor Comments', 'Start Time', 'End Time', 'Break Start', 'Break End']
      : ['Date', 'Approved Hours'];

    const rows = filteredEntries.map(entry => {
      const row = [entry.date, entry.approved_hours];
      if (detailed) {
        row.push(
          `"${entry.mentor_comments || ''}"`,
          entry.start_time,
          entry.end_time,
          entry.break_start,
          entry.break_end
        );
      }
      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `report_${detailed ? 'detailed' : 'summary'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  $: totalHours = filteredEntries.reduce((sum, entry) => sum + (entry.approved_hours || 0), 0);
  $: workingDays = differenceInBusinessDays(parseISO(dateRange.to), parseISO(dateRange.from));
  $: averageHours = totalHours / (filteredEntries.length || 1);
</script>

<svelte:head>
  <style>
    @media print {
      body { font-family: 'Times New Roman', serif; color: black; }
      .no-print { display: none !important; }
      .print-container {
        position: absolute; left: 0; top: 0; width: 100%;
        background-color: white !important;
        padding: 2.5cm 2cm;
      }
      .print-container * {
        background-color: transparent !important;
        color: black !important;
        text-shadow: none !important;
        border-color: #ccc !important;
      }
    }
    @page { size: A4; margin: 0; }
  </style>
</svelte:head>

<div class="p-8">
  <div bind:this={reportContentRef} class="print-container">
    <!-- Print Header -->
    <div class="report-header hidden print:flex justify-between items-center border-b-2 border-black pb-2 mb-8">
      <div>
        <h1 class="text-2xl font-bold">Work Hours Report</h1>
        <p>Student: {selectedStudent?.full_name}</p>
      </div>
      <div class="text-right">
        <p class="font-bold">Internship Program</p>
        <p class="text-sm">Confidential Document</p>
      </div>
    </div>

    <div class="no-print bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg mb-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label class="text-white/80 mb-2 block">From Date</Label>
          <Input type="date" value={dateRange.from} on:change={(e) => handleDateChange('from', e.target.value)} class="bg-white/10 border-white/20 text-white" />
        </div>
        <div>
          <Label class="text-white/80 mb-2 block">To Date</Label>
          <Input type="date" value={dateRange.to} on:change={(e) => handleDateChange('to', e.target.value)} class="bg-white/10 border-white/20 text-white" />
        </div>
        <div class="flex flex-wrap gap-2 items-end">
          <Button on:click={() => exportToCSV(false)} class="bg-blue-500 hover:bg-blue-600 text-white">
            <Download class="w-4 h-4 mr-2" />Summary CSV
          </Button>
          <Button on:click={() => exportToCSV(true)} class="bg-blue-600 hover:bg-blue-700 text-white">
            <FileSpreadsheet class="w-4 h-4 mr-2" />Detailed CSV
          </Button>
          <Button on:click={() => window.print()} class="bg-purple-500 hover:bg-purple-600 text-white">
            <Printer class="w-4 h-4 mr-2" />PDF
          </Button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
        <p class="text-white/70 text-sm">Total Approved Hours</p>
        <p class="text-2xl font-bold text-amber-400">{totalHours.toFixed(2)}</p>
      </div>
      <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
        <p class="text-white/70 text-sm">Working Days in Range</p>
        <p class="text-2xl font-bold text-amber-400">{workingDays}</p>
      </div>
      <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
        <p class="text-white/70 text-sm">Average Hours / Day</p>
        <p class="text-2xl font-bold text-amber-400">{averageHours.toFixed(2)}</p>
      </div>
    </div>

    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg no-print">
      <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <BarChart3 class="w-6 h-6 text-amber-400" />
        Hours Overview
      </h3>
      <div class="space-y-3 max-h-80 overflow-y-auto">
        {#each filteredEntries.slice(0, 30) as entry}
          {@const maxHours = Math.max(...filteredEntries.map(e => e.approved_hours || 0), 8)}
          {@const percentage = ((entry.approved_hours || 0) / maxHours) * 100}
          <div class="group">
            <div class="flex items-center gap-3">
              <span class="text-white/60 text-sm w-24 shrink-0">{entry.date}</span>
              <div class="flex-1 bg-white/5 rounded-lg h-8 relative overflow-hidden border border-white/10">
                <div
                  class="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-lg transition-all duration-500 group-hover:from-amber-300 group-hover:to-orange-400"
                  style="width: {percentage}%"
                ></div>
              </div>
              <span class="text-white font-semibold w-12 text-right">{entry.approved_hours || 0}h</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Print Table -->
    <div class="hidden print:block mt-8">
      <h3 class="text-lg font-bold mb-4">Detailed Log</h3>
      <table class="w-full text-sm border-collapse border border-gray-400">
        <thead>
          <tr class="bg-gray-200">
            <th class="border border-gray-300 p-2 text-left">Date</th>
            <th class="border border-gray-300 p-2 text-left">Approved Hours</th>
            <th class="border border-gray-300 p-2 text-left">Comments</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredEntries as entry}
            <tr>
              <td class="border border-gray-300 p-2">{entry.date}</td>
              <td class="border border-gray-300 p-2">{entry.approved_hours}</td>
              <td class="border border-gray-300 p-2">{entry.mentor_comments}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Print Footer -->
    <div class="report-footer hidden print:block text-center text-xs text-gray-500 mt-8 pt-4 border-t">
      <p>Generated on: {format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
    </div>
  </div>
</div>
