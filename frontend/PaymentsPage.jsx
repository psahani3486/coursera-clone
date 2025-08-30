import React from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

export default function PaymentsPage({ courseId }) {
  const handleCheckout = async () => {
    const stripe = await stripePromise;
    const res = await fetch('/api/payments/create-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId }) });
    const { id } = await res.json();
    await stripe.redirectToCheckout({ sessionId: id });
  };

  return <button onClick={handleCheckout} className="bg-green-600 text-white px-4 py-2 rounded">Subscribe</button>;
}