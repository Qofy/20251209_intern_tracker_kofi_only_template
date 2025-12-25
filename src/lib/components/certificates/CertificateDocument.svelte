<script>
  import { format } from 'date-fns';

  export let certificate;
</script>

<svelte:head>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; }
      .no-print { display: none !important; }
      @page { size: landscape; margin: 0.5in; }
    }
  </style>
</svelte:head>

<div class="bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 print:shadow-none print:bg-white" id="certificate-document">
  <!-- A4 Horizontal Certificate Layout -->
  <div class="w-full h-[8.27in] relative bg-white print:bg-white" style="aspect-ratio: 11.7/8.27;">

    <!-- Decorative Border -->
    <div class="absolute inset-4 border-8 border-double border-gray-800">
      <div class="absolute inset-2 border-2 border-gray-600">

        <!-- Certificate Content -->
        <div class="h-full flex flex-col justify-between p-8 text-center">

          <!-- Header -->
          <div class="space-y-4">
            {#if certificate.company_logo_url}
              <div class="flex justify-center mb-6">
                <img
                  src={certificate.company_logo_url}
                  alt="Company Logo"
                  class="max-h-16 max-w-32 object-contain"
                />
              </div>
            {/if}

            <h1 class="text-5xl font-serif font-bold text-gray-800 mb-2">
              CERTIFICATE
            </h1>
            <h2 class="text-2xl font-serif text-gray-600 mb-4">
              of Internship Completion
            </h2>

            <div class="w-32 h-1 bg-gray-600 mx-auto"></div>
          </div>

          <!-- Main Content -->
          <div class="flex-1 flex flex-col justify-center space-y-6 py-8">
            <p class="text-xl text-gray-700 leading-relaxed">
              This is to certify that
            </p>

            <h3 class="text-4xl font-serif font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mx-16">
              {certificate.student_name}
            </h3>

            <div class="text-lg text-gray-700 leading-relaxed max-w-4xl mx-auto">
              <p class="mb-4">
                has successfully completed an internship program at <strong>{certificate.company_name}</strong>
              </p>

              <p class="mb-4">
                for a total of <strong>{certificate.total_hours} hours</strong> from{' '}
                <strong>{format(new Date(certificate.start_date), 'MMMM d, yyyy')}</strong> to{' '}
                <strong>{format(new Date(certificate.end_date), 'MMMM d, yyyy')}</strong>
              </p>

              <div class="text-base bg-gray-50 p-4 rounded-lg border">
                <p class="font-semibold mb-2 text-gray-800">Tasks and Responsibilities:</p>
                <p class="text-left">{certificate.tasks_description}</p>
              </div>
            </div>
          </div>

          <!-- Footer with Signatures -->
          <div class="space-y-6">
            <div class="grid grid-cols-2 gap-12 max-w-2xl mx-auto">
              <!-- Date -->
              <div class="text-center">
                <div class="border-b-2 border-gray-300 pb-1 mb-2">
                  <p class="text-lg font-semibold">
                    {certificate.issued_date ? format(new Date(certificate.issued_date), 'MMMM d, yyyy') : format(new Date(), 'MMMM d, yyyy')}
                  </p>
                </div>
                <p class="text-sm text-gray-600">Date</p>
              </div>

              <!-- Supervisor Signature -->
              <div class="text-center">
                <div class="border-b-2 border-gray-300 pb-1 mb-2 h-16 flex items-end justify-center">
                  {#if certificate.supervisor_signature_url}
                    <img
                      src={certificate.supervisor_signature_url}
                      alt="Supervisor Signature"
                      class="max-h-12 max-w-32 object-contain"
                    />
                  {:else}
                    <div class="h-12"></div>
                  {/if}
                </div>
                <div class="text-sm">
                  {#if certificate.supervisor_name}
                    <p class="font-semibold">{certificate.supervisor_name}</p>
                  {/if}
                  {#if certificate.supervisor_title}
                    <p class="text-gray-600">{certificate.supervisor_title}</p>
                  {/if}
                  {#if !certificate.supervisor_name && !certificate.supervisor_title}
                    <p class="text-gray-600">Authorized Signature</p>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Certificate Number -->
            <div class="pt-4 border-t border-gray-200">
              <p class="text-xs text-gray-500">
                Certificate No: {certificate.certificate_number}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Decorative Corner Elements -->
    <div class="absolute top-8 left-8 w-8 h-8">
      <div class="w-full h-full border-l-4 border-t-4 border-gray-600"></div>
    </div>
    <div class="absolute top-8 right-8 w-8 h-8">
      <div class="w-full h-full border-r-4 border-t-4 border-gray-600"></div>
    </div>
    <div class="absolute bottom-8 left-8 w-8 h-8">
      <div class="w-full h-full border-l-4 border-b-4 border-gray-600"></div>
    </div>
    <div class="absolute bottom-8 right-8 w-8 h-8">
      <div class="w-full h-full border-r-4 border-b-4 border-gray-600"></div>
    </div>
  </div>
</div>
