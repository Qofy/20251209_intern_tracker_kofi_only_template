<script>
  import { Save, Upload, User, Building, Clock, Calendar, FileText, UserCheck } from 'lucide-svelte';
  import apiClient from '../../../api/client';

  export let certificate = {
    student_name: '',
    company_name: '',
    total_hours: '',
    start_date: '',
    end_date: '',
    tasks_description: '',
    company_logo_url: '',
    supervisor_name: '',
    supervisor_title: '',
    supervisor_signature_url: '',
    issued_date: ''
  };
  export let onSave;

  let saving = false;
  let uploading = false;
  let fieldErrors = {};

  async function handleFileUpload(event, fieldName) {
    const file = event.target.files[0];
    if (!file) return;

    uploading = true;
    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await apiClient.uploadFiles([file]);
      if (response && response.length > 0) {
        certificate = { ...certificate, [fieldName]: response[0].file_url };
      }
    } catch (error) {
      console.error('File upload failed:', error);
      alert('File upload failed. Please try again.');
    } finally {
      uploading = false;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validation
    fieldErrors = {};
    if (!certificate.student_name?.trim()) fieldErrors.student_name = "Student name is required";
    if (!certificate.company_name?.trim()) fieldErrors.company_name = "Company name is required";
    if (!certificate.total_hours) fieldErrors.total_hours = "Total hours are required";
    if (!certificate.start_date) fieldErrors.start_date = "Start date is required";
    if (!certificate.end_date) fieldErrors.end_date = "End date is required";
    if (!certificate.tasks_description?.trim()) fieldErrors.tasks_description = "Tasks description is required";

    if (Object.keys(fieldErrors).length) {
      alert("Validation failed. Please fix highlighted fields.");
      return;
    }

    saving = true;
    try {
      await onSave(certificate);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save certificate');
    } finally {
      saving = false;
    }
  }
</script>

