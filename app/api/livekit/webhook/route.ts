// app/api/livekit/webhook/route.ts
// Handle LiveKit webhooks - updates recording URL when egress completes

import { NextRequest, NextResponse } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import { db } from '@/lib/db';
import { interviewSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    // Check LiveKit credentials
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      console.error('❌ LiveKit credentials not configured for webhooks');
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const body = await req.text();
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      console.error('❌ Missing Authorization header in webhook');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize webhook receiver
    const webhookReceiver = new WebhookReceiver(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );

    // Verify signature and parse event
    let event;
    try {
      event = await webhookReceiver.receive(body, authHeader);
    } catch (error) {
      console.error('❌ Invalid webhook signature:', error);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log(`📥 LiveKit webhook: ${event.event}`);

    // Handle egress_ended event
    if (event.event === 'egress_ended' && event.egressInfo) {
      const egressInfo = event.egressInfo;
      const roomName = egressInfo.roomName;
      
      console.log(`🎬 Egress ended: ${egressInfo.egressId}, room: ${roomName}, status: ${egressInfo.status}`);

      // Get recording URL from file results
      let recordingUrl: string | null = null;
      
      if (egressInfo.fileResults && egressInfo.fileResults.length > 0) {
        const fileResult = egressInfo.fileResults[0];
        const s3Location = fileResult.location || '';
        
        // Convert S3 location to public URL
        recordingUrl = convertToPublicUrl(s3Location);
        console.log(`📁 Recording URL: ${recordingUrl}`);
      }

      // Update database with recording URL
      if (roomName && recordingUrl) {
        try {
          const result = await db.update(interviewSessions)
            .set({ 
              recordingUrl: recordingUrl,
              updatedAt: new Date(),
            })
            .where(eq(interviewSessions.roomName, roomName))
            .returning({ id: interviewSessions.id });

          if (result.length > 0) {
            console.log(`✅ Updated session ${result[0].id} with recording URL`);
          } else {
            console.warn(`⚠️ No session found for room: ${roomName}`);
          }
        } catch (dbError) {
          console.error('Database update error:', dbError);
        }
      }
    }

    // Log other egress events
    if (event.event === 'egress_started' && event.egressInfo) {
      console.log(`🎬 Egress started: ${event.egressInfo.egressId}`);
    }

    if (event.event === 'egress_updated' && event.egressInfo) {
      console.log(`🔄 Egress updated: ${event.egressInfo.egressId}, status: ${event.egressInfo.status}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Convert S3 location to public R2 URL
function convertToPublicUrl(s3Location: string): string {
  // S3 location format: s3://bucket/path/to/file.mp4
  
  // Use R2_PUBLIC_URL if set (custom domain or r2.dev subdomain)
  if (process.env.R2_PUBLIC_URL) {
    const pathMatch = s3Location.match(/s3:\/\/[^/]+\/(.+)/);
    if (pathMatch) {
      return `${process.env.R2_PUBLIC_URL}/${pathMatch[1]}`;
    }
  }

  // Fallback: construct URL from endpoint
  if (process.env.R2_ENDPOINT && process.env.R2_BUCKET) {
    const pathMatch = s3Location.match(/s3:\/\/[^/]+\/(.+)/);
    if (pathMatch) {
      // Remove the account ID part from endpoint for public access
      const endpoint = process.env.R2_ENDPOINT.replace(/^https:\/\/[^.]+\./, 'https://');
      return `${endpoint}/${process.env.R2_BUCKET}/${pathMatch[1]}`;
    }
  }

  // Return original if can't parse
  console.warn('⚠️ Could not convert S3 location to public URL:', s3Location);
  return s3Location;
}