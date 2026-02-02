
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getAdminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event;

    try {
        // You must add STRIPE_WEBHOOK_SECRET to .env.local
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('Missing STRIPE_WEBHOOK_SECRET');
            return NextResponse.json({ error: 'Server config error' }, { status: 500 });
        }

        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            webhookSecret
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Webhook signature verification failed: ${message}`);
        return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as any; // Keeping this any as Stripe types are complex, but suppressed if needed or safe
            const orgId = session.metadata?.orgId;

            console.log(`Processing checkout for Org: ${orgId}`);

            if (orgId) {
                // Update Firestore
                const adminDb = getAdminDb();
                await adminDb.collection('organizations').doc(orgId).update({
                    accountType: 'PRO',
                    subscriptionStatus: 'active',
                    stripeSubscriptionId: session.subscription,
                    stripeCustomerId: session.customer,
                    updatedAt: new Date().toISOString() // Use ISO string for consistency
                });
                console.log(`Updated Org ${orgId} to PRO`);
            }
        }
    } catch (error: unknown) {
        console.error('Error updating Firestore:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
