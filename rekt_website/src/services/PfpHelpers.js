/**
 * Retry utility function
 * @param {Function} fn - The async function to retry
 * @param {number} retries - Number of retry attempts
 * @param {number} delay - Delay between retries in ms
 */
export async function retry(fn, retries = 3, delay = 1000) {
    let attempt = 0;
    while (attempt < retries) {
      try {
        return await fn();
      } catch (error) {
        attempt++;
        console.warn(`Attempt ${attempt} failed: ${error.message || error}`);
        if (attempt === retries) {
          console.error(`Failed after ${retries} attempts.`);
          throw error;
        }
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }