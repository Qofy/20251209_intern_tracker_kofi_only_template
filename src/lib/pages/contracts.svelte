<script>
  import { onMount } from 'svelte';
  import { Contract, Student, Task } from '../../entities/all';
  import { userStore } from '../../stores/userStore';
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Dialog from '$lib/components/ui/dialog.svelte';
  import ContractPreview from '$lib/components/contract/ContractPreview.svelte';
  import ParagraphEditor from '$lib/components/contract/ParagraphEditor.svelte';
  import PlaceholderGuide from '$lib/components/contract/PlaceholderGuide.svelte';
  import { initialContractParagraphs } from '$lib/components/contract/initialContractData.js';
  import { 
    FileText, Plus, Eye, CheckCircle, X, Send, 
    Clock, AlertCircle, Edit, Trash2, UserCheck,
    FilePlus, FileSignature, Download, HelpCircle
  } from 'lucide-svelte';
  import { format } from 'date-fns';

  $: user = $userStore.user;
  export let userRole = 'mentor'; // Can be 'mentor', 'admin', or 'student'

  let contracts = [];
  let students = [];
  let tasks = [];
  let isLoading = false;
  let showCreateModal = false;
  let showViewModal = false;
  let showPreviewModal = false;
  let showPlaceholderGuide = false;
  let selectedContract = null;

  let newContract = {
    title: 'Internship Contract',
    description: '',
    student_email: '',
    student_name: '',
    mentor_email: user?.email || '',
    mentor_name: user?.full_name || '',
    contract_hours: 600,
    start_date: '',
    end_date: '',
    work_area: '',
    work_description: '',
    weekly_hours: '40',
    probation_weeks: '4',
    probation_months: '1',
    company_name: '',
    company_address: '',
    paragraphs: [...initialContractParagraphs],
    status: 'draft',
    assigned_task_id: null
  };

  let signatureText = '';
  let adminNotes = '';
  let rejectionReason = '';

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    isLoading = true;
    try {
      if (userRole === 'admin') {
        contracts = await Contract.list();
        students = await Student.list();
        tasks = await Task.list();
      } else if (userRole === 'mentor') {
        const allContracts = await Contract.list();
        contracts = allContracts.filter(c => c.mentor_email === user?.email);
        const allStudents = await Student.list();
        students = allStudents.filter(s => s.mentor_email === user?.email);
        tasks = await Task.list({ mentor_email: user?.email });
      } else if (userRole === 'student') {
        const allContracts = await Contract.list();
        contracts = allContracts.filter(c => c.student_email === user?.email);
      }

      console.log('[Contracts] Loaded:', {
        role: userRole,
        contractsCount: contracts.length,
        studentsCount: students.length
      });
    } catch (error) {
      console.error('[Contracts] Error loading data:', error);
    }
    isLoading = false;
  }

  async function createContract() {
    console.log('[Contracts] Creating contract with data:', newContract);
    
    try {
      // Validate required fields
      if (!newContract.title || !newContract.student_email || !newContract.student_name) {
        alert('Please fill in all required fields (Title, Student Email, Student Name)');
        return;
      }

      // Generate terms from paragraphs with placeholder replacement
      const terms = generateTermsFromParagraphs(newContract.paragraphs);
      console.log('[Contracts] Generated terms:', terms.substring(0, 200) + '...');

      const contractData = {
        title: newContract.title,
        description: newContract.description || '',
        student_email: newContract.student_email,
        student_name: newContract.student_name,
        mentor_email: newContract.mentor_email || user?.email || '',
        mentor_name: newContract.mentor_name || user?.full_name || '',
        contract_hours: parseInt(newContract.contract_hours) || 600,
        start_date: newContract.start_date || null,
        end_date: newContract.end_date || null,
        terms,
        status: userRole === 'admin' ? 'draft' : 'student_review',
        assigned_task_id: newContract.assigned_task_id || null,
        company_id: user?.company_id || null,
        // Store additional fields for placeholder replacement
        work_area: newContract.work_area || '',
        work_description: newContract.work_description || '',
        weekly_hours: newContract.weekly_hours || '40',
        company_name: newContract.company_name || '',
        company_address: newContract.company_address || ''
      };

      console.log('[Contracts] Sending contract data:', contractData);
      const created = await Contract.create(contractData);
      console.log('[Contracts] Contract created successfully:', created);
      
      contracts = [...contracts, created];
      showCreateModal = false;
      resetForm();
      await loadData();
      
      alert('Contract created successfully!');
    } catch (error) {
      console.error('[Contracts] Error creating contract:', error);
      alert('Failed to create contract: ' + (error.message || 'Unknown error'));
    }
  }

  function generateTermsFromParagraphs(paragraphs) {
    const placeholderData = {
      student_name: newContract.student_name,
      start_date: newContract.start_date || 'TBD',
      end_date: newContract.end_date || 'TBD',
      mentor_name: newContract.mentor_name,
      work_area: newContract.work_area,
      work_description: newContract.work_description,
      weekly_hours: newContract.weekly_hours,
      probation_weeks: newContract.probation_weeks,
      probation_months: newContract.probation_months,
      company_name: newContract.company_name,
      company_address: newContract.company_address
    };

    let terms = '';
    paragraphs.forEach((para, index) => {
      terms += `\n\n§${index + 1} ${replacePlaceholders(para.title_en, placeholderData)}\n`;
      terms += `${replacePlaceholders(para.content_en, placeholderData)}\n`;
      terms += `\n${replacePlaceholders(para.title_de, placeholderData)}\n`;
      terms += `${replacePlaceholders(para.content_de, placeholderData)}`;
    });

    return terms.trim();
  }

  function replacePlaceholders(text, data) {
    if (!text) return '';
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
  }

  async function signAsStudent(contract) {
    if (!signatureText.trim()) {
      alert('Please provide your signature');
      return;
    }

    try {
      await Contract.signAsStudent(contract.id, {
        signature: signatureText,
        date: new Date().toISOString().split('T')[0]
      });
      
      alert('Contract signed! Sent to mentor for review.');
      signatureText = '';
      showViewModal = false;
      await loadData();
    } catch (error) {
      console.error('[Contracts] Error signing:', error);
      alert('Failed to sign contract');
    }
  }

  async function submitToAdmin(contract) {
    if (!signatureText.trim()) {
      alert('Please provide your signature');
      return;
    }

    try {
      await Contract.submitToAdmin(contract.id, {
        signature: signatureText,
        date: new Date().toISOString().split('T')[0]
      });
      
      alert('Contract submitted to admin for approval!');
      signatureText = '';
      showViewModal = false;
      await loadData();
    } catch (error) {
      console.error('[Contracts] Error submitting:', error);
      alert('Failed to submit contract');
    }
  }

  async function approveContract(contract) {
    try {
      await Contract.approve(contract.id, adminNotes);
      alert('Contract approved!');
      adminNotes = '';
      showViewModal = false;
      await loadData();
    } catch (error) {
      console.error('[Contracts] Error approving:', error);
      alert('Failed to approve contract');
    }
  }

  async function rejectContract(contract) {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      await Contract.reject(contract.id, rejectionReason);
      alert('Contract rejected');
      rejectionReason = '';
      showViewModal = false;
      await loadData();
    } catch (error) {
      console.error('[Contracts] Error rejecting:', error);
      alert('Failed to reject contract');
    }
  }

  async function deleteContract(contractId) {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    
    try {
      await Contract.delete(contractId);
      contracts = contracts.filter(c => c.id !== contractId);
    } catch (error) {
      console.error('[Contracts] Error deleting:', error);
      alert('Failed to delete contract');
    }
  }

  function viewContract(contract) {
    selectedContract = contract;
    showViewModal = true;
  }

  function resetForm() {
    newContract = {
      title: 'Internship Contract',
      description: '',
      student_email: '',
      student_name: '',
      mentor_email: user?.email || '',
      mentor_name: user?.full_name || '',
      contract_hours: 600,
      start_date: '',
      end_date: '',
      work_area: '',
      work_description: '',
      weekly_hours: '40',
      probation_weeks: '4',
      probation_months: '1',
      company_name: '',
      company_address: '',
      paragraphs: [...initialContractParagraphs],
      status: 'draft',
      assigned_task_id: null
    };
  }

  function updateParagraph(index, updatedPara) {
    newContract.paragraphs[index] = updatedPara;
    newContract = { ...newContract };
  }

  function addParagraph() {
    newContract.paragraphs = [
      ...newContract.paragraphs,
      {
        id: `para_${Date.now()}`,
        title_de: '',
        title_en: '',
        content_de: '',
        content_en: ''
      }
    ];
  }

  function removeParagraph(index) {
    newContract.paragraphs = newContract.paragraphs.filter((_, i) => i !== index);
  }

  function previewContract() {
    // Prepare contract with all necessary data for preview
    const previewData = {
      ...newContract,
      title: newContract.title || 'Internship Contract',
      paragraphs: newContract.paragraphs || [],
      student_name: newContract.student_name || 'Student Name',
      start_date: newContract.start_date || 'TBD',
      end_date: newContract.end_date || 'TBD',
      mentor_name: newContract.mentor_name || 'Mentor Name',
      work_area: newContract.work_area || 'Work Area',
      work_description: newContract.work_description || 'Work Description',
      weekly_hours: newContract.weekly_hours || '40',
      company_name: newContract.company_name || 'Company Name',
      company_address: newContract.company_address || 'Company Address'
    };
    showPreviewModal = true;
  }

  function getStatusColor(status) {
    const colors = {
      draft: 'bg-gray-500/20 text-gray-400',
      student_review: 'bg-blue-500/20 text-blue-400',
      mentor_review: 'bg-yellow-500/20 text-yellow-400',
      pending_approval: 'bg-purple-500/20 text-purple-400',
      approved: 'bg-green-500/20 text-green-400',
      rejected: 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  }

  function getStatusIcon(status) {
    const icons = {
      draft: Edit,
      student_review: FileSignature,
      mentor_review: Eye,
      pending_approval: Clock,
      approved: CheckCircle,
      rejected: X
    };
    return icons[status] || FileText;
  }

  function onStudentSelect(event) {
    const email = event.target.value;
    const student = students.find(s => s.student_email === email);
    if (student) {
      newContract.student_name = student.full_name;
    }
  }

  $: filteredContracts = contracts;
  $: stats = {
    total: contracts.length,
    draft: contracts.filter(c => c.status === 'draft').length,
    pending: contracts.filter(c => ['student_review', 'mentor_review', 'pending_approval'].includes(c.status)).length,
    approved: contracts.filter(c => c.status === 'approved').length,
    rejected: contracts.filter(c => c.status === 'rejected').length
  };
</script>

<div class="p-8">
  <!-- Header -->
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-4xl font-bold text-white mb-2">Contract Management</h1>
      <p class="text-white/70">
        {#if userRole === 'admin'}
          Review and approve internship contracts
        {:else if userRole === 'mentor'}
          Create and manage student contracts
        {:else}
          View and sign your internship contracts
        {/if}
      </p>
    </div>
    {#if userRole === 'mentor' || userRole === 'admin'}
      <Button
        on:click={() => showCreateModal = true}
        class="bg-green-500 hover:bg-green-600 text-white flex items-center gap-2 h-10 px-4 rounded-md"
      >
        <Plus class="w-5 h-5" />
        Create Contract
      </Button>
    {/if}
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
    <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
      <FileText class="w-6 h-6 text-white/60 mb-2" />
      <p class="text-2xl font-bold text-white">{stats.total}</p>
      <p class="text-white/60 text-sm">Total</p>
    </div>
    <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
      <Edit class="w-6 h-6 text-gray-400 mb-2" />
      <p class="text-2xl font-bold text-white">{stats.draft}</p>
      <p class="text-white/60 text-sm">Draft</p>
    </div>
    <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
      <Clock class="w-6 h-6 text-yellow-400 mb-2" />
      <p class="text-2xl font-bold text-white">{stats.pending}</p>
      <p class="text-white/60 text-sm">Pending</p>
    </div>
    <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
      <CheckCircle class="w-6 h-6 text-green-400 mb-2" />
      <p class="text-2xl font-bold text-white">{stats.approved}</p>
      <p class="text-white/60 text-sm">Approved</p>
    </div>
    <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
      <X class="w-6 h-6 text-red-400 mb-2" />
      <p class="text-2xl font-bold text-white">{stats.rejected}</p>
      <p class="text-white/60 text-sm">Rejected</p>
    </div>
  </div>

  <!-- Contracts List -->
  <div class="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
    <h2 class="text-2xl font-bold text-white mb-6">Contracts</h2>

    {#if isLoading}
      <div class="text-center py-12">
        <Clock class="w-12 h-12 text-white/50 mx-auto animate-spin mb-4" />
        <p class="text-white/70">Loading contracts...</p>
      </div>
    {:else if contracts.length === 0}
      <div class="text-center py-12">
        <FileText class="w-16 h-16 text-white/30 mx-auto mb-4" />
        <p class="text-white/70 mb-2">No contracts yet</p>
        {#if userRole === 'mentor' || userRole === 'admin'}
          <Button
            on:click={() => showCreateModal = true}
            class="mt-4 bg-green-500 hover:bg-green-600 text-white h-10 px-4 rounded-md"
          >
            Create First Contract
          </Button>
        {/if}
      </div>
    {:else}
      <div class="space-y-4">
        {#each filteredContracts as contract}
          <div class="bg-white/5 rounded-xl border border-white/20 p-6 hover:bg-white/10 transition-all">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-3">
                  <svelte:component this={getStatusIcon(contract.status)} class="w-5 h-5 text-white/70" />
                  <h3 class="text-lg font-bold text-white">{contract.title}</h3>
                  <span class="px-3 py-1 rounded-full text-xs font-semibold {getStatusColor(contract.status)}">
                    {contract.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {#if contract.description}
                  <p class="text-white/70 text-sm mb-3">{contract.description}</p>
                {/if}

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span class="text-white/50">Student:</span>
                    <p class="text-white">{contract.student_name}</p>
                  </div>
                  <div>
                    <span class="text-white/50">Mentor:</span>
                    <p class="text-white">{contract.mentor_name}</p>
                  </div>
                  <div>
                    <span class="text-white/50">Hours:</span>
                    <p class="text-white">{contract.contract_hours}h</p>
                  </div>
                  <div>
                    <span class="text-white/50">Period:</span>
                    <p class="text-white">
                      {contract.start_date ? format(new Date(contract.start_date), 'MMM dd') : 'TBD'} - 
                      {contract.end_date ? format(new Date(contract.end_date), 'MMM dd, yyyy') : 'TBD'}
                    </p>
                  </div>
                </div>
              </div>

              <div class="flex gap-2 ml-4">
                <Button
                  on:click={() => viewContract(contract)}
                  class="bg-blue-500 hover:bg-blue-600 text-white h-9 px-3 rounded-md"
                >
                  <Eye class="w-4 h-4" />
                </Button>
                {#if (userRole === 'admin' || userRole === 'mentor') && contract.status === 'draft'}
                  <Button
                    on:click={() => deleteContract(contract.id)}
                    class="bg-red-500 hover:bg-red-600 text-white h-9 px-3 rounded-md"
                  >
                    <Trash2 class="w-4 h-4" />
                  </Button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Create Contract Modal -->
{#if showCreateModal}
  <Dialog bind:open={showCreateModal}>
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-900 rounded-xl border border-white/20 p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold text-white mb-6">Create New Contract</h2>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/70 text-sm block mb-2">Contract Title *</label>
              <Input
                bind:value={newContract.title}
                placeholder="e.g., Software Engineering Internship"
                class="w-full"
              />
            </div>
            <div>
              <label class="text-white/70 text-sm block mb-2">Contract Hours *</label>
              <Input
                bind:value={newContract.contract_hours}
                type="number"
                placeholder="600"
                class="w-full"
              />
            </div>
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Description</label>
            <textarea
              bind:value={newContract.description}
              rows="2"
              placeholder="Brief description of the internship..."
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/70 text-sm block mb-2">Student Email *</label>
              {#if userRole === 'admin'}
                <Input
                  bind:value={newContract.student_email}
                  type="email"
                  placeholder="student@example.com"
                  class="w-full"
                />
              {:else}
                <select
                  bind:value={newContract.student_email}
                  on:change={onStudentSelect}
                  class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
                >
                  <option value="">Select student...</option>
                  {#each students as student}
                    <option value={student.student_email}>
                      {student.full_name} ({student.student_email})
                    </option>
                  {/each}
                </select>
              {/if}
            </div>
            <div>
              <label class="text-white/70 text-sm block mb-2">Student Name *</label>
              <Input
                bind:value={newContract.student_name}
                placeholder="Student full name"
                class="w-full"
              />
            </div>
          </div>

          {#if userRole === 'admin'}
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-white/70 text-sm block mb-2">Mentor Email</label>
                <Input
                  bind:value={newContract.mentor_email}
                  type="email"
                  placeholder="mentor@example.com"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-white/70 text-sm block mb-2">Mentor Name</label>
                <Input
                  bind:value={newContract.mentor_name}
                  placeholder="Mentor full name"
                  class="w-full"
                />
              </div>
            </div>

            {#if tasks.length > 0}
              <div>
                <label class="text-white/70 text-sm block mb-2">Assign Task (Optional)</label>
                <select
                  bind:value={newContract.assigned_task_id}
                  class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
                >
                  <option value={null}>No task</option>
                  {#each tasks as task}
                    <option value={task.id}>{task.title}</option>
                  {/each}
                </select>
              </div>
            {/if}
          {/if}

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/70 text-sm block mb-2">Start Date</label>
              <Input
                bind:value={newContract.start_date}
                type="date"
                class="w-full"
              />
            </div>
            <div>
              <label class="text-white/70 text-sm block mb-2">End Date</label>
              <Input
                bind:value={newContract.end_date}
                type="date"
                class="w-full"
              />
            </div>
          </div>

          <!-- Additional Contract Fields -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/70 text-sm block mb-2">Work Area</label>
              <Input
                bind:value={newContract.work_area}
                placeholder="e.g., Software Development"
                class="w-full"
              />
            </div>
            <div>
              <label class="text-white/70 text-sm block mb-2">Weekly Hours</label>
              <Input
                bind:value={newContract.weekly_hours}
                type="number"
                placeholder="40"
                class="w-full"
              />
            </div>
          </div>

          <div>
            <label class="text-white/70 text-sm block mb-2">Work Description</label>
            <textarea
              bind:value={newContract.work_description}
              rows="2"
              placeholder="Detailed description of tasks and responsibilities..."
              class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-white/70 text-sm block mb-2">Company Name</label>
              <Input
                bind:value={newContract.company_name}
                placeholder="e.g., Tech Solutions GmbH"
                class="w-full"
              />
            </div>
            <div>
              <label class="text-white/70 text-sm block mb-2">Company Address</label>
              <Input
                bind:value={newContract.company_address}
                placeholder="Street, City, ZIP"
                class="w-full"
              />
            </div>
          </div>

          <!-- Contract Paragraphs -->
          <div class="border-t border-white/20 pt-6 mt-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-xl font-bold text-white">Contract Paragraphs (Bilingual)</h3>
                <p class="text-white/60 text-sm">Edit German and English versions of each paragraph</p>
              </div>
              <Button
                on:click={() => showPlaceholderGuide = true}
                variant="outline"
                class="text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
              >
                <HelpCircle class="w-4 h-4 mr-2" />
                Placeholders
              </Button>
            </div>

            <div class="space-y-4 max-h-96 overflow-y-auto pr-2">
              {#each newContract.paragraphs as paragraph, index}
                <div class="relative">
                  <ParagraphEditor
                    {paragraph}
                    {index}
                    onUpdate={updateParagraph}
                  />
                  {#if newContract.paragraphs.length > 1}
                    <Button
                      on:click={() => removeParagraph(index)}
                      class="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white h-8 w-8 p-0 rounded-md flex items-center px-1 justify-center"
                    >
                      <X class="w-4 h-4" />
                    </Button>
                  {/if}
                </div>
              {/each}
            </div>

            <Button
              on:click={addParagraph}
              class="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white h-10 rounded-md items-center flex justify-center"
            >
              <Plus class="w-4 h-4 mr-2" />
              Add Paragraph
            </Button>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <Button
            on:click={previewContract}
            class="bg-amber-500 hover:bg-amber-600 text-white h-10 px-4 rounded-md flex items-center"
          >
            <Eye class="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            on:click={createContract}
            class="flex-1 bg-green-500 hover:bg-green-600 text-white h-10 justify-center flex items-center rounded-md"
            disabled={!newContract.title || !newContract.student_email || !newContract.student_name}
          >
            <FilePlus class="w-4 h-4 mr-2" />
            Create Contract
          </Button>
          <Button
            on:click={() => { showCreateModal = false; resetForm(); }}
            variant="ghost"
            class="text-white/70 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  </Dialog>
{/if}

<!-- View/Action Contract Modal -->
{#if showViewModal && selectedContract}
  <Dialog bind:open={showViewModal}>
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-900 rounded-xl border border-white/20 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex items-start justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">{selectedContract.title}</h2>
            <span class="px-3 py-1 rounded-full text-xs font-semibold {getStatusColor(selectedContract.status)}">
              {selectedContract.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        <!-- Contract Details -->
        <div class="bg-white/5 rounded-lg p-6 mb-6">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <p class="text-white/50 text-sm">Student</p>
              <p class="text-white font-semibold">{selectedContract.student_name}</p>
              <p class="text-white/70 text-xs">{selectedContract.student_email}</p>
            </div>
            <div>
              <p class="text-white/50 text-sm">Mentor</p>
              <p class="text-white font-semibold">{selectedContract.mentor_name}</p>
              <p class="text-white/70 text-xs">{selectedContract.mentor_email}</p>
            </div>
            <div>
              <p class="text-white/50 text-sm">Hours</p>
              <p class="text-white font-semibold">{selectedContract.contract_hours} hours</p>
            </div>
            <div>
              <p class="text-white/50 text-sm">Period</p>
              <p class="text-white font-semibold">
                {selectedContract.start_date ? format(new Date(selectedContract.start_date), 'MMM dd') : 'TBD'} - 
                {selectedContract.end_date ? format(new Date(selectedContract.end_date), 'MMM dd, yyyy') : 'TBD'}
              </p>
            </div>
          </div>

          <!-- Contract Terms -->
          <div class="border-t border-white/10 pt-6">
            <h3 class="text-white font-bold mb-3">Contract Terms & Conditions</h3>
            <div class="bg-white/5 rounded-lg p-4 max-h-64 overflow-y-auto">
              <pre class="text-white/70 text-sm whitespace-pre-wrap font-sans">{selectedContract.terms}</pre>
            </div>
          </div>

          <!-- Signatures -->
          {#if selectedContract.student_signature || selectedContract.mentor_signature}
            <div class="border-t border-white/10 pt-6 mt-6">
              <h3 class="text-white font-bold mb-4">Signatures</h3>
              <div class="grid grid-cols-2 gap-6">
                {#if selectedContract.student_signature}
                  <div class="bg-white/5 rounded-lg p-4">
                    <p class="text-white/50 text-xs mb-2">Student Signature</p>
                    <p class="text-white font-semibold text-lg italic">{selectedContract.student_signature}</p>
                    <p class="text-white/70 text-xs mt-2">
                      Signed on {selectedContract.student_signed_date ? format(new Date(selectedContract.student_signed_date), 'MMM dd, yyyy') : 'N/A'}
                    </p>
                  </div>
                {/if}
                {#if selectedContract.mentor_signature}
                  <div class="bg-white/5 rounded-lg p-4">
                    <p class="text-white/50 text-xs mb-2">Mentor Signature</p>
                    <p class="text-white font-semibold text-lg italic">{selectedContract.mentor_signature}</p>
                    <p class="text-white/70 text-xs mt-2">
                      Signed on {selectedContract.mentor_signed_date ? format(new Date(selectedContract.mentor_signed_date), 'MMM dd, yyyy') : 'N/A'}
                    </p>
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Admin Notes or Rejection Reason -->
          {#if selectedContract.admin_notes}
            <div class="border-t border-white/10 pt-6 mt-6">
              <p class="text-white/50 text-sm mb-2">Admin Notes</p>
              <p class="text-white">{selectedContract.admin_notes}</p>
            </div>
          {/if}
          {#if selectedContract.rejection_reason}
            <div class="border-t border-white/10 pt-6 mt-6">
              <p class="text-red-400 text-sm mb-2">Rejection Reason</p>
              <p class="text-white">{selectedContract.rejection_reason}</p>
            </div>
          {/if}
        </div>

        <!-- Actions based on role and status -->
        <div class="space-y-4">
          {#if userRole === 'student' && selectedContract.status === 'student_review'}
            <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p class="text-blue-200 mb-4">Please review and sign this contract</p>
              <Input
                bind:value={signatureText}
                placeholder="Type your full name as signature"
                class="mb-3"
              />
              <Button
                on:click={() => signAsStudent(selectedContract)}
                class="w-full bg-blue-500 hover:bg-blue-600 text-white h-10 justify-center flex items-center rounded-md"
                disabled={!signatureText.trim()}
              >
                <FileSignature class="w-4 h-4 mr-2" />
                Sign Contract
              </Button>
            </div>
          {/if}

          {#if userRole === 'mentor' && selectedContract.status === 'mentor_review'}
            <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p class="text-yellow-200 mb-4">Student has signed. Review and submit to admin.</p>
              <Input
                bind:value={signatureText}
                placeholder="Type your full name as signature"
                class="mb-3"
              />
              <Button
                on:click={() => submitToAdmin(selectedContract)}
                class="w-full bg-yellow-500 hover:bg-yellow-600 text-white h-10 justify-center flex items-center rounded-md"
                disabled={!signatureText.trim()}
              >
                <Send class="w-4 h-4 mr-2" />
                Submit to Admin
              </Button>
            </div>
          {/if}

          {#if userRole === 'admin' && selectedContract.status === 'pending_approval'}
            <div class="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <p class="text-purple-200 mb-4">Review and approve or reject this contract</p>
              <textarea
                bind:value={adminNotes}
                rows="3"
                placeholder="Admin notes (optional)"
                class="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white mb-3"
              />
              <div class="flex gap-3">
                <Button
                  on:click={() => approveContract(selectedContract)}
                  class="flex-1 bg-green-500 hover:bg-green-600 text-white h-10 justify-center flex items-center rounded-md"
                >
                  <CheckCircle class="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  on:click={() => {
                    rejectionReason = prompt('Rejection reason:') || '';
                    if (rejectionReason) rejectContract(selectedContract);
                  }}
                  class="flex-1 bg-red-500 hover:bg-red-600 text-white h-10 justify-center flex items-center rounded-md"
                >
                  <X class="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          {/if}
        </div>

        <div class="flex justify-end mt-6">
          <Button
            on:click={() => { showViewModal = false; selectedContract = null; signatureText = ''; adminNotes = ''; }}
            variant="ghost"
            class="text-white/70 hover:text-white  h-10 rounded-md items-center flex justify-center"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  </Dialog>
{/if}

<!-- Preview Modal -->
{#if showPreviewModal}
  <ContractPreview
    template={newContract}
    onClose={() => showPreviewModal = false}
  />
{/if}

<!-- Placeholder Guide Modal -->
{#if showPlaceholderGuide}
  <PlaceholderGuide onClose={() => showPlaceholderGuide = false} />
{/if}