<form on:submit={handleSubmit} class="space-y-6">
  <!-- Student Information -->
  <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      <User class="w-5 h-5" />
      Student Information
    </h3>
    <div class="grid md:grid-cols-2 gap-6">
      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm font-medium text-white">
          <User class="w-4 h-4"/>
          Student Full Name *
        </label>
        <div class="bg-white/5 p-3 rounded-lg relative {fieldErrors.student_name ? 'border-2 border-red-500' : 'border border-white/10'}">
          <span class="absolute right-2 top-2 text-[11px] font-semibold {fieldErrors.student_name ? 'text-red-400' : 'text-white/60'}">
            {fieldErrors.student_name ? 'error' : 'required'}
          </span>
          <input
            type="text"
            required
            bind:value={certificate.student_name}
            class="w-full bg-transparent outline-none text-white placeholder-white/50"
            placeholder="John Doe"
          />
        </div>
        {#if fieldErrors.student_name}
          <p class="text-xs text-red-400">{fieldErrors.student_name}</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Company Information -->
  <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      <Building class="w-5 h-5" />
      Company Information
    </h3>
    <div class="grid md:grid-cols-2 gap-6">
      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm font-medium text-white">
          <Building class="w-4 h-4"/>
          Company Name *
        </label>
        <div class="bg-white/5 p-3 rounded-lg relative {fieldErrors.company_name ? 'border-2 border-red-500' : 'border border-white/10'}">
          <span class="absolute right-2 top-2 text-[11px] font-semibold {fieldErrors.company_name ? 'text-red-400' : 'text-white/60'}">
            {fieldErrors.company_name ? 'error' : 'required'}
          </span>
          <input
            type="text"
            required
            bind:value={certificate.company_name}
            class="w-full bg-transparent outline-none text-white placeholder-white/50"
            placeholder="ABC Corporation"
          />
        </div>
        {#if fieldErrors.company_name}
          <p class="text-xs text-red-400">{fieldErrors.company_name}</p>
        {/if}
      </div>

      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm font-medium text-white">
          <Upload class="w-4 h-4"/>
          Company Logo
        </label>
        <div class="bg-white/5 p-3 rounded-lg border border-white/10">
          <input
            type="file"
            accept="image/*"
            on:change={(e) => handleFileUpload(e, 'company_logo_url')}
            class="w-full bg-transparent outline-none text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
            disabled={uploading}
          />
          {#if certificate.company_logo_url}
            <div class="mt-2">
              <img src={certificate.company_logo_url} alt="Company Logo" class="h-12 w-auto" />
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Internship Details -->
  <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      <Clock class="w-5 h-5" />
      Internship Details
    </h3>
    <div class="grid md:grid-cols-3 gap-6 mb-6">
      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm font-medium text-white">
          <Clock class="w-4 h-4"/>
          Total Hours *
        </label>
        <div class="bg-white/5 p-3 rounded-lg relative {fieldErrors.total_hours ? 'border-2 border-red-500' : 'border border-white/10'}">
          <span class="absolute right-2 top-2 text-[11px] font-semibold {fieldErrors.total_hours ? 'text-red-400' : 'text-white/60'}">
            {fieldErrors.total_hours ? 'error' : 'required'}
          </span>
          <input
            type="number"
            required
            bind:value={certificate.total_hours}
            class="w-full bg-transparent outline-none text-white placeholder-white/50"
            placeholder="120"
          />
        </div>
        {#if fieldErrors.total_hours}
          <p class="text-xs text-red-400">{fieldErrors.total_hours}</p>
        {/if}
      </div>

      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm font-medium text-white">
          <Calendar class="w-4 h-4"/>
          Start Date *
        </label>
        <div class="bg-white/5 p-3 rounded-lg relative {fieldErrors.start_date ? 'border-2 border-red-500' : 'border border-white/10'}">
          <span class="absolute right-2 top-2 text-[11px] font-semibold {fieldErrors.start_date ? 'text-red-400' : 'text-white/60'}">
            {fieldErrors.start_date ? 'error' : 'required'}
          </span>
          <input
            type="date"
            required
            bind:value={certificate.start_date}
            class="w-full bg-transparent outline-none text-white"
          />
        </div>
        {#if fieldErrors.start_date}
          <p class="text-xs text-red-400">{fieldErrors.start_date}</p>
        {/if}
      </div>

      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm font-medium text-white">
          <Calendar class="w-4 h-4"/>
          End Date *
        </label>
        <div class="bg-white/5 p-3 rounded-lg relative {fieldErrors.end_date ? 'border-2 border-red-500' : 'border border-white/10'}">
          <span class="absolute right-2 top-2 text-[11px] font-semibold {fieldErrors.end_date ? 'text-red-400' : 'text-white/60'}">
            {fieldErrors.end_date ? 'error' : 'required'}
          </span>
          <input
            type="date"
            required
            bind:value={certificate.end_date}
            class="w-full bg-transparent outline-none text-white"
          />
        </div>
        {#if fieldErrors.end_date}
          <p class="text-xs text-red-400">{fieldErrors.end_date}</p>
        {/if}
      </div>
    </div>

    <div class="space-y-2">
      <label class="flex items-center gap-2 text-sm font-medium text-white">
        <FileText class="w-4 h-4"/>
        Tasks Description *
      </label>
      <div class="bg-white/5 p-3 rounded-lg border border-white/10">
        <textarea
          required
          bind:value={certificate.tasks_description}
          class="w-full bg-transparent outline-none text-white h-32 placeholder-white/50"
          placeholder="Describe the main tasks and responsibilities performed during the internship..."
        />
      </div>
    </div>
  </div>

  <!-- Supervisor Information -->
  <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      <UserCheck class="w-5 h-5" />
      Supervisor Information
    </h3>
    <div class="grid md:grid-cols-2 gap-6">
      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm font-medium text-white">
          <UserCheck class="w-4 h-4"/>
          Supervisor Name
        </label>
        <div class="bg-white/5 p-3 rounded-lg border border-white/10">
          <input
            type="text"
            bind:value={certificate.supervisor_name}
            class="w-full bg-transparent outline-none text-white placeholder-white/50"
            placeholder="Jane Smith"
          />
        </div>
      </div>

      <div class="space-y-2">
        <label class="flex items-center gap-2 text-sm font-medium text-white">
          <Building class="w-4 h-4"/>
          Supervisor Title
        </label>
        <div class="bg-white/5 p-3 rounded-lg border border-white/10">
          <input
            type="text"
            bind:value={certificate.supervisor_title}
            class="w-full bg-transparent outline-none text-white placeholder-white/50"
            placeholder="HR Manager"
          />
        </div>
      </div>

      <div class="space-y-2 md:col-span-2">
        <label class="flex items-center gap-2 text-sm font-medium text-white">
          <Upload class="w-4 h-4"/>
          Supervisor Signature
        </label>
        <div class="bg-white/5 p-3 rounded-lg border border-white/10">
          <input
            type="file"
            accept="image/*"
            on:change={(e) => handleFileUpload(e, 'supervisor_signature_url')}
            class="w-full bg-transparent outline-none text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
            disabled={uploading}
          />
          {#if certificate.supervisor_signature_url}
            <div class="mt-2">
              <img src={certificate.supervisor_signature_url} alt="Supervisor Signature" class="h-16 w-auto" />
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Actions -->
  <div class="flex justify-end pt-4">
    <button
      type="submit"
      disabled={saving || uploading}
      class="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 px-8 py-3 text-white font-semibold flex items-center gap-2 disabled:opacity-50 rounded-lg transition-all"
    >
      <Save class="w-5 h-5"/>
      {saving ? 'Saving...' : 'Save Certificate'}
    </button>
  </div>
</form>
