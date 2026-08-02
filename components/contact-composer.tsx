"use client";

import { type FormEvent, useState } from "react";
import { Send } from "reicon-react";

const destination = "suhyeon.yu.2789@gmail.com";

export function ContactComposer() {
  const [status, setStatus] = useState("");

  function composeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const replyTo = String(form.get("email") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    const subject = name
      ? `Portfolio message from ${name}`
      : "Portfolio message";
    const body = [
      name ? `Name: ${name}` : null,
      replyTo ? `Reply to: ${replyTo}` : null,
      name || replyTo ? "" : null,
      message,
    ]
      .filter((line) => line !== null)
      .join("\n");

    setStatus("Opening your email app…");
    window.location.href = `mailto:${destination}?${new URLSearchParams({
      subject,
      body,
    }).toString()}`;
  }

  return (
    <form className="contact-composer" onSubmit={composeEmail}>
      <div className="contact-composer-fields">
        <label>
          <span>Name</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Your name"
          />
        </label>
        <label>
          <span>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
      </div>
      <label>
        <span>Message</span>
        <textarea
          name="message"
          required
          rows={7}
          placeholder="Tell me what you’re working on."
        />
      </label>
      <div className="contact-composer-actions">
        <button type="submit" className="focus-ring">
          <Send aria-hidden="true" />
          Compose email
        </button>
        <span aria-live="polite">{status}</span>
      </div>
    </form>
  );
}
