<script>
  import { onMount } from 'svelte';
  import { page } from '@roxi$lib/routify-adapter.js';
  import { Quote, QuoteComment, Company } from '$lib/entities/all';
  import {
    Check,
    X,
    MessageSquare,
    Send,
    CheckCircle,
    AlertCircle,
    Eye,
    Download,
    Calendar,
    Mail,
    Phone,
    MapPin,
    Globe,
    FileText
  } from 'lucide-svelte';

  // Get token from URL query string
  let token = null;
  let approvalToken = null;

  let quote = null;
  let comments = [];
  let company = null;
  let loading = true;
  let error = null;
  let isExpired = false;

  // Action state
  let comment = '';
  let authorName = '';
  let submitting = false;
  let approvalStatus = null;
  let rejectionReason = '';

  async function loadData() {
    loading = true;
    error = null;
    try {
      // Use the public endpoint to fetch quote by token
      const quoteItem = await Quote.getByPublicToken(token);

      if (!quoteItem) {
        error = 'Quote not found or invalid link.';
        loading = false;
        return;
      }

      // Check if public view is disabled
      if (!quoteItem.public_view_enabled) {
        error = 'This quote is no longer available for public viewing.';
        loading = false;
        return;
      }

      // Check if quote has expired based on valid_until date
      if (quoteItem.valid_until) {
        const validUntilDate = new Date(quoteItem.valid_until);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

        if (validUntilDate < today) {
          isExpired = true;
        }
      }

      quote = quoteItem;

      // Load comments and company data
      const [commentsData, companyData] = await Promise.all([
        QuoteComment.filter({ quote_id: quoteItem.id }, '-created_date'),
        Company.filter({ is_default: true })
      ]);

      comments = commentsData;
      if (companyData.length > 0) {
        company = companyData[0];
      }
    } catch (err) {
      console.error('Error loading data:', err);
      error = 'Failed to load quote. Please try again later.';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      token = urlParams.get('token');
      approvalToken = urlParams.get('approval') || token;

      if (token) {
        loadData();
      } else {
        error = 'No quote token provided.';
        loading = false;
      }
    }
  });

  async function handleAction(status, approverName = '', reason = '') {
    if (status === 'approved' && !approverName.trim()) {
      alert('Please provide your name for approval');
      return;
    }

    if (!confirm(`Are you sure you want to ${status} this quote?`)) return;

    submitting = true;
    try {
      if (status === 'approved') {
        await Quote.approveByToken(approvalToken, approverName);
        approvalStatus = 'approved';
      } else if (status === 'rejected') {
        await Quote.rejectByToken(approvalToken, approverName || authorName, reason);
        approvalStatus = 'rejected';
      }
      loadData();
    } catch (err) {
      console.error(`Failed to ${status} quote`, err);
      alert(`Failed to ${status} quote. Please try again.`);
    } finally {
      submitting = false;
    }
  }

  async function handleCommentSubmit(e) {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) {
      alert('Please provide your name and a comment.');
      return;
    }
    submitting = true;
    try {
      await QuoteComment.create({
        quote_id: quote.id,
        author_name: authorName,
        author_role: 'customer',
        comment: comment
      });
      comment = '';
      loadData();
    } catch (err) {
      console.error('Failed to submit comment', err);
    } finally {
      submitting = false;
    }
  }

  function handleApprovalWithName() {
    const approverName = prompt('Please enter your name for approval:');
    if (approverName && approverName.trim()) {
      handleAction('approved', approverName.trim());
    }
  }

  function handleRejectionWithReason() {
    const rejectorName = prompt('Please enter your name:');
    if (!rejectorName || !rejectorName.trim()) return;

    const reason = prompt('Please provide a reason for rejection (optional):');
    handleAction('rejected', rejectorName.trim(), reason || '');
  }

  function getStatusBadge(status) {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-yellow-100 text-yellow-800'
    };

    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  $: isActionable = quote && (quote.status === 'sent' || quote.status === 'draft') && !isExpired;
  $: canApprove =
    approvalToken &&
    quote &&
    (quote.approval_token === approvalToken || quote.id === approvalToken) &&
    !isExpired;
</script>

<svelte:head>
  <title>View Quote - QuoteFlow</title>
</svelte:head>

{#if loading}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div
        class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"
      ></div>
      <p class="text-gray-600">Loading quote...</p>
    </div>
  </div>
{:else if error || !quote}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center max-w-md">
      <div
        class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <AlertCircle class="w-8 h-8 text-red-600" />
      </div>
      <h1 class="text-xl font-semibold text-gray-900 mb-2">Quote Not Available</h1>
      <p class="text-gray-600">{error}</p>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto p-6">
      <!-- Expired Quote Banner -->
      {#if isExpired}
        <div class="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <Calendar class="w-6 h-6 text-yellow-600" />
            </div>
            <div class="flex-1">
              <h2 class="text-xl font-bold text-yellow-900 mb-2">Quote Expired</h2>
              <p class="text-yellow-800 mb-2">
                This quote expired on {quote.valid_until
                  ? new Date(quote.valid_until).toLocaleDateString()
                  : 'N/A'}.
              </p>
              <p class="text-yellow-700 text-sm">
                The quote is no longer valid for approval or action. Please contact us if you would
                like to request an updated quote.
              </p>
            </div>
          </div>
        </div>
      {/if}

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <!-- Quote Document -->
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
                <h2 class="text-3xl font-bold text-gray-900 mb-2">QUOTE</h2>
                <p class="text-lg font-semibold text-gray-600">#{quote.quote_number}</p>
                <div class="mt-2">
                  <span class={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(quote.status)}`}>
                    {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>

            <!-- Quote Details -->
            <div class="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 class="font-semibold text-gray-900 mb-3">Quote For:</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="font-medium text-gray-900">{quote.customer_name}</p>
                  {#if quote.customer_email}
                    <p class="text-sm text-gray-600 mt-1">{quote.customer_email}</p>
                  {/if}
                </div>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 mb-3">Quote Details:</h3>
                <div class="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Issue Date:</span>
                    <span class="text-gray-900"
                      >{new Date(quote.created_date).toLocaleDateString()}</span
                    >
                  </div>
                  {#if quote.valid_until}
                    <div class="flex justify-between">
                      <span class="text-gray-600">Valid Until:</span>
                      <span class="text-gray-900"
                        >{new Date(quote.valid_until).toLocaleDateString()}</span
                      >
                    </div>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Quote Title -->
            <div class="mb-6">
              <h3 class="text-xl font-semibold text-gray-900">{quote.title}</h3>
              {#if quote.reference_url}
                <a
                  href={quote.reference_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-700 text-sm mt-1 flex items-center gap-1"
                >
                  <Globe class="w-4 h-4" /> Reference Link
                </a>
              {/if}
            </div>

            <!-- Attachments -->
            {#if quote.attachments && quote.attachments.length > 0}
              <div class="mb-8">
                <h3 class="font-semibold text-gray-900 mb-4">Attachments:</h3>
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {#each quote.attachments as attachment, index}
                    {@const isImage = attachment.file_type?.startsWith('image/')}
                    {@const isPDF = attachment.file_type === 'application/pdf'}

                    <div
                      class="border border-gray-200 rounded-lg p-3 flex flex-col gap-2 bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <!-- Preview Area -->
                      <div
                        class="w-full h-40 bg-gray-50 rounded overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        on:click={() => window.open(attachment.file_url, '_blank')}
                        role="button"
                        tabindex="0"
                        on:keydown={(e) =>
                          e.key === 'Enter' && window.open(attachment.file_url, '_blank')}
                      >
                        {#if isImage}
                          <img
                            src={attachment.preview_url || attachment.file_url}
                            alt={attachment.file_name}
                            class="w-full h-full object-contain"
                          />
                        {:else if isPDF}
                          <div
                            class="w-full h-full flex flex-col items-center justify-center bg-red-50"
                          >
                            <FileText class="w-16 h-16 text-red-500 mb-2" />
                            <p class="text-xs text-red-700 font-semibold">PDF Document</p>
                            <p class="text-xs text-gray-500 mt-1">Click to view</p>
                          </div>
                        {:else}
                          <div
                            class="w-full h-full flex flex-col items-center justify-center bg-gray-100"
                          >
                            <FileText class="w-16 h-16 text-gray-400 mb-2" />
                            <p class="text-xs text-gray-600">File Preview</p>
                            <p class="text-xs text-gray-500 mt-1">Click to view</p>
                          </div>
                        {/if}
                      </div>

                      <!-- File Info and Actions -->
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                          <p
                            class="text-sm font-medium text-gray-900 truncate"
                            title={attachment.file_name}
                          >
                            {attachment.file_name}
                          </p>
                          <p class="text-xs text-gray-500">
                            {attachment.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                          </p>
                        </div>
                        <button
                          on:click={() => window.open(attachment.file_url, '_blank')}
                          class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Eye class="w-3 h-3" /> View
                        </button>
                      </div>
                    </div>
                  {/each}
                </div>
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
                    {#each quote.items || [] as item, index}
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
                    <span class="text-gray-900">${quote.subtotal?.toFixed(2)}</span>
                  </div>
                  {#if quote.tax_rate > 0}
                    <div class="flex justify-between">
                      <span class="text-gray-600">Tax ({quote.tax_rate}%):</span>
                      <span class="text-gray-900">${quote.tax_amount?.toFixed(2)}</span>
                    </div>
                  {/if}
                  <div class="border-t border-gray-200 pt-2 mt-2">
                    <div class="flex justify-between font-semibold text-lg">
                      <span class="text-gray-900">Total:</span>
                      <span class="text-gray-900">${quote.total_amount?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes -->
            {#if quote.notes}
              <div class="mb-6">
                <h3 class="font-semibold text-gray-900 mb-2">Notes:</h3>
                <div class="bg-gray-50 p-4 rounded-lg">
                  <p class="text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
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
                <p class="mt-2">Thank you for considering our proposal!</p>
              </div>
            {/if}
          </div>

          <!-- Comment History -->
          <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mt-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Comment History</h3>
            <div class="space-y-3 max-h-72 overflow-y-auto">
              {#if comments.length === 0}
                <p class="text-sm text-gray-500 text-center py-4">No comments yet.</p>
              {:else}
                {#each comments as c}
                  <div
                    class={`p-3 rounded-lg ${c.author_role === 'customer' ? 'bg-blue-50' : 'bg-gray-50'}`}
                  >
                    <p class="text-sm text-gray-900">{c.comment}</p>
                    <p class="text-xs text-gray-500 mt-1 text-right">
                      - {c.author_name} ({c.author_role}) • {new Date(
                        c.created_date
                      ).toLocaleDateString()}
                    </p>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </div>

        <div>
          <!-- Quote Actions -->
          <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            {#if approvalStatus === 'approved'}
              <div class="text-center">
                <div
                  class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center"
                >
                  <CheckCircle class="w-8 h-8 text-green-600" />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Quote Approved!</h3>
                <p class="text-sm text-gray-600">
                  Thank you for approving this quote. We will be in touch soon.
                </p>
              </div>
            {:else if approvalStatus === 'rejected'}
              <div class="text-center">
                <div
                  class="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center"
                >
                  <AlertCircle class="w-8 h-8 text-red-600" />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Quote Rejected</h3>
                <p class="text-sm text-gray-600">The quote has been marked as rejected.</p>
              </div>
            {:else}
              {#if isActionable && canApprove}
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Quote Actions</h3>
                <div class="flex gap-3 mb-6">
                  <button
                    on:click={handleApprovalWithName}
                    disabled={submitting}
                    class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    <Check class="w-4 h-4" /> Approve Quote
                  </button>
                  <button
                    on:click={handleRejectionWithReason}
                    disabled={submitting}
                    class="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    <X class="w-4 h-4" /> Reject Quote
                  </button>
                </div>
              {:else}
                <div class="bg-gray-50 p-4 rounded-lg text-center mb-6">
                  {#if isExpired}
                    <h3 class="font-semibold text-gray-900">This quote has expired.</h3>
                    <p class="text-sm text-gray-600 mt-1">
                      Actions are no longer available for expired quotes.
                    </p>
                  {:else}
                    <h3 class="font-semibold text-gray-900">This quote is {quote.status}.</h3>
                    {#if quote.status === 'approved'}
                      <p class="text-sm text-gray-600 mt-1">
                        Approved on {quote.approved_date
                          ? new Date(quote.approved_date).toLocaleDateString()
                          : 'N/A'}
                        {#if quote.approved_by}by {quote.approved_by}{/if}
                      </p>
                    {/if}
                    {#if quote.status === 'rejected'}
                      <div class="mt-2">
                        <p class="text-sm text-gray-600">
                          Rejected on {quote.rejected_date
                            ? new Date(quote.rejected_date).toLocaleDateString()
                            : 'N/A'}
                          {#if quote.rejected_by}by {quote.rejected_by}{/if}
                        </p>
                        {#if quote.rejection_reason}
                          <p class="text-sm text-gray-600 mt-1 italic">
                            Reason: {quote.rejection_reason}
                          </p>
                        {/if}
                      </div>
                    {/if}
                    {#if !canApprove && quote.status === 'sent'}
                      <p class="text-sm text-gray-600 mt-1">
                        You need the approval link to take action on this quote.
                      </p>
                    {/if}
                  {/if}
                </div>
              {/if}

              <div class="border-t border-gray-200 pt-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare class="w-5 h-5" /> Questions or Comments?
                </h3>
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
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
