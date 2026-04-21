import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://mcleave-final-bb6e.bolt.host",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WhatsAppRequest {
  phoneNumber: string;
  crewName: string;
  leaveType: string;
  dateStart: string;
  dateEnd: string;
  status: string;
  adminNote?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { phoneNumber, crewName, leaveType, dateStart, dateEnd, status, adminNote }: WhatsAppRequest = await req.json();

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('673') ? cleanPhone : `673${cleanPhone.replace(/^0/, '')}`;

    const statusEmoji = status === 'approved' ? '✅' : status === 'denied' ? '❌' : '⏳';
    const statusText = status === 'approved' ? 'APPROVED' : status === 'denied' ? 'DENIED' : 'PENDING';

    let message = `${statusEmoji} *McLeave Leave Request ${statusText}*\n\n`;
    message += `Hi ${crewName},\n\n`;
    message += `Your leave request has been *${statusText}*.\n\n`;
    message += `📋 *Details:*\n`;
    message += `• Type: ${leaveType}\n`;
    message += `• Dates: ${dateStart} to ${dateEnd}\n`;

    if (adminNote) {
      message += `\n💬 *Manager's Note:*\n${adminNote}\n`;
    }

    message += `\n---\n`;
    message += `🍟 McDonald's McLeave System`;

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: whatsappUrl,
        message: "WhatsApp link generated successfully"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
