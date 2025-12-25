<script>
  import { Trash2, ArrowLeft } from 'lucide-svelte';
  import { InternCertificate } from '../../entities/all';
  import CertificateForm from '../components/certificates/CertificateForm.svelte';

  export let certificate;
  export let onBack;

  async function handleSaveCertificate(certificateData) {
    try {
      await InternCertificate.update(certificate.id, certificateData);
      alert('Certificate updated successfully!');
      onBack();
    } catch (error) {
      console.error("Failed to update certificate:", error);
      throw error;
    }
  }

  async function handleDeleteCertificate() {
    if (confirm("Are you sure you want to delete this certificate? This action cannot be undone.")) {
      try {
        await InternCertificate.delete(certificate.id);
        alert('Certificate deleted successfully.');
        onBack();
      } catch (error) {
        console.error("Failed to delete certificate:", error);
        alert('Failed to delete certificate.');
      }
    }
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 p-6">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div class="flex items-center gap-4">
        <button
          on:click={onBack}
          class="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 p-3 text-white rounded-lg transition-all"
          title="Back to List"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Edit Certificate #{certificate.certificate_number}</h1>
          <p class="text-white/70">Update the details for this internship certificate.</p>
        </div>
      </div>
      <button
        on:click={handleDeleteCertificate}
        class="bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm border border-red-400/20 p-3 text-red-400 rounded-lg transition-all"
        title="Delete Certificate"
      >
        <Trash2 class="w-5 h-5" />
      </button>
    </div>
  </div>

  <!-- Form -->
  <CertificateForm {certificate} onSave={handleSaveCertificate} />
</div>
