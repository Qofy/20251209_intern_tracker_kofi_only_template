<script>
  import { onMount } from 'svelte';
  import { TimeEntry, Student } from '../../entities/all';
  import { userStore, isAdmin } from '../../stores/userStore';
  import { format, subDays, parseISO, differenceInBusinessDays } from 'date-fns';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Dialog from '$lib/components/ui/dialog.svelte';
  import DialogContent from '$lib/components/ui/DialogContent.svelte';
  import DialogHeader from '$lib/components/ui/DialogHeader.svelte';
  import DialogTitle from '$lib/components/ui/DialogTitle.svelte';
  import { BarChart3, Download, Printer, QrCode, FileSpreadsheet, Users } from 'lucide-svelte';

  $: selectedStudent = $userStore.selectedStudent;
  $: user = $userStore.user;

  let entries = [];
  let allStudents = [];
  let selectedStudentEmail = null; // Store email instead of entire object
  let dateRange = {
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  };
  let reportUrl = '';
  let reportContentRef;
  let showQRDialog = false;
  let isLoading = false;

  // Computed property to get the selected student object
  $: selectedStudentForReport = allStudents.find(s => s.student_email === selectedStudentEmail) || null;

  // Auto-load data when component is created
  (async () => {
    if ($isAdmin) {
      await loadStudents();
    } else if (selectedStudent) {
      await loadEntries();
    }
  })();

  $: if ($isAdmin && selectedStudentForReport) {
    console.log('[Reports] Selected student changed:', selectedStudentForReport);
    loadEntriesForStudent(selectedStudentForReport);
    updateReportUrl();
  } else if (!$isAdmin && selectedStudent) {
    loadEntries();
    updateReportUrl();
  }

  $: if (dateRange) {
    updateReportUrl();
  }

  function updateReportUrl() {
    const student = $isAdmin ? selectedStudentForReport : selectedStudent;
    const url = `${window.location.origin}/reports?student=${student?.id}&from=${dateRange.from}&to=${dateRange.to}`;
    reportUrl = url;
  }

  async function loadStudents() {
    isLoading = true;
    try {
      const data = await Student.list();
      allStudents = data || [];
      if (allStudents.length > 0 && !selectedStudentEmail) {
        selectedStudentEmail = allStudents[0].student_email;
        // Load entries for the first student
        await loadEntriesForStudent(allStudents[0]);
      }
    } catch (error) {
      console.error("Error loading students:", error);
      allStudents = [];
    }
    isLoading = false;
  }

  async function loadEntriesForStudent(student) {
    if (!student) return;
    isLoading = true;
    try {
      console.log('Loading entries for student:', student);
      // First check all entries to see what's available
      const allEntries = await TimeEntry.list();
      console.log('All time entries in system:', allEntries);
      
      // Filter entries by student email
      // Time entries have 'created_by' field that should match student email
      const studentEntries = allEntries.filter(entry => 
        entry.created_by === student.student_email || 
        entry.created_by === student.email
      );
      
      console.log(`Filtered entries for ${student.student_email}:`, studentEntries.length);
      
      // Force reactivity by creating a new array
      entries = [...studentEntries];
      
      console.log('Showing filtered entries:', entries);
      console.log('entries array reference updated');
    } catch (error) {
      console.error("Error loading entries:", error);
      entries = [];
    }
    isLoading = false;
  }

  async function loadEntries() {
    if (!selectedStudent) return;
    isLoading = true;
    try {
      // For now, show ALL entries regardless of status (for demo purposes)
      const data = await TimeEntry.list();
      entries = data || [];
    } catch (error) {
      console.error("Error loading entries:", error);
      entries = [];
    }
    isLoading = false;
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

  $: totalHours = filteredEntries.reduce((sum, entry) => sum + (entry.manually_inputted_hours || 0), 0);
  $: workingDays = differenceInBusinessDays(parseISO(dateRange.to), parseISO(dateRange.from));
  $: averageHours = totalHours / (filteredEntries.length || 1);
  
  // Get contract information from selected student
  $: contractHours = selectedStudentForReport?.contract_hours || 0;
  $: contractStartDate = selectedStudentForReport?.start_date || '';
  $: contractEndDate = selectedStudentForReport?.end_date || '';
  $: contractProgress = contractHours > 0 ? Math.round((totalHours / contractHours) * 100) : 0;
  
  // Debug reactive computed values
  $: {
    console.log('[Reports] Reactive computed values updated:');
    console.log('  - filteredEntries.length:', filteredEntries.length);
    console.log('  - totalHours:', totalHours);
    console.log('  - workingDays:', workingDays);
    console.log('  - averageHours:', averageHours);
    console.log('  - contractHours:', contractHours);
    console.log('  - contractProgress:', contractProgress);
  }
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
  <!-- Admin Header with Student Selection -->
  {#if $isAdmin}
    <div class="mb-8">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 class="w-8 h-8 text-amber-400" />
            Reports Management
          </h1>
          <p class="text-white/70">View and export student work hour reports</p>
        </div>
      </div>
      
      <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg mb-6">
        <label class="text-white/80 text-sm font-medium mb-2 block">Select Student</label>
        <select
          bind:value={selectedStudentEmail}
          class="w-full px-4 py-2.5 bg-black/20 border border-white/30 rounded-lg text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none"
          on:change={() => console.log('[Reports] Student dropdown changed to:', selectedStudentEmail)}
        >
          <option value={null} disabled>-- Select a student --</option>
          {#each allStudents as student}
            <option value={student.student_email}>{student.full_name} ({student.student_email})</option>
          {/each}
        </select>
      </div>
    </div>
  {:else}
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white mb-2 flex items-center gap-3">
        <BarChart3 class="w-8 h-8 text-amber-400" />
        My Work Hours Report
      </h1>
      <p class="text-white/70">Track and export your approved work hours</p>
    </div>
  {/if}

  <div bind:this={reportContentRef} class="print-container">
    <!-- Print Header -->
    <div class="report-header hidden print:flex justify-between items-center border-b-2 border-black pb-2 mb-8">
      <div>
        <h1 class="text-2xl font-bold">Work Hours Report</h1>
        <p>Student: {$isAdmin ? selectedStudentForReport?.full_name : selectedStudent?.full_name}</p>
      </div>
      <div class="text-right">
        <p class="font-bold">Internship Program</p>
        <p class="text-sm">Confidential Document</p>
      </div>
    </div>

    <div class="no-print bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg mb-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label class="text-white/80 text-sm font-medium mb-2 block">From Date</label>
          <Input type="date" value={dateRange.from} on:change={(e) => handleDateChange('from', e.target.value)} class="bg-black/20 border-white/30 text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" />
        </div>
        <div>
          <label class="text-white/80 text-sm font-medium mb-2 block">To Date</label>
          <Input type="date" value={dateRange.to} on:change={(e) => handleDateChange('to', e.target.value)} class="bg-black/20 border-white/30 text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" />
        </div>
        <div class="flex flex-wrap gap-2 items-end">
          <Button on:click={() => exportToCSV(false)} class="bg-blue-500 hover:bg-blue-600 text-white flex h-10 items-center px-1 rounded-md">
            <Download class="w-4 h-4 mr-2" />Summary CSV
          </Button>
          <Button on:click={() => exportToCSV(true)} class="bg-blue-600 hover:bg-blue-700 text-white flex h-10 items-center px-1 rounded-md">
            <FileSpreadsheet class="w-4 h-4 mr-2" />Detailed CSV
          </Button>
          <Button on:click={() => window.print()} class="bg-purple-500 hover:bg-purple-600 text-white flex h-10 items-center px-1 rounded-md">
            <Printer class="w-4 h-4 mr-2" />PDF
          </Button>
          <Button on:click={() => showQRDialog = true} variant="ghost" class="text-white/80 hover:text-white hover:bg-white/10 flex h-10 items-center px-1 rounded-md">
            <QrCode size=35  />
          </Button>
        </div>
      </div>
    </div>

    {#if showQRDialog}
      <Dialog bind:open={showQRDialog}>
        <DialogContent class="bg-white/10 backdrop-blur-md border-white/20 text-white">
          <DialogHeader>
            <DialogTitle class="text-white">Report URL QR Code</DialogTitle>
          </DialogHeader>
          <div class="flex justify-center p-4">
            {#if reportUrl}
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={encodeURIComponent(reportUrl)}" alt="QR Code" />
            {:else}
              <p>Generating QR Code...</p>
            {/if}
          </div>
          <p class="text-sm text-center break-all">{reportUrl}</p>
        </DialogContent>
      </Dialog>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
        <p class="text-white/70 text-sm">Total Hours Logged</p>
        <p class="text-2xl font-bold text-blue-400">{totalHours.toFixed(2)}</p>
        <p class="text-white/50 text-xs mt-1">in selected period</p>
      </div>
      <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
        <p class="text-white/70 text-sm">Contract Hours</p>
        <p class="text-2xl font-bold text-green-400">{contractHours}</p>
        <p class="text-white/50 text-xs mt-1">total contracted</p>
      </div>
      <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
        <p class="text-white/70 text-sm">Contract Progress</p>
        <p class="text-2xl font-bold text-purple-400">{contractProgress}%</p>
        <p class="text-white/50 text-xs mt-1">{totalHours.toFixed(1)} / {contractHours}h</p>
      </div>
      <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
        <p class="text-white/70 text-sm">Contract Period</p>
        <p class="text-lg font-bold text-yellow-400">
          {#if contractStartDate && contractEndDate}
            {format(parseISO(contractStartDate), 'MMM d')} - {format(parseISO(contractEndDate), 'MMM d, yyyy')}
          {:else if contractStartDate}
            {format(parseISO(contractStartDate), 'MMM d, yyyy')} - Ongoing
          {:else}
            Not Set
          {/if}
        </p>
        <p class="text-white/50 text-xs mt-1">start - end dates</p>
      </div>
    </div>

    <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-lg no-print">
      <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <BarChart3 class="w-6 h-6 text-amber-400" />
        Hours Overview
      </h3>
      {#if isLoading}
        <div class="text-center py-12">
          <div class="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
          <p class="text-white/60">Loading report data...</p>
        </div>
      {:else if filteredEntries.length === 0}
        <div class="text-center py-12">
          <BarChart3 class="w-16 h-16 text-white/30 mx-auto mb-4" />
          <h3 class="text-lg font-semibold text-white mb-2">No entries found</h3>
          <p class="text-white/60">No approved time entries in the selected date range.</p>
        </div>
      {:else}
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
      {/if}
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
