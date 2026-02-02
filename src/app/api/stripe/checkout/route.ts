import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe'; // You might need to adjust import path if lib is elsewhere
// import { adminAuth, adminDb } from '@/lib/firebase/admin'; 
// We are not using admin SDK in this simple MVP, relying on passed email/orgId.
// In production, verify auth user more strictly.

export async function POST(req: Request) {
    try {
        const { priceId, successUrl, cancelUrl, orgId, email } = await req.json();

        if (!priceId || !orgId) {
            return NextResponse.json({ error: 'Missing priceId or orgId' }, { status: 400 });
        }

        // 1. Create Checkout Session
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: email, // Pre-fill email
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: cancelUrl,
            metadata: {
                orgId: orgId, // Crucial: Link payment to Organization
            },
            subscription_data: {
                metadata: {
                    orgId: orgId, // Also put on subscription for easier tracing
                },
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
