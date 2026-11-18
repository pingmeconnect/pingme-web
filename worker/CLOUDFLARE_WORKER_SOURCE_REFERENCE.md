export default {







  async fetch(request, env) {







    const url = new URL(request.url);







    const path = url.pathname;















    const corsHeaders = {







      "Access-Control-Allow-Origin": "\*",







      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",







      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Password",







      "Content-Type": "application/json"







    };















    if (request.method === "OPTIONS") {







      return new Response(null, { headers: corsHeaders });







    }















    function json(data, status = 200) {







      return new Response(JSON.stringify(data), { status, headers: corsHeaders });







    }















    function normalizePhone(phone) {



      let digits = String(phone || "").replace(/\D/g, "");



      *// PingMe operates in India: treat +91XXXXXXXXXX, 0XXXXXXXXXX and XXXXXXXXXX*



      *// as the same 10-digit mobile number. Leave other international numbers intact.*



      if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);



      else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);



      return digits;



    }















    function safeFileName(value) {







      return String(value || "photo").replace(/[^a-zA-Z0-9\_-]/g, "\_").slice(0, 60);







    }















    async function supabaseRequest(endpoint, method = "GET", body = null, extraHeaders = {}) {







      const options = {







        method,







        headers: {







          apikey: env.SUPABASE_KEY,







          Authorization: \`Bearer ${env.SUPABASE_KEY}\`,







          "Content-Type": "application/json",







          Prefer: "return=representation",







          ...extraHeaders







        }







      };







      if (body !== null) options.body = JSON.stringify(body);















      const res = await fetch(\`${env.SUPABASE_URL}/rest/v1/${endpoint}\`, options);







      const responseText = await res.text();







      let data = null;







      try { data = responseText ? JSON.parse(responseText) : null; }







      catch { data = responseText; }







      return { ok: res.ok, status: res.status, data };







    }















    *// Current QR Studio uses pingme_customers.customer_id as the public Tag Code.*



    *// Continue supporting legacy installations that still store records in public.tags.*



    async function findTagRecord(tagCode) {



      const code = String(tagCode || "").trim();



      if (!code) return { ok: true, record: null, source: null };



      const legacy = await supabaseRequest(\`tags?tag_code=eq.${encodeURIComponent(code)}&select=\*&limit=1\`);



      if (legacy.ok && Array.isArray(legacy.data) && legacy.data.length) {



        return { ok: true, record: legacy.data[0], source: "tags" };



      }



      const customers = await supabaseRequest(\`pingme_customers?customer_id=eq.${encodeURIComponent(code)}&select=\*&limit=1\`);



      if (!customers.ok) return { ok: false, status: customers.status, error: customers.data };



      if (!Array.isArray(customers.data) || !customers.data.length) return { ok: true, record: null, source: null };



      const c = customers.data[0];



      const status = String(c.status || "").trim().toLowerCase();



      const creditsField = status === "testing" ? "test_credits" : "paid_credits";



      return {



        ok: true, source: "pingme_customers", creditsField,



        record: {



          id: c.id, tag_code: c.customer_id, serial_no: c.customer_id,



          tag_type: c.tag_type || c.category || "General",



          vehicle_or_item: c.vehicle_or_item || c.tag_type || "PingMe tag",



          status: c.status, owner_name: c.owner_name || c.name || "Customer",



          owner_whatsapp: c.owner_whatsapp || c.mobile || "",



          owner_email: c.owner_email || c.email || "",



          scan_credits: Number(c[creditsField] ?? 0), expires_at: c.expires_at || c.expiry_date || null,



          \_credits_field: creditsField



        }



      };



    }







    function getWhatsAppConfig(env) {



      return {



        token: env.WHATSAPP_ACCESS_TOKEN || env.WHATSAPP_TOKEN || "",



        phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || env.PHONE_NUMBER_ID || "",



        apiVersion: String(env.WHATSAPP_API_VERSION || "v27.0").replace(/^\\/?/, "")



      };



    }







    async function verifyMetaSignature(rawBody, signature, secret) {







      if (!signature || !secret || !signature.startsWith("sha256=")) return false;







      const suppliedHex = signature.substring(7);







      if (!/^[a-fA-F0-9]{64}$/.test(suppliedHex)) return false;















      const encoder = new TextEncoder();







      const key = await crypto.subtle.importKey(







        "raw", encoder.encode(secret),







        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]







      );







      const expected = new Uint8Array(







        await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody))







      );







      const supplied = new Uint8Array(







        suppliedHex.match(/.{2}/g).map(byte => parseInt(byte, 16))







      );







      let difference = 0;







      for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ supplied[i];







      return difference === 0;







    }















    async function uploadPhotoDataUrl(dataUrl, tagCode, sessionKey) {







      if (!dataUrl || typeof dataUrl !== "string") return { ok: true, url: null };







      const match = dataUrl.match(/^data:(image\\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);







      if (!match) return { ok: false, error: "Unsupported photo format. Use JPG, PNG or WEBP." };















      const mime = match[1].toLowerCase().replace("image/jpg", "image/jpeg");







      const binary = atob(match[2].replace(/\s/g, ""));







      const bytes = new Uint8Array(binary.length);







      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);















      *// Keep uploads bounded. The browser should resize/compress larger photos before upload.*







      if (bytes.byteLength > 5 \* 1024 \* 1024) {







        return { ok: false, error: "Photo is larger than 5 MB. Please choose a smaller photo." };







      }















      const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";







      const objectPath = \`${safeFileName(tagCode)}/${Date.now()}\_${safeFileName(sessionKey)}.${extension}\`;







      const uploadUrl = \`${env.SUPABASE_URL}/storage/v1/object/alert-photos/${objectPath}\`;















      const upload = await fetch(uploadUrl, {







        method: "POST",







        headers: {







          apikey: env.SUPABASE_KEY,







          Authorization: \`Bearer ${env.SUPABASE_KEY}\`,







          "Content-Type": mime,







          "x-upsert": "true"







        },







        body: bytes







      });















      if (!upload.ok) {







        const detail = await upload.text();







        return { ok: false, error: \`Supabase photo upload failed (${upload.status}): ${detail}\` };







      }















      const publicUrl = \`${env.SUPABASE_URL}/storage/v1/object/public/alert-photos/${objectPath}\`;







      return { ok: true, url: publicUrl, mime, size: bytes.byteLength };







    }















    async function sendWhatsAppMessage(to, message) {



      const wa = getWhatsAppConfig(env);



      if (!wa.token || !wa.phoneNumberId) {



        return { ok: false, status: 503, data: { error: { message: "WhatsApp API credentials are not configured in Cloudflare Worker secrets." } } };



      }



      const response = await fetch(\`https\\://graph.facebook.com/${wa.apiVersion}/${wa.phoneNumberId}/messages\`, {



        method: "POST",



        headers: { Authorization: \`Bearer ${wa.token}\`, "Content-Type": "application/json" },



        body: JSON.stringify({ messaging_product: "whatsapp", to, ...message })



      });



      const bodyText = await response.text();



      let data;



      try { data = bodyText ? JSON.parse(bodyText) : null; }



      catch { data = bodyText; }



      return { ok: response.ok, status: response.status, data };



    }











    *// Email is an independent channel. A Resend failure must never interrupt WhatsApp.*



    function escapeHtml(value) {



      return String(value ?? "").replace(/[&<>"']/g, ch => ({



        "&": "&amp;", "<": "&lt;", ">": "&gt;", "\\"": "&quot;", "'": "&#39;"



      }[ch]));



    }







    async function sendEmailAlert(to, alert) {



      const apiKey = env.RESEND_API_KEY || "";



      const from = env.RESEND_FROM_EMAIL || "";



      if (!apiKey || !from) {



        return { ok: false, status: 503, error: "Resend is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL to Cloudflare Worker secrets." };



      }



      const subject = \`PingMe Alert – ${alert.category} – ${alert.tagCode}\`;



      const rows = [



        ["Category", alert.category], ["Tag Code", alert.tagCode],



        ["Reason", alert.reason], ["Details", alert.details]



      ];



      if (alert.mapUrl) rows.push(["Location", alert.mapUrl]);



      if (alert.photoUrl) rows.push(["Photo", alert.photoUrl]);



      const htmlRows = rows.map(([label, value]) =>



        \`\<tr>\<td style="padding:9px 12px;color:#52617a;font-weight:600;border-bottom:1px solid #e8edf5">${escapeHtml(label)}\</td>\<td style="padding:9px 12px;color:#14264b;border-bottom:1px solid #e8edf5">${label === "Location" || label === "Photo" ? \`\<a href="${escapeHtml(value)}">Open ${escapeHtml(label.toLowerCase())}\</a>\` : escapeHtml(value)}\</td>\</tr>\`



      ).join("");



      const text = rows.map(([label, value]) => \`${label}: ${value}\`).join("\n") + "\n\nThis is an automated PingMe alert.";



      try {



        const response = await fetch("https\\://api.resend.com/emails", {



          method: "POST",



          headers: { Authorization: \`Bearer ${apiKey}\`, "Content-Type": "application/json" },



          body: JSON.stringify({



            from, to: [to], subject, text,



            html: \`\<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#14264b">\<div style="font-size:22px;font-weight:700;color:#123b80">PingMe Alert\</div>\<p>A new alert has been reported for your PingMe tag.\</p>\<table style="width:100%;border-collapse:collapse;background:#f8faff">${htmlRows}\</table>\<p style="font-size:12px;color:#71809a;margin-top:20px">Private · Secure · Simple\<br>PingMe – One Scan. Instant Connection.\</p>\</div>\`



          })



        });



        const responseText = await response.text();



        let data;



        try { data = responseText ? JSON.parse(responseText) : null; }



        catch { data = responseText; }



        return { ok: response.ok, status: response.status, data };



      } catch (error) {



        return { ok: false, status: 500, error: error?.message || String(error) };



      }



    }















    async function sendPendingAttachmentsToOwner(session, ownerPhone) {







      *// A successful item is never resent when the owner later replies.*



      *// Failed/pending items are retried after the reply opens the 24-hour window.*



      const outcomes = {



        photo: session.photo_delivery_status || (session.photo_url ? "pending" : "not_available"),



        location: session.location_delivery_status ||



          (session.gps_lat !== null && session.gps_lat !== undefined &&



           session.gps_lng !== null && session.gps_lng !== undefined ? "pending" : "not_available")



      };







      if (session.photo_url && outcomes.photo !== "sent") {



        const photoResult = await sendWhatsAppMessage(ownerPhone, {



          type: "image",



          image: { link: session.photo_url, caption: "PingMe alert photo" }



        });



        outcomes.photo = photoResult.ok ? "sent" : "failed";



        if (!photoResult.ok) outcomes.photo_error = photoResult.data;



      }







      if (session.gps_lat !== null && session.gps_lat !== undefined &&



          session.gps_lng !== null && session.gps_lng !== undefined &&



          outcomes.location !== "sent") {



        const locationResult = await sendWhatsAppMessage(ownerPhone, {



          type: "location",



          location: {



            latitude: Number(session.gps_lat),



            longitude: Number(session.gps_lng),



            name: "PingMe alert location",



            address: session.location_url || ""



          }



        });



        outcomes.location = locationResult.ok ? "sent" : "failed";



        if (!locationResult.ok) outcomes.location_error = locationResult.data;



      }







      *// These two columns are added by the companion SQL migration.*



      await supabaseRequest(



        \`scan_logs?id=eq.${encodeURIComponent(session.id)}\`,



        "PATCH",



        {



          photo_delivery_status: outcomes.photo,



          location_delivery_status: outcomes.location



        }



      );



      return outcomes;



    }















    try {







      *// HEALTH CHECK*







      if (path === "/" || path === "/api/health") {







        return json({ status: "online", service: "PingMe Backend v4.0" });







      }















      *// META WEBHOOK VERIFICATION*







      if (path === "/api/whatsapp-webhook" && request.method === "GET") {







        const mode = url.searchParams.get("hub.mode");







        const token = url.searchParams.get("hub.verify_token");







        const challenge = url.searchParams.get("hub.challenge");







        if (mode === "subscribe" && token && token === env.WEBHOOK_VERIFY_TOKEN) {







          return new Response(challenge || "", { status: 200, headers: { "Content-Type": "text/plain" } });







        }







        return new Response("Webhook verification failed", { status: 403 });







      }















      *// RECEIVE OWNER REPLIES*







      if (path === "/api/whatsapp-webhook" && request.method === "POST") {







        if (!env.META_APP_SECRET) return json({ error: "Webhook secret missing" }, 500);















        const rawBody = await request.text();







        const signature = request.headers.get("X-Hub-Signature-256");







        const validSignature = await verifyMetaSignature(rawBody, signature, env.META_APP_SECRET);







        if (!validSignature) return json({ error: "Invalid webhook signature" }, 401);















        const payload = JSON.parse(rawBody);







        for (const entry of payload.entry || []) {







          for (const change of entry.changes || []) {







            const value = change.value || {};







            for (const message of value.messages || []) {







              const sender = normalizePhone(message.from);







              let ownerReply = "";















              if (message.type === "text") ownerReply = message.text?.body || "";







              else if (message.type === "button") ownerReply = message.button?.text || "";







              else if (message.type === "interactive") {







                ownerReply = message.interactive?.button_reply?.title ||







                  message.interactive?.list_reply?.title || "";







              }







              ownerReply = ownerReply.trim();







              if (!sender || !ownerReply) continue;















              const tagsResult = await supabaseRequest(



                "tags?select=tag_code,owner_whatsapp&limit=1000"



              );



              const customerResult = await supabaseRequest(



                "pingme_customers?select=customer_id,mobile&limit=1000"



              );



              const matchingTags = [];



              if (tagsResult.ok && Array.isArray(tagsResult.data)) {



                matchingTags.push(...tagsResult.data.filter(tag => normalizePhone(tag.owner_whatsapp) === sender));



              }



              if (customerResult.ok && Array.isArray(customerResult.data)) {



                matchingTags.push(...customerResult.data



                  .filter(customer => normalizePhone(customer.mobile) === sender)



                  .map(customer => ({ tag_code: customer.customer_id })));



              }



              if (!matchingTags.length) continue;















              *// Match the newest still-waiting scan for this owner's verified number.*



              *// The browser controls its own 180-second waiting screen; the webhook must not*



              *// independently reject a valid reply because delivery/Meta webhook was delayed.*



              let latestSession = null;















              for (const tag of matchingTags) {







                const sessionResult = await supabaseRequest(







                  \`scan_logs?tag_code=eq.${encodeURIComponent(tag.tag_code)}\` +







                  \`&session_status=eq.waiting\` +







                  "&select=id,tag_code,created_at,photo_url,gps_lat,gps_lng,location_url,photo_delivery_status,location_delivery_status" +







                  "&order=created_at.desc&limit=1"







                );







                if (sessionResult.ok && Array.isArray(sessionResult.data) && sessionResult.data.length) {







                  const candidate = sessionResult.data[0];







                  if (!latestSession || new Date(candidate.created_at) > new Date(latestSession.created_at)) {







                    latestSession = candidate;







                  }







                }







              }















              if (!latestSession) continue;















              const patch = await supabaseRequest(







                \`scan_logs?id=eq.${encodeURIComponent(latestSession.id)}\`,







                "PATCH",







                {







                  owner_reply: ownerReply,







                  replied_at: new Date().toISOString(),







                  session_status: "replied"







                }







              );















              *// An inbound owner reply opens the 24-hour customer-service window.*



              *// Retry only media items that were not delivered during the initial alert.*



              if (patch.ok) {



                await sendPendingAttachmentsToOwner(latestSession, sender);



              }







            }







          }







        }







        return json({ success: true });







      }















      *// LOOKUP TAG — supports the current customer_id QR format and legacy tags.*



      if (path === "/api/tag" && request.method === "GET") {



        const code = (url.searchParams.get("t") || "").trim();



        if (!code) return json({ error: "Missing tag code" }, 400);



        const found = await findTagRecord(code);



        if (!found.ok) return json({ error: "Tag lookup failed", details: found.error }, 500);



        if (!found.record) return json({ error: "Tag not found" }, 404);



        const tag = found.record;



        return json({ tag: {



          id: tag.id, tag_code: tag.tag_code, serial_no: tag.serial_no || tag.tag_code,



          tag_type: tag.tag_type || "General", vehicle_or_item: tag.vehicle_or_item || null,



          status: tag.status || null, scan_credits: Number(tag.scan_credits || 0), expires_at: tag.expires_at || null



        } });



      }







      *// SEND PINGME ALERT*







      if (path === "/api/alert" && request.method === "POST") {







        const body = await request.json();







        const tagCode = String(body.tag_code || "").trim();







        const reason = String(body.reason || "").trim();







        *// Use the category selected by the scanner, not the tag's registered type.*



        const requestedCategory = String(body.category || "other").trim().toLowerCase();



        const categoryLabels = {



          vehicle: "Vehicle",



          lost: "Lost & Found",



          other: "Other"



        };



        const alertCategory = categoryLabels[requestedCategory] || "Other";







        const customMessage = String(body.custom_message || "").trim();







        const locationUrl = body.location_url || null;







        const gpsLat = body.gps_lat !== undefined && body.gps_lat !== null ? Number(body.gps_lat) : null;







        const gpsLng = body.gps_lng !== undefined && body.gps_lng !== null ? Number(body.gps_lng) : null;







        const photoData = body.photo_data || null;















        if (!tagCode || !reason) return json({ error: "Missing tag code or alert reason" }, 400);







        if ((gpsLat === null) !== (gpsLng === null) ||







            (gpsLat !== null && (!Number.isFinite(gpsLat) || !Number.isFinite(gpsLng) ||







             gpsLat < -90 || gpsLat > 90 || gpsLng < -180 || gpsLng > 180))) {







          return json({ error: "Invalid GPS coordinates" }, 400);







        }















        const found = await findTagRecord(tagCode);



        if (!found.ok) return json({ error: "Tag lookup failed", details: found.error }, 500);



        if (!found.record) return json({ error: "Tag not found" }, 404);



        const tag = found.record;



        const tagStatus = String(tag.status || "active").trim().toLowerCase();



        const isCustomerRecord = found.source === "pingme_customers";



        const allowedStatuses = isCustomerRecord ? ["active", "testing"] : ["active"];



        if (!allowedStatuses.includes(tagStatus)) return json({ error: "This PingMe tag is not active. Please contact PingMe support." }, 403);



        if (Number(tag.scan_credits || 0) <= 0) {



          return json({ error: isCustomerRecord && tagStatus === "testing" ? "No free test credits remaining." : "No scan credits remaining." }, 402);



        }



        const waConfig = getWhatsAppConfig(env);



        const ownerEmail = String(tag.owner_email || tag.email || "").trim();



        const canSendWhatsApp = Boolean(waConfig.token && waConfig.phoneNumberId && tag.owner_whatsapp);



        if (!canSendWhatsApp && !ownerEmail) {



          return json({ error: "No alert channel is configured for this customer. Check the WhatsApp number or registered email." }, 422);



        }















        *// Create a session key before uploading, then store the photo in Supabase Storage.*







        const sessionKey = crypto.randomUUID();







        let photoUrl = null;







        let photoUploadStatus = "not_attached";















        if (photoData) {







          const uploaded = await uploadPhotoDataUrl(photoData, tagCode, sessionKey);







          if (!uploaded.ok) return json({ error: uploaded.error }, 400);







          photoUrl = uploaded.url;







          photoUploadStatus = "uploaded";







        }















        *// Keep the approved WhatsApp template clean: never put long GPS/photo URLs in it.*







        *// Actual media/location are delivered as separate follow-up messages when Meta permits.*







        const details = [







          \`GPS: ${gpsLat !== null && gpsLng !== null ? "Attached" : "Not attached"}\`,







          \`Photo: ${photoUrl ? "Attached" : "Not attached"}\`







        ];







        if (customMessage) details.push(\`Note: ${customMessage.substring(0, 160)}\`);







        const var5 = details.join(" | ").substring(0, 250);















        *// Save the session BEFORE sending WhatsApp, so a fast owner reply can be matched.*







        const scanInsert = await supabaseRequest("scan_logs", "POST", {







          tag_code: tag.tag_code,







          reason,







          custom_message: customMessage || null,







          gps_lat: gpsLat,







          gps_lng: gpsLng,







          location_url: locationUrl,







          photo_url: photoUrl,







          scanner_ip: request.headers.get("CF-Connecting-IP") || "unknown",







          delivery_status: "pending",







          session_status: "waiting"







        });















        if (!scanInsert.ok || !Array.isArray(scanInsert.data) || !scanInsert.data.length) {







          return json({ error: "Could not save alert session", details: scanInsert.data }, 500);







        }















        const sessionId = scanInsert.data[0].id;







        let templateStatus = "skipped";







        let templateError = null;















        if (waConfig.token && waConfig.phoneNumberId && tag.owner_whatsapp) {







          const cleanTo = normalizePhone(tag.owner_whatsapp);







          const var1 = tag.owner_name || "Customer";







          const var2 = alertCategory;







          const var3 = tag.serial_no || "PingMe Tag";







          const var4 = reason;















          const waRes = await sendWhatsAppMessage(cleanTo, {







            type: "template",







            template: {







              *// Keep the existing Meta-approved template name and static body unchanged.*



              *// Variable 2 now reflects the scanner's selected category.*



              name: "pingme_instant_alert",







              language: { code: "en_US" },







              components: [{







                type: "body",







                parameters: [







                  { type: "text", text: String(var1).slice(0, 1000) },







                  { type: "text", text: String(var2).slice(0, 1000) },







                  { type: "text", text: String(var3).slice(0, 1000) },







                  { type: "text", text: String(var4).slice(0, 1000) },







                  { type: "text", text: var5 || "No additional details." }







                ]







              }]







            }







          });







          templateStatus = waRes.ok ? "sent" : "failed";







          if (!waRes.ok) templateError = waRes.data;







        }















        await supabaseRequest(



          \`scan_logs?id=eq.${encodeURIComponent(sessionId)}\`,



          "PATCH",



          { delivery_status: templateStatus }



        );







        *// Attempt media immediately after the alert template. If Meta rejects media*



        *// because the owner's 24-hour window is closed, retain failed status and retry*



        *// after the owner replies. This does not alter the approved template or credits.*



        let mediaDelivery = { photo: photoUrl ? "pending" : "not_available",



          location: gpsLat !== null && gpsLng !== null ? "pending" : "not_available" };



        if (templateStatus === "sent" && tag.owner_whatsapp && (photoUrl || (gpsLat !== null && gpsLng !== null))) {



          mediaDelivery = await sendPendingAttachmentsToOwner({



            id: sessionId, photo_url: photoUrl, gps_lat: gpsLat, gps_lng: gpsLng,



            location_url: locationUrl, photo_delivery_status: "pending",



            location_delivery_status: "pending"



          }, normalizePhone(tag.owner_whatsapp));



        } else {



          await supabaseRequest(\`scan_logs?id=eq.${encodeURIComponent(sessionId)}\`, "PATCH", {



            photo_delivery_status: mediaDelivery.photo,



            location_delivery_status: mediaDelivery.location



          });



        }







        *// Send email independently. Never throw or change WhatsApp delivery/credit handling.*



        let emailStatus = ownerEmail ? "failed" : "not_configured";



        let emailError = null;



        if (ownerEmail) {



          const mapUrl = gpsLat !== null && gpsLng !== null



            ? \`https\\://www\\.google.com/maps?q=${gpsLat},${gpsLng}\`



            : locationUrl;



          try {



            const emailResult = await sendEmailAlert(ownerEmail, {



              category: alertCategory, tagCode, reason,



              details: var5 || "No additional details.",



              mapUrl: mapUrl || null, photoUrl: photoUrl || null



            });



            emailStatus = emailResult.ok ? "sent" : "failed";



            if (!emailResult.ok) emailError = emailResult.data || emailResult.error || \`Resend returned ${emailResult.status}\`;



          } catch (emailException) {



            emailStatus = "failed";



            emailError = emailException?.message || String(emailException);



          }



        }











        *// Deduct only when Meta accepts the approved template send.*



        *// Testing customers use test_credits; Active customers use paid_credits.*



        if (templateStatus === "sent") {



          const newCredits = Math.max(0, Number(tag.scan_credits || 0) - 1);



          if (isCustomerRecord) {



            const creditsField = tag.\_credits_field || (tagStatus === "testing" ? "test_credits" : "paid_credits");



            await supabaseRequest(\`pingme_customers?id=eq.${encodeURIComponent(tag.id)}\`, "PATCH", {



              [creditsField]: newCredits, updated_at: new Date().toISOString()



            });



          } else {



            await supabaseRequest(\`tags?id=eq.${encodeURIComponent(tag.id)}\`, "PATCH", {



              scan_credits: newCredits, status: newCredits === 0 ? "exhausted" : "active"



            });



          }



        }















        return json({



          success: templateStatus === "sent", session_id: sessionId,



          delivery_status: templateStatus, photo_upload_status: photoUploadStatus,



          photo_url: photoUrl, location_attached: gpsLat !== null && gpsLng !== null,



          photo_delivery_status: mediaDelivery.photo,



          location_delivery_status: mediaDelivery.location,



          email_status: emailStatus, email_error: emailError,



          whatsapp_error: templateError,



          error: templateStatus === "sent" ? null : "WhatsApp did not accept the alert. No credit was deducted."



        }, templateStatus === "sent" ? 200 : 502);







      }















      *// RECOVER A SESSION if the browser lost the POST response after the alert was processed.*







      if (path === "/api/session/latest" && request.method === "GET") {







        const tagCode = (url.searchParams.get("tag_code") || "").trim();







        const since = (url.searchParams.get("since") || "").trim();







        if (!tagCode || !since) return json({ error: "Missing tag_code or since" }, 400);







        const result = await supabaseRequest(







          \`scan_logs?tag_code=eq.${encodeURIComponent(tagCode)}\` +







          \`&created_at=gte.${encodeURIComponent(since)}\` +







          "&select=id,tag_code,owner_reply,replied_at,session_status,delivery_status,created_at" +







          "&order=created_at.desc&limit=1"







        );







        if (!result.ok) return json({ error: "Could not recover session", details: result.data }, 500);







        if (!Array.isArray(result.data) || !result.data.length) {







          return json({ success: false, error: "No recent session found" }, 404);







        }







        return json({ success: true, session: result.data[0], session_id: result.data[0].id });







      }















      *// CHECK SESSION STATUS*







      if (path === "/api/session" && request.method === "GET") {







        const sessionId = (url.searchParams.get("id") || "").trim();







        if (!sessionId) return json({ error: "Missing session id" }, 400);







        const res = await supabaseRequest(







          \`scan_logs?id=eq.${encodeURIComponent(sessionId)}\` +







          "&select=id,owner_reply,replied_at,session_status,delivery_status"







        );







        if (!res.ok || !res.data || !res.data.length) return json({ error: "Session not found" }, 404);







        return json({ session: res.data[0] });







      }















      *// CLOSE SESSION*







      if (path === "/api/session/close" && request.method === "POST") {







        const { session_id } = await request.json();







        if (!session_id) return json({ error: "Missing session id" }, 400);







        const result = await supabaseRequest(







          \`scan_logs?id=eq.${encodeURIComponent(session_id)}\`,







          "PATCH",







          { session_status: "completed" }







        );







        if (!result.ok) return json({ error: "Could not close session", details: result.data }, 500);







        return json({ success: true });







      }



      *// ADMIN-ONLY SCANNER DETAILS API*

      *// Requires a valid Supabase access token for the configured admin email.*

      if (path === "/api/admin/scanner-details" && request.method === "GET") {

        const authorization = request.headers.get("Authorization") || "";

        const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);

        if (!tokenMatch) return json({ error: "Unauthorized" }, 401);

        if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {

          return json({ error: "Supabase server configuration is missing" }, 500);

        }



        const adminEmail = String(env.ADMIN_EMAIL || "pingmeconnect\@gmail.com").trim().toLowerCase();

        let authResponse;

        try {

          authResponse = await fetch(\`${env.SUPABASE_URL}/auth/v1/user\`, {

            method: "GET",

            headers: {

              apikey: env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_KEY,

              Authorization: \`Bearer ${tokenMatch[1]}\`

            }

          });

        } catch (authError) {

          return json({ error: "Could not verify admin session" }, 502);

        }

        if (!authResponse.ok) return json({ error: "Invalid or expired admin session" }, 401);

        const authUser = await authResponse.json();

        if (!authUser || String(authUser.email || "").trim().toLowerCase() !== adminEmail) {

          return json({ error: "Admin access required" }, 403);

        }



        const tagCode = String(url.searchParams.get("tag_code") || "").trim();

        const fromDate = String(url.searchParams.get("from") || "").trim();

        const toDate = String(url.searchParams.get("to") || "").trim();

        const includeCustomerDetails = url.searchParams.get("include_customer_details") === "true";

        const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(\`${value}T00:00:00Z\`));



        if (fromDate && !validDate(fromDate)) return json({ error: "Invalid from date. Use YYYY-MM-DD." }, 400);

        if (toDate && !validDate(toDate)) return json({ error: "Invalid to date. Use YYYY-MM-DD." }, 400);

        if (fromDate && toDate && fromDate > toDate) return json({ error: "From date cannot be after To date." }, 400);



        const params = new URLSearchParams();

        params.set("select", "\*");

        params.set("order", "created_at.desc");

        if (tagCode) params.set("tag_code", \`eq.${tagCode}\`);

        *// Date inputs are interpreted as India-local calendar dates (UTC+05:30).*

        if (fromDate) params.set("created_at", \`gte.${new Date(\`${fromDate}T00:00:00+05:30\`).toISOString()}\`);

        if (toDate) {

          const endExclusive = new Date(\`${toDate}T00:00:00+05:30\`);

          endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

          const existing = params.get("created_at");

          params.delete("created_at");

          if (existing) params.append("and", \`(created_at.gte.${existing.slice(4)},created_at.lt.${endExclusive.toISOString()})\`);

          else params.set("created_at", \`lt.${endExclusive.toISOString()}\`);

        }



        const records = [];

        const batchSize = 1000;

        const maxRecords = 20000;

        try {

          for (let offset = 0; offset < maxRecords; offset += batchSize) {

            const scanResponse = await fetch(\`${env.SUPABASE_URL}/rest/v1/scan_logs?${params.toString()}\`, {

              method: "GET",

              headers: {

                apikey: env.SUPABASE_KEY,

                Authorization: \`Bearer ${env.SUPABASE_KEY}\`,

                Range: \`${offset}-${Math.min(offset + batchSize - 1, maxRecords - 1)}\`,

                "Range-Unit": "items"

              }

            });

            const responseText = await scanResponse.text();

            if (!scanResponse.ok) {

              return json({ error: "Could not read scan history", details: responseText.slice(0, 500) }, 502);

            }

            const batch = responseText ? JSON.parse(responseText) : [];

            if (!Array.isArray(batch)) return json({ error: "Unexpected scan history response" }, 502);

            records.push(...batch);

            if (batch.length < batchSize) break;

          }

        } catch (scanError) {

          return json({ error: "Scanner history request failed", details: scanError?.message || String(scanError) }, 502);

        }



        const responseData = { records, count: records.length, truncated: records.length >= maxRecords };

        if (includeCustomerDetails && records.length) {

          const codes = [...new Set(records.map(row => String(row\.tag_code || "").trim()).filter(Boolean))];

          const customerMap = {};

          *// Query customer records in small batches to keep the URL within safe limits.*

          for (let i = 0; i < codes.length; i += 40) {

            const batchCodes = codes.slice(i, i + 40);

            const inFilter = \`in.(${batchCodes.map(code => JSON.stringify(code)).join(",")})\`;

            const customerParams = new URLSearchParams({

              select: "customer_id,name,mobile,email,address",

              customer_id: inFilter

            });

            const customerResponse = await fetch(\`${env.SUPABASE_URL}/rest/v1/pingme_customers?${customerParams.toString()}\`, {

              method: "GET",

              headers: {

                apikey: env.SUPABASE_KEY,

                Authorization: \`Bearer ${env.SUPABASE_KEY}\`

              }

            });

            if (!customerResponse.ok) {

              return json({ error: "Could not read customer details for the report", details: (await customerResponse.text()).slice(0, 500) }, 502);

            }

            const customers = await customerResponse.json();

            for (const customer of customers || []) {

              customerMap[customer.customer_id] = {

                customer_id: customer.customer_id,

                name: customer.name || "",

                mobile: customer.mobile || "",

                email: customer.email || "",

                address: customer.address || ""

              };

            }

          }

          responseData.customer_details = customerMap;

        }

        return json(responseData);

      }

















      return json({ error: "Route not found" }, 404);







    } catch (err) {







      return json({ error: "Internal server error", details: err?.message || String(err) }, 500);







    }







  }







};
