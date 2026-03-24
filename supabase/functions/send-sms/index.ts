const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, customerName, status, itemName, customMessage } = await req.json()

    const accountSid = Deno.env.get('TWILIO_SID')
    const authToken = Deno.env.get('TWILIO_TOKEN')
    const twilioPhone = Deno.env.get('TWILIO_PHONE')

    if (!accountSid || !authToken || !twilioPhone) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing Twilio credentials'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const messages: Record<string, string> = {
      'Pending':   `Dear ${customerName}, your order for ${itemName} has been received and is pending. Thank you! - Vastra Track`,
      'Cutting':   `Dear ${customerName}, your ${itemName} is now being cut. We will keep you updated! - Vastra Track`,
      'Stitching': `Dear ${customerName}, your ${itemName} is now being stitched. Almost there! - Vastra Track`,
      'Ready':     `Dear ${customerName}, great news! Your ${itemName} is ready for pickup. Please visit us! - Vastra Track`,
      'Delivered': `Dear ${customerName}, your ${itemName} has been delivered. Thank you for choosing us! - Vastra Track`,
    }

    let message = ''
    if (customMessage) {
      message = customMessage.replace('{name}', customerName)
    } else {
      message = messages[status] || `Dear ${customerName}, your order status has been updated to: ${status}`
    }

    let formattedPhone = phone.toString().replace(/\D/g, '')
    if (formattedPhone.length === 10) {
      formattedPhone = '+91' + formattedPhone
    } else if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
      formattedPhone = '+' + formattedPhone
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const credentials = btoa(`${accountSid}:${authToken}`)

    const bodyParams = new URLSearchParams({
      To: formattedPhone,
      From: twilioPhone,
      Body: message,
    })

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    })

    const result = await response.json()

    if (response.ok) {
      return new Response(JSON.stringify({ success: true, sid: result.sid }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: result.message,
        code: result.code,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})