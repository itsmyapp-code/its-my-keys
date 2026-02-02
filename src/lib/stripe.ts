import Stripe from 'stripe';

let stripeInstance: Stripe | undefined;

export const getStripe = () => {
    if (!stripeInstance) {
        if (!process.env.STRIPE_SECRET_KEY) {
            console.warn('STRIPE_SECRET_KEY is missing');
        }
        stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
            apiVersion: '2026-01-28.clover',
            typescript: true,
        });
    }
    return stripeInstance;
};
