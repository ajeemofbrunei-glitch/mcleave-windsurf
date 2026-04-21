export async function sendWhatsAppNotification(
  phoneNumber: string,
  crewName: string,
  leaveType: string,
  dateStart: string,
  dateEnd: string,
  status: string,
  adminNote?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    const apiUrl = `${supabaseUrl}/functions/v1/send-whatsapp`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        crewName,
        leaveType,
        dateStart,
        dateEnd,
        status,
        adminNote
      })
    });

    const data = await response.json();

    if (data.success && data.url) {
      window.open(data.url, '_blank');
      return { success: true, url: data.url };
    } else {
      return { success: false, error: data.error || 'Failed to generate WhatsApp link' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
