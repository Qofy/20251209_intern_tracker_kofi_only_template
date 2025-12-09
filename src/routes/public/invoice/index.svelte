<script>
  import { onMount } from 'svelte';
  import { page } from '@roxi$lib/routify-adapter.js';
  import { Invoice, Company } from '$lib/entities/all';
  import {
    CheckCircle,
    AlertCircle,
    Download,
    Calendar,
    Mail,
    Phone,
    MapPin,
    Globe,
    FileText,
    DollarSign,
    CreditCard,
    Check,
    X,
    MessageSquare,
    Send
  } from 'lucide-svelte';
  import { jsPDF } from 'jspdf';

  // Get token from URL query string
  let token = null;

  let invoice = null;
  let company = null;
  let loading = true;
  let error = null;

  // Action state
  let comment = '';
  let authorName = '';
  let submitting = false;
  let approvalStatus = null;
  let showComments = false;

  async function loadData() {
    loading = true;
    error = null;
    try {
      // Use Invoice.get() directly with the token (which is the invoice ID)
      const invoiceItem = await Invoice.get(token);

      if (!invoiceItem) {
        error = 'Invoice not found or invalid link.';
        loading = false;
        return;
      }

      invoice = invoiceItem;

      // Load company data
      const companyData = await Company.filter({ is_default: true });
      if (companyData.length > 0) {
        company = companyData[0];
      }
    } catch (err) {
      console.error('Error loading data:', err);
      error = 'Failed to load invoice. Please try again later.';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      token = urlParams.get('token');

      if (token) {
        loadData();
      } else {
        error = 'No invoice token provided.';
        loading = false;
      }
    }
  });

  async function handleAction(action, name) {
    if (!name.trim()) {
      alert('Please provide your name');
      return;
    }

    if (!confirm(`Are you sure you want to ${action} this invoice?`)) return;

    submitting = true;
    try {
      await Invoice.update(invoice.id, {
        status: action === 'approve' ? 'pending_payment' : 'rejected',
        approved_by: action === 'approve' ? name : null,
        approved_date: action === 'approve' ? new Date().toISOString() : null,
        rejected_by: action === 'reject' ? name : null,
        rejected_date: action === 'reject' ? new Date().toISOString() : null
      });
      approvalStatus = action === 'approve' ? 'approved' : 'rejected';
      loadData();
    } catch (err) {
      console.error(`Failed to ${action} invoice:`, err);
      alert(`Failed to ${action} invoice. Please try again.`);
    } finally {
      submitting = false;
    }
  }

  function handleApprove() {
    const name = prompt('Please enter your name to approve this invoice:');
    if (name) handleAction('approve', name);
  }

  function handleReject() {
    const name = prompt('Please enter your name to reject this invoice:');
    if (name) handleAction('reject', name);
  }

  async function handleCommentSubmit(e) {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) {
      alert('Please provide your name and a comment.');
      return;
    }
    submitting = true;
    try {
      const updatedComments = [
        ...(invoice.comments || []),
        {
          author_name: authorName,
          author_role: 'customer',
          comment: comment,
          created_date: new Date().toISOString()
        }
      ];
      await Invoice.update(invoice.id, { comments: updatedComments });
      comment = '';
      authorName = '';
      loadData();
    } catch (err) {
      console.error('Failed to submit comment', err);
      alert('Failed to submit comment. Please try again.');
    } finally {
      submitting = false;
    }
  }

  function generatePaidInvoicePDF() {
    if (!invoice || !company) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add PAID watermark
    if (invoice.status === 'paid') {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.1 }));
      doc.setFontSize(80);
      doc.setTextColor(0, 128, 0);
      doc.text('PAID', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45
      });
      doc.restoreGraphicsState();
    }

    // Header
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text('INVOICE', 20, 20);

    doc.setFontSize(10);
    doc.text(`#${invoice.invoice_number}`, 20, 30);

    if (company?.name) {
      doc.text(company.name, pageWidth - 20, 20, { align: 'right' });
    }

    // Customer & Date Info
    doc.setFontSize(12);
    doc.text('Bill To:', 20, 50);
    doc.setFontSize(10);
    doc.text(invoice.customer_name, 20, 58);
    if (invoice.customer_email) {
      doc.text(invoice.customer_email, 20, 64);
    }

    doc.setFontSize(10);
    doc.text(
      `Issue Date: ${new Date(invoice.created_date).toLocaleDateString()}`,
      pageWidth - 20,
      50,
      { align: 'right' }
    );
    if (invoice.due_date) {
      doc.text(
        `Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`,
        pageWidth - 20,
        58,
        { align: 'right' }
      );
    }
    if (invoice.payment_date) {
      doc.setTextColor(0, 128, 0);
      doc.text(
        `Paid On: ${new Date(invoice.payment_date).toLocaleDateString()}`,
        pageWidth - 20,
        66,
        { align: 'right' }
      );
      doc.setTextColor(0, 0, 0);
    }

    // Title
    if (invoice.title) {
      doc.setFontSize(14);
      doc.text(invoice.title, 20, 80);
    }

    // Items table
    let yPos = 95;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Description', 20, yPos);
    doc.text('Qty', 110, yPos);
    doc.text('Price', 135, yPos);
    doc.text('Total', 165, yPos);
    doc.setFont(undefined, 'normal');

    yPos += 7;
    invoice.items?.forEach((item) => {
      doc.text(item.description.substring(0, 40), 20, yPos);
      doc.text(String(item.quantity), 110, yPos);
      doc.text(`$${item.unit_price.toFixed(2)}`, 135, yPos);
      doc.text(`$${(item.quantity * item.unit_price).toFixed(2)}`, 165, yPos);
      yPos += 7;
    });

    // Totals
    yPos += 10;
    doc.text('Subtotal:', 135, yPos);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, 165, yPos);

    if (invoice.tax_rate > 0) {
      yPos += 7;
      doc.text(`Tax (${invoice.tax_rate}%):`, 135, yPos);
      doc.text(`$${invoice.tax_amount.toFixed(2)}`, 165, yPos);
    }

    yPos += 7;
    doc.setFont(undefined, 'bold');
    doc.text('Total:', 135, yPos);
    doc.text(`$${invoice.total_amount.toFixed(2)}`, 165, yPos);

    if (invoice.paid_amount > 0) {
      yPos += 7;
      doc.setTextColor(0, 128, 0);
      doc.text('Paid:', 135, yPos);
      doc.text(`-$${invoice.paid_amount.toFixed(2)}`, 165, yPos);
      doc.setTextColor(0, 0, 0);
    }

    // Save PDF
    doc.save(`invoice-${invoice.invoice_number}.pdf`);
  }

  function getStatusBadge(status) {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      pending_payment: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-600'
    };

    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  $: isPaid = invoice && invoice.status === 'paid';
  $: balanceDue = invoice ? invoice.total_amount - (invoice.paid_amount || 0) : 0;
  $: isOverdue =
    invoice &&
    invoice.due_date &&
    invoice.status !== 'paid' &&
    new Date(invoice.due_date) < new Date();
  $: canApprove = invoice && (invoice.status === 'sent' || invoice.status === 'draft');
</script>

<svelte:head>
  <title>View Invoice - QuoteFlow</title>
</svelte:head>

{#if loading}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div
        class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
      ></div>
      <p class="text-gray-600">Loading invoice...</p>
    </div>
  </div>
{:else if error || !invoice}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center max-w-md">
      <div
        class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <AlertCircle class="w-8 h-8 text-red-600" />
      </div>
      <h1 class="text-xl font-semibold text-gray-900 mb-2">Invoice Not Available</h1>
      <p class="text-gray-600">{error}</p>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto p-6">
      <!-- Overdue Banner -->
      {#if isOverdue}
        <div class="bg-red-50 border-2 border-red-400 rounded-lg p-6 mb-6">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <AlertCircle class="w-6 h-6 text-red-600" />
            </div>
            <div class="flex-1">
              <h2 class="text-xl font-bold text-red-900 mb-2">Payment Overdue</h2>
              <p class="text-red-800 mb-2">
                This invoice was due on {new Date(invoice.due_date).toLocaleDateString()}.
              </p>
              <p class="text-red-700 text-sm">
                Please arrange payment as soon as possible. Contact us if you have any questions.
              </p>
            </div>
          </div>
        </div>
      {/if}

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <!-- Invoice Document -->
          <div class="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
            <!-- Header -->
            <div class="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
              <div>
                {#if company?.logo_url}
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    class="w-16 h-16 object-contain mb-4"
                  />
                {:else}
                  <div
                    class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4"
                  >
                    <div class="w-8 h-8 bg-gray-400 rounded"></div>
                  </div>
                {/if}
                <h1 class="text-xl font-bold text-gray-900 mb-1">
                  {company?.name || 'QuoteFlow'}
                </h1>
                {#if company?.contact?.email}
                  <p class="text-sm text-gray-600">{company.contact.email}</p>
                {/if}
              </div>
              <div class="text-right">
                <h2 class="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
                <p class="text-lg font-semibold text-gray-600">#{invoice.invoice_number}</p>
                <div class="mt-2">
                  <span
                    class={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(invoice.status)}`}
                  >
                    {invoice.status === 'pending_payment'
                      ? 'Pending Payment'
                      : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            <!-- Invoice Details -->
            <div class="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 class="font-semibold text-gray-900 mb-3">Bill To:</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="font-medium text-gray-900">{invoice.customer_name}</p>
                  {#if invoice.customer_email}
                    <p class="text-sm text-gray-600 mt-1">{invoice.customer_email}</p>
                  {/if}
                </div>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 mb-3">Invoice Details:</h3>
                <div class="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Issue Date:</span>
                    <span class="text-gray-900"
                      >{new Date(invoice.created_date).toLocaleDateString()}</span
                    >
                  </div>
                  {#if invoice.due_date}
                    <div class="flex justify-between">
                      <span class="text-gray-600">Due Date:</span>
                      <span class={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                        {new Date(invoice.due_date).toLocaleDateString()}
                        {#if isOverdue}(Overdue){/if}
                      </span>
                    </div>
                  {/if}
                  {#if invoice.payment_date}
                    <div class="flex justify-between">
                      <span class="text-gray-600">Paid On:</span>
                      <span class="text-green-600 font-semibold"
                        >{new Date(invoice.payment_date).toLocaleDateString()}</span
                      >
                    </div>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Invoice Title -->
            {#if invoice.title}
              <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-900">{invoice.title}</h3>
              </div>
            {/if}

            <!-- Items Table -->
            <div class="mb-8">
              <div class="bg-gray-50 rounded-lg overflow-hidden">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-gray-200">
                      <th class="text-left py-3 px-4 font-medium text-gray-900">Description</th>
                      <th class="text-center py-3 px-4 font-medium text-gray-900">Quantity</th>
                      <th class="text-right py-3 px-4 font-medium text-gray-900">Unit Price</th>
                      <th class="text-right py-3 px-4 font-medium text-gray-900">Total</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white">
                    {#each invoice.items || [] as item, index}
                      <tr class="border-b border-gray-100">
                        <td class="py-3 px-4 text-gray-900">{item.description}</td>
                        <td class="py-3 px-4 text-center text-gray-600">{item.quantity}</td>
                        <td class="py-3 px-4 text-right text-gray-600"
                          >${item.unit_price?.toFixed(2)}</td
                        >
                        <td class="py-3 px-4 text-right font-medium text-gray-900">
                          ${(item.quantity * item.unit_price)?.toFixed(2)}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Totals -->
            <div class="flex justify-end mb-8">
              <div class="w-64">
                <div class="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Subtotal:</span>
                    <span class="text-gray-900">${invoice.subtotal?.toFixed(2)}</span>
                  </div>
                  {#if invoice.tax_rate > 0}
                    <div class="flex justify-between">
                      <span class="text-gray-600">Tax ({invoice.tax_rate}%):</span>
                      <span class="text-gray-900">${invoice.tax_amount?.toFixed(2)}</span>
                    </div>
                  {/if}
                  <div class="border-t border-gray-200 pt-2 mt-2">
                    <div class="flex justify-between font-semibold text-lg">
                      <span class="text-gray-900">Total:</span>
                      <span class="text-gray-900">${invoice.total_amount?.toFixed(2)}</span>
                    </div>
                  </div>
                  {#if invoice.paid_amount > 0}
                    <div class="flex justify-between text-green-600">
                      <span>Paid:</span>
                      <span>-${invoice.paid_amount?.toFixed(2)}</span>
                    </div>
                    <div class="border-t border-gray-200 pt-2 mt-2">
                      <div class="flex justify-between font-semibold text-lg">
                        <span class="text-gray-900">Balance Due:</span>
                        <span
                          class={invoice.total_amount - invoice.paid_amount > 0
                            ? 'text-red-600'
                            : 'text-green-600'}
                        >
                          ${(invoice.total_amount - invoice.paid_amount)?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Notes -->
            {#if invoice.notes}
              <div class="mb-6">
                <h3 class="font-semibold text-gray-900 mb-2">Notes:</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              </div>
            {/if}

            <!-- Payment Terms -->
            {#if invoice.payment_terms}
              <div class="mb-6">
                <h3 class="font-semibold text-gray-900 mb-2">Payment Terms:</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="text-gray-700">{invoice.payment_terms}</p>
                </div>
              </div>
            {/if}

            <!-- Company Details -->
            {#if company}
              <div class="border-t border-gray-200 pt-6 text-center text-sm text-gray-600">
                <div class="flex justify-center items-center gap-6 mb-2">
                  {#if company.contact?.email}
                    <div class="flex items-center gap-1">
                      <Mail class="w-4 h-4" />
                      <span>{company.contact.email}</span>
                    </div>
                  {/if}
                  {#if company.contact?.phone}
                    <div class="flex items-center gap-1">
                      <Phone class="w-4 h-4" />
                      <span>{company.contact.phone}</span>
                    </div>
                  {/if}
                  {#if company.contact?.website}
                    <div class="flex items-center gap-1">
                      <Globe class="w-4 h-4" />
                      <a
                        href={company.contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-blue-600 hover:text-blue-700"
                      >
                        Website
                      </a>
                    </div>
                  {/if}
                </div>
                {#if company.address}
                  <div class="flex items-center justify-center gap-1">
                    <MapPin class="w-4 h-4" />
                    <span>
                      {[
                        company.address.street,
                        company.address.city,
                        company.address.state,
                        company.address.zip,
                        company.address.country
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                {/if}
                <p class="mt-2">Thank you for your business!</p>
              </div>
            {/if}
          </div>
        </div>

        <div>
          <!-- Payment Status -->
          <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-6">
            {#if approvalStatus === 'approved'}
              <div class="text-center">
                <div
                  class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center"
                >
                  <CheckCircle class="w-8 h-8 text-green-600" />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Invoice Approved!</h3>
                <p class="text-sm text-gray-600">Thank you for approving. Payment is pending.</p>
              </div>
            {:else if approvalStatus === 'rejected'}
              <div class="text-center">
                <div
                  class="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center"
                >
                  <AlertCircle class="w-8 h-8 text-red-600" />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Invoice Rejected</h3>
                <p class="text-sm text-gray-600">This invoice has been rejected.</p>
              </div>
            {:else if isPaid}
              <div class="text-center">
                <div
                  class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center"
                >
                  <CheckCircle class="w-8 h-8 text-green-600" />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Invoice Paid</h3>
                <p class="text-sm text-gray-600">This invoice has been paid in full.</p>
                {#if invoice.payment_date}
                  <p class="text-xs text-gray-500 mt-1">
                    Paid on {new Date(invoice.payment_date).toLocaleDateString()}
                  </p>
                {/if}
              </div>
            {:else}
              {#if canApprove}
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 mb-4">Invoice Actions</h3>
                  <div class="flex gap-3">
                    <button
                      on:click={handleApprove}
                      disabled={submitting}
                      class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      <Check class="w-4 h-4" /> Approve
                    </button>
                    <button
                      on:click={handleReject}
                      disabled={submitting}
                      class="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      <X class="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              {/if}

              <div>
                <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign class="w-5 h-5" /> Payment Information
                </h3>

                <div
                  class={`p-4 rounded-lg ${isOverdue ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}
                >
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-medium text-gray-700">Amount Due:</span>
                    <span
                      class={`text-2xl font-bold ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}
                    >
                      ${balanceDue.toFixed(2)}
                    </span>
                  </div>
                  {#if invoice.due_date}
                    <div class="flex justify-between items-center text-sm">
                      <span class="text-gray-600">Due Date:</span>
                      <span class={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                        <Calendar class="w-4 h-4 inline mr-1" />
                        {new Date(invoice.due_date).toLocaleDateString()}
                        {#if isOverdue}(Overdue){/if}
                      </span>
                    </div>
                  {/if}
                </div>
              </div>

              <div class="border-t border-gray-200 pt-4">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CreditCard class="w-4 h-4" /> How to Pay
                </h4>
                <div class="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
                  <p>Please contact us to arrange payment for this invoice.</p>
                  <p class="text-xs text-gray-500">
                    For payment questions or to request alternative payment methods, please reach
                    out to us using the contact information provided.
                  </p>
                </div>
              </div>

              <div class="border-t border-gray-200 pt-4 mt-4">
                <button
                  on:click={() => (showComments = !showComments)}
                  class="w-full flex items-center justify-between gap-2 font-semibold text-gray-900 mb-3"
                >
                  <span class="flex items-center gap-2">
                    <MessageSquare class="w-5 h-5" /> Questions or Comments?
                  </span>
                  <span class="text-sm text-gray-500">{showComments ? 'Hide' : 'Show'}</span>
                </button>

                {#if showComments}
                  <form on:submit={handleCommentSubmit} class="space-y-3">
                    <div class="bg-gray-50 p-3 rounded-lg">
                      <input
                        type="text"
                        bind:value={authorName}
                        placeholder="Your Name"
                        required
                        class="w-full bg-transparent outline-none text-gray-900 placeholder-gray-500"
                      />
                    </div>
                    <div class="bg-gray-50 p-3 rounded-lg">
                      <textarea
                        bind:value={comment}
                        placeholder="Type your message..."
                        required
                        class="w-full h-24 bg-transparent outline-none text-gray-900 placeholder-gray-500 resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting || !authorName.trim() || !comment.trim()}
                      class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {#if submitting}
                        <div
                          class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                        ></div>
                        Submitting...
                      {:else}
                        <Send class="w-4 h-4" />
                        Submit Comment
                      {/if}
                    </button>
                  </form>
                {/if}
              </div>
            {/if}
          </div>

          <button
            on:click={() => {
              if (invoice.status === 'paid') {
                generatePaidInvoicePDF();
              } else {
                window.print();
              }
            }}
            class="w-full mt-6 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download class="w-4 h-4" />
            {invoice?.status === 'paid' ? 'Download Paid Invoice PDF' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
