import axios from 'axios';

const WEBHOOK_URL = 'https://api.brrr.now/v1/br_usr_e73738eebbb39743026e588dea4a46ca6ace93a59cdb8d099e6ae6bf596c8af0';

export const sendNotification = async (message: string): Promise<void> => {
  try {
    await axios.post(WEBHOOK_URL, message, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  } catch (error) {
    // Silently fail if notification cannot be sent
  }
};
