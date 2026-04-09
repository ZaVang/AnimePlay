/**
 * Persistence API Service
 * Handles all network I/O for saving and loading user data.
 * Decouples Pinia stores from direct fetch calls.
 */

export interface PersistencePayload {
  state: Record<string, any>;
  [key: string]: any;
}

export const PersistenceService = {
  /**
   * Saves the entire user state to the backend.
   * @param username - The username to save data for.
   * @param payload - The serialized state from all stores.
   */
  async saveUserData(username: string, payload: PersistencePayload): Promise<void> {
    if (!username) return;

    try {
      const response = await fetch('/api/user/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          payload
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save user data: ${response.statusText}`);
      }
    } catch (error) {
      console.error('PersistenceService.saveUserData Error:', error);
      throw error;
    }
  },

  /**
   * Loads the user state from the backend.
   * @param username - The username to load data for.
   * @returns The user state payload, or null if it's a new user.
   */
  async loadUserData(username: string): Promise<PersistencePayload | null> {
    if (!username) return null;

    try {
      const response = await fetch(`/api/user/data?username=${username}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load user data: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle the backend's specific "new user" or error format
      if (data && !data.isNewUser && !data.error) {
        return data as PersistencePayload;
      }
      
      return null;
    } catch (error) {
      console.error('PersistenceService.loadUserData Error:', error);
      throw error;
    }
  }
};
