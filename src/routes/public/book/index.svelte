<script>
  import { onMount } from 'svelte';
  import { page } from '@roxi$lib/routify-adapter.js';
  import { Book, Review, BookComment, ContactMessage } from '$lib/entities/all';
  import { BookOpen, Star, MessageSquare, Send, ShoppingCart, Mail } from 'lucide-svelte';
  import { format } from 'date-fns';

  $: bookId = $page?.params?.id;

  let book = null;
  let reviews = [];
  let comments = [];
  let loading = true;

  // State for new review/comment/contact
  let newReview = { rating: 0, review_text: '', author_name: '', author_email: '' };
  let newComment = { comment_text: '', author_name: '', author_email: '' };
  let contact = { message: '', sender_name: '', sender_email: '', sender_phone: '' };
  let showContactModal = false;

  async function loadData() {
    if (!bookId) {
      loading = false;
      return;
    }
    loading = true;
    try {
      const bookData = await Book.filter({ id: bookId });

      if (bookData.length > 0) {
        book = bookData[0];
      }

      // Since reviews and comments now require admin access, we'll show empty arrays
      // In a real implementation, you'd need a public API endpoint for approved reviews/comments
      reviews = [];
      comments = [];
    } catch (error) {
      console.error('Error loading public book data:', error);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
  });

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (
      newReview.rating === 0 ||
      !newReview.review_text ||
      !newReview.author_name ||
      !newReview.author_email
    ) {
      alert('Please fill all review fields.');
      return;
    }
    try {
      // Since Review entity now requires admin access, this won't work from public page
      // You'd need a separate public API endpoint for creating reviews
      alert('Reviews are currently disabled. Please contact us directly.');
      // await Review.create({ ...newReview, book_id: bookId });
      newReview = { rating: 0, review_text: '', author_name: '', author_email: '' };
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review.');
    }
  }

  async function handleSubmitComment(e) {
    e.preventDefault();
    if (!newComment.comment_text || !newComment.author_name || !newComment.author_email) {
      alert('Please fill all comment fields.');
      return;
    }
    try {
      // Since BookComment entity now requires admin access, this won't work from public page
      // You'd need a separate public API endpoint for creating comments
      alert('Comments are currently disabled. Please contact us directly.');
      // await BookComment.create({ ...newComment, book_id: bookId });
      newComment = { comment_text: '', author_name: '', author_email: '' };
    } catch (error) {
      console.error('Failed to submit comment:', error);
      alert('Failed to submit comment.');
    }
  }

  async function handleContactAuthor(e) {
    e.preventDefault();
    if (!contact.message || !contact.sender_name || !contact.sender_email) {
      alert('Please fill all required contact fields.');
      return;
    }
    try {
      await ContactMessage.create({
        ...contact,
        book_id: bookId,
        book_author_email: book.created_by
      });
      contact = { message: '', sender_name: '', sender_email: '', sender_phone: '' };
      showContactModal = false;
      alert('Your message has been sent to the author.');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message.');
    }
  }

  $: averageRating =
    reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0;
</script>

<svelte:head>
  <title>{book?.title || 'Book'} - QuoteFlow</title>
</svelte:head>

{#if loading}
  <div class="flex items-center justify-center h-screen bg-white">
    <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
  </div>
{:else if !book}
  <div class="bg-white min-h-screen flex items-center justify-center text-center p-4">
    <div>
      <BookOpen class="w-24 h-24 mx-auto text-gray-400 mb-4" />
      <h1 class="text-3xl font-bold text-gray-800">Book Not Found</h1>
      <p class="text-gray-600 mt-2">
        The book you are looking for does not exist or is unavailable.
      </p>
    </div>
  </div>
{:else}
  <div class="bg-white font-sans">
    <div class="container mx-auto p-4 md:p-8">
      <main class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Column: Image & Purchase Info -->
        <div class="lg:col-span-1">
          <div class="sticky top-8">
            {#if book.image_url}
              <img
                src={book.image_url}
                alt={book.title}
                class="w-full h-auto object-cover rounded-lg shadow-lg mb-6"
              />
            {:else}
              <div
                class="w-full h-96 bg-gray-200 flex items-center justify-center rounded-lg shadow-lg mb-6"
              >
                <BookOpen class="w-24 h-24 text-gray-400" />
              </div>
            {/if}
            <div class="bg-gray-50 rounded-lg p-6">
              <p class="text-3xl font-bold text-gray-900 mb-2">${book.price?.toFixed(2)}</p>
              <p class="text-sm text-green-600 mb-4">
                {book.stock_quantity > 0 ? `${book.stock_quantity} in stock` : 'Out of stock'}
              </p>
              <button
                disabled={book.stock_quantity === 0}
                class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <ShoppingCart class="w-5 h-5" /> Purchase Now
              </button>
              <button
                on:click={() => (showContactModal = true)}
                class="w-full mt-2 bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors"
              >
                <Mail class="w-5 h-5" /> Contact Author
              </button>
            </div>
          </div>
        </div>

        <!-- Right Column: Details & Interactions -->
        <div class="lg:col-span-2">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">{book.title}</h1>
          <p class="text-xl text-gray-600 mb-4">by {book.author}</p>
          <div class="flex items-center gap-4 mb-6 pb-6 border-b">
            <div class="flex items-center">
              {#each [1, 2, 3, 4, 5] as star}
                <Star
                  class={`w-6 h-6 ${averageRating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                  fill={averageRating >= star ? 'currentColor' : 'none'}
                />
              {/each}
            </div>
            <span class="text-gray-600 font-medium">{averageRating} stars</span>
            <a href="#reviews" class="text-blue-600 hover:underline">{reviews.length} reviews</a>
            <a href="#comments" class="text-blue-600 hover:underline">{comments.length} comments</a>
          </div>

          <div class="prose max-w-none mb-8">
            <h2 class="text-2xl font-bold mb-4">Description</h2>
            <p>{book.description || 'No description available.'}</p>
          </div>

          {#if book.genres && book.genres.length > 0}
            <div class="mb-8">
              <h3 class="font-semibold mb-2">Genres</h3>
              <div class="flex flex-wrap gap-2">
                {#each book.genres as genre, i}
                  <span class="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm"
                    >{genre}</span
                  >
                {/each}
              </div>
            </div>
          {/if}

          <!-- Reviews Section -->
          <section id="reviews" class="mb-12">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Reviews</h2>
            <div class="bg-gray-50 p-6 rounded-lg space-y-6">
              {#each reviews as review}
                <div class="border-b pb-4">
                  <div class="flex items-center justify-between mb-1">
                    <h4 class="font-bold">{review.author_name}</h4>
                    <div class="flex items-center">
                      {#each [1, 2, 3, 4, 5] as star}
                        <Star
                          class={`w-6 h-6 ${review.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill={review.rating >= star ? 'currentColor' : 'none'}
                        />
                      {/each}
                    </div>
                  </div>
                  <p class="text-gray-600 text-sm mb-2">
                    {format(new Date(review.created_date), 'MMMM d, yyyy')}
                  </p>
                  <p class="text-gray-700">{review.review_text}</p>
                </div>
              {/each}
              {#if reviews.length === 0}
                <p class="text-gray-500">No reviews yet. Be the first to write one!</p>
              {/if}
            </div>

            <!-- Review Form -->
            <form on:submit={handleSubmitReview} class="mt-6 p-6 border rounded-lg">
              <h3 class="font-bold text-lg mb-4">Write a Review</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  bind:value={newReview.author_name}
                  class="border p-2 rounded w-full"
                  required
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  bind:value={newReview.author_email}
                  class="border p-2 rounded w-full"
                  required
                />
              </div>
              <div class="mb-4">
                <div class="flex items-center">
                  {#each [1, 2, 3, 4, 5] as star}
                    <Star
                      class={`w-6 h-6 ${newReview.rating >= star ? 'text-yellow-400' : 'text-gray-300'} cursor-pointer`}
                      fill={newReview.rating >= star ? 'currentColor' : 'none'}
                      on:click={() => (newReview.rating = star)}
                    />
                  {/each}
                </div>
              </div>
              <textarea
                bind:value={newReview.review_text}
                placeholder="Your review..."
                class="border p-2 rounded w-full h-24 mb-4"
                required
              />
              <button
                type="submit"
                class="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700"
                >Submit Review</button
              >
            </form>
          </section>

          <!-- Comments Section -->
          <section id="comments">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Comments</h2>
            <div class="bg-gray-50 p-6 rounded-lg space-y-6">
              {#each comments as comment}
                <div class="border-b pb-4">
                  <h4 class="font-bold">{comment.author_name}</h4>
                  <p class="text-gray-600 text-sm mb-2">
                    {format(new Date(comment.created_date), 'MMMM d, yyyy')}
                  </p>
                  <p class="text-gray-700">{comment.comment_text}</p>
                </div>
              {/each}
              {#if comments.length === 0}
                <p class="text-gray-500">No comments yet.</p>
              {/if}
            </div>

            <!-- Comment Form -->
            <form on:submit={handleSubmitComment} class="mt-6 p-6 border rounded-lg">
              <h3 class="font-bold text-lg mb-4">Leave a Comment</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  bind:value={newComment.author_name}
                  class="border p-2 rounded w-full"
                  required
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  bind:value={newComment.author_email}
                  class="border p-2 rounded w-full"
                  required
                />
              </div>
              <textarea
                bind:value={newComment.comment_text}
                placeholder="Your comment..."
                class="border p-2 rounded w-full h-24 mb-4"
                required
              />
              <button
                type="submit"
                class="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700"
                >Post Comment</button
              >
            </form>
          </section>
        </div>
      </main>
    </div>

    {#if showContactModal}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-lg p-8 w-full max-w-md">
          <h2 class="text-2xl font-bold mb-4">Contact {book.author}</h2>
          <form on:submit={handleContactAuthor}>
            <div class="space-y-4">
              <input
                type="text"
                placeholder="Your Name*"
                bind:value={contact.sender_name}
                class="border p-2 rounded w-full"
                required
              />
              <input
                type="email"
                placeholder="Your Email*"
                bind:value={contact.sender_email}
                class="border p-2 rounded w-full"
                required
              />
              <input
                type="tel"
                placeholder="Your Phone (Optional)"
                bind:value={contact.sender_phone}
                class="border p-2 rounded w-full"
              />
              <textarea
                placeholder="Your Message*"
                bind:value={contact.message}
                class="border p-2 rounded w-full h-32"
                required
              />
            </div>
            <div class="flex justify-end gap-4 mt-6">
              <button
                type="button"
                on:click={() => (showContactModal = false)}
                class="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancel</button
              >
              <button type="submit" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
                >Send Message</button
              >
            </div>
          </form>
        </div>
      </div>
    {/if}
  </div>
{/if}
