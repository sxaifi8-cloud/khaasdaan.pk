'use client';

import React, { useState } from 'react';
import { MapPin, Phone, Clock, Send, CheckCircle2, MessageCircle } from 'lucide-react';
import PublicSiteChrome from '@/components/public/PublicSiteChrome';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('Table Reservation');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitted(true);
    setName('');
    setPhone('');
    setMessage('');
  };

  return (
    <PublicSiteChrome>
      <section className="bg-slate-950 py-14 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 space-y-3">
          <span className="inline-block rounded-full bg-amber-500/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-300">
            Contact &amp; Reservations
          </span>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Get in Touch with Khaasdaan
          </h1>
          <p className="mx-auto max-w-xl text-xs text-slate-300 sm:text-sm">
            Questions about home delivery, family table bookings, or catering in Faisalabad? Reach our counter directly.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs space-y-5">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h2 className="text-xs font-extrabold uppercase text-slate-900">
                    Restaurant Location
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    D Ground Commercial Area, Faisalabad, Punjab, Pakistan
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <h2 className="text-xs font-extrabold uppercase text-slate-900">
                    Phone &amp; Order Desk
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">+92 300 1234567</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                <div>
                  <h2 className="text-xs font-extrabold uppercase text-slate-900">
                    Opening Hours
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Monday – Sunday: 12:00 PM to 1:00 AM
                  </p>
                </div>
              </div>

              <a
                href="https://wa.me/923001234567"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-extrabold text-white hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs">
              <h2 className="text-base font-extrabold text-slate-900">
                Send a Message or Reservation Request
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Our team will get back to you promptly.
              </p>

              {submitted && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Thank you! Your inquiry has been submitted.</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-3.5 text-xs">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-bold text-slate-700">Your Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700">Mobile Number *</label>
                    <input
                      required
                      type="tel"
                      placeholder="0300-1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Topic</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 font-semibold focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Table Reservation">Family Table Reservation</option>
                    <option value="Catering & Bulk Order">Catering / Bulk Order</option>
                    <option value="Delivery Inquiry">Delivery Inquiry</option>
                    <option value="Feedback">General Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Message</label>
                  <textarea
                    rows={4}
                    placeholder="Number of guests, preferred time, or inquiry details..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-extrabold text-white hover:bg-slate-800"
                >
                  <Send className="h-3.5 w-3.5 text-amber-400" />
                  <span>Submit Inquiry</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteChrome>
  );
}