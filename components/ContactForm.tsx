"use client";
import { FormEvent, useState } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = `Ambern chatbot enquiry — ${data.get("business") || "New project"}`;
    const body = [`Name: ${data.get("name")}`, `Email: ${data.get("email")}`, `Business: ${data.get("business")}`, `Workflow: ${data.get("message")}`].join("\n\n");
    window.location.href = `mailto:vinicius@ambern.dev?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }
  return <form className="contact-form" onSubmit={submit} aria-label="Contact Ambern">
    <div className="contact-form-heading"><span className="eyebrow">START A CONVERSATION</span><h3>Tell us what your first response needs to do.</h3><p>We’ll open your email app with the details addressed to vinicius@ambern.dev.</p></div>
    <div className="contact-fields"><label>Name<input name="name" required autoComplete="name" placeholder="Your name" /></label><label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@company.com" /></label><label>Business or website<input name="business" required placeholder="Company name" /></label><label>What would you like to improve?<textarea name="message" required rows={4} placeholder="Common enquiries, tools and workflow…" /></label></div>
    <button className="primary-button" type="submit">Email Vinicius ↗</button>{sent && <p className="contact-sent" role="status">Your email app should be open with a prepared message.</p>}
  </form>;
}
