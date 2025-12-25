<script>
  import { Download, Pencil, Trash2, ArrowLeft } from 'lucide-svelte';
  import { InternCertificate } from '../../entities/all';
  import CertificateDocument from '../components/certificates/CertificateDocument.svelte';

  export let certificate;
  export let onBack;

  async function exportToPDF() {
    window.print();
  }

  async function handleDelete() {
    if (confirm('Are you sure you want to delete this certificate? This action cannot be undone.')) {
      try {
        await InternCertificate.delete(certificate.id);
        alert('Certificate deleted successfully.');
        onBack();
      } catch (error) {
        console.error('Failed to delete certificate:', error);
        alert('Failed to delete certificate.');
      }
    }
  }

  function handleEdit() {
    // Trigger parent to switch to edit mode
    if (window.editCertificate) {
      window.editCertificate(certificate);
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
          <h1 class="text-3xl font-bold text-white mb-2">
            Certificate #{certificate.certificate_number}
          </h1>
          <p class="text-white/70">{certificate.student_name} - {certificate.company_name}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          on:click={exportToPDF}
          class="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 p-3 text-white rounded-lg transition-all"
          title="Download PDF"
        >
          <Download class="w-4 h-4" />
        </button>
        <button
          on:click={handleEdit}
          class="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 p-3 text-white rounded-lg transition-all"
          title="Edit Certificate"
        >
          <Pencil class="w-5 h-5" />
        </button>
        <button
          on:click={handleDelete}
          class="bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm border border-red-400/20 p-3 text-red-400 rounded-lg transition-all"
          title="Delete Certificate"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  <!-- Certificate Document -->
  <CertificateDocument {certificate} />
</div>
