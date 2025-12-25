<script>
  import { ArrowLeft } from 'lucide-svelte';
  import { InternCertificate } from '../../entities/all';
  import CertificateForm from '../components/certificates/CertificateForm.svelte';

  export let onBack;

  const newCertificate = {
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

  async function handleSaveCertificate(certificateData) {
    try {
      await InternCertificate.create(certificateData);
      alert('Certificate created successfully!');
      onBack();
    } catch (error) {
      console.error("Failed to create certificate:", error);
      throw error;
    }
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
    <div class="flex items-center gap-4">
      <button
        on:click={onBack}
        class="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 p-3 text-white rounded-lg transition-all"
        title="Back to List"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div>
        <h1 class="text-3xl font-bold text-white mb-2">Create New Certificate</h1>
        <p class="text-white/70">Fill in the details to generate an internship completion certificate.</p>
      </div>
    </div>
  </div>

  <!-- Form -->
  <CertificateForm certificate={newCertificate} onSave={handleSaveCertificate} />
</div>
